import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import {
  Building2, Plus, Loader2, X, Edit2, Power, PowerOff,
  Users, Package, BarChart3, ExternalLink, ShieldAlert,
  CheckCircle2, AlertTriangle, Clock, RefreshCcw, LogOut,
  Eye, TrendingUp, Calendar, Activity
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
  const [name, setName] = useState(tenant?.name ?? '');
  const [slug, setSlug] = useState(tenant?.slug ?? '');
  const [ownerEmail, setOwnerEmail] = useState(tenant?.owner_email ?? '');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
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
        const { data: tenantData, error: tenantErr } = await supabase.from('tenants').insert([{ name, slug, status, owner_email: ownerEmail || null }]).select('id').single();
        if (tenantErr) throw tenantErr;
        await supabase.from('tenant_branding').insert([{ tenant_id: tenantData.id, store_name: name, primary_color: primaryColor }]);
        if (ownerEmail && ownerPassword) {
          const { data: authData, error: authErr } = await supabase.auth.admin.createUser({ email: ownerEmail, password: ownerPassword, email_confirm: true, user_metadata: { full_name: ownerName || name } });
          if (authErr) throw authErr;
          if (authData.user) await supabase.from('profiles').insert([{ id: authData.user.id, full_name: ownerName || name, role: 'admin', tenant_id: tenantData.id }]);
        }
        success(`Empresa "${name}" criada!`);
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
                    <Label className="text-[10px] uppercase text-white/40 font-bold">Senha Inicial</Label>
                    <Input type="password" value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} placeholder="Mín. 6 caracteres" className="h-10 bg-white/5 border-white/10 text-white" />
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

      const enriched = await Promise.all((data || []).map(async (t: any) => {
        const [{ count: userCount }, { count: productCount }] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
        ]);
        return { ...t, _branding: Array.isArray(t._branding) ? t._branding[0] : t._branding, _userCount: userCount ?? 0, _productCount: productCount ?? 0 };
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

  return (
    <div className="min-h-screen bg-[#08080f] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative border-b border-white/5 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-base leading-none text-white">Super Admin</h1>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Laris ERP · Painel Mestre</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30 hidden sm:block">{user?.email}</span>
            <button onClick={() => window.location.href = '/dashboard'} className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition-all">
              <ExternalLink className="h-3.5 w-3.5" /> Meu ERP
            </button>
            <button onClick={signOut} className="h-9 w-9 flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-all">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Empresas', value: tenants.length, icon: Building2, color: 'from-purple-600 to-purple-700', glow: 'shadow-purple-500/20' },
            { label: 'Ativas', value: activeCount, icon: CheckCircle2, color: 'from-emerald-600 to-emerald-700', glow: 'shadow-emerald-500/20' },
            { label: 'Suspensas', value: suspendedCount, icon: AlertTriangle, color: 'from-red-600 to-red-700', glow: 'shadow-red-500/20' },
            { label: 'Produtos Total', value: totalProducts, icon: Package, color: 'from-blue-600 to-blue-700', glow: 'shadow-blue-500/20' },
          ].map(kpi => (
            <div key={kpi.label} className="relative bg-white/3 border border-white/8 rounded-2xl p-5 overflow-hidden group hover:border-white/15 transition-all">
              <div className={cn('h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg', kpi.color, kpi.glow)}>
                <kpi.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-3xl font-black text-white">{kpi.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Tenant List */}
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="font-black text-sm uppercase tracking-widest text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-400" /> Empresas Cadastradas
            </h2>
            <div className="flex gap-2">
              <button onClick={fetchTenants} className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/40 hover:text-white">
                <RefreshCcw className="h-4 w-4" />
              </button>
              <button onClick={() => { setEditingTenant(null); setModalOpen(true); }} className="h-9 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-purple-500/20 transition-all active:scale-95">
                <Plus className="h-4 w-4" /> Nova Empresa
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin h-8 w-8 text-purple-400/40" /></div>
          ) : tenants.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="h-12 w-12 opacity-10 mx-auto mb-3 text-white" />
              <p className="font-bold text-white/30">Nenhuma empresa cadastrada.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {tenants.map(t => {
                const StatusIcon = STATUS_CONFIG[t.status].icon;
                const primaryColor = t._branding?.primary_color ?? '#a855f7';
                const logoUrl = t._branding?.logo_url;
                const storeName = t._branding?.store_name || t.name;

                return (
                  <div key={t.id} className="flex items-center gap-4 px-6 py-5 hover:bg-white/3 transition-colors group">
                    {/* Logo */}
                    <div className="h-14 w-14 rounded-2xl shrink-0 overflow-hidden shadow-lg border border-white/10" style={{ background: primaryColor + '20' }}>
                      {logoUrl ? (
                        <img src={logoUrl} alt={storeName} className="h-full w-full object-contain p-1" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-black text-xl" style={{ color: primaryColor }}>
                          {storeName[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-white">{storeName}</p>
                        <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded-md">/{t.slug}</span>
                        <span className={cn('flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border', STATUS_CONFIG[t.status].bg, STATUS_CONFIG[t.status].color)}>
                          <StatusIcon className="h-2.5 w-2.5" />{STATUS_CONFIG[t.status].label}
                        </span>
                      </div>
                      <p className="text-xs text-white/30 mt-0.5">{t.owner_email ?? 'Sem e-mail'}</p>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="text-[11px] text-white/40 flex items-center gap-1">
                          <Users className="h-3 w-3" />{t._userCount} usuário{t._userCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[11px] text-white/40 flex items-center gap-1">
                          <Package className="h-3 w-3" />{t._productCount} produto{t._productCount !== 1 ? 's' : ''}
                        </span>
                        <span className={cn("text-[11px] flex items-center gap-1", t.last_accessed_at ? 'text-emerald-400' : 'text-white/30')}>
                          <Activity className="h-3 w-3" />{formatRelativeTime(t.last_accessed_at)}
                        </span>
                        <span className="text-[11px] text-white/30 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />Criado {new Date(t.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => accessTenant(t)}
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 transition-colors"
                        title="Acessar empresa"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setEditingTenant(t); setModalOpen(true); }}
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(t)}
                        className={cn('h-9 w-9 flex items-center justify-center rounded-lg border transition-colors',
                          t.status === 'active'
                            ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        )}
                        title={t.status === 'active' ? 'Suspender' : 'Reativar'}
                      >
                        {t.status === 'active' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
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
