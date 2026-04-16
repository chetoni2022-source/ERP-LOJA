import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Label } from '../../components/ui';
import { Loader2, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [settings, setSettings] = useState<{ logo_url: string | null } | null>(null);

  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  useEffect(() => {
    supabase.from('store_settings').select('logo_url').limit(1).maybeSingle()
      .then(({ data }) => { if (data) setSettings(data); });
  }, []);

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
          await supabase.from('profiles').insert([{ id: data.user.id, full_name: name, role: 'admin' }]);
          success('Conta criada com sucesso! Verifique seu e-mail.');
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Erro ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/3 rounded-full blur-[80px]" />
        {/* E-commerce / Fashion subtle background */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.015]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* ⚡ Nano Box Portal (v7.0 Laris — Mobile Optimized) */}
      <div className="w-full max-w-[300px] relative z-10 flex flex-col animate-in zoom-in-95 duration-500">
        <div className="bg-white border border-zinc-200 shadow-2xl rounded-2xl p-5 sm:p-6 relative overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
          <div className="space-y-4 sm:space-y-5">
            {/* Logo / Branding */}
            {settings?.logo_url ? (
              <div className="flex items-center justify-start h-6 sm:h-8 mb-2 sm:mb-3 grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all">
                <img
                  src={settings.logo_url}
                  crossOrigin="anonymous"
                  className="h-full w-auto object-contain"
                  alt="Logo Laris"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-5 rounded-md bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
                  <span className="text-white dark:text-zinc-900 text-[8px] font-black">L</span>
                </div>
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Laris Acessórios</span>
              </div>
            )}

            <div>
              <h1 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight uppercase leading-none mb-0.5">
                {recoveryMode ? 'Recuperar' : isLogin ? 'Acesso' : 'Cadastro'}
              </h1>
              <p className="text-[7px] sm:text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em]">
                Aura Elite ERP · Laris
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-3 sm:space-y-3.5">
              {!isLogin && !recoveryMode && (
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">Nome</Label>
                  <Input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-10 rounded-lg text-sm border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">E-mail</Label>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-10 rounded-lg text-sm border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  autoComplete="email"
                />
              </div>

              {!recoveryMode && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">Senha</Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => setRecoveryMode(true)}
                        className="text-[9px] font-bold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                      >
                        Esqueci
                      </button>
                    )}
                  </div>
                  <Input
                    required
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 rounded-lg text-sm border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 tracking-widest"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all active:scale-95 shadow-lg mt-1"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <span className="flex items-center gap-2">
                    {recoveryMode ? 'Enviar Link' : isLogin ? 'Entrar' : 'Criar Conta'}
                    <ArrowRight size={14} />
                  </span>
                )}
              </Button>
            </form>

            <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  if (recoveryMode) setRecoveryMode(false);
                  else setIsLogin(!isLogin);
                }}
                className="w-full text-center text-[9px] font-bold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors uppercase tracking-[0.15em] py-1"
              >
                {recoveryMode
                  ? '← Voltar ao login'
                  : isLogin
                  ? 'Não tem conta? Cadastrar'
                  : 'Já tenho conta · Entrar'}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[8px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] mt-4">
          Laris Acessórios &amp; Semijoias · ERP Elite
        </p>
      </div>
    </div>
  );
}
