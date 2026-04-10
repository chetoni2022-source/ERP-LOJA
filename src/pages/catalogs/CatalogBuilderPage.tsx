import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Label } from '../../components/ui';
import { 
  Plus, Edit2, Trash2, Globe, Layout, Palette, 
  Eye, Share2, Copy, Check, Loader2, Sparkles, 
  Zap, ShieldCheck, ArrowUpRight, Search, Package,
  Smartphone, Monitor, Laptop, Image as ImageIcon
} from 'lucide-react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default function CatalogBuilderPage() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    theme: 'luxury',
    settings: {
      hide_out_of_stock: false,
      show_prices: true,
      order_whatsapp: true
    }
  });

  useEffect(() => { if (user) fetchCatalogs(); }, [user]);

  async function fetchCatalogs() {
    setLoading(true);
    try {
      const { data } = await supabase.from('catalogs').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
      setCatalogs(data || []);
    } catch (err: any) { toastError(err.message); }
    finally { setLoading(false); }
  }

  const handleSave = async () => {
    if (!form.name || !form.slug || !user) return;
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from('catalogs').update(form).eq('id', editingId);
        success('Vitrine digital atualizada.');
      } else {
        await supabase.from('catalogs').insert([{ ...form, user_id: user.id }]);
        success('Nova vitrine lançada no ecossistema.');
      }
      setIsModalOpen(false);
      fetchCatalogs();
    } catch (err: any) { toastError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta vitrine e remover o link público?')) return;
    try {
      await supabase.from('catalogs').delete().eq('id', id);
      setCatalogs(catalogs.filter(c => c.id !== id));
      success('Link público desativado.');
    } catch (err: any) { toastError(err.message); }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/v/${slug}`;
    navigator.clipboard.writeText(url);
    success('URL da vitrine copiada!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 🏁 Aura Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 lg:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1.5"><Globe size={10} /> Distribuição Global</span>
            <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Aura Workspace v2.0.0</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-white">Vitrines <span className="text-primary italic">Digitais</span></h1>
          <p className="text-muted-foreground font-medium text-sm lg:text-base max-w-2xl">
            Crie experiências de compra imersivas e distribua seus produtos através de links públicos de alta performance.
          </p>
        </div>
        
        <button onClick={() => { setEditingId(null); setForm({name:'', slug:'', description:'', theme:'luxury', settings:{hide_out_of_stock:false, show_prices:true, order_whatsapp:true}}); setIsModalOpen(true); }} className="ux-button h-14 px-8 bg-primary text-white shadow-xl shadow-primary/20 text-[13px] uppercase tracking-widest gap-3 active:scale-95 transition-all">
          <Plus size={20} strokeWidth={3} /> Gerar Nova Vitrine
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
         {/* 🏛 Catalog Matrix */}
         <div className="lg:col-span-8 space-y-6">
            <div className="relative group">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-primary transition-colors" size={18} />
               <Input placeholder="Pesquisar vitrines ativas..." className="ux-input h-16 pl-16 !bg-white/5 border-white/5 font-bold text-lg" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
               {loading ? (
                 <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-white/20"><Loader2 className="animate-spin" /> <span className="text-[10px] font-black uppercase tracking-widest italic">Sincronizando Links Públicos...</span></div>
               ) : catalogs.length === 0 ? (
                 <div className="col-span-full py-20 glass-card text-center grayscale opacity-30 space-y-4">
                    <Layout size={64} className="mx-auto text-white/10" />
                    <p className="text-[11px] font-black uppercase tracking-widest">Nenhuma vitrine digital ativa</p>
                 </div>
               ) : (
                 catalogs.map((c, i) => (
                   <div key={c.id} className="glass-card p-0 group overflow-hidden hover:border-primary/30 transition-all animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="p-8 space-y-6 relative">
                         <div className="absolute top-0 right-0 p-8 text-white/[0.02] -mr-12 -mt-12 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-700"><Globe size={160} /></div>
                         
                         <div className="flex justify-between items-start">
                            <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-primary group-hover:text-white group-hover:bg-primary transition-all shadow-xl shadow-primary/5"><Layout size={24} /></div>
                            <div className="flex gap-2">
                               <button onClick={() => { setEditingId(c.id); setForm({name:c.name, slug:c.slug, description:c.description||'', theme:c.theme||'luxury', settings:c.settings || form.settings}); setIsModalOpen(true); }} className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/20 hover:text-white transition-all"><Edit2 size={16} /></button>
                               <button onClick={() => handleDelete(c.id)} className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/20 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                            </div>
                         </div>

                         <div>
                            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">{c.name}</h3>
                            <div className="flex items-center gap-3">
                               <span className="text-[10px] font-black uppercase text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">Slug: {c.slug}</span>
                               <span className="text-[9px] font-black uppercase text-white/20 tracking-widest italic">{c.theme || 'Luxury Theme'}</span>
                            </div>
                         </div>

                         <div className="pt-4 flex flex-col gap-3">
                            <button onClick={() => copyLink(c.slug)} className="ux-button h-12 w-full bg-white/5 border border-white/5 text-white font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-white hover:text-black transition-all">
                               <Copy size={14} /> Copiar Link Público
                            </button>
                            <a href={`/v/${c.slug}`} target="_blank" className="ux-button h-12 w-full bg-primary/10 border border-primary/20 text-primary font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-primary hover:text-white transition-all">
                               <Eye size={14} /> Visualizar Vitrine <ArrowUpRight size={12} />
                            </a>
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>
         </div>

         {/* 🎨 Theme Selector Preview */}
         <div className="lg:col-span-4 space-y-6">
            <h3 className="text-[11px] font-black uppercase text-white/20 tracking-[0.3em] font-mono px-4">Workspace Environment • Config</h3>
            <div className="glass-card p-10 space-y-10 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 text-white/[0.02] -mr-16 -mt-16 rotate-12 pointer-events-none"><Palette size={280} /></div>
               
               <div className="space-y-6 relative z-10">
                  <h3 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3 border-b border-white/5 pb-6">Design Engines</h3>
                  <div className="grid grid-cols-2 gap-4">
                     {[
                       { id: 'luxury', name: 'Black Aura', colors: 'from-black to-zinc-800' },
                       { id: 'rose', name: 'Rosé Quartz', colors: 'from-rose-50 to-rose-100' },
                       { id: 'midnight', name: 'Deep Sea', colors: 'from-[#050a12] to-blue-900' },
                       { id: 'pearl', name: 'Silk Pearl', colors: 'from-zinc-50 to-stone-200' },
                     ].map(t => (
                       <div key={t.id} className="group cursor-pointer">
                          <div className={cn("h-24 w-full rounded-2xl border-4 transition-all bg-gradient-to-br", t.colors, form.theme === t.id ? "border-primary shadow-xl shadow-primary/20 scale-105" : "border-white/5 group-hover:border-white/10")} />
                          <p className="text-[10px] font-black uppercase text-center mt-3 tracking-widest text-white/40 group-hover:text-white">{t.name}</p>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="space-y-6 relative z-10 border-t border-white/5 pt-10">
                  <h3 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">Protocolos Globais</h3>
                  <div className="space-y-4">
                     {[
                       { id: 'hide_out_of_stock', label: 'Auto-hide Falta de Estoque' },
                       { id: 'show_prices', label: 'Exibir Precificação Pública' },
                       { id: 'order_whatsapp', label: 'Integração Checkout WhatsApp' },
                     ].map(opt => (
                       <div key={opt.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">{opt.label}</span>
                          <div className="h-5 w-10 bg-primary/20 rounded-full flex items-center px-1">
                             <div className="h-3 w-3 bg-primary rounded-full shadow-lg shadow-primary/50" />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
