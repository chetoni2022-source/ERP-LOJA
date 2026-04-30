import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { UserCircle2, Plus, Trash2, Edit2, Loader2, Search, Phone, Mail, ShoppingBag, X, ChevronRight, MessageCircle, ArrowLeft } from 'lucide-react';

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
      toastError('Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, [user.id, toastError]);

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
        success('Cliente atualizado!');
      } else {
        await supabase.from('customers').insert([{ ...form, user_id: user.id }]);
        success('Cliente cadastrado!');
      }
      setModalOpen(false);
      fetchCustomers();
    } catch {
      toastError('Erro ao salvar cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Remover "${c.full_name}" do cadastro?`)) return;
    await supabase.from('customers').delete().eq('id', c.id);
    success('Cliente removido.');
    if (selectedCustomer?.id === c.id) setSelectedCustomer(null);
    fetchCustomers();
  };

  const openHistory = async (c: Customer) => {
    setSelectedCustomer(c);
    setSalesLoading(true);
    const { data } = await supabase
      .from('sales')
      .select('*, products(name, image_url)')
      .eq('user_id', user.id)
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-5 animate-in fade-in duration-300 pb-20">
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${selectedCustomer ? 'hidden md:flex' : ''}`}>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-0.5 flex items-center gap-2">
            <UserCircle2 className="text-primary hidden md:inline" /> Clientes
          </h1>
          <p className="text-sm text-muted-foreground">Cadastro completo com histórico de compras de cada cliente.</p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto py-5 px-5 font-bold bg-primary hover:bg-primary/90 rounded-xl shadow-md">
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {/* Search - Hidden on mobile if customer selected */}
      <div className={`relative ${selectedCustomer ? 'hidden md:block' : ''}`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail..." className="pl-10 h-11 bg-card" />
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        {/* Customer List */}
        <div className={`bg-card border border-border rounded-xl shadow-sm overflow-hidden ${selectedCustomer ? 'md:col-span-2 hidden md:block' : 'md:col-span-5'}`}>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-primary/50" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <UserCircle2 className="h-10 w-10 opacity-20 mx-auto mb-3" />
              <span className="font-bold block">Nenhum cliente encontrado</span>
              {!search && <p className="text-xs mt-1">Clique em "Novo Cliente" para começar.</p>}
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map(c => (
                <div
                  key={c.id}
                  onClick={() => openHistory(c)}
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-muted/30 ${selectedCustomer?.id === c.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="font-black text-primary text-sm">{c.full_name[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{c.full_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.phone || c.email || 'Sem contato'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-xs text-primary">{fmt(c.total_spent || 0)}</p>
                    <p className="text-[10px] text-muted-foreground">{c.purchase_count} compra{c.purchase_count !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Detail / History */}
        {selectedCustomer && (
          <div className="md:col-span-3 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 min-h-[60vh]">
            <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button onClick={() => setSelectedCustomer(null)} className="h-9 w-9 p-0 bg-muted hover:bg-primary/10 hover:text-primary sm:hidden shrink-0 border border-border">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20 shrink-0">
                  <span className="font-black text-primary text-base">{selectedCustomer.full_name[0].toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{selectedCustomer.full_name}</h3>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {selectedCustomer.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{selectedCustomer.phone}</span>}
                    {selectedCustomer.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{selectedCustomer.email}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                {selectedCustomer.phone && (
                  <Button 
                    onClick={() => {
                        const tel = selectedCustomer.phone?.replace(/\D/g, '');
                        const msg = encodeURIComponent(`Olá ${selectedCustomer.full_name}! Vim te avisar que chegou novidades Laris Acessórios e separei um mimo de 5% off para você.`);
                        window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
                    }}
                    className="h-8 px-2.5 flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20b858] text-white border-none shadow-md transition-all active:scale-95"
                    title="Disparar Oferta de Revenda"
                  >
                     <MessageCircle className="h-3.5 w-3.5" /> <span className="text-[10px] uppercase font-black tracking-widest hidden sm:inline">Zap Oferta</span>
                  </Button>
                )}
                <Button onClick={() => openEdit(selectedCustomer)} className="h-8 w-8 px-0 bg-muted border border-border text-foreground hover:bg-teal-500/10 hover:text-teal-600 transition-colors">
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button onClick={() => handleDelete(selectedCustomer)} className="h-8 w-8 px-0 bg-muted border border-border text-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button onClick={() => setSelectedCustomer(null)} className="h-8 w-8 px-0 bg-muted border border-border text-foreground hover:bg-muted/80 transition-colors sm:flex hidden">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 border-b border-border">
              <div className="bg-muted/30 rounded-lg p-3 border border-border text-center">
                <p className="font-black text-lg text-primary">{fmt(selectedCustomer.total_spent || 0)}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Gasto</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 border border-border text-center">
                <p className="font-black text-lg text-foreground">{selectedCustomer.purchase_count}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Compras</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-3 border-b border-border">
                <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" /> Histórico de Compras
                </h4>
              </div>
              {salesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin h-5 w-5 text-primary/50" /></div>
              ) : customerSales.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">Nenhuma compra registrada ainda.</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {customerSales.map(sale => (
                    <div key={sale.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-9 w-9 rounded-lg bg-muted overflow-hidden shrink-0">
                        {(sale.products as any)?.image_url ? (
                          <img src={(sale.products as any).image_url} alt="" className="w-full h-full object-cover" />
                        ) : <ShoppingBag className="w-full h-full p-2 text-muted-foreground/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">{(sale.products as any)?.name || 'Produto excluído'}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(sale.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })} · {sale.quantity} un
                        </p>
                      </div>
                      <p className="font-black text-sm text-primary shrink-0">{fmt(sale.total_price)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border z-10 flex flex-col max-h-[calc(100svh-80px)] sm:max-h-[85vh] mb-16 sm:mb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 overflow-hidden">
            <div className="px-5 py-4 border-b border-border shrink-0 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome Completo *</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Maria Carolina Silva" className="mt-1.5 h-12" autoFocus />
              </div>
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" className="mt-1.5 h-12" inputMode="tel" />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" className="mt-1.5 h-12" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações</Label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Preferências, ocasiões especiais, presente frequente..."
                  className="mt-1.5 w-full h-24 px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-medium text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border bg-card/95 backdrop-blur-sm flex gap-3 shrink-0">
              <Button onClick={() => setModalOpen(false)} className="flex-1 h-12 bg-muted text-foreground border border-border hover:bg-muted/80 font-bold rounded-xl">Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.full_name.trim()}
                className="flex-1 h-12 font-black bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-widest text-xs shadow-md active:scale-95 transition-all rounded-xl disabled:opacity-40"
              >
                {saving ? <Loader2 className="animate-spin h-4 w-4" /> : editingId ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
