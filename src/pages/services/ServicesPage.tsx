import { useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Clock3, Edit2, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { Button, Input, Label } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../contexts/ToastContext';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number | null;
  duration_minutes: number | null;
  active: boolean;
  created_at: string;
}

const fmt = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export default function ServicesPage() {
  const { user } = useAuthStore();
  const { tenantId } = useTenant();
  const { success, error: toastError } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    cost_price: '',
    duration_minutes: '',
    active: true,
  });

  const fetchServices = useCallback(async () => {
    if (!tenantId) {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (error) {
      toastError('Erro ao carregar serviços.');
    } else {
      setServices(data || []);
    }
    setLoading(false);
  }, [tenantId, toastError]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchServices();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchServices]);

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter((service) =>
      service.name.toLowerCase().includes(q) ||
      service.description?.toLowerCase().includes(q)
    );
  }, [services, search]);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      price: '',
      cost_price: '',
      duration_minutes: '',
      active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description || '',
      price: String(service.price ?? ''),
      cost_price: service.cost_price == null ? '' : String(service.cost_price),
      duration_minutes: service.duration_minutes == null ? '' : String(service.duration_minutes),
      active: service.active,
    });
    setModalOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantId || !user?.id) {
      toastError('Empresa não identificada.');
      return;
    }
    if (!form.name.trim()) {
      toastError('Informe o nome do serviço.');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price || 0),
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      active: form.active,
      tenant_id: tenantId,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = editing
      ? await supabase.from('services').update(payload).eq('id', editing.id).eq('tenant_id', tenantId)
      : await supabase.from('services').insert([payload]);

    setSaving(false);
    if (error) {
      toastError(error.message || 'Erro ao salvar serviço.');
      return;
    }

    success(editing ? 'Serviço atualizado!' : 'Serviço cadastrado!');
    setModalOpen(false);
    fetchServices();
  };

  const handleDelete = async (service: Service) => {
    if (!tenantId || !confirm(`Excluir o serviço "${service.name}"?`)) return;
    const { error } = await supabase.from('services').delete().eq('id', service.id).eq('tenant_id', tenantId);
    if (error) {
      toastError('Erro ao excluir serviço.');
      return;
    }
    success('Serviço removido.');
    fetchServices();
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
            <BriefcaseBusiness className="text-primary hidden md:inline" /> Serviços
          </h1>
          <p className="text-sm text-muted-foreground">Cadastre mão de obra, pacotes, diagnósticos e serviços vendidos pela empresa.</p>
        </div>
        <Button onClick={openNew} className="h-11 px-5 font-bold bg-primary text-primary-foreground rounded-xl shadow-md">
          <Plus className="mr-2 h-4 w-4" /> Novo Serviço
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar serviço..."
          className="pl-10 h-11 bg-card"
        />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          <BriefcaseBusiness className="h-12 w-12 opacity-20 mx-auto mb-3" />
          <p className="font-bold">Nenhum serviço cadastrado.</p>
          <p className="text-sm mt-1">Use o botão acima para criar o primeiro serviço da empresa.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-black text-base text-foreground truncate">{service.name}</h2>
                    {!service.active && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                        Inativo
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <div className="rounded-lg bg-muted/30 border border-border p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preço</p>
                  <p className="font-black text-primary">{fmt(service.price)}</p>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Duração</p>
                  <p className="font-black text-foreground flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                    {service.duration_minutes ? `${service.duration_minutes} min` : 'Livre'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <Button onClick={() => openEdit(service)} className="flex-1 h-9 bg-muted border border-border text-foreground hover:bg-muted/80">
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Editar
                </Button>
                <Button onClick={() => handleDelete(service)} className="h-9 w-9 px-0 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <form
            onSubmit={handleSave}
            className="relative bg-card w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border z-10 overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-black text-lg text-foreground">{editing ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Ex: Troca de óleo, alinhamento, diagnóstico"
                  className="mt-1.5 h-12"
                  autoFocus
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Detalhes do serviço, peças inclusas ou observações..."
                  className="mt-1.5 w-full h-24 px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-medium text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label>Preço de venda</Label>
                  <Input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} className="mt-1.5 h-12" />
                </div>
                <div>
                  <Label>Custo estimado</Label>
                  <Input type="number" min="0" step="0.01" value={form.cost_price} onChange={(event) => setForm((prev) => ({ ...prev, cost_price: event.target.value }))} className="mt-1.5 h-12" />
                </div>
                <div>
                  <Label>Duração (min)</Label>
                  <Input type="number" min="0" step="1" value={form.duration_minutes} onChange={(event) => setForm((prev) => ({ ...prev, duration_minutes: event.target.value }))} className="mt-1.5 h-12" />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-border bg-muted/20 p-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-bold text-foreground">Serviço ativo para venda</span>
              </label>
            </div>

            <div className="p-4 border-t border-border flex gap-3">
              <Button type="button" onClick={() => setModalOpen(false)} className="flex-1 h-12 bg-muted border border-border text-foreground hover:bg-muted/80">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !form.name.trim()} className="flex-1 h-12 bg-primary text-primary-foreground font-black">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
