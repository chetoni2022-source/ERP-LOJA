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
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  useEffect(() => {
    supabase.from('store_settings').select('store_name, logo_url').limit(1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data);
    });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (recoveryMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: `${window.location.origin}/auth` });
        if (error) throw error;
        success('Link de recuperação enviado com sucesso!');
        setRecoveryMode(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.fullName } }
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from('profiles').insert([{ id: data.user.id, full_name: form.fullName, role: 'admin' }]);
          success('Conta criada com sucesso!');
        }
      }
    } catch (err: any) { toastError(err.message); }
    finally { setLoading(false); }
  };

  const welcomeText = recoveryMode 
    ? 'Recuperar acesso' 
    : isLogin 
      ? `Bem-vindo à ${settings?.store_name || 'sua plataforma'}` 
      : 'Crie sua conta';

  const subtitleText = recoveryMode 
    ? 'Insira seu e-mail para receber as instruções' 
    : isLogin 
      ? 'Acesse seu painel administrativo' 
      : 'Comece a escala do seu negócio agora';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 selection:bg-primary selection:text-primary-foreground font-sans antialiased">
      
      {/* 🏙️ Sophisticated Background (Radial Depth) */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--border)_0%,transparent_50%)]" />
      </div>

      <div className="w-full max-w-[360px] relative z-10 flex flex-col space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Header - Editorial Style */}
        <div className="space-y-6 text-center">
          {settings?.logo_url && (
            <div className="flex items-center justify-center mb-8">
               <img src={settings.logo_url} className="h-10 w-auto object-contain transition-all duration-700" alt="Logo" />
            </div>
          )}
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight">
              {welcomeText}
            </h1>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">
              {subtitleText}
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="space-y-8">
          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && !recoveryMode && (
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input 
                  required 
                  value={form.fullName} 
                  onChange={e => setForm({...form, fullName: e.target.value})} 
                  placeholder="Seu nome" 
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>E-mail Corporativo</Label>
              <Input 
                required 
                type="email" 
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
                placeholder="nome@empresa.com" 
              />
            </div>

            {!recoveryMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <Label>Senha</Label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => setRecoveryMode(true)} 
                      className="text-[10px] font-black uppercase tracking-widest text-foreground hover:opacity-50 transition-opacity"
                    >
                      Esqueci a senha
                    </button>
                  )}
                </div>
                <Input 
                  required 
                  type="password" 
                  value={form.password} 
                  onChange={e => setForm({...form, password: e.target.value})} 
                  placeholder="••••••••" 
                />
              </div>
            )}

            <div className="pt-3">
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full uppercase tracking-[0.2em] shadow-xl shadow-foreground/5"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : (
                  <>
                    {recoveryMode ? 'Recuperar' : isLogin ? 'Acessar Painel' : 'Criar Conta'}
                    {!loading && <ArrowRight size={14} />}
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Toggle Login/Sign-up */}
          <div className="pt-4 text-center">
            <button 
              type="button" 
              onClick={() => { if(recoveryMode) setRecoveryMode(false); else setIsLogin(!isLogin); }}
              className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
            >
              {recoveryMode ? 'Voltar para o Login' : isLogin ? 'Não possui conta? Registre-se' : 'Já possui conta? Faça login'}
            </button>
          </div>
        </div>

        {/* Minimalist Brand Footer */}
        <div className="pt-12 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-30">Powered by Aura elite &copy; 2026</p>
        </div>

      </div>
    </div>
  );
}
