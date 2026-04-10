import { useState, useEffect } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { 
  Plus, Trash2, Edit2, Loader2, Tag, LayoutPanelLeft, 
  X, Check, Search, ShieldCheck, Sparkles, Zap, ChevronRight, Package
} from 'lucide-react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default function CategoriesPage() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { if (user) fetchCategories(); }, [user]);

  async function fetchCategories() {
    setLoading(true);
    try {
      const { data } = await supabase.from('categories').select('*').eq('user_id', user?.id).order('name');
      setCategories(data || []);
    } catch (err: any) { toastError(err.message); }
    finally { setLoading(false); }
  }

  const handleSave = async () => {
    if (!form.name.trim() || !user) return;
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from('categories').update(form).eq('id', editingId);
        success('Entidade atualizada no catálogo.');
      } else {
        await supabase.from('categories').insert([{ ...form, user_id: user.id }]);
        success('Nova categoria federada.');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err: any) { toastError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta categoria? Os produtos não serão removidos, mas ficarão sem categoria.')) return;
    try {
      await supabase.from('categories').delete().eq('id', id);
      setCategories(categories.filter(c => c.id !== id));
      success('Categoria removida do ecossistema.');
    } catch (err: any) { toastError(err.message); }
  };

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 🏁 Aura Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 lg:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1.5"><Tag size={10} /> Arquitetura de Ativos</span>
            <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Aura Workspace</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-white">Gestão de <span className="text-primary italic">Departamentos</span></h1>
          <p className="text-muted-foreground font-medium text-sm lg:text-base max-w-2xl">
            Estruture seu catálogo público por categorias lógicas para otimizar a experiência de compra dos seus clientes.
          </p>
        </div>
        
        <button onClick={() => { setEditingId(null); setForm({ name: '', description: '' }); setModalOpen(true); }} className="ux-button h-14 px-8 bg-primary text-white shadow-xl shadow-primary/20 text-[13px] uppercase tracking-widest gap-3">
          <Plus size={20} strokeWidth={3} /> Nova Categoria
        </button>
      </div>

      {/* 🔍 Search Command Matrix */}
      <div className="relative group">
         <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-primary transition-colors" size={18} />
         <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Comando de busca rápida..." className="ux-input h-16 pl-16 !bg-white/5 border-white/5 font-bold text-lg" />
      </div>

      {/* 📊 Categories Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {loading ? (
           <div className="col-span-full py-24 flex flex-col items-center justify-center gap-4 text-white/20"><Loader2 className="animate-spin" /> <span className="text-[10px] font-black uppercase tracking-widest italic">Sincronizando Departamentos...</span></div>
         ) : filtered.length === 0 ? (
           <div className="col-span-full py-24 glass-card text-center grayscale opacity-30 space-y-4">
              <LayoutPanelLeft size={64} className="mx-auto text-white/10" />
              <p className="text-[11px] font-black uppercase tracking-widest italic">Nenhuma entidade de categoria detectada</p>
           </div>
         ) : (
           filtered.map((c, i) => (
             <div key={c.id} className="glass-card p-0 group overflow-hidden border-white/5 hover:border-primary/20 transition-all animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="p-8 space-y-4 relative">
                   <div className="absolute top-0 right-0 p-8 text-white/[0.02] -mr-12 -mt-12 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-700"><Tag size={160} /></div>
                   <div className="flex justify-between items-start">
                      <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-primary group-hover:text-white group-hover:bg-primary transition-all"><Tag size={20} /></div>
                      <div className="flex gap-2">
                         <button onClick={() => { setEditingId(c.id); setForm({ name: c.name, description: c.description || '' }); setModalOpen(true); }} className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/20 hover:text-white transition-all"><Edit2 size={16} /></button>
                         <button onClick={() => handleDelete(c.id)} className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/20 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                      </div>
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-1">{c.name}</h3>
                      <p className="text-white/30 text-[11px] font-medium leading-relaxed italic line-clamp-2">"{c.description || 'Nenhuma descrição federada para este departamento.'}"</p>
                   </div>
                   <div className="pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                         <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">Ativo no Workspace</span>
                      </div>
                      <button className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2 hover:brightness-125 transition-all">Ver Itens <ChevronRight size={12} /></button>
                   </div>
                </div>
             </div>
           ))
         )}
      </div>

      {/* 🎭 Command Modal (Category Create/Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="glass-card w-full max-w-lg rounded-[40px] shadow-2xl border border-white/10 p-10 animate-in zoom-in-95 duration-500 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 text-white/[0.02] pointer-events-none -mr-16 -mt-16 rotate-12 opacity-50"><Tag size={320} /></div>
             
             <button onClick={() => setModalOpen(false)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"><X size={24} /></button>
             
             <div className="mb-10">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">{editingId ? 'Refinar Departamento' : 'Nova Célula Lógica'}</h3>
                <p className="text-white/40 text-sm font-medium italic">Defina as bases lógicas para organização dos seus ativos.</p>
             </div>

             <div className="space-y-6 relative z-10">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Nome da Categoria *</Label>
                   <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Coleção Inverno 2.0" className="ux-input h-14 !bg-white/5 font-black text-lg" autoFocus />
                </div>
                
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Dossiê e Descrição</Label>
                   <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Atributos e detalhes desta categoria para a vitrine pública..." className="w-full h-32 px-6 py-4 rounded-3xl border border-white/5 bg-white/5 text-sm font-medium text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
                </div>

                <div className="flex gap-4 pt-6">
                   <button onClick={() => setModalOpen(false)} className="h-16 flex-1 bg-white/5 text-white/40 font-black uppercase text-[12px] tracking-widest rounded-3xl border border-white/5 hover:text-white transition-all">Cancelar</button>
                   <button onClick={handleSave} disabled={saving || !form.name.trim()} className="ux-button h-16 flex-[2] bg-primary text-white font-black uppercase text-[12px] tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all">
                      {saving ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" size={18} strokeWidth={3} />}
                      {saving ? 'Codificando...' : 'Confirmar Registro'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
