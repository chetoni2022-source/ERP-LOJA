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
    <div className="min-h-screen flex items-center justify-center p-4 selection:bg-zinc-900 selection:text-white font-sans antialiased relative overflow-hidden bg-zinc-50">
      
      {/* 🌌 Background Dinâmico Premium Light */}
      <img 
        src="https://images.unsplash.com/photo-1614165936126-22485f58bc16?q=80&w=2070&auto=format&fit=crop" 
        alt="Aesthetic Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-[0.15] select-none pointer-events-none mix-blend-luminosity transition-opacity duration-1000"
        onLoad={(e) => { e.currentTarget.style.opacity = '0.15'; }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />

      {/* ⚡ Formulário Ultra Compacto (White Clean) */}
      <div className="w-full max-w-[360px] relative z-10 flex flex-col space-y-4 animate-in zoom-in-95 duration-500 bg-white/95 backdrop-blur-xl border border-zinc-200 p-6 sm:p-8 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
          
          <div className="space-y-3 text-center">
            {settings?.logo_url && (
              <div className="flex items-center justify-center mb-4 h-10">
                 <img 
                   src={settings.logo_url} 
                   className="max-h-full w-auto object-contain drop-shadow-sm" 
                   alt={settings.store_name || "Logo"} 
                   onError={(e) => { e.currentTarget.style.display = 'none'; }}
                 />
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight leading-tight">
                {welcomeText}
              </h1>
              <p className="text-[9px] sm:text-[10px] text-zinc-500 font-bold tracking-[0.2em] uppercase mt-1 mx-auto max-w-xs">
                {subtitleText}
              </p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 pt-2">
            {!isLogin && !recoveryMode && (
              <div className="space-y-1.5">
                <Label className="uppercase text-[8px] font-black tracking-widest text-zinc-500 ml-1">Nome de Gestão</Label>
                <Input required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="Seu nome" className="h-10 !bg-zinc-50 !text-black !border-zinc-200 shadow-sm focus-visible:!ring-zinc-900 focus-visible:ring-1 ring-offset-0 transition-all font-semibold placeholder:text-zinc-400 placeholder:font-normal" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="uppercase text-[8px] font-black tracking-widest text-zinc-500 ml-1">E-Mail Operacional</Label>
              <Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="ceo@empresa.com" className="h-10 !bg-zinc-50 !text-black !border-zinc-200 shadow-sm focus-visible:!ring-zinc-900 focus-visible:ring-1 ring-offset-0 transition-all font-semibold placeholder:text-zinc-400 placeholder:font-normal" />
            </div>

            {!recoveryMode && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1 mr-1">
                  <Label className="uppercase text-[8px] font-black tracking-widest text-zinc-500">Chave de Segurança</Label>
                  {isLogin && (
                    <button type="button" onClick={() => setRecoveryMode(true)} className="text-[8px] font-black uppercase tracking-widest text-black hover:text-emerald-600 transition-colors">
                      Esqueci a Senha
                    </button>
                  )}
                </div>
                <Input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" className="h-10 !bg-zinc-50 !text-black !border-zinc-200 shadow-sm focus-visible:!ring-zinc-900 focus-visible:ring-1 ring-offset-0 transition-all font-semibold tracking-widest placeholder:text-zinc-400 placeholder:font-normal placeholder:tracking-normal" />
              </div>
            )}

            <div className="pt-4">
              <Button type="submit" disabled={loading} className="w-full h-12 uppercase font-black text-[10px] tracking-widest !bg-zinc-900 hover:!bg-black !text-white shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all border-none rounded-xl">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                  <>
                    <span className="flex-1 text-center font-black">{recoveryMode ? 'Desbloquear Restrição' : isLogin ? 'INICIAR TRAÇÃO' : 'FORMAR IMPÉRIO'}</span>
                    {!loading && <ArrowRight size={14} className="absolute right-5" />}
                  </>
                )}
              </Button>
            </div>

            {/* Toggle Switch */}
            <div className="pt-2 text-center mt-2">
              <button type="button" onClick={() => { if(recoveryMode) setRecoveryMode(false); else setIsLogin(!isLogin); }} className="text-[8px] font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
                {recoveryMode ? 'Voltar para base Segura' : isLogin ? 'Não possuí permissão? Solicite acesso!' : 'Já tem o núcleo criado? Fazer Login Ouro'}
              </button>
            </div>
          </form>

          <div className="pt-4 pb-1 flex items-center justify-between opacity-50 border-t border-zinc-100 mt-4">
            <p className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-400">Aura Elite © 2026</p>
            <p className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-1"><Store size={8} /> Edge Server</p>
          </div>

      </div>
    </div>
  );
}
