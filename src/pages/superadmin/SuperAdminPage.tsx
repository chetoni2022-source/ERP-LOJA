import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import {
  Building2, Plus, Loader2, X, Edit2, Power, PowerOff,
  Users, Package, BarChart3, ExternalLink, ShieldAlert,
  CheckCircle2, AlertTriangle, Clock, RefreshCcw, LogOut
} from 'lucide-react';
import { cn } from '../../components/ui';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial';
  owner_email: string | null;
  created_at: string;
  _userCount?: number;
  _productCount?: number;
  _branding?: {
    store_name: string | null;
    logo_url: string | null;
    primary_color: string | null;
  } | null;
}

const STATUS_CONFIG = {
  active:    { label: 'Ativo',    icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  suspended: { label: 'Suspenso', icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-500/10 border-red-500/20' },
  trial:     { label: 'Trial',    icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-500/10 border-amber-500/20' },
};

function TenantModal({
  tenant,
  onClose,
  onSave,
}: {
  tenant: Partial<Tenant> | null;
  onClose: () => void;
  onSave: () => void;
}) {
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

  const handleSlug = (val: string) =>
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'));

  const handleSave = async () => {
    if (!name || !slug) { toastError('Preencha nome e slug.'); return; }
    setSaving(true);
    try {
      if (isNew) {
        // 1. Create tenant
        const { data: tenantData, error: tenantErr } = await supabase
          .from('tenants')
          .insert([{ name, slug, status, owner_email: ownerEmail || null }])
          .select('id')
          .single();
        if (tenantErr) throw tenantErr;

        // 2. Create branding
        await supabase.from('tenant_branding').insert([{
          tenant_id: tenantData.id,
          store_name: name,
          primary_color: primaryColor,
        }]);

        // 3. Create admin user if email and password provided
        if (ownerEmail && ownerPassword) {
          const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email: ownerEmail,
            password: ownerPassword,
            email_confirm: true,
            user_metadata: { full_name: ownerName || name },
          });
          if (authErr) throw authErr;

          if (authData.user) {
            await supabase.from('profiles').insert([{
              id: authData.user.id,
              full_name: ownerName || name,
              role: 'admin',
              tenant_id: tenantData.id,
            }]);
          }
        }

        success(`Empresa "${name}" criada com sucesso!`);
      } else {
        // Update existing
        const { error } = await supabase
          .from('tenants')
          .update({ name, slug, status, owner_email: ownerEmail || null })
          .eq('id', tenant!.id);
        if (error) throw error;
        success('Empresa atualizada!');
      }
      onSave();
      onClose();
    } catch (err: any) {
      toastError(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-black text-lg">{isNew ? 'Nova Empresa' : 'Editar Empresa'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Nome da Empresa *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Bijou & Co." className="h-12" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Slug (identificador) *</Label>
              <Input
                value={slug}
                onChange={e => handleSlug(e.target.value)}
                placeholder="bijou-eco"
                className="h-12 font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Só letras, números e hífen. Ex: laris, bijou-eco</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">E-mail do Responsável</Label>
            <Input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="admin@empresa.com" className="h-12" />
            <p className="text-[10px] text-muted-foreground">
              O sistema detecta o tenant pelo domínio deste e-mail na tela de login.
            </p>
          </div>

          {isNew && (
            <>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                <p className="text-xs font-black text-primary uppercase tracking-wider">Criar Usuário Admin para esta empresa</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold">Nome do Admin</Label>
                    <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Nome" className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold">Senha Inicial</Label>
                    <Input type="password" value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="h-10" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Deixe em branco se preferir criar o usuário manualmente depois.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Cor Primária da Empresa</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="h-12 w-12 rounded-xl border border-border cursor-pointer"
                  />
                  <div className="flex-1 h-12 rounded-xl border border-border flex items-center px-4" style={{ background: primaryColor + '20' }}>
                    <span className="font-mono font-bold text-sm" style={{ color: primaryColor }}>{primaryColor}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Status</Label>
            <div className="flex gap-2">
              {(['active', 'trial', 'suspended'] as const).map(s => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "flex-1 h-10 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                      status === s ? `${cfg.bg} ${cfg.color} border-current` : 'border-border text-muted-foreground hover:bg-muted/40'
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <Button onClick={onClose} className="flex-1 h-12 bg-muted text-foreground border border-border hover:bg-muted/80 font-bold rounded-xl">Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name || !slug}
            className="flex-1 h-12 font-black bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-widest text-xs shadow-md active:scale-95 transition-all rounded-xl disabled:opacity-40"
          >
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
        .select(`
          *,
          _branding:tenant_branding(store_name, logo_url, primary_color)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch counts for each tenant
      const enriched = await Promise.all((data || []).map(async (t: any) => {
        const [{ count: userCount }, { count: productCount }] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
        ]);
        return {
          ...t,
          _branding: Array.isArray(t._branding) ? t._branding[0] : t._branding,
          _userCount: userCount ?? 0,
          _productCount: productCount ?? 0,
        };
      }));

      setTenants(enriched);
    } catch (err: any) {
      toastError('Erro ao carregar empresas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const toggleStatus = async (t: Tenant) => {
    const newStatus = t.status === 'active' ? 'suspended' : 'active';
    await supabase.from('tenants').update({ status: newStatus }).eq('id', t.id);
    success(`Empresa ${newStatus === 'active' ? 'reativada' : 'suspensa'}!`);
    fetchTenants();
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground p-8">
        <ShieldAlert className="h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-black">Acesso Negado</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          Você não tem permissão para acessar esta área. Apenas Super Admins podem gerenciar as empresas.
        </p>
        <Button onClick={() => window.location.href = '/dashboard'} className="mt-4">
          Voltar ao Painel
        </Button>
      </div>
    );
  }

  const activeCount = tenants.filter(t => t.status === 'active').length;
  const suspendedCount = tenants.filter(t => t.status === 'suspended').length;
  const totalUsers = tenants.reduce((s, t) => s + (t._userCount ?? 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <ShieldAlert className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-black text-lg leading-none">Super Admin</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Laris ERP · Painel Mestre</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="h-9 px-3 bg-muted text-foreground border border-border hover:bg-muted/80 text-xs font-bold"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Meu ERP
            </Button>
            <Button
              onClick={signOut}
              className="h-9 px-3 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 text-xs font-bold"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Empresas Total', value: tenants.length, icon: Building2, color: 'text-primary' },
            { label: 'Ativas', value: activeCount, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'Suspensas', value: suspendedCount, icon: AlertTriangle, color: 'text-red-500' },
            { label: 'Usuários Total', value: totalUsers, icon: Users, color: 'text-blue-500' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <kpi.icon className={cn('h-5 w-5 mb-2', kpi.color)} />
              <p className="text-3xl font-black">{kpi.value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Tenant List */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-black text-base uppercase tracking-widest flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Empresas Cadastradas
            </h2>
            <div className="flex gap-2">
              <button
                onClick={fetchTenants}
                className="h-9 w-9 flex items-center justify-center rounded-lg bg-muted border border-border hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
              <Button
                onClick={() => { setEditingTenant(null); setModalOpen(true); }}
                className="h-9 px-4 font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Nova Empresa
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin h-8 w-8 text-primary/40" /></div>
          ) : tenants.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 opacity-20 mx-auto mb-3" />
              <p className="font-bold">Nenhuma empresa cadastrada ainda.</p>
              <p className="text-sm mt-1">Clique em "Nova Empresa" para começar.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {tenants.map(t => {
                const StatusIcon = STATUS_CONFIG[t.status].icon;
                const primaryColor = t._branding?.primary_color ?? '#a855f7';

                return (
                  <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                    {/* Color dot / logo */}
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-white font-black text-lg"
                      style={{ background: primaryColor }}
                    >
                      {t._branding?.logo_url
                        ? <img src={t._branding.logo_url} className="h-8 w-8 object-contain" />
                        : t.name[0]?.toUpperCase()
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-sm text-foreground">{t._branding?.store_name || t.name}</p>
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">/{t.slug}</span>
                        <span className={cn('flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border', STATUS_CONFIG[t.status].bg, STATUS_CONFIG[t.status].color)}>
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_CONFIG[t.status].label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.owner_email ?? 'Sem e-mail cadastrado'}</p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />{t._userCount} usuário{t._userCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />{t._productCount} produto{t._productCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Criado em {new Date(t.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setEditingTenant(t); setModalOpen(true); }}
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-muted border border-border hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(t)}
                        className={cn(
                          'h-9 w-9 flex items-center justify-center rounded-lg border transition-colors',
                          t.status === 'active'
                            ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
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

        {/* Instructions */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
          <h3 className="font-black text-amber-600 uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Instruções de Segurança
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>URL Secreta:</strong> Mantenha o endereço <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/superadmin-laris</code> em segredo. Não compartilhe com clientes.</li>
            <li>• <strong>Suspender:</strong> Ao suspender uma empresa, seus usuários perdem acesso imediatamente via RLS.</li>
            <li>• <strong>Isolamento:</strong> Cada empresa vê apenas seus próprios dados. O banco de dados aplica isso automaticamente.</li>
            <li>• <strong>Novo cliente:</strong> Crie a empresa → O sistema cria o usuário admin → Você passa as credenciais para o cliente.</li>
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
