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
    <div className="min-h-screen flex items-center justify-center p-6 selection:bg-emerald-500 selection:text-white font-sans antialiased relative overflow-hidden bg-white">
      
      {/* 🌌 Dynamic Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-100/50 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-50/20 rounded-full blur-[80px]" />
        
        {/* 🌌 High-Tech Logistics & Inventory Background */}
        <img 
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop" 
          alt="Smart Logistics & Stock Background" 
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.08] select-none pointer-events-none mix-blend-overlay"
        />
      </div>

      {/* ⚡ The Nano Box Portal (v7.0 Mobile Optimized) */}
      <div className="w-full max-w-[300px] relative z-10 flex flex-col animate-in zoom-in-95 duration-500">
          <div className="bg-white border border-zinc-200 shadow-2xl rounded-2xl p-5 sm:p-6 relative overflow-hidden">
            <div className="space-y-4 sm:space-y-6 text-center">
              {settings?.logo_url && (
                <div className="flex items-center justify-start h-6 sm:h-8 mb-2 sm:mb-4 grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all">
                   <img src={settings.logo_url} crossOrigin="anonymous" className="h-full w-auto object-contain" alt="Logo" />
                </div>
              )}
              
              <div className="text-left">
                <h1 className="text-lg sm:text-xl font-black text-black tracking-tight uppercase leading-none mb-0.5">Acesso</h1>
                <p className="text-[7px] sm:text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Aura Elite 2026</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-3 sm:space-y-4 text-left">
                {!isLogin && !recoveryMode && (
                  <div className="group space-y-2">
                    <Label className="uppercase text-[9px] font-black tracking-widest text-zinc-400 ml-1 transition-colors group-focus-within:text-emerald-500">Gestão Direct</Label>
                    <Input required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="Seu nome completo" className="h-12 !bg-zinc-50/50 !text-black border-transparent shadow-inner focus-visible:!border-emerald-500/30 focus-visible:!ring-0 transition-all font-bold rounded-2xl placeholder:text-zinc-300" />
                  </div>
                )}

                <div className="group space-y-2">
                  <Label className="uppercase text-[9px] font-black tracking-widest text-zinc-400 ml-1 transition-colors group-focus-within:text-emerald-500">ID de Acesso</Label>
                  <Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="nome@empresa.com" className="h-12 !bg-zinc-50/50 !text-black border-transparent shadow-inner focus-visible:!border-emerald-500/30 focus-visible:!ring-0 transition-all font-bold rounded-2xl placeholder:text-zinc-300" />
                </div>

                {!recoveryMode && (
                  <div className="group space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <Label className="uppercase text-[9px] font-black tracking-widest text-zinc-400 transition-colors group-focus-within:text-emerald-500">Criptografia</Label>
                      {isLogin && (
                        <button type="button" onClick={() => setRecoveryMode(true)} className="text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-black transition-colors">
                          Recuperar
                        </button>
                      )}
                    </div>
                    <Input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" className="h-12 !bg-zinc-50/50 !text-black border-transparent shadow-inner focus-visible:!border-emerald-500/30 focus-visible:!ring-0 transition-all font-black tracking-widest rounded-2xl placeholder:text-zinc-300 placeholder:tracking-normal" />
                  </div>
                )}

                <div className="pt-4">
                  <Button type="submit" disabled={loading} className="w-full h-14 uppercase font-black text-xs tracking-[0.2em] !bg-black hover:!bg-zinc-800 !text-white shadow-2xl hover:shadow-emerald-500/10 transition-all rounded-2xl flex items-center justify-between px-8 group">
                    {loading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : (
                      <>
                        <span>{recoveryMode ? 'Restaurar' : isLogin ? 'ENTRAR' : 'ATIVAR'}</span>
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="mt-8 flex flex-col items-center space-y-6">
            <button type="button" onClick={() => { if(recoveryMode) setRecoveryMode(false); else setIsLogin(!isLogin); }} className="px-6 py-2 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm">
              {recoveryMode ? 'Voltar ao Login' : isLogin ? 'Solicitar Acesso Elite' : 'Já sou membro Aura'}
            </button>
            <div className="flex items-center gap-6 opacity-30">
              <span className="h-px w-8 bg-zinc-400" />
              <p className="text-[8px] font-black uppercase tracking-[0.5em] text-zinc-500">Aura Elite Ecosystem</p>
              <span className="h-px w-8 bg-zinc-400" />
            </div>
          </div>

      </div>
    </div>

  );
}
