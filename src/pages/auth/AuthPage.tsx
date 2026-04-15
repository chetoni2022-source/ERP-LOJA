import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Label } from '../../components/ui';
import { Loader2, ArrowRight, Car, ShieldCheck } from 'lucide-react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => { if (user) navigate('/admin'); }, [user, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (recoveryMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: `${window.location.origin}/auth` });
        if (error) throw error;
        success('Link de recuperação enviado!');
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
          success('Conta criada!');
        }
      }
    } catch (err: any) { toastError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0A0A0A] text-white selection:bg-primary selection:text-white font-sans antialiased relative overflow-hidden">
      
      {/* 🌌 Atmospheric Glows */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[100px]" />
        
        {/* 🌌 High-Tech Automotive Background */}
        <img 
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2000&auto=format&fit=crop" 
          alt="Premium Automotive Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-[0.1] select-none pointer-events-none mix-blend-overlay"
        />
      </div>

      {/* ⚡ Login Portal */}
      <div className="w-full max-w-[340px] relative z-10 flex flex-col animate-in zoom-in-95 duration-700">
          <div className="glass rounded-[40px] p-8 border border-white/5 relative overflow-hidden shadow-2xl">
            <div className="space-y-8">
              {/* Logo Wrapper */}
              <div className="flex flex-col items-center gap-4 mb-2">
                <div className="w-24 h-24 rounded-3xl bg-white/5 p-2 flex items-center justify-center overflow-hidden glow-primary border border-white/10">
                   <img src="/src/assets/logo.png" className="w-full h-full object-contain" alt="TMC AR Logo" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">TMC<span className="text-primary text-3xl">AR</span></h1>
                  <p className="text-[9px] font-black italic text-white/40 uppercase tracking-[0.4em] mt-1">Maintenance Elite Control</p>
                </div>
              </div>

              <form onSubmit={handleAuth} className="space-y-4 text-left">
                {!isLogin && !recoveryMode && (
                  <div className="group space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-white/30 ml-2 group-focus-within:text-primary transition-colors">Nome Completo</Label>
                    <Input required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="Thiago Carvalho" className="input-glass !h-14 !rounded-2xl" />
                  </div>
                )}

                <div className="group space-y-2">
                  <Label className="uppercase text-[10px] font-black tracking-widest text-white/30 ml-2 group-focus-within:text-primary transition-colors">E-mail de Acesso</Label>
                  <Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="thiago@tmcar.com" className="input-glass !h-14 !rounded-2xl" />
                </div>

                {!recoveryMode && (
                  <div className="group space-y-2">
                    <div className="flex justify-between items-center ml-2">
                      <Label className="uppercase text-[10px] font-black tracking-widest text-white/30 group-focus-within:text-primary transition-colors">Senha Segura</Label>
                      {isLogin && (
                        <button type="button" onClick={() => setRecoveryMode(true)} className="text-[10px] font-black tracking-widest text-white/20 hover:text-primary transition-colors">
                          Recuperar
                        </button>
                      )}
                    </div>
                    <Input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" className="input-glass !h-14 !rounded-2xl tracking-widest" />
                  </div>
                )}

                <div className="pt-6">
                  <Button type="submit" disabled={loading} className="btn-orange w-full !h-16 flex items-center justify-center gap-3">
                    {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (
                      <>
                        <span className="text-xs font-black tracking-widest">{recoveryMode ? 'RESTAURAR' : isLogin ? 'ACESSAR PAINEL' : 'ATIVAR REGISTRO'}</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="mt-8 flex flex-col items-center space-y-8">
            <button type="button" onClick={() => { if(recoveryMode) setRecoveryMode(false); else setIsLogin(!isLogin); }} className="px-8 py-3 rounded-2xl glass-bright text-white/40 text-[11px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all border border-white/5">
              {recoveryMode ? 'Voltar ao Login' : isLogin ? 'Solicitar Acesso Administrativo' : 'Já sou credenciado'}
            </button>
            <div className="flex items-center gap-6 opacity-10">
              <span className="h-px w-10 bg-white" />
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} />
                <p className="text-[9px] font-black uppercase tracking-[0.4em]">TMC Management Ecosystem</p>
              </div>
              <span className="h-px w-10 bg-white" />
            </div>
          </div>
      </div>
    </div>
  );
}
