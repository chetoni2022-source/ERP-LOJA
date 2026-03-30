import React, { useState, useEffect, useRef } from 'react';
import { 
  BadgeDollarSign, Plus, Loader2, CheckCircle2, 
  UserCircle2, Trash2, Minus, History as HistoryIcon,
  ShoppingCart, Package, TrendingUp, X, Search, Edit
} from 'lucide-react';
import { Button, Input, Label } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  cost_price: number;
  stock_quantity: number;
  image_url?: string | null;
  images?: string[];
  sku?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Sale {
  id: string;
  created_at: string;
  product_id: string;
  quantity: number;
  total_price: number;
  customer_name?: string;
  customer_id?: string;
  lead_source?: string;
  products?: { name: string, stock_quantity: number };
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

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [cartQty, setCartQty] = useState('1');

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  const [leadSource, setLeadSource] = useState('WhatsApp');
  const [availableLeadSources, setAvailableLeadSources] = useState<string[]>(['WhatsApp', 'Instagram', 'Ads', 'Indicação', 'Loja']);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editCustomer, setEditCustomer] = useState('');
  const [editSource, setEditSource] = useState('');

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchStoreSettings();
    }
    const handleClick = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [user]);

  async function fetchStoreSettings() {
    try {
      if (!user) return;
      const { data } = await supabase
        .from('store_settings')
        .select('lead_sources')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.lead_sources && data.lead_sources.length > 0) {
        setAvailableLeadSources(data.lead_sources);
        setLeadSource(data.lead_sources[0]);
      }
    } catch (err) {
      console.error('Error fetching lead sources:', err);
    }
  }

  async function fetchData() {
    try {
      if (!user) return;
      const [{ data: prodData }, { data: custData }, { data: salesData }] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id).order('name'),
        supabase.from('customers').select('id, full_name, phone').eq('user_id', user.id).order('full_name'),
        supabase.from('sales').select(`*, products(name, stock_quantity)`).eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      setProducts(prodData || []);
      setCustomers(custData || []);
      setSales(salesData?.map(s => ({ ...s, products: (s.products as any) })) || []);
    } catch (err) {
      console.error(err);
      toastError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  const addToCart = () => {
    const p = products.find(prod => prod.id === selectedProductId);
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

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty < 1) return c;
      if (newQty > c.product.stock_quantity) {
        toastError('Limite de estoque atingido.');
        return c;
      }
      return { ...c, quantity: newQty };
    }).filter(c => c.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
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

        await supabase.from('products')
          .update({ stock_quantity: item.product.stock_quantity - item.quantity })
          .eq('id', item.product.id);

        await supabase.from('product_movements').insert([{
          product_id: item.product.id,
          user_id: user.id,
          type: 'out',
          quantity: item.quantity,
          reason: `Venda registrada — ${customerSearch || 'Balcão'}`,
        }]);
      }

      success(`Venda enviada com sucesso!`);
      setCart([]);
      setSelectedProductId('');
      setCustomerSearch('');
      setSelectedCustomerId('');
      fetchData();
    } catch (err: any) {
      toastError('Erro ao registrar venda: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSale(sale: Sale) {
    if (!window.confirm(`Deseja realmente cancelar esta venda? O estoque de "${sale.products?.name || 'Item Excluído'}" será devolvido (+${sale.quantity}).`)) return;
    
    try {
      // 1. Devolver estoque
      if (sale.product_id && sale.products) {
        const { error: stockErr } = await supabase.from('products')
          .update({ stock_quantity: (sale.products.stock_quantity || 0) + sale.quantity })
          .eq('id', sale.product_id);
        if (stockErr) throw stockErr;

        // 2. Registrar movimento corretivo
        await supabase.from('product_movements').insert([{
          product_id: sale.product_id,
          user_id: user?.id,
          type: 'in',
          quantity: sale.quantity,
          reason: `Venda cancelada (Exclusão) — ${sale.customer_name || 'Balcão'}`,
        }]);
      }

      // 3. Deletar venda
      const { error: delErr } = await supabase.from('sales').delete().eq('id', sale.id);
      if (delErr) throw delErr;

      success('Venda cancelada e estoque devolvido.');
      fetchData();
    } catch (err: any) {
      toastError('Erro ao excluir venda: ' + err.message);
    }
  }

  const openEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setEditQty(sale.quantity.toString());
    setEditCustomer(sale.customer_name || '');
    setEditSource(sale.lead_source || 'WhatsApp');
  };

  async function handleUpdateSale(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSale || !user) return;
    setSaving(true);

    try {
      const newQty = parseInt(editQty) || 1;
      const oldQty = editingSale.quantity;
      const qtyDelta = newQty - oldQty; // +1 means we sold 1 more, so stock goes -1

      // 1. Validar estoque se aumentou a venda
      if (qtyDelta > 0) {
        if (qtyDelta > (editingSale.products?.stock_quantity || 0)) {
           toastError('Estoque insuficiente para este aumento.');
           return;
        }
      }

      // 2. Atualizar Estoque do Produto
      if (qtyDelta !== 0 && editingSale.product_id) {
         const { error: stockErr } = await supabase.from('products')
           .update({ stock_quantity: (editingSale.products?.stock_quantity || 0) - qtyDelta })
           .eq('id', editingSale.product_id);
         if (stockErr) throw stockErr;

         await supabase.from('product_movements').insert([{
           product_id: editingSale.product_id,
           user_id: user.id,
           type: qtyDelta > 0 ? 'out' : 'in',
           quantity: Math.abs(qtyDelta),
           reason: `Venda editada (Ajuste Qtd) — ${editCustomer}`,
         }]);
      }

      // 3. Atualizar Venda
      const { error: saleErr } = await supabase.from('sales').update({
        quantity: newQty,
        total_price: (editingSale.total_price / oldQty) * newQty, // Proportionally update total
        customer_name: editCustomer || null,
        lead_source: editSource || null
      }).eq('id', editingSale.id);

      if (saleErr) throw saleErr;

      success('Venda atualizada!');
      setEditingSale(null);
      fetchData();
    } catch (err: any) {
      toastError('Erro ao atualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sincronizando PDV...</p>
    </div>
  );

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* ── Header Compacto ────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tighter flex items-center gap-2">
            <BadgeDollarSign className="h-5 w-5 text-primary" />
            Terminal de <span className="text-primary italic">Vendas</span>
          </h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider hidden md:block">Registre seus pedidos com agilidade</p>
        </div>
        
        <div className="flex items-center gap-2">
           <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowHistory(!showHistory)}
            className={cn("h-9 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-border/40", showHistory && "bg-primary/10 text-primary border-primary/20")}
           >
            <HistoryIcon className="h-4 w-4 mr-2" />
            {showHistory ? 'Fechar Histórico' : 'Ver Recentes'}
           </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4 md:gap-6 items-start">
        
        {/* ── Coluna Esquerda: Cadastro ─────────────────────── */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-4">
          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Nova Venda
              </h2>
            </div>

            {/* Seleção de Produto */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Produto</Label>
                <div className="relative">
                  <select
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                    className="w-full h-11 px-3 bg-muted/20 border border-border/40 text-foreground font-bold text-xs rounded-xl focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                  >
                    <option value="">Selecione a peça...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                        {p.name} — {fmt(p.sale_price || p.price)} ({p.stock_quantity} un.)
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                    <Search className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-24 space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Qtd</Label>
                  <Input
                    type="number" min="1" value={cartQty}
                    onChange={e => setCartQty(e.target.value)}
                    className="h-11 text-center font-black bg-muted/20 border-border/40 rounded-xl"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <Button 
                    onClick={addToCart} 
                    disabled={!selectedProductId} 
                    className="h-11 w-full rounded-xl bg-primary text-primary-foreground font-black text-[10px] tracking-widest uppercase shadow-md active:scale-95 transition-all"
                  >
                    ADICIONAR AO CARRINHO
                  </Button>
                </div>
              </div>
            </div>

            {/* Cliente e Origem */}
            <div className="pt-4 border-t border-border/40 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Cliente (Opcional)</Label>
                <div ref={customerRef} className="relative">
                  <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                  <Input
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomerId(''); setCustomerDropdownOpen(true); }}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    placeholder="Nome ou balcão..."
                    className="h-11 pl-9 text-xs font-bold bg-muted/10 border-border/40 rounded-xl"
                  />
                  {customerDropdownOpen && filteredCustomers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border shadow-xl z-50 rounded-xl max-h-48 overflow-y-auto p-1 backdrop-blur-md">
                      {filteredCustomers.slice(0, 6).map(c => (
                        <button
                          key={c.id}
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left px-3 py-2 text-[11px] hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-2 group"
                        >
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary">{c.full_name[0]}</div>
                          <span className="font-bold flex-1 truncate">{c.full_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Origem da Lead</Label>
                <div className="flex flex-wrap gap-1.5">
                  {availableLeadSources.map(source => (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setLeadSource(source)}
                      className={cn(
                        "px-3 py-1.5 text-[9px] font-black rounded-lg border transition-all uppercase tracking-wider",
                        leadSource === source 
                          ? "bg-foreground text-background border-foreground shadow-sm" 
                          : "bg-muted/10 border-border/40 text-muted-foreground hover:bg-muted/30"
                      )}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Coluna Direita: Carrinho ──────────────────────── */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-4">
          
          <div className="bg-card border border-border/50 rounded-2xl shadow-sm flex flex-col min-h-[350px] overflow-hidden">
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/5">
              <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                Carrinho
                <span className="ml-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                  {cart.reduce((a,b)=>a+b.quantity, 0)}
                </span>
              </h2>
              <div className="text-right">
                <span className="text-[9px] font-black text-muted-foreground uppercase mr-2 tracking-tighter">Total à pagar</span>
                <span className="text-lg font-black text-primary tabular-nums">{fmt(cartTotal)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-2 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 py-10">
                  <ShoppingCart className="h-8 w-8 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Carrinho vazio</p>
                </div>
              ) : (
                cart.map((item, i) => (
                  <div key={i} className="group relative flex items-center gap-3 p-3 bg-muted/10 hover:bg-muted/20 border border-border/30 rounded-xl transition-all animate-in slide-in-from-right-4 duration-300">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg border border-border/50 overflow-hidden bg-card flex-shrink-0">
                      {item.product.images?.[0] || item.product.image_url ? (
                        <img src={item.product.images?.[0] || item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-full h-full p-2 md:p-3 text-muted-foreground/20" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">{item.product.name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{fmt(item.product.sale_price || item.product.price)} un.</p>
                    </div>

                    <div className="flex items-center gap-2">
                       <div className="flex items-center bg-card border border-border/40 rounded-lg overflow-hidden h-8 shadow-sm">
                         <button onClick={() => updateCartQty(item.product.id, -1)} className="w-7 h-full hover:bg-muted transition-colors flex items-center justify-center border-r border-border/40"><Minus size={12} /></button>
                         <span className="w-7 text-[11px] font-black text-center">{item.quantity}</span>
                         <button onClick={() => updateCartQty(item.product.id, 1)} className="w-7 h-full hover:bg-muted transition-colors flex items-center justify-center border-l border-border/40"><Plus size={12} /></button>
                       </div>
                       
                       <div className="min-w-[60px] md:min-w-[70px] text-right">
                          <p className="text-sm font-black text-primary tracking-tight">{fmt((item.product.sale_price || item.product.price) * item.quantity)}</p>
                       </div>

                       <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 px-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all ml-1"
                       >
                        <Trash2 size={14} />
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-muted/5 border-t border-border/40">
               <form onSubmit={handleRegisterSale}>
                <Button
                  type="submit"
                  disabled={saving || cart.length === 0}
                  className="w-full h-12 md:h-14 text-sm font-black uppercase tracking-[0.2em] bg-foreground text-background hover:bg-foreground/90 rounded-xl shadow-lg relative overflow-hidden active:scale-95 transition-all"
                >
                  {saving ? <Loader2 className="animate-spin h-5 w-5 mr-3" /> : <CheckCircle2 className="h-5 w-5 mr-3" />}
                  {saving ? 'PROCESSANDO...' : 'FINALIZAR VENDA'}
                </Button>
              </form>
            </div>
          </div>

          {/* ── Vendas Recentes (Colapsável) ────────────────── */}
          {showHistory && (
            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
              <h3 className="text-xs font-black tracking-widest text-foreground uppercase flex items-center gap-2">
                <HistoryIcon className="h-4 w-4 text-primary" />
                Histórico Recente
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[9px] text-muted-foreground uppercase tracking-widest font-black border-b border-border/30">
                    <tr>
                      <th className="px-2 py-3">Peça</th>
                      <th className="px-2 py-3 hidden md:table-cell">Cliente / Canal</th>
                      <th className="px-2 py-3 text-center">Qtd</th>
                      <th className="px-2 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {sales.map(sale => (
                      <tr key={sale.id} className="text-[11px] group">
                        <td className="px-2 py-3">
                           <span className="font-bold block truncate max-w-[120px]">{sale.products?.name || 'Item Excluído'}</span>
                           <span className="text-[9px] text-muted-foreground block md:hidden">{sale.customer_name || 'Balcão'} • {sale.lead_source}</span>
                        </td>
                        <td className="px-2 py-3 hidden md:table-cell">
                           <span className="font-semibold">{sale.customer_name || 'Balcão'}</span>
                           <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-tighter">{sale.lead_source}</span>
                        </td>
                        <td className="px-2 py-3 text-center opacity-40 font-black">×{sale.quantity}</td>
                        <td className="px-2 py-3 text-right font-black text-foreground">
                           <div className="flex items-center justify-end gap-1.5 uppercase tracking-tighter">
                             <span className="mr-1">{fmt(sale.total_price)}</span>
                             <button 
                               onClick={() => openEditSale(sale)}
                               className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-md transition-all"
                             >
                               <Edit size={12} />
                             </button>
                             <button 
                               onClick={() => handleDeleteSale(sale)}
                               className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-md transition-all"
                             >
                               <Trash2 size={12} />
                             </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL EDIÇÃO DE VENDA ── */}
      {editingSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEditingSale(null)}></div>
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest text-foreground">Editar Lançamento</h3>
              <button onClick={() => setEditingSale(null)} className="p-1 hover:bg-muted rounded-full"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateSale} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Produto</Label>
                <div className="p-3 bg-muted/20 border border-border/40 rounded-xl text-xs font-bold text-foreground">
                  {editingSale.products?.name || 'Item Excluído'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Quantidade</Label>
                  <Input type="number" min="1" value={editQty} onChange={e=>setEditQty(e.target.value)} className="h-10 text-xs font-black" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Canal</Label>
                  <select value={editSource} onChange={e=>setEditSource(e.target.value)} className="w-full h-10 px-3 bg-muted/20 border border-border/40 text-xs font-bold rounded-xl appearance-none">
                    {availableLeadSources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Cliente</Label>
                <Input value={editCustomer} onChange={e=>setEditCustomer(e.target.value)} placeholder="Balcão / Nome..." className="h-10 text-xs font-bold" />
              </div>

              <div className="pt-4 flex gap-2">
                <Button type="button" variant="ghost" onClick={()=>setEditingSale(null)} className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest border border-border/40">Cancelar</Button>
                <Button type="submit" disabled={saving} className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-lg">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
