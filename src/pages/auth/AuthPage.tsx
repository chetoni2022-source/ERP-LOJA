import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Label } from '../../components/ui';
import {
  Loader2,
  ArrowRight,
  Building2,
  Mail,
  LockKeyhole,
  Store,
  UserRound,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react';

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
  const companyInputRef = useRef<HTMLInputElement>(null);
  const latestCompanyCodeRef = useRef(companyCode);
  const localFallbackLoadedRef = useRef(Boolean(companyCode));
  const lastSyncedSearchRef = useRef(location.search);

  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  const clearCompanyCode = () => {
    localFallbackLoadedRef.current = true;
    setCompanyCode('');
    setTenantBranding(null);
    window.requestAnimationFrame(() => companyInputRef.current?.focus());
  };

  useEffect(() => {
    latestCompanyCodeRef.current = companyCode;
  }, [companyCode]);

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
      if (normalizeTenantHint(latestCompanyCodeRef.current)) return;
      setTenantBranding(branding);
      setCompanyCode(branding.tenant_slug);
      rememberTenant(branding);
    } finally {
      setBrandingLoading(false);
    }
  }, [rememberTenant]);

  useEffect(() => {
    if (lastSyncedSearchRef.current === location.search) return;
    lastSyncedSearchRef.current = location.search;
    const nextHint = getInitialTenantHint(location.search);
    if (nextHint) {
      setCompanyCode((current) => current === nextHint ? current : nextHint);
    }
  }, [location.search]);

  useEffect(() => {
    const hint = normalizeTenantHint(companyCode);
    if (!hint) {
      setTenantBranding(null);
      if (!localFallbackLoadedRef.current) {
        localFallbackLoadedRef.current = true;
        loadLocalFallbackBranding();
      }
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
        success('Link de recuperacao enviado para o seu e-mail!');
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

  const title = recoveryMode ? 'Recuperar acesso' : isLogin ? 'Entrar' : 'Criar conta';
  const primaryColor = tenantBranding?.primary_color || '#18181b';
  const bgImage = tenantBranding?.login_bg_url || '/auth-bg.jpg';
  const bgColor = tenantBranding?.login_bg_color || '#000000';
  const bgMode = tenantBranding?.login_bg_mode || 'image';
  const logoUrl = tenantBranding?.logo_url || null;
  const storeName = tenantBranding?.store_name || tenantBranding?.tenant_name || 'ERP';
  const actionLabel = recoveryMode ? 'Enviar link seguro' : isLogin ? 'Entrar no painel' : 'Criar conta';
  const formSubtitle = recoveryMode
    ? 'Informe seu e-mail para receber o link de recuperacao.'
    : isLogin
      ? 'Acesse o ambiente da sua empresa.'
      : 'Crie o primeiro acesso vinculado a esta empresa.';
  const brandInitial = storeName.trim().charAt(0).toUpperCase() || 'E';
  const backgroundStyle = bgMode === 'image'
    ? { backgroundImage: `url(${bgImage})`, backgroundPosition: 'center', backgroundSize: 'cover' }
    : { background: bgMode === 'gradient' ? `linear-gradient(135deg, ${bgColor} 0%, ${primaryColor} 100%)` : bgColor };

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
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f7f5f2] text-zinc-950 dark:bg-[#080808] dark:text-zinc-50">
      <div className="absolute inset-0" style={backgroundStyle}>
        <div
          className="absolute inset-0 hidden lg:block"
          style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.74) 0%, rgba(0,0,0,0.48) 42%, rgba(247,245,242,0.96) 72%, rgba(247,245,242,1) 100%)' }}
        />
        <div
          className="absolute inset-0 lg:hidden"
          style={{ background: 'linear-gradient(180deg, rgba(247,245,242,0.12) 0%, rgba(247,245,242,0.94) 42%, rgba(247,245,242,1) 100%)' }}
        />
      </div>

      <main className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-7xl grid-cols-1 items-center gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(390px,480px)] lg:px-10">
        <section className="hidden min-h-[calc(100dvh-4rem)] flex-col justify-between py-8 text-white lg:flex">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] backdrop-blur">
            <Building2 className="h-4 w-4" />
            {tenantBranding?.tenant_name || 'Portal ERP'}
          </div>

          <div className="max-w-xl">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="mb-8 max-h-28 w-auto max-w-[320px] object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.32)]" />
            ) : (
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-lg text-3xl font-black text-white shadow-2xl" style={{ background: primaryColor }}>
                {brandInitial}
              </div>
            )}
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-white/62">Acesso da empresa</p>
            <h1 className="max-w-[620px] text-5xl font-black leading-[0.98] tracking-tight xl:text-6xl">
              {storeName}
            </h1>
            <div className="mt-8 flex max-w-md items-center gap-3 border-l border-white/20 pl-4 text-sm font-medium leading-relaxed text-white/68">
              <ShieldCheck className="h-5 w-5 shrink-0 text-white/80" />
              <span>Ambiente isolado para a equipe desta empresa.</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-white/45">
            <BadgeCheck className="h-4 w-4" />
            Laris ERP
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-[470px] flex-col rounded-lg border border-white/70 bg-white/95 p-4 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/90 sm:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-500">Portal de acesso</p>
              <h2 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-3xl">{title}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{formSubtitle}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-full w-full object-contain p-1.5" />
              ) : (
                <Store className="h-5 w-5" style={{ color: primaryColor }} />
              )}
            </div>
          </div>

          {!recoveryMode && (
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`h-10 rounded-md text-xs font-black uppercase tracking-[0.16em] transition-all ${isLogin ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white' : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white'}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`h-10 rounded-md text-xs font-black uppercase tracking-[0.16em] transition-all ${!isLogin ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white' : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white'}`}
              >
                Criar conta
              </button>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-zinc-500">Empresa</Label>
                <div className="flex min-w-0 items-center gap-2">
                  {tenantBranding && !brandingLoading && (
                    <span className="inline-flex min-w-0 items-center gap-1.5 truncate rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
                      {tenantBranding.tenant_name}
                    </span>
                  )}
                  {companyCode && (
                    <button
                      type="button"
                      onClick={clearCompanyCode}
                      className="shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-800 dark:hover:text-white"
                    >
                      Trocar
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  ref={companyInputRef}
                  value={companyCode}
                  onChange={e => setCompanyCode(normalizeTenantHint(e.target.value))}
                  placeholder="laris-acess-rios ou tmcar"
                  className="h-12 rounded-lg border-zinc-200 bg-white pl-10 pr-10 font-semibold shadow-none dark:border-zinc-800 dark:bg-zinc-900"
                  autoComplete="organization"
                />
                {brandingLoading && (
                  <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
                )}
              </div>
            </div>

            {!isLogin && !recoveryMode && (
              <div className="space-y-2">
                <Label className="text-zinc-500">Nome completo</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-12 rounded-lg border-zinc-200 bg-white pl-10 font-semibold shadow-none dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-zinc-500">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  className="h-12 rounded-lg border-zinc-200 bg-white pl-10 pr-10 font-semibold shadow-none dark:border-zinc-800 dark:bg-zinc-900"
                  autoComplete="email"
                />
                {brandingLoading && !companyCode && (
                  <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
                )}
              </div>
            </div>

            {!recoveryMode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-500">Senha</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setRecoveryMode(true)}
                      className="text-[11px] font-bold text-zinc-500 transition-colors hover:text-zinc-950 dark:hover:text-white"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    required
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="h-12 rounded-lg border-zinc-200 bg-white pl-10 font-semibold shadow-none dark:border-zinc-800 dark:bg-zinc-900"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-12 w-full rounded-lg border-none text-white shadow-lg transition-all active:scale-[0.98]"
              style={{ background: primaryColor, boxShadow: `0 16px 36px ${primaryColor}2e` }}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em]">
                  {actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                if (recoveryMode) setRecoveryMode(false);
                else setIsLogin(!isLogin);
              }}
              className="text-left text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-zinc-950 dark:hover:text-white"
            >
              {recoveryMode ? 'Voltar ao login' : isLogin ? 'Novo cadastro' : 'Ja tenho acesso'}
            </button>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 dark:text-zinc-700">
              Laris ERP
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
