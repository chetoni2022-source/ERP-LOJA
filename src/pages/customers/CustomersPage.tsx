import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { UserCircle2, Plus, Trash2, Edit2, Loader2, Search, Phone, Mail, ShoppingBag, X, ChevronRight, MessageCircle, UserCheck, Star, Zap, Target, ArrowUpRight, History, CreditCard, Filter } from 'lucide-react';

interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  total_spent?: number;
  purchase_count?: number;
}

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default function CustomersPage() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', notes: '' });

  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: custs } = await supabase.from('customers').select('*').eq('user_id', user.id).order('full_name');
      const { data: salesData } = await supabase.from('sales').select('customer_id, total_price').eq('user_id', user.id);

      const enriched = (custs || []).map(c => {
        const custSales = (salesData || []).filter(s => s.customer_id === c.id);
        return {
          ...c,
          total_spent: custSales.reduce((a, s) => a + s.total_price, 0),
          purchase_count: custSales.length,
        };
      });
      setCustomers(enriched);
    } catch {
      toastError('Erro ao carregar ecossistema de clientes.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openNew = () => {
    setEditingId(null);
    setForm({ full_name: '', phone: '', email: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({ full_name: c.full_name, phone: c.phone || '', email: c.email || '', notes: c.notes || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !user) return;
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from('customers').update({ ...form }).eq('id', editingId);
        success('Perfil atualizado!');
      } else {
        await supabase.from('customers').insert([{ ...form, user_id: user.id }]);
        success('Novo cliente cadastrado!');
      }
      setModalOpen(false);
      fetchCustomers();
    } catch {
      toastError('Erro ao salvar no banco.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Remover "${c.full_name}" permanentemente?`)) return;
    await supabase.from('customers').delete().eq('id', c.id);
    success('Registro removido.');
    if (selectedCustomer?.id === c.id) setSelectedCustomer(null);
    fetchCustomers();
  };

  const openHistory = async (c: Customer) => {
    setSelectedCustomer(c);
    setSalesLoading(true);
    const { data } = await supabase
      .from('sales')
      .select('*, products(name, image_url)')
      .eq('user_id', user?.id)
      .eq('customer_id', c.id)
      .order('created_at', { ascending: false });
    setCustomerSales(data || []);
    setSalesLoading(false);
  };

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 🏁 Aura Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 lg:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1.5"><UserCheck size={10} /> Ecossistema Elo</span>
            <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Aura Workspace</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-white italic">Gestão de <span className="text-primary">Clientes</span></h1>
          <p className="text-muted-foreground font-medium text-sm lg:text-base max-w-2xl">
            Visualize o ROI por cliente, gerencie históricos e dispare campanhas de recompra.
          </p>
        </div>
        
        <button onClick={openNew} className="ux-button h-14 px-8 bg-primary text-white shadow-xl shadow-primary/20 text-[13px] uppercase tracking-widest gap-3">
          <Plus size={20} strokeWidth={3} /> Cadastrar Comprador
        </button>
      </div>

      {/* 🔍 Search Command Matrix */}
      <div className="flex flex-col md:flex-row gap-4">
         <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-primary transition-colors" size={18} />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Comando de busca: Nome, WhatsApp ou E-mail..." className="ux-input h-16 pl-16 !bg-white/5 border-white/5 font-bold text-lg" />
         </div>
         <button className="ux-button h-16 px-8 bg-white/5 border border-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest gap-2 hover:text-white">
            <Filter size={14} /> Filtro Avançado
         </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4 duration-500">
         {/* 👥 CRM Matrix List */}
         <div className={cn("glass-card !p-0 overflow-hidden lg:col-span-5 transition-all duration-700", selectedCustomer ? "lg:col-span-4" : "lg:col-span-12")}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
               <h3 className="text-[10px] font-black uppercase text-white/30 tracking-widest flex items-center gap-2 italic"><Zap size={14} className="text-primary" /> Matriz de Relacionamento</h3>
               <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Total: {filtered.length} Ativos</span>
            </div>
            {loading ? (
               <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/20"><Loader2 className="animate-spin" /> <span className="text-[10px] font-black uppercase tracking-widest">Carregando Elo...</span></div>
            ) : filtered.length === 0 ? (
               <div className="py-20 text-center space-y-4 grayscale opacity-40">
                  <UserCircle2 size={64} className="mx-auto text-white/10" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/20">Célula de clientes vazia</p>
               </div>
            ) : (
               <div className="divide-y divide-white/5 max-h-[700px] overflow-y-auto no-scrollbar">
                  {filtered.map(c => {
                    const isVip = (c.total_spent || 0) > 2000;
                    return (
                      <div key={c.id} onClick={() => openHistory(c)} className={cn("flex items-center gap-6 px-8 py-6 cursor-pointer transition-all hover:bg-white/[0.03] group relative", selectedCustomer?.id === c.id && "bg-primary/[0.05] border-l-4 border-primary shadow-inner")}>
                         <div className="relative">
                            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all", selectedCustomer?.id === c.id ? "bg-primary text-white shadow-xl shadow-primary/20 rotate-12" : "bg-white/5 text-white/30 group-hover:text-primary")}>
                               {c.full_name[0].toUpperCase()}
                            </div>
                            {isVip && <div className="absolute -top-2 -right-2 h-6 w-6 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg border-2 border-[#0c0c0c]"><Star size={10} className="text-white fill-white" /></div>}
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                               <p className="text-[14px] font-black text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors">{c.full_name}</p>
                               {isVip && <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-amber-500/20">VIP</span>}
                            </div>
                            <p className="text-[11px] font-bold text-white/30 truncate mt-0.5 uppercase tracking-widest">{c.phone || c.email || 'ELO INCOMPLETO'}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[15px] font-black text-white italic">{fmt(c.total_spent || 0)}</p>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-0.5">{c.purchase_count} PEDIDOS</p>
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 transition-all ml-2"><ChevronRight size={16} className="text-primary" /></div>
                      </div>
                    );
                  })}
               </div>
            )}
         </div>

         {/* 💎 Individual Customer Profile */}
         {selectedCustomer && (
            <div className="lg:col-span-8 glass-card !p-0 overflow-hidden flex flex-col animate-in slide-in-from-right-4 duration-500">
               {/* Detail Header */}
               <div className="p-10 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 text-white/5 -mr-16 -mt-16 rotate-12 pointer-events-none"><UserCircle2 size={240} /></div>
                  
                  <div className="flex items-center gap-8 relative z-10">
                     <div className="h-24 w-24 rounded-[32px] bg-primary flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-primary/30 shrink-0">
                        {selectedCustomer.full_name[0].toUpperCase()}
                     </div>
                     <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-tighter">Cliente Registrado</span>
                           <span className="text-white/20 text-[10px] uppercase font-bold tracking-widest italic">{new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">{selectedCustomer.full_name}</h2>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-white/40 pt-2">
                           {selectedCustomer.phone && <span className="text-[11px] font-black flex items-center gap-2 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-xl border border-white/5"><Phone size={14} className="text-primary" /> {selectedCustomer.phone}</span>}
                           {selectedCustomer.email && <span className="text-[11px] font-black flex items-center gap-2 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-xl border border-white/5"><Mail size={14} className="text-primary" /> {selectedCustomer.email}</span>}
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-3 relative z-10">
                     {selectedCustomer.phone && (
                        <button onClick={() => {
                           const tel = selectedCustomer.phone?.replace(/\D/g, '');
                           const msg = encodeURIComponent(`Olá ${selectedCustomer.full_name}! Preparamos novidades exclusivas que combinam com seu estilo. Confira aqui na Laris.`);
                           window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
                        }} className="ux-button h-16 px-8 bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 text-[12px] uppercase tracking-widest gap-3 active:scale-95 transition-all">
                           <MessageCircle size={20} /> Zap Campanha
                        </button>
                     )}
                     <button onClick={() => openEdit(selectedCustomer)} className="h-16 w-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all"><Edit2 size={22} /></button>
                     <button onClick={() => handleDelete(selectedCustomer)} className="h-16 w-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-red-500 transition-all"><Trash2 size={22} /></button>
                     <button onClick={() => setSelectedCustomer(null)} className="h-16 w-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20 hover:text-white transition-all"><X size={22} /></button>
                  </div>
               </div>

               {/* Performance Metrics */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-10 bg-white/[0.01]">
                  <div className="glass-card p-8 border-none !bg-white/5 space-y-2 group">
                     <div className="flex items-center justify-between text-white/20 group-hover:text-primary transition-colors"><Target size={20} /> <ArrowUpRight size={16} /></div>
                     <p className="text-3xl font-black text-white italic">{fmt(selectedCustomer.total_spent || 0)}</p>
                     <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Ticket Vitalício</p>
                  </div>
                  <div className="glass-card p-8 border-none !bg-white/5 space-y-2 group">
                     <div className="flex items-center justify-between text-white/20 group-hover:text-primary transition-colors"><ShoppingBag size={20} /> <ArrowUpRight size={16} /></div>
                     <p className="text-3xl font-black text-white italic">{selectedCustomer.purchase_count}</p>
                     <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Frequência Compra</p>
                  </div>
                  <div className="glass-card p-8 border-none !bg-white/5 space-y-2 group">
                     <div className="flex items-center justify-between text-white/20 group-hover:text-primary transition-colors"><CreditCard size={20} /> <ArrowUpRight size={16} /></div>
                     <p className="text-3xl font-black text-white italic">{fmt((selectedCustomer.total_spent || 0) / (selectedCustomer.purchase_count || 1))}</p>
                     <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Média p/ Pedido</p>
                  </div>
               </div>

               {/* Timeline History */}
               <div className="p-10 flex-1 space-y-8 overflow-y-auto no-scrollbar">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-3 italic"><History size={16} className="text-primary" /> Linha do Tempo de Interação</h4>
                  
                  {salesLoading ? (
                     <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
                  ) : customerSales.length === 0 ? (
                     <div className="py-20 text-center text-white/10 italic text-sm">Ainda não há registros de transações para este comprador.</div>
                  ) : (
                     <div className="space-y-4">
                        {customerSales.map(sale => (
                           <div key={sale.id} className="glass-card p-6 flex items-center gap-6 border-white/5 hover:border-primary/20 transition-all group">
                              <div className="h-16 w-16 rounded-2xl bg-black overflow-hidden shrink-0 border border-white/5">
                                 {sale.products?.image_url ? (
                                    <img src={sale.products.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                 ) : <ShoppingBag className="w-full h-full p-4 text-white/5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-black text-white uppercase tracking-tight truncate">{sale.products?.name || 'Item do Catálogo'}</p>
                                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
                                    {new Date(sale.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })} — Transação #{sale.id.slice(0,5)}
                                 </p>
                              </div>
                              <div className="text-right">
                                 <p className="text-lg font-black text-primary italic">{fmt(sale.total_price)}</p>
                                 <span className="text-[9px] font-black text-white/20 uppercase">{sale.quantity} UNIDADES</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         )}
      </div>

      {/* 🎭 Command Modal (Create/Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="glass-card w-full max-w-xl rounded-[40px] shadow-2xl border border-white/10 p-10 animate-in zoom-in-95 duration-500 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 text-white/[0.02] pointer-events-none -mr-16 -mt-16 rotate-12 bg-white/5 blur-3xl" />
             
             <button onClick={() => setModalOpen(false)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"><X size={24} /></button>
             
             <div className="mb-10">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">{editingId ? 'Refinar Cadastro' : 'Novo Elo de Venda'}</h3>
                <p className="text-white/40 text-sm font-medium italic">Preencha os dados fundamentais para iniciar o rastreamento de compras.</p>
             </div>

             <div className="space-y-6 relative z-10">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Nome Completo do Cliente *</Label>
                   <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ex: Carolina de Oliveira" className="ux-input h-14 !bg-white/5 font-black text-lg" autoFocus />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-white/30 tracking-widest">WhatsApp / Celular</Label>
                      <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(XX) 9XXXX-XXXX" className="ux-input h-14 !bg-white/5 font-black" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-white/30 tracking-widest">E-mail de Contato</Label>
                      <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="cliente@aura.is" className="ux-input h-14 !bg-white/5 font-black" />
                   </div>
                </div>

                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Dossiê e Observações</Label>
                   <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Perfil de compra, datas comemorativas, restrições..." className="w-full h-32 px-6 py-4 rounded-3xl border border-white/5 bg-white/5 text-sm font-medium text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
                </div>

                <div className="flex gap-4 pt-6">
                   <button onClick={() => setModalOpen(false)} className="h-16 flex-1 bg-white/5 text-white/40 font-black uppercase text-[12px] tracking-widest rounded-3xl border border-white/5 hover:text-white transition-all">Cancelar</button>
                   <button onClick={handleSave} disabled={saving || !form.full_name.trim()} className="ux-button h-16 flex-[2] bg-primary text-white font-black uppercase text-[12px] tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all">
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
