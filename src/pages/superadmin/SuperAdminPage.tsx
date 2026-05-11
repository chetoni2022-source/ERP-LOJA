import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import {
  Building2, Plus, Loader2, X, Edit2, Power, PowerOff,
  Users, Package, BarChart3, ExternalLink, ShieldAlert,
  CheckCircle2, AlertTriangle, Clock, RefreshCcw, LogOut,
  Eye, TrendingUp, Calendar, Activity, BriefcaseBusiness
} from 'lucide-react';
import { cn } from '../../components/ui';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial';
  owner_email: string | null;
  last_accessed_at: string | null;
  created_at: string;
  _userCount?: number;
  _productCount?: number;
  _serviceCount?: number;
  _saleCount?: number;
  _usage7d?: number;
  _revenue30d?: number;
  _branding?: { store_name: string | null; logo_url: string | null; primary_color: string | null; } | null;
}

const STATUS_CONFIG = {
  active:    { label: 'Ativo',    icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  suspended: { label: 'Suspenso', icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
  trial:     { label: 'Trial',    icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30' },
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Nunca acessou';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora mesmo';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function TenantModal({ tenant, onClose, onSave }: { tenant: Partial<Tenant> | null; onClose: () => void; onSave: () => void; }) {
  const { user } = useAuthStore();
  const [name, setName] = useState(tenant?.name ?? '');
  const [slug, setSlug] = useState(tenant?.slug ?? '');
  const [ownerEmail, setOwnerEmail] = useState(tenant?.owner_email ?? '');
  const [ownerName, setOwnerName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#a855f7');
  const [status, setStatus] = useState<Tenant['status']>(tenant?.status ?? 'active');
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();
  const isNew = !tenant?.id;

  const handleSlug = (val: string) => setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'));

  const handleSave = async () => {
    if (!name || !slug) { toastError('Preencha nome e slug.'); return; }
    setSaving(true);
    try {
      if (isNew) {
        // 1. Criar o tenant
        const { data: tenantData, error: tenantErr } = await supabase
          .from('tenants')
          .insert([{ name, slug, status, owner_email: ownerEmail || null }])
          .select('id').single();
        if (tenantErr) throw tenantErr;

        // 2. Criar o branding inicial
        await supabase.from('tenant_branding').insert([{
          tenant_id: tenantData.id,
          store_name: name,
          primary_color: primaryColor
        }]);
        await supabase.from('store_settings').insert([{
          tenant_id: tenantData.id,
          store_name: name,
        }]);

        // 3. Registrar convite do dono sem trocar a sessão do super admin.
        if (ownerEmail) {
          await supabase.from('team_invites').insert({
            email: ownerEmail.toLowerCase().trim(),
            role: 'admin',
            invited_by: user?.id ?? null,
            tenant_id: tenantData.id
          });
          await supabase.from('tenants').update({ owner_email: ownerEmail }).eq('id', tenantData.id);
        }
        success(`Empresa "${name}" criada! O dono deve criar a conta usando o e-mail convidado.`);
      } else {
        const { error } = await supabase.from('tenants').update({ name, slug, status, owner_email: ownerEmail || null }).eq('id', tenant!.id);
        if (error) throw error;
        success('Empresa atualizada!');
      }
      onSave(); onClose();
    } catch (err: any) { toastError(err.message || 'Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[#0f0f1a] border border-white/10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="font-black text-lg text-white">{isNew ? '+ Nova Empresa' : 'Editar Empresa'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-white/50">Nome da Empresa *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Bijou & Co." className="h-12 bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-white/50">Slug *</Label>
              <Input value={slug} onChange={e => handleSlug(e.target.value)} placeholder="bijou-eco" className="h-12 bg-white/5 border-white/10 text-white font-mono" />
              <p className="text-[10px] text-white/30">Só letras, números e hífen</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-white/50">E-mail do Responsável</Label>
            <Input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="admin@empresa.com" className="h-12 bg-white/5 border-white/10 text-white" />
          </div>
          {isNew && (
            <>
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-3">
                <p className="text-xs font-black text-purple-400 uppercase tracking-wider">Criar Usuário Admin</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-white/40 font-bold">Nome do Admin</Label>
                    <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Nome" className="h-10 bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-white/40 font-bold">Acesso</Label>
                    <div className="h-10 flex items-center px-3 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/50 font-semibold">O dono cria a senha no cadastro.</div>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-white/50">Cor Primária</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-12 w-12 rounded-xl border border-white/10 cursor-pointer bg-transparent" />
                  <div className="flex-1 h-12 rounded-xl border border-white/10 flex items-center px-4" style={{ background: primaryColor + '20' }}>
                    <span className="font-mono font-bold text-sm" style={{ color: primaryColor }}>{primaryColor}</span>
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-white/50">Status</Label>
            <div className="flex gap-2">
              {(['active', 'trial', 'suspended'] as const).map(s => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button key={s} onClick={() => setStatus(s)} className={cn("flex-1 h-10 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all", status === s ? `${cfg.bg} ${cfg.color}` : 'border-white/10 text-white/30 hover:bg-white/5')}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <Button onClick={onClose} className="flex-1 h-12 bg-white/5 text-white border border-white/10 hover:bg-white/10 font-bold rounded-xl">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !name || !slug} className="flex-1 h-12 font-black bg-purple-600 hover:bg-purple-500 text-white uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all rounded-xl disabled:opacity-40">
            {saving ? <Loader2 className="animate-spin h-4 w-4" /> : isNew ? 'Criar Empresa' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const { user, profile, signOut } = useAuthStore();
  const { error: toastError, success } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, _branding:tenant_branding(store_name, logo_url, primary_color)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const enriched = await Promise.all((data || []).map(async (t: any) => {
        const [{ count: userCount }, { count: productCount }, { count: serviceCount }, { count: saleCount }, { count: usage7d }, revenueRes] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
          supabase.from('services').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
          supabase.from('sales').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
          supabase.from('tenant_usage_events').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id).gte('created_at', since7d),
          supabase.from('sales').select('total_price').eq('tenant_id', t.id).gte('created_at', since30d),
        ]);
        const revenue30d = (revenueRes.data || []).reduce((sum: number, sale: any) => sum + Number(sale.total_price || 0), 0);
        return {
          ...t,
          _branding: Array.isArray(t._branding) ? t._branding[0] : t._branding,
          _userCount: userCount ?? 0,
          _productCount: productCount ?? 0,
          _serviceCount: serviceCount ?? 0,
          _saleCount: saleCount ?? 0,
          _usage7d: usage7d ?? 0,
          _revenue30d: revenue30d,
        };
      }));
      setTenants(enriched);
    } catch (err: any) { toastError('Erro: ' + err.message); }
    finally { setLoading(false); }
  }, [toastError]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const toggleStatus = async (t: Tenant) => {
    const newStatus = t.status === 'active' ? 'suspended' : 'active';
    await supabase.from('tenants').update({ status: newStatus }).eq('id', t.id);
    success(`Empresa ${newStatus === 'active' ? 'reativada' : 'suspensa'}!`);
    fetchTenants();
  };

  const accessTenant = (t: Tenant) => {
    window.open(`${window.location.origin}/dashboard?preview_tenant=${t.id}`, '_blank');
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#08080f] text-white p-8">
        <div className="h-20 w-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldAlert className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-black">Acesso Negado</h1>
        <p className="text-white/50 text-center max-w-sm">Apenas Super Admins podem acessar esta área.</p>
        <Button onClick={() => window.location.href = '/dashboard'} className="mt-4 bg-white/10 border border-white/20 hover:bg-white/20 text-white">
          Voltar ao Painel
        </Button>
      </div>
    );
  }

  const activeCount = tenants.filter(t => t.status === 'active').length;
  const suspendedCount = tenants.filter(t => t.status === 'suspended').length;
  const totalUsers = tenants.reduce((s, t) => s + (t._userCount ?? 0), 0);
  const totalProducts = tenants.reduce((s, t) => s + (t._productCount ?? 0), 0);
  const totalServices = tenants.reduce((s, t) => s + (t._serviceCount ?? 0), 0);
  const totalUsage7d = tenants.reduce((s, t) => s + (t._usage7d ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#08080f] text-white overflow-x-hidden w-full max-w-[100vw]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative border-b border-white/10 bg-[#08080f]/60 backdrop-blur-2xl sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.15)] shrink-0">
              <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6 text-purple-300" />
            </div>
            <div>
              <h1 className="font-black text-base sm:text-xl leading-none bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-none">Super Admin</h1>
              <p className="text-[10px] sm:text-[11px] text-white/40 font-bold uppercase tracking-widest mt-1 hidden sm:block">Laris ERP <span className="text-purple-400/50">•</span> Painel Mestre</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs font-medium text-white/30 hidden md:block border-r border-white/10 pr-4">{user?.email}</span>
            <button onClick={() => window.location.href = '/dashboard'} className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-[10px] sm:text-xs font-bold text-white flex items-center gap-2 transition-all active:scale-95">
              <ExternalLink className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-purple-300" /> <span className="hidden sm:inline">Meu ERP</span><span className="sm:hidden">ERP</span>
            </button>
            <button onClick={signOut} className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 text-red-400 transition-all active:scale-95 group">
              <LogOut className="h-4 sm:h-4.5 w-4 sm:w-4.5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: 'Empresas', value: tenants.length, icon: Building2, color: 'from-purple-500 to-indigo-600', text: 'text-purple-300' },
            { label: 'Ativas', value: activeCount, icon: CheckCircle2, color: 'from-emerald-500 to-teal-600', text: 'text-emerald-300' },
            { label: 'Acessos 7d', value: totalUsage7d, icon: Activity, color: 'from-cyan-500 to-sky-600', text: 'text-cyan-300' },
            { label: 'Produtos/Serviços', value: `${totalProducts}/${totalServices}`, icon: Package, color: 'from-blue-500 to-cyan-600', text: 'text-blue-300' },
          ].map((kpi, i) => (
            <div key={kpi.label} className="relative bg-[#ffffff05] border border-[#ffffff10] rounded-3xl p-6 overflow-hidden group hover:border-[#ffffff20] hover:bg-[#ffffff08] transition-all duration-500 hover:-translate-y-1 shadow-2xl shadow-black/50">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className={cn('h-12 w-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg transform group-hover:scale-110 transition-transform duration-500', kpi.color)}>
                <kpi.icon className="h-6 w-6 text-white" />
              </div>
              <p className="text-4xl font-black text-white tracking-tight">{kpi.value}</p>
              <p className={cn("text-[10px] font-black uppercase tracking-widest mt-2", kpi.text)}>{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Tenant List */}
        <div className="bg-[#ffffff05] border border-[#ffffff10] rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="px-6 sm:px-8 py-5 border-b border-[#ffffff10] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#ffffff03]">
            <h2 className="font-black text-sm uppercase tracking-widest text-white flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                <Building2 className="h-4 w-4" />
              </div>
              Empresas Cadastradas
            </h2>
            <div className="flex gap-3">
              <button onClick={fetchTenants} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white/50 hover:text-white active:scale-95">
                <RefreshCcw className="h-4.5 w-4.5" />
              </button>
              <button onClick={() => { setEditingTenant(null); setModalOpen(true); }} className="h-10 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all active:scale-95 border border-purple-500/50">
                <Plus className="h-4.5 w-4.5" /> <span className="hidden sm:inline">Nova Empresa</span><span className="sm:hidden">Nova</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-purple-500/50" /></div>
          ) : tenants.length === 0 ? (
            <div className="py-24 text-center">
              <div className="h-20 w-20 bg-[#ffffff05] border border-[#ffffff10] rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-10 w-10 opacity-20 text-white" />
              </div>
              <p className="font-bold text-white/40 text-lg">Nenhuma empresa cadastrada.</p>
              <p className="text-sm text-white/20 mt-2">Clique em "Nova Empresa" para começar.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {tenants.map(t => {
                const StatusIcon = STATUS_CONFIG[t.status].icon;
                const primaryColor = t._branding?.primary_color ?? '#a855f7';
                const logoUrl = t._branding?.logo_url;
                const storeName = t._branding?.store_name || t.name;

                return (
                  <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 sm:px-6 py-5 hover:bg-white/3 transition-colors group">
                    {/* Logo */}
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl shrink-0 overflow-hidden shadow-lg border border-white/10 flex items-center justify-center" style={{ background: primaryColor + '20' }}>
                      {logoUrl ? (
                        <img src={logoUrl} alt={storeName} className="h-full w-full object-contain p-1" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-black text-xl" style={{ color: primaryColor }}>
                          {storeName[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-white truncate">{storeName}</p>
                        <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded-md hidden sm:inline-block">/{t.slug}</span>
                        <span className={cn('flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border', STATUS_CONFIG[t.status].bg, STATUS_CONFIG[t.status].color)}>
                          <StatusIcon className="h-2.5 w-2.5" />{STATUS_CONFIG[t.status].label}
                        </span>
                      </div>
                      <p className="text-xs text-white/30 mt-0.5 truncate">{t.owner_email ?? 'Sem e-mail'}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
                        <span className="text-[11px] text-white/40 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />{t._userCount}
                        </span>
                        <span className="text-[11px] text-white/40 flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5" />{t._productCount}
                        </span>
                        <span className="text-[11px] text-white/40 flex items-center gap-1.5">
                          <BriefcaseBusiness className="h-3.5 w-3.5" />{t._serviceCount}
                        </span>
                        <span className="text-[11px] text-white/40 flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5" />{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t._revenue30d || 0)}
                        </span>
                        <span className="text-[11px] text-white/40 flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5" />{t._usage7d} acessos/7d
                        </span>
                        <span className={cn("text-[11px] flex items-center gap-1.5", t.last_accessed_at ? 'text-emerald-400' : 'text-white/30')}>
                          <Activity className="h-3.5 w-3.5" />{formatRelativeTime(t.last_accessed_at)}
                        </span>
                        <span className="text-[11px] text-white/30 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />{new Date(t.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity mt-2 sm:mt-0 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => accessTenant(t)}
                        className="flex-1 sm:flex-none h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 transition-colors"
                        title="Acessar empresa"
                      >
                        <Eye className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => { setEditingTenant(t); setModalOpen(true); }}
                        className="flex-1 sm:flex-none h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(t)}
                        className={cn('flex-1 sm:flex-none h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg border transition-colors',
                          t.status === 'active'
                            ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        )}
                        title={t.status === 'active' ? 'Suspender' : 'Reativar'}
                      >
                        {t.status === 'active' ? <PowerOff className="h-4.5 w-4.5 sm:h-4 sm:w-4" /> : <Power className="h-4.5 w-4.5 sm:h-4 sm:w-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Security Info */}
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-6">
          <h3 className="font-black text-amber-400 uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Instruções de Segurança
          </h3>
          <ul className="space-y-2 text-sm text-white/40">
            <li>• <strong className="text-white/60">URL Secreta:</strong> Mantenha <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs text-purple-400">/superadmin-laris</code> em segredo.</li>
            <li>• <strong className="text-white/60">Suspender:</strong> Bloqueia o acesso de todos os usuários da empresa imediatamente via RLS.</li>
            <li>• <strong className="text-white/60">Isolamento:</strong> Cada empresa vê apenas seus próprios dados. Garantido pelo banco de dados.</li>
            <li>• <strong className="text-white/60">Acessar empresa:</strong> Use o ícone <Eye className="inline h-3 w-3" /> para ver o painel da empresa como ela vê.</li>
          </ul>
        </div>
      </div>

      {modalOpen && (
        <TenantModal
          tenant={editingTenant}
          onClose={() => { setModalOpen(false); setEditingTenant(null); }}
          onSave={fetchTenants}
        />
      )}
    </div>
  );
}
