import React, { useState, useEffect, useMemo } from 'react';
import { Button, Input, Label, Card } from '../../components/ui';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { 
  Plus, Search, Edit2, Trash2, Package, AlertCircle, Loader2, ArrowUpDown, 
  Filter, MoreHorizontal, LayoutGrid, List, SlidersHorizontal, ImagePlus, 
  X, Check, DollarSign, Tag, Archive, Sparkles, Zap, ShieldCheck, ShoppingBag
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  sale_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  category_id: string | null;
  image_url: string | null;
  images: string[] | null;
  user_id: string;
  created_at: string;
}

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default function InventoryPage() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Stats
  const stats = useMemo(() => {
    const total = products.length;
    const stockValue = products.reduce((acc, p) => acc + (p.price * p.stock_quantity), 0);
    const lowStock = products.filter(p => p.stock_quantity <= 5).length;
    const inventoryCost = products.reduce((acc, p) => acc + ((p.cost_price || 0) * p.stock_quantity), 0);
    return { total, stockValue, lowStock, inventoryCost };
  }, [products]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => { if (user) fetchProducts(); }, [user]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) { toastError(err.message); }
    finally { setLoading(false); }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este item permanentemente?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
      success('Produto removido do ecossistema.');
    } catch (err: any) { toastError(err.message); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 🏁 Aura Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 lg:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={10} /> Inventário Verificado</span>
            <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Aura Workspace</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-white">Central de <span className="text-primary italic">Ativos</span></h1>
          <p className="text-muted-foreground font-medium text-sm lg:text-base max-w-2xl">
            Gerencie seu estoque físico e digital com precisão cirúrgica e métricas de valuation em tempo real.
          </p>
        </div>
        
        <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="ux-button h-14 px-8 bg-primary text-white shadow-xl shadow-primary/20 text-[13px] uppercase tracking-widest gap-3">
          <Plus size={20} strokeWidth={3} /> Cadastrar Novo Item
        </button>
      </div>

      {/* 📊 High-End KPI Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'SKUs Totais', val: stats.total, icon: Package, color: 'text-primary' },
          { label: 'Valuation Estoque', val: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.stockValue), icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Custo de Ativos', val: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.inventoryCost), icon: Archive, color: 'text-blue-400' },
          { label: 'Ruptura de Estoque', val: stats.lowStock, icon: AlertCircle, color: stats.lowStock > 0 ? 'text-rose-400' : 'text-emerald-400' },
        ].map((kpi, idx) => (
          <div key={idx} className="glass-card p-6 flex flex-col justify-between hover:border-primary/20 transition-all group">
             <div className="flex justify-between items-start">
                <div className={cn("p-3 rounded-xl bg-white/5 group-hover:bg-primary/10 transition-colors", kpi.color)}><kpi.icon size={20} /></div>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             </div>
             <div className="mt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">{kpi.label}</p>
                <p className="text-2xl font-black text-white italic tracking-tighter">{kpi.val}</p>
             </div>
          </div>
        ))}
      </div>

      {/* 🔍 Control Bar */}
      <div className="flex flex-col md:flex-row gap-4">
         <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-primary transition-colors" size={18} />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por SKU, Título ou Categoria..." className="ux-input h-16 pl-16 !bg-white/5 border-white/5 font-bold text-lg" />
         </div>
         <div className="flex gap-2">
            <button onClick={() => setActiveTab('grid')} className={cn("ux-button h-16 w-16 bg-white/5 border border-white/5", activeTab === 'grid' ? "text-primary border-primary/20" : "text-white/20 hover:text-white")}><LayoutGrid size={24} /></button>
            <button onClick={() => setActiveTab('list')} className={cn("ux-button h-16 w-16 bg-white/5 border border-white/5", activeTab === 'list' ? "text-primary border-primary/20" : "text-white/20 hover:text-white")}><List size={24} /></button>
            <button className="ux-button h-16 px-8 bg-white/5 border border-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest gap-2 hover:text-white"><SlidersHorizontal size={14} /> Filtro</button>
         </div>
      </div>

      {/* 📦 Inventory Content */}
      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4 text-white/20"><Loader2 className="animate-spin" /> <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Ativos...</span></div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-32 glass-card flex flex-col items-center justify-center text-center space-y-4">
           <div className="h-24 w-24 bg-white/5 rounded-full flex items-center justify-center text-white/10"><ShoppingBag size={48} /></div>
           <h3 className="text-2xl font-black text-white italic">Nenhum Ativo Detectado</h3>
           <p className="text-muted-foreground max-w-sm font-medium">Seu ecossistema está pronto. Inicie cadastrando seu primeiro produto para ativar as métricas.</p>
        </div>
      ) : activeTab === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {filteredProducts.map((p, i) => (
             <div key={p.id} className="glass-card !p-0 overflow-hidden group hover:border-primary/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="aspect-square relative bg-black overflow-hidden">
                   {p.image_url ? (
                     <img src={getProxyUrl(p.image_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                   ) : (
                     <div className="h-full w-full flex items-center justify-center"><Package size={48} className="text-white/5" /></div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60" />
                   <div className="absolute top-4 right-4 flex gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                      <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="h-10 w-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center text-white hover:bg-primary transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(p.id)} className="h-10 w-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center text-white hover:bg-rose-500 transition-all"><Trash2 size={16} /></button>
                   </div>
                   <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                      <div className="space-y-1">
                         <span className="bg-primary/20 text-primary text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-primary/20">SKU: {p.sku || 'N/A'}</span>
                         <h3 className="text-lg font-black text-white italic tracking-tight line-clamp-1 truncate">{p.name}</h3>
                      </div>
                      <div className="text-right">
                         <p className="text-2xl font-black text-white italic">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}</p>
                      </div>
                   </div>
                </div>
                <div className="p-6 flex items-center justify-between border-t border-white/5">
                   <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full", p.stock_quantity > 5 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]")} />
                      <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">{p.stock_quantity} un disponíveis</span>
                   </div>
                   <div className="flex -space-x-2">
                      {[1,2,3].map(i => <div key={i} className="h-6 w-6 rounded-full border-2 border-[#0c0c0c] bg-white/5 flex items-center justify-center text-[8px] font-bold text-white/20 italic">A{i}</div>)}
                   </div>
                </div>
             </div>
           ))}
        </div>
      ) : (
        <div className="glass-card !p-0 overflow-hidden">
           <table className="w-full text-left">
              <thead className="border-b border-white/5 bg-white/[0.02]">
                 <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-white/30 tracking-widest">Produto</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-white/30 tracking-widest">SKU</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-white/30 tracking-widest text-right">Preço</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-white/30 tracking-widest text-center">Unidades</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase text-white/30 tracking-widest text-right">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {filteredProducts.map(p => (
                   <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-4">
                         <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-white/5 overflow-hidden"><img src={getProxyUrl(p.image_url)} className="w-full h-full object-cover" /></div>
                            <span className="font-black text-white uppercase tracking-tight italic">{p.name}</span>
                         </div>
                      </td>
                      <td className="px-8 py-4"><span className="text-xs font-mono font-bold text-white/30">{p.sku || '---'}</span></td>
                      <td className="px-8 py-4 text-right font-black text-white italic">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}</td>
                      <td className="px-8 py-4 text-center">
                         <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", p.stock_quantity > 5 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500")}>
                            {p.stock_quantity} un
                         </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                         <div className="flex justify-end gap-2">
                            <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="h-10 w-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-primary transition-all"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(p.id)} className="h-10 w-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-white/30 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                         </div>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}
