import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Input, Label, Card } from '../../components/ui';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, UserCircle2, 
  CreditCard, Banknote, QrCode, Ticket, Loader2, Package,
  Zap, ArrowRight, History, CheckCircle2, ShoppingBag, Sparkles
} from 'lucide-react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default function SalesPage() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'cash'>('pix');
  const [discount, setDiscount] = useState(0);
  const [registering, setRegistering] = useState(false);

  useEffect(() => { if (user) fetchProducts(); }, [user]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const { data } = await supabase.from('products').select('*').eq('user_id', user?.id).order('name');
      setProducts(data || []);
    } catch (err: any) { toastError(err.message); }
    finally { setLoading(false); }
  }

  const addToCart = (product: any) => {
    if (product.stock_quantity <= 0) { toastError('Produto esgotado no inventário!'); return; }
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
         if (exists.quantity >= product.stock_quantity) { toastError('Limite de estoque atingido!'); return prev; }
         return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));
  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
         const newQty = Math.max(1, item.quantity + delta);
         if (newQty > item.stock_quantity) { toastError('Estoque insuficiente!'); return item; }
         return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const total = Math.max(0, subtotal - discount);
    return { subtotal, total };
  }, [cart, discount]);

  const handleRegisterSale = async () => {
    if (cart.length === 0) return;
    setRegistering(true);
    try {
      const salesData = cart.map(item => ({
        user_id: user?.id,
        product_id: item.id,
        quantity: item.quantity,
        total_price: (item.price * item.quantity) - (discount / cart.length),
        payment_method: paymentMethod,
        cost_price: item.cost_price || 0
      }));

      const { error: saleErr } = await supabase.from('sales').insert(salesData);
      if (saleErr) throw saleErr;

      // Update Stock
      for (const item of cart) {
        await supabase.from('products').update({ stock_quantity: item.stock_quantity - item.quantity }).eq('id', item.id);
      }

      success('Venda sincronizada com sucesso!');
      setCart([]);
      setDiscount(0);
      fetchProducts();
    } catch (err: any) { toastError(err.message); }
    finally { setRegistering(false); }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.includes(search));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 🏁 Sales Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 lg:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1.5"><Zap size={10} /> Terminal de Vendas</span>
            <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Aura Professional</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-white">Novo <span className="text-primary italic">Lançamento</span></h1>
          <p className="text-muted-foreground font-medium text-sm lg:text-base max-w-2xl">
            Sua frente de caixa (PDV) de alta performance com processamento em nuvem.
          </p>
        </div>
        
        <div className="h-14 px-6 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4">
           <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
           <span className="text-[11px] font-black uppercase text-white/40 tracking-widest">Sincronização Ativa</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
         {/* 📦 Product Matrix */}
         <div className="lg:col-span-8 space-y-6">
            <div className="relative group">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-primary transition-colors" size={18} />
               <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Comando rápido: SKU ou Nome..." className="ux-input h-16 pl-16 !bg-white/5 border-white/5 font-bold text-lg" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[700px] overflow-y-auto no-scrollbar pb-10">
               {loading ? (
                 <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
               ) : filtered.length === 0 ? (
                 <div className="col-span-full py-20 text-center glass-card font-black uppercase tracking-widest text-white/10 italic">Nenhum ativo localizado</div>
               ) : (
                 filtered.map(p => (
                   <div key={p.id} onClick={() => addToCart(p)} className={cn("glass-card !p-0 overflow-hidden cursor-pointer transition-all group relative", p.stock_quantity <= 0 && "opacity-40 grayscale")}>
                      <div className="aspect-square bg-black relative">
                         {p.image_url ? (
                           <img src={getProxyUrl(p.image_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                         ) : <Package className="m-auto h-full text-white/5 p-6" />}
                         <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent h-1/2" />
                         <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                            <span className="text-[16px] font-black text-white italic">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}</span>
                            <div className="h-6 w-6 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg transform translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all"><Plus size={14} strokeWidth={3} /></div>
                         </div>
                      </div>
                      <div className="p-3">
                         <p className="text-[10px] font-black text-white uppercase truncate tracking-tight">{p.name}</p>
                         <p className="text-[9px] font-bold text-white/20 uppercase mt-0.5">EST: {p.stock_quantity} unidades</p>
                      </div>
                   </div>
                 ))
               )}
            </div>
         </div>

         {/* 🧾 Command Cart */}
         <div className="lg:col-span-4 glass-card p-0 overflow-hidden flex flex-col shadow-2xl border-primary/10">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
               <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2"><ShoppingCart size={16} className="text-primary" /> Carrinho Ativo</h2>
               <span className="text-[9px] font-black text-white px-2 py-1 bg-primary rounded-lg">{cart.length} ITENS</span>
            </div>

            <div className="flex-1 max-h-[400px] overflow-y-auto no-scrollbar divide-y divide-white/5">
               {cart.length === 0 ? (
                 <div className="py-20 text-center space-y-4">
                    <ShoppingBag size={48} className="mx-auto text-white/5" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10">Aguardando Seleção</p>
                 </div>
               ) : (
                 cart.map(item => (
                    <div key={item.id} className="p-6 flex items-center gap-4 group">
                       <div className="h-14 w-14 rounded-2xl bg-black overflow-hidden border border-white/5 shrink-0">
                          <img src={getProxyUrl(item.image_url)} className="w-full h-full object-cover" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white uppercase tracking-tight truncate italic">{item.name}</p>
                          <p className="text-[10px] font-bold text-primary mt-0.5">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</p>
                       </div>
                       <div className="flex items-center gap-3">
                          <button onClick={() => updateQty(item.id, -1)} className="h-8 w-8 bg-white/5 rounded-xl flex items-center justify-center text-white/20 hover:text-white transition-all"><Minus size={14} /></button>
                          <span className="text-xs font-black text-white">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="h-8 w-8 bg-white/5 rounded-xl flex items-center justify-center text-white/20 hover:text-white transition-all"><Plus size={14} /></button>
                          <button onClick={() => removeFromCart(item.id)} className="ml-2 text-white/10 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                       </div>
                    </div>
                 ))
               )}
            </div>

            <div className="p-8 bg-white/[0.02] border-t border-white/5 space-y-6">
               <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'pix', icon: QrCode, label: 'PIX' },
                    { id: 'card', icon: CreditCard, label: 'Cartão' },
                    { id: 'cash', icon: Banknote, label: 'Dinheiro' }
                  ].map(m => (
                    <button key={m.id} onClick={() => setPaymentMethod(m.id as any)} className={cn("py-4 rounded-2xl border flex flex-col items-center gap-2 transition-all", paymentMethod === m.id ? "bg-primary border-primary shadow-lg shadow-primary/20 text-white" : "bg-white/5 border-white/5 text-white/30 hover:text-white")}>
                       <m.icon size={18} />
                       <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                    </button>
                  ))}
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                     <span className="text-[11px] font-black uppercase text-white/20 tracking-widest">Subtotal Bruto</span>
                     <span className="text-sm font-black text-white italic">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center px-1">
                     <span className="text-[11px] font-black uppercase text-white/20 tracking-widest">Desconto Aplicado</span>
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-rose-500 italic">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discount)}</span>
                        <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-16 h-8 bg-white/5 border border-white/5 rounded-lg text-[11px] font-black px-2 outline-none text-white focus:border-primary/50" />
                     </div>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center px-1">
                     <span className="text-sm font-black uppercase text-primary tracking-widest italic">Total Líquido</span>
                     <span className="text-3xl font-black text-white italic tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}</span>
                  </div>
               </div>

               <button 
                 onClick={handleRegisterSale} 
                 disabled={registering || cart.length === 0} 
                 className="ux-button h-16 w-full bg-primary text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
               >
                  {registering ? <Loader2 className="animate-spin" /> : 'Finalizar Transação Aura'}
                  {!registering && <ArrowRight size={18} strokeWidth={3} />}
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
