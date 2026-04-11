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
    <div className="min-h-screen flex selection:bg-primary selection:text-primary-foreground font-sans antialiased bg-background">
      
      {/* 🏙️ Esquerda: Capa Fotográfica Imersiva (High-End Aesthetic) */}
      <div className="hidden lg:flex w-1/2 relative bg-zinc-950 overflow-hidden">
        {/* Usando uma joia preta e dourada do Unsplash livre de direitos */}
        <img 
          src="https://images.unsplash.com/photo-1599643478514-4a5202300408?q=80&w=2070&auto=format&fit=crop" 
          alt="Luxury Aesthetic Cover" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-transparent" />
        
        <div className="absolute bottom-10 left-10 right-10 p-10 bg-background/10 backdrop-blur-md border border-white/10 rounded-3xl animate-in slide-in-from-bottom-8 duration-1000 shadow-2xl">
           <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
             O futuro da gestão<br/>empresarial de luxo.
           </h2>
           <p className="mt-4 text-sm text-zinc-300 font-medium max-w-sm">
             Aura Elite v6 otimiza operações de alta perfomance enquanto mantém uma fachada invisível e premium.
           </p>
        </div>
      </div>

      {/* ⚖️ Direita: Formulário Glassmórfico (O Motor) */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 md:p-24 relative overflow-hidden">
        
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_0%,var(--border)_0%,transparent_50%)]" />

        <div className="w-full max-w-[380px] relative z-10 flex flex-col space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
          
          <div className="space-y-5">
            {settings?.logo_url && (
              <div className="flex items-center mb-6">
                 <img src={settings.logo_url} className="h-12 w-auto object-contain drop-shadow-xl" alt="Logo" />
              </div>
            )}
            <div className="space-y-1.5">
              <h1 className="text-3xl font-black text-foreground tracking-tight leading-tight">
                {welcomeText}
              </h1>
              <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase opacity-70">
                {subtitleText}
              </p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-5 bg-card/50 backdrop-blur-xl border border-border/60 p-6 sm:p-8 rounded-3xl shadow-xl">
            {!isLogin && !recoveryMode && (
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground ml-1">Nome Completo</Label>
                <Input required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="Seu nome" className="h-12 bg-background/80 shadow-none focus-visible:ring-primary ring-offset-0 transition-all font-medium" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground ml-1">Conta de Acesso</Label>
              <Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="nome@empresa.com" className="h-12 bg-background/80 shadow-none focus-visible:ring-primary ring-offset-0 transition-all font-medium" />
            </div>

            {!recoveryMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1 mr-1">
                  <Label className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">Senha Segura</Label>
                  {isLogin && (
                    <button type="button" onClick={() => setRecoveryMode(true)} className="text-[9px] font-black uppercase tracking-widest text-foreground hover:opacity-50 transition-opacity">
                      Esqueci a Senha
                    </button>
                  )}
                </div>
                <Input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" className="h-12 bg-background/80 shadow-none focus-visible:ring-primary ring-offset-0 transition-all font-medium tracking-widest" />
              </div>
            )}

            <div className="pt-4">
              <Button type="submit" disabled={loading} className="w-full h-12 uppercase font-black text-xs tracking-widest bg-foreground text-background shadow-lg shadow-foreground/10 hover:-translate-y-0.5 transition-all">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                  <>
                    {recoveryMode ? 'Restaurar Acesso' : isLogin ? 'Acessar Painel' : 'Criar Conta Elite'}
                    {!loading && <ArrowRight size={16} className="ml-2" />}
                  </>
                )}
              </Button>
            </div>

            {/* Toggle Switch */}
            <div className="pt-2 text-center border-t border-border/40 mt-4">
              <button type="button" onClick={() => { if(recoveryMode) setRecoveryMode(false); else setIsLogin(!isLogin); }} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mt-4">
                {recoveryMode ? 'Voltar com acesso restrito' : isLogin ? 'Solicitar convite de acesso' : 'Já possui conta? Fazer Login'}
              </button>
            </div>
          </form>

          <div className="pt-4 flex items-center justify-between opacity-30">
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-foreground">Aura Elite © 2026</p>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground">Ambiente Seguro</p>
          </div>

        </div>
      </div>
    </div>
  );
}
