import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Label } from '../../components/ui';
import { Loader2, ArrowRight, Building2 } from 'lucide-react';

interface TenantLoginBranding {
  store_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  login_bg_url: string | null;
  login_bg_color: string | null;
  login_bg_mode: 'image' | 'color' | 'gradient' | null;
  primary_color: string | null;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
}

interface LoginBrandingRow {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  store_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  login_bg_url: string | null;
  login_bg_color: string | null;
  login_bg_mode: 'image' | 'color' | 'gradient' | null;
  primary_color: string | null;
  updated_at?: string | null;
}

interface TeamInvite {
  role: string | null;
  tenant_id: string | null;
}

const LOGIN_BRANDING_COLUMNS = `
  tenant_id,
  tenant_slug,
  tenant_name,
  store_name,
  logo_url,
  favicon_url,
  login_bg_url,
  login_bg_color,
  login_bg_mode,
  primary_color,
  updated_at
`;

const GENERIC_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const GENERIC_SUBDOMAINS = new Set(['www', 'erp', 'app', 'painel', 'sistema']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeTenantHint(value: string | null | undefined) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getTenantHintFromHost() {
  const host = window.location.hostname.toLowerCase();
  if (GENERIC_HOSTS.has(host) || host.endsWith('.vercel.app')) return '';
  const [firstPart] = host.split('.');
  return firstPart && !GENERIC_SUBDOMAINS.has(firstPart) ? normalizeTenantHint(firstPart) : '';
}

function getInitialTenantHint(search: string) {
  const params = new URLSearchParams(search);
  return normalizeTenantHint(
    params.get('empresa') ||
    params.get('tenant') ||
    params.get('loja') ||
    getTenantHintFromHost() ||
    localStorage.getItem('lastTenantSlug') ||
    localStorage.getItem('lastTenantId')
  );
}

function toTenantLoginBranding(row: LoginBrandingRow): TenantLoginBranding {
  return {
    store_name: row.store_name ?? null,
    logo_url: row.logo_url ?? null,
    favicon_url: row.favicon_url ?? null,
    login_bg_url: row.login_bg_url ?? null,
    login_bg_color: row.login_bg_color ?? null,
    login_bg_mode: row.login_bg_mode ?? null,
    primary_color: row.primary_color ?? null,
    tenant_id: row.tenant_id,
    tenant_slug: row.tenant_slug,
    tenant_name: row.tenant_name,
  };
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const location = useLocation();
  const [companyCode, setCompanyCode] = useState(() => getInitialTenantHint(window.location.search));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tenantBranding, setTenantBranding] = useState<TenantLoginBranding | null>(null);

  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  const rememberTenant = useCallback((branding: TenantLoginBranding) => {
    localStorage.setItem('lastTenantId', branding.tenant_id);
    localStorage.setItem('lastTenantSlug', branding.tenant_slug);
  }, []);

  const loadTenantBranding = useCallback(async (
    tenantHint: string,
    options: { clearOnMiss?: boolean; persist?: boolean } = {}
  ) => {
    const hint = normalizeTenantHint(tenantHint);
    if (!hint) {
      if (options.clearOnMiss) setTenantBranding(null);
      return null;
    }

    setBrandingLoading(true);
    try {
      let query = supabase
        .from('tenant_login_branding')
        .select(LOGIN_BRANDING_COLUMNS)
        .limit(1);

      query = UUID_RE.test(hint)
        ? query.eq('tenant_id', hint)
        : query.eq('tenant_slug', hint);

      const { data, error } = await query.maybeSingle<LoginBrandingRow>();
      if (error) throw error;

      if (data) {
        const branding = toTenantLoginBranding(data);
        setTenantBranding(branding);
        if (options.persist) rememberTenant(branding);
        return branding;
      }

      if (options.clearOnMiss) setTenantBranding(null);
      return null;
    } catch {
      if (options.clearOnMiss) setTenantBranding(null);
      return null;
    } finally {
      setBrandingLoading(false);
    }
  }, [rememberTenant]);

  const detectTenantByEmail = useCallback(async (emailValue: string) => {
    if (!emailValue || !emailValue.includes('@') || companyCode) return;
    const domain = emailValue.split('@')[1]?.toLowerCase();
    if (!domain) return;

    const ignored = new Set(['gmail', 'hotmail', 'outlook', 'yahoo', 'icloud', 'live', 'uol', 'bol', 'terra']);
    const candidates = domain
      .split('.')
      .map(normalizeTenantHint)
      .filter((part) => part.length > 2 && !ignored.has(part));

    for (const candidate of candidates) {
      const branding = await loadTenantBranding(candidate, { persist: true });
      if (branding) {
        setCompanyCode(branding.tenant_slug);
        return;
      }
    }
  }, [companyCode, loadTenantBranding]);

  const loadLocalFallbackBranding = useCallback(async () => {
    if (!GENERIC_HOSTS.has(window.location.hostname.toLowerCase())) return;

    setBrandingLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_login_branding')
        .select(LOGIN_BRANDING_COLUMNS)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle<LoginBrandingRow>();

      if (error || !data) return;
      const branding = toTenantLoginBranding(data);
      setTenantBranding(branding);
      setCompanyCode(branding.tenant_slug);
      rememberTenant(branding);
    } finally {
      setBrandingLoading(false);
    }
  }, [rememberTenant]);

  useEffect(() => {
    const nextHint = getInitialTenantHint(location.search);
    if (nextHint && nextHint !== companyCode) {
      setCompanyCode(nextHint);
    }
  }, [companyCode, location.search]);

  useEffect(() => {
    const hint = normalizeTenantHint(companyCode);
    if (!hint) {
      loadLocalFallbackBranding();
      return;
    }
    const timer = setTimeout(() => {
      loadTenantBranding(hint, { clearOnMiss: true, persist: true });
    }, 450);
    return () => clearTimeout(timer);
  }, [companyCode, loadLocalFallbackBranding, loadTenantBranding]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (email && email.includes('@') && email.includes('.')) {
        detectTenantByEmail(email);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [email, detectTenantByEmail]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (recoveryMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        success('Link de recuperação enviado para o seu e-mail!');
        setRecoveryMode(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!tenantBranding?.tenant_id) {
          throw new Error('Informe o codigo da empresa para criar a conta.');
        }
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: name } },
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          const { data: invite } = await supabase
            .from('team_invites')
            .select('role, tenant_id')
            .eq('email', normalizedEmail)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle<TeamInvite>();

          const profilePayload: {
            id: string;
            full_name: string;
            role: string;
            tenant_id?: string;
          } = {
            id: data.user.id,
            full_name: name,
            role: invite?.role || 'admin',
          };
          const tenantId = invite?.tenant_id || tenantBranding.tenant_id;
          if (tenantId) {
            profilePayload.tenant_id = tenantId;
          }
          const { error: profileError } = await supabase.from('profiles').insert([profilePayload]);
          if (profileError) throw profileError;
          success('Conta criada! Verifique seu e-mail.');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao autenticar. Tente novamente.';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  const title = recoveryMode ? 'Recuperar Acesso' : isLogin ? 'Entrar' : 'Criar Conta';
  const primaryColor = tenantBranding?.primary_color || '#18181b';
  const bgImage = tenantBranding?.login_bg_url || '/auth-bg.jpg';
  const bgColor = tenantBranding?.login_bg_color || '#000000';
  const bgMode = tenantBranding?.login_bg_mode || 'image';
  const logoUrl = tenantBranding?.logo_url || null;
  const storeName = tenantBranding?.store_name || tenantBranding?.tenant_name || 'ERP';

  useEffect(() => {
    if (tenantBranding?.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = `${tenantBranding.favicon_url}?v=${Date.now()}`;
    }
    if (tenantBranding) {
      document.title = `${storeName} | ERP`;
    }
  }, [storeName, tenantBranding]);

  return (
    <div className="min-h-[100dvh] flex items-stretch bg-black overflow-hidden font-sans">
      
      {/* ── Esquerda: Imagem de Fundo (Desktop) ─── */}
      <div 
        className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden items-center justify-center"
        style={{ 
          background: bgMode === 'image' 
            ? `url(${bgImage}) center/cover no-repeat` 
            : bgMode === 'gradient' 
              ? `linear-gradient(135deg, ${bgColor} 0%, ${primaryColor} 100%)` 
              : bgColor 
        }}
      >
        {bgMode === 'image' && (
          <>
            <img
              src={bgImage}
              alt={storeName}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </>
        )}
        
        {/* Adicionando um overlay elegante se for gradiente ou cor */}
        {(bgMode === 'gradient' || bgMode === 'color') && (
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        )}
        
        {tenantBranding && (
          <div className="absolute top-8 left-8 flex items-center gap-3 animate-in fade-in duration-500">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: primaryColor }}
            >
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-white/80 text-xs font-black uppercase tracking-widest">
              {tenantBranding.tenant_name}
            </span>
          </div>
        )}

        <div className="absolute bottom-12 left-12 right-12 z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
           <div className="h-px w-12 bg-white/40 mb-6" />
           <h2 className="text-white text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] mb-4">
             A elegância que<br />
             <span className="text-white/60">sua loja merece.</span>
           </h2>
           <p className="text-white/50 text-sm font-medium max-w-sm leading-relaxed tracking-wide uppercase text-[10px]">
             Sistema completo de gestão para joias e acessórios.
           </p>
        </div>
      </div>

      {/* ── Direita: Painel de Login ─── */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-white dark:bg-[#050505] overflow-hidden">
        
        {/* Mobile background */}
        <div className="md:hidden absolute inset-0 overflow-hidden">
          {bgMode === 'image' ? (
            <img src={bgImage} alt="" className="w-full h-full object-cover opacity-15" />
          ) : (
            <div className="w-full h-full opacity-10" style={{ background: bgMode === 'gradient' ? `linear-gradient(135deg, ${bgColor}, ${primaryColor})` : bgColor }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/95 to-white dark:from-black/70 dark:via-[#050505]/95 dark:to-[#050505]" />
        </div>

        <div className="relative z-10 w-full px-5 sm:px-8 py-6 sm:py-10 max-w-[440px] mx-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
          
          {/* Logo / Branding */}
          <div className="mb-8 sm:mb-12 flex flex-col items-center w-full">
            {logoUrl ? (
              <div className="mb-8 flex items-center justify-center w-full transition-transform duration-500 hover:scale-[1.02]">
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-20 sm:h-28 md:h-32 w-auto max-w-full object-contain filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.1)]"
                />
              </div>
            ) : (
              <div className="mb-8 flex flex-col items-center gap-4">
                <div
                  className="h-20 w-20 rounded-3xl flex items-center justify-center shadow-2xl relative group overflow-hidden"
                  style={{ background: primaryColor }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <span className="text-white text-3xl font-black">
                    {storeName[0]?.toUpperCase() ?? 'E'}
                  </span>
                </div>
                <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-[0.4em] uppercase">{storeName}</span>
              </div>
            )}

            <div className="text-center space-y-2">
              <h1 
                className="text-3xl font-black tracking-tighter uppercase italic"
                style={{ color: tenantBranding ? primaryColor : undefined }}
              >
                {title}
              </h1>
              <div className="h-1 w-8 mx-auto rounded-full" style={{ background: primaryColor }} />
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] pt-1">
                {tenantBranding ? `Plataforma ${storeName}` : 'Acessar Plataforma'}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4 w-full">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Empresa</Label>
                {tenantBranding && !brandingLoading && (
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                    {tenantBranding.tenant_name}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  value={companyCode}
                  onChange={e => setCompanyCode(normalizeTenantHint(e.target.value))}
                  placeholder="laris-acess-rios ou tmcar"
                  className="h-12 text-sm rounded-2xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 font-bold focus:ring-0 transition-all pl-5 pr-10"
                  autoComplete="organization"
                />
                {brandingLoading && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
                )}
              </div>
              <p className="px-1 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-300 dark:text-zinc-700">
                Use o codigo enviado pela sua empresa.
              </p>
            </div>

            {!isLogin && !recoveryMode && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nome Completo</Label>
                <Input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="h-14 text-sm rounded-2xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 font-bold focus:ring-0 transition-all pl-5"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">E-mail</Label>
              <div className="relative">
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  className="h-14 text-sm rounded-2xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 font-bold focus:ring-0 transition-all pl-5 pr-10"
                  autoComplete="email"
                />
                {brandingLoading && !companyCode && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
                )}
              </div>
              {tenantBranding && !brandingLoading && (
                <div className="flex items-center gap-2 px-1 pt-1 animate-in fade-in duration-300">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                    {tenantBranding.tenant_name} identificado
                  </span>
                </div>
              )}
            </div>

            {!recoveryMode && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Senha</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setRecoveryMode(true)}
                      className="text-[9px] font-black text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-widest"
                    >
                      Esqueceu?
                    </button>
                  )}
                </div>
                <Input
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-14 text-sm rounded-2xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 font-bold tracking-widest focus:ring-0 transition-all pl-5"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-16 mt-4 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all active:scale-[0.97] shadow-2xl relative overflow-hidden group border-none"
              style={{ background: primaryColor }}
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <span className="flex items-center gap-3">
                  {title}
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-8">
            <button
              type="button"
              onClick={() => {
                if (recoveryMode) setRecoveryMode(false);
                else setIsLogin(!isLogin);
              }}
              className="group flex flex-col items-center gap-1"
            >
              <span className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-widest transition-colors group-hover:text-zinc-400">
                {recoveryMode ? 'Voltar para o portal' : isLogin ? 'Solicitar Novo Cadastro' : 'Já possui credenciais?'}
              </span>
              <div className="h-0.5 w-4 bg-zinc-100 dark:bg-zinc-800 transition-all group-hover:w-8 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700" />
            </button>
          </div>

          <p className="mt-auto pt-8 sm:pt-16 text-[9px] font-black text-zinc-200 dark:text-zinc-900 uppercase tracking-[0.5em]">
            POWERED BY LARIS ERP
          </p>
        </div>
      </div>
    </div>
  );
}
