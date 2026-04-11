import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Label } from '../../components/ui';
import { Loader2, ArrowRight, Store } from 'lucide-react';

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
    ? 'Recuperação de Acesso' 
    : isLogin 
      ? `Domine Suas Vendas` 
      : 'Escale Seu Negócio Hoje';

  const subtitleText = recoveryMode 
    ? 'Insira as credenciais para restaurar conexão' 
    : isLogin 
      ? 'Acelere Inteligência de Mercado e Logística' 
      : 'Ative o painel definitivo para alta conversão';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 selection:bg-primary selection:text-primary-foreground font-sans antialiased relative overflow-hidden bg-black">
      
      {/* 🌌 Background Dinâmico - Imagem de Perfomance c/ Fallback Seguro */}
      <img 
        src="https://images.unsplash.com/photo-1614165936126-22485f58bc16?q=80&w=2070&auto=format&fit=crop" 
        alt="Aesthetic Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-30 select-none pointer-events-none transition-opacity duration-1000"
        onLoad={(e) => { e.currentTarget.style.opacity = '0.35'; }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/90 to-black/60 z-0 pointer-events-none" />

      {/* ⚡ Formulário Centralizado Elevado (Glassmorphism Centrado) */}
      <div className="w-full max-w-[420px] relative z-10 flex flex-col space-y-6 animate-in zoom-in-95 duration-700 bg-card/60 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl">
          
          <div className="space-y-4 text-center">
            {settings?.logo_url && (
              <div className="flex items-center justify-center mb-6 h-12">
                 <img 
                   src={settings.logo_url} 
                   className="max-h-full w-auto object-contain drop-shadow-xl" 
                   alt={settings.store_name || "Logo"} 
                   onError={(e) => { e.currentTarget.style.display = 'none'; }}
                 />
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {welcomeText}
              </h1>
              <p className="text-[10px] sm:text-xs text-zinc-400 font-bold tracking-[0.2em] uppercase opacity-80 mt-2 mx-auto max-w-xs">
                {subtitleText}
              </p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-5 pt-4">
            {!isLogin && !recoveryMode && (
              <div className="space-y-2">
                <Label className="uppercase text-[9px] font-black tracking-widest text-zinc-400 ml-1">Nome de Gestão</Label>
                <Input required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="Seu nome" className="h-12 !bg-zinc-900/80 !text-white !border-zinc-700 shadow-inner focus-visible:!ring-white ring-offset-0 transition-all font-medium" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="uppercase text-[9px] font-black tracking-widest text-zinc-400 ml-1">E-Mail Operacional</Label>
              <Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="ceo@empresa.com" className="h-12 !bg-zinc-900/80 !text-white !border-zinc-700 shadow-inner focus-visible:!ring-white ring-offset-0 transition-all font-medium" />
            </div>

            {!recoveryMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1 mr-1">
                  <Label className="uppercase text-[9px] font-black tracking-widest text-zinc-400">Chave de Segurança</Label>
                  {isLogin && (
                    <button type="button" onClick={() => setRecoveryMode(true)} className="text-[9px] font-black uppercase tracking-widest text-white hover:text-primary transition-colors">
                      Esqueci a Senha
                    </button>
                  )}
                </div>
                <Input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" className="h-12 !bg-zinc-900/80 !text-white !border-zinc-700 shadow-inner focus-visible:!ring-white ring-offset-0 transition-all font-medium tracking-widest" />
              </div>
            )}

            <div className="pt-6">
              <Button type="submit" disabled={loading} className="w-full h-14 uppercase font-black text-xs tracking-widest !bg-white hover:!bg-zinc-200 !text-black shadow-lg hover:shadow-white/20 hover:scale-[1.02] active:scale-95 transition-all border-none">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                  <>
                    <span className="flex-1 text-center font-black">{recoveryMode ? 'Desbloquear Restrição' : isLogin ? 'INICIAR TRAÇÃO' : 'FORMAR IMPÉRIO'}</span>
                    {!loading && <ArrowRight size={16} className="absolute right-6" />}
                  </>
                )}
              </Button>
            </div>

            {/* Toggle Switch */}
            <div className="pt-4 text-center mt-4">
              <button type="button" onClick={() => { if(recoveryMode) setRecoveryMode(false); else setIsLogin(!isLogin); }} className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors mt-2">
                {recoveryMode ? 'Voltar para base Segura' : isLogin ? 'Não possuí permissão? Solicite acesso!' : 'Já tem o núcleo criado? Fazer Login Ouro'}
              </button>
            </div>
          </form>

          <div className="pt-6 pb-2 flex items-center justify-between opacity-50 border-t border-white/10 mt-6">
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-300">Aura Elite © 2026</p>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-300 flex items-center gap-1"><Store size={10} /> Edge Server</p>
          </div>

      </div>
    </div>
  );
}
