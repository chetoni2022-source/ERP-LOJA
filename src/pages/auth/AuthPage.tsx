import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Label } from '../../components/ui';
import { Loader2, ArrowRight, Building2 } from 'lucide-react';

interface TenantLoginBranding {
  store_name: string | null;
  logo_url: string | null;
  login_bg_url: string | null;
  primary_color: string | null;
  tenant_id: string;
  tenant_name: string;
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tenantBranding, setTenantBranding] = useState<TenantLoginBranding | null>(null);

  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  // Detect tenant by email domain when user stops typing
  const detectTenantByEmail = useCallback(async (emailValue: string) => {
    if (!emailValue || !emailValue.includes('@')) {
      setTenantBranding(null);
      return;
    }

    setBrandingLoading(true);
    try {
      // Try to find tenant by owner_email or users with that email domain
      const domain = emailValue.split('@')[1];

      // Look for tenant branding linked to users with this email domain
      const { data } = await supabase
        .from('tenants')
        .select(`
          id, name, slug,
          tenant_branding (
            store_name, logo_url, login_bg_url, primary_color
          )
        `)
        .eq('status', 'active')
        .limit(10);

      if (data && data.length > 0) {
        // Check if any tenant has a user with this email
        const { data: profileMatch } = await supabase
          .from('profiles')
          .select('tenant_id, full_name')
          .limit(1)
          .single();

        // For now, try to match by owner_email domain
        const { data: tenantByDomain } = await supabase
          .from('tenants')
          .select(`id, name, slug, tenant_branding (store_name, logo_url, login_bg_url, primary_color)`)
          .ilike('owner_email', `%@${domain}`)
          .eq('status', 'active')
          .maybeSingle();

        if (tenantByDomain) {
          const branding = (tenantByDomain as any).tenant_branding;
          setTenantBranding({
            store_name: branding?.store_name ?? null,
            logo_url: branding?.logo_url ?? null,
            login_bg_url: branding?.login_bg_url ?? null,
            primary_color: branding?.primary_color ?? null,
            tenant_id: tenantByDomain.id,
            tenant_name: tenantByDomain.name,
          });
          return;
        }
      }

      setTenantBranding(null);
    } catch {
      setTenantBranding(null);
    } finally {
      setBrandingLoading(false);
    }
  }, []);

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
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          const profilePayload: any = {
            id: data.user.id,
            full_name: name,
            role: 'admin',
          };
          // If a tenant was detected by email, assign the user to it
          if (tenantBranding?.tenant_id) {
            profilePayload.tenant_id = tenantBranding.tenant_id;
          }
          await supabase.from('profiles').insert([profilePayload]);
          success('Conta criada! Verifique seu e-mail.');
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Erro ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const title = recoveryMode ? 'Recuperar Acesso' : isLogin ? 'Entrar' : 'Criar Conta';
  const primaryColor = tenantBranding?.primary_color || '#18181b';
  const bgImage = tenantBranding?.login_bg_url || '/auth-bg.jpg';
  const logoUrl = tenantBranding?.logo_url || null;
  const storeName = tenantBranding?.store_name || tenantBranding?.tenant_name || 'ERP';
  const isDarkBg = true; // For the left panel text contrast

  return (
    <div className="min-h-[100dvh] flex items-stretch bg-black overflow-hidden font-sans">
      
      {/* ── Esquerda: Imagem de Fundo (Desktop) ─── */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden">
        <img
          src={bgImage}
          alt={storeName}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
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
        <div className="md:hidden absolute inset-0">
          <img src={bgImage} alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/95 to-white dark:from-black/70 dark:via-[#050505]/95 dark:to-[#050505]" />
        </div>

        <div className="relative z-10 w-full px-8 py-10 max-w-[440px] mx-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
          
          {/* Logo / Branding */}
          <div className="mb-12 flex flex-col items-center w-full">
            {logoUrl ? (
              <div className="mb-8 flex items-center justify-center w-full transition-transform duration-500 hover:scale-[1.02]">
                <img
                  src={logoUrl}
                  crossOrigin="anonymous"
                  alt={storeName}
                  className="h-28 sm:h-32 w-auto max-w-full object-contain filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.1)]"
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
                {brandingLoading && (
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

          <p className="mt-auto pt-16 text-[9px] font-black text-zinc-200 dark:text-zinc-900 uppercase tracking-[0.5em]">
            POWERED BY LARIS ERP
          </p>
        </div>
      </div>
    </div>
  );
}
