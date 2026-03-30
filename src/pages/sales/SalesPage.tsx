import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { BadgeDollarSign, Loader2, PackageSearch, Plus, Trash2, CheckCircle2, UserCircle2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  cost_price: number;
  other_costs: number;
  stock_quantity: number;
  image_url?: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Sale {
  id: string;
  created_at: string;
  quantity: number;
  total_price: number;
  customer_name?: string;
  lead_source?: string;
  products?: { name: string };
}

interface Customer {
  id: string;
  full_name: string;
  phone?: string;
}

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default function SalesPage() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [cartQty, setCartQty] = useState('1');

  // Customer autocomplete
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  // Other fields
  const [leadSource, setLeadSource] = useState('WhatsApp');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
    const handleClick = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [user]);

  async function fetchData() {
    try {
      const [{ data: prodData }, { data: custData }, { data: salesData }] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id).order('name'),
        supabase.from('customers').select('id, full_name, phone').eq('user_id', user.id).order('full_name'),
        supabase.from('sales').select(`*, products(name)`).eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
      ]);
      setProducts(prodData || []);
      setCustomers(custData || []);
      setSales(salesData?.map(s => ({ ...s, products: (s.products as any) })) || []);
    } catch {
      toastError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  const addToCart = () => {
    const p = products.find(p => p.id === selectedProductId);
    if (!p) return;
    const qty = parseInt(cartQty) || 1;
    const existing = cart.find(c => c.product.id === p.id);
    const currentInCart = existing?.quantity || 0;
    if (qty + currentInCart > p.stock_quantity) {
      toastError(`Estoque insuficiente! Disponível: ${p.stock_quantity - currentInCart}`);
      return;
    }
    if (existing) {
      setCart(prev => prev.map(c => c.product.id === p.id ? { ...c, quantity: c.quantity + qty } : c));
    } else {
      setCart(prev => [...prev, { product: p, quantity: qty }]);
    }
    setSelectedProductId('');
    setCartQty('1');
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(c => c.product.id !== productId));
  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart(prev => prev.map(c => c.product.id === productId ? { ...c, quantity: qty } : c));
  };

  const cartTotal = cart.reduce((acc, item) => {
    const price = item.product.sale_price || item.product.price;
    return acc + price * item.quantity;
  }, 0);

  const filteredCustomers = customers.filter(c =>
    c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  const selectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerSearch(c.full_name);
    setCustomerDropdownOpen(false);
  };

  async function handleRegisterSale(e: React.FormEvent) {
    e.preventDefault();
    if (!user || cart.length === 0) return;
    setSaving(true);

    try {
      for (const item of cart) {
        const unitPrice = item.product.sale_price || item.product.price;
        const totalPrice = unitPrice * item.quantity;
        const unitCost = item.product.cost_price || 0;

        await supabase.from('sales').insert([{
          product_id: item.product.id,
          quantity: item.quantity,
          total_price: totalPrice,
          unit_cost_at_sale: unitCost,
          customer_id: selectedCustomerId || null,
          customer_name: customerSearch || null,
          lead_source: leadSource || null,
          user_id: user.id,
        }]);

        // Update stock
        await supabase.from('products')
          .update({ stock_quantity: item.product.stock_quantity - item.quantity })
          .eq('id', item.product.id);

        // Register movement
        await supabase.from('product_movements').insert([{
          product_id: item.product.id,
          user_id: user.id,
          type: 'out',
          quantity: item.quantity,
          reason: `Venda registrada — ${customerSearch || 'Balcão'}`,
        }]).then(() => {}); // non-blocking
      }

      success(`Venda de ${cart.length} item${cart.length > 1 ? 's' : ''} registrada!`);
      setCart([]);
      setSelectedProductId('');
      setCustomerSearch('');
      setSelectedCustomerId('');
      setLeadSource('WhatsApp');
      fetchData();
    } catch (err: any) {
      toastError('Erro ao registrar venda: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2 block">Terminal de Operações</span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">Registro de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-md font-medium">PDV Simplificado: Gerencie múltiplas peças e finalize pedidos em segundos.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Form ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-primary" /> Nova Venda
            </h2>

            {/* Add to cart */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                <PackageSearch size={14}/> Adicionar Produto ao Carrinho
              </Label>
              <div className="flex gap-2">
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="flex-1 h-12 px-3 bg-muted/30 border border-border text-foreground font-bold text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">Selecione a peça...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                      {p.name} ({p.stock_quantity} em estoque)
                    </option>
                  ))}
                </select>
                <div className="relative w-20">
                  <Input
                    type="number" min="1" value={cartQty}
                    onChange={e => setCartQty(e.target.value)}
                    className="w-full h-12 text-center font-black bg-muted/30 border-border rounded-xl focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <Button onClick={addToCart} disabled={!selectedProductId} className="h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-muted/30 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border">
                  Carrinho ({cart.length} {cart.length > 1 ? 'itens' : 'item'})
                </div>
                <div className="divide-y divide-border/60">
                  {cart.map(item => {
                    const price = item.product.sale_price || item.product.price;
                    return (
                      <div key={item.product.id} className="flex items-center gap-2 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-foreground truncate">{item.product.name}</p>
                          <p className="text-[10px] text-primary font-bold">{fmt(price)} / un</p>
                        </div>
                        <input
                          type="number" min="1"
                          value={item.quantity}
                          onChange={e => updateCartQty(item.product.id, parseInt(e.target.value) || 1)}
                          className="w-12 h-7 text-center text-xs font-black bg-background border border-border rounded-md focus:outline-none"
                        />
                        <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center px-3 py-2.5 bg-primary/5 border-t border-primary/20">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</span>
                  <span className="font-black text-base text-primary">{fmt(cartTotal)}</span>
                </div>
              </div>
            )}

            {/* Customer Autocomplete */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente (Opcional)</Label>
              <div ref={customerRef} className="relative">
                <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomerId(''); setCustomerDropdownOpen(true); }}
                  onFocus={() => setCustomerDropdownOpen(true)}
                  placeholder="Nome ou balcão..."
                  className="h-10 pl-9 font-medium bg-background"
                />
                {customerDropdownOpen && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-30 max-h-40 overflow-y-auto">
                    {filteredCustomers.slice(0, 6).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
                      >
                        <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-primary">{c.full_name[0]}</span>
                        </div>
                        <div>
                          <p className="font-bold text-xs text-foreground">{c.full_name}</p>
                          {c.phone && <p className="text-[10px] text-muted-foreground">{c.phone}</p>}
                        </div>
                        {selectedCustomerId === c.id && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lead Source */}
            <div className="space-y-1.5 pb-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Origem da Lead</Label>
              <div className="grid grid-cols-3 gap-2">
                {['WhatsApp', 'Instagram', 'Ads', 'Indicação', 'Loja'].map(source => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setLeadSource(source)}
                    className={cn(
                      "py-2 text-[10px] font-black rounded-lg border transition-all uppercase tracking-tighter",
                      leadSource === source ? "bg-primary border-primary text-primary-foreground shadow-md" : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleRegisterSale}>
              <Button
                type="submit"
                disabled={saving || cart.length === 0}
                className="w-full h-14 font-black uppercase tracking-[0.1em] bg-foreground text-background hover:bg-foreground/90 shadow-xl rounded-xl group transition-all"
              >
                {saving ? <Loader2 className="animate-spin h-5 w-5 mr-3" /> : null}
                {saving ? 'Registrando Transação...' : `Finalizar Venda · ${fmt(cartTotal)}`}
              </Button>
            </form>
          </div>
        </div>

        {/* ── Sales History ── */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-bold text-foreground mb-3 hidden md:block">Últimas Vendas</h2>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[300px]">
            {loading ? (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin h-6 w-6 text-primary/50" /></div>
            ) : sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <PackageSearch className="h-10 w-10 opacity-20 mb-3" />
                <p className="font-bold text-foreground">Nenhuma venda ainda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-muted-foreground uppercase bg-muted/30 border-b border-border tracking-widest font-black">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3 hidden md:table-cell">Cliente · Canal</th>
                      <th className="px-4 py-3 text-center">Qtd</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {sales.map(sale => (
                      <tr key={sale.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground font-semibold whitespace-nowrap">
                          {new Date(sale.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground text-xs max-w-[140px] truncate">
                          {sale.products?.name || <span className="text-muted-foreground italic">Excluído</span>}
                          <div className="md:hidden mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{sale.customer_name || 'Balcão'} · {sale.lead_source}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="font-bold text-xs text-foreground">{sale.customer_name || 'Balcão'}</p>
                          {sale.lead_source && <p className="text-[10px] text-muted-foreground uppercase">{sale.lead_source}</p>}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-muted-foreground text-xs">×{sale.quantity}</td>
                        <td className="px-4 py-3 text-right font-black text-primary text-sm">{fmt(sale.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
