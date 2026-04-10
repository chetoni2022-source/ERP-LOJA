import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Label, Card } from '../../components/ui';
import { Loader2, ArrowRight, ShieldCheck, Mail, Lock, User, Sparkles, Zap, ShieldAlert, CheckCircle2, Globe, Heart } from 'lucide-react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [brand, setBrand] = useState<{name:string;logo:string|null;favicon:string|null}>({name:'Aura Workspace',logo:null,favicon:null});
  
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);

  useEffect(() => {
    supabase.from('store_settings').select('store_name, logo_url, favicon_url').limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setBrand({ name: data.store_name || 'Aura Workspace', logo: data.logo_url, favicon: data.favicon_url });
        if (data.favicon_url) {
          const l = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (l) l.href = data.favicon_url;
        }
      }
    });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (recoveryMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: `${window.location.origin}/auth` });
        if (error) throw error;
        success('Elo de recuperação enviado! Verifique seu e-mail.');
        setRecoveryMode(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        success(`Bem-vindo de volta, ${form.email.split('@')[0]}!`);
      } else {
        const { data, error } = await supabase.auth.signUp({ 
            email: form.email, 
            password: form.password,
            options: { data: { full_name: form.fullName } }
        });
        if (error) throw error;
        if (data.user) {
            await supabase.from('profiles').insert([{ id: data.user.id, full_name: form.fullName, role: 'admin' }]);
            success('Bem-vindo ao ecossistema Aura! Seu ambiente está pronto.');
        }
      }
    } catch (err: any) { toastError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden text-white font-sans selection:bg-primary/30">
      {/* 🔮 Aura Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        {/* Branding Area */}
        <div className="text-center mb-10 space-y-4">
           {brand.logo ? (
             <img src={brand.logo} className="h-16 mx-auto object-contain drop-shadow-2xl" alt={brand.name} />
           ) : (
             <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border border-primary/20 shadow-2xl shadow-primary/10">
                <Sparkles size={32} className="text-primary animate-pulse" />
             </div>
           )}
           <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter italic uppercase text-white">{brand.name}</h1>
              <p className="text-white/30 text-[10px] uppercase font-bold tracking-[0.3em] font-mono">Enterprise SaaS Ecosystem</p>
           </div>
        </div>

        {/* Auth Interface */}
        <div className="glass-card !p-10 border-white/5 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 text-white/[0.02] -mr-16 -mt-16 rotate-12 pointer-events-none"><ShieldCheck size={280} /></div>
           
           <div className="mb-8 flex justify-between items-center">
              <h2 className="text-2xl font-black italic tracking-tighter text-white">
                 {recoveryMode ? 'Recuperação' : isLogin ? 'Acesso' : 'Registro'} <span className="text-primary">{recoveryMode ? 'de Elo' : 'Aura'}</span>
              </h2>
           </div>

           <form onSubmit={handleAuth} className="space-y-6 relative z-10">
              {!isLogin && !recoveryMode && (
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-white/30 tracking-widest pl-1">Nome Completo</Label>
                   <div className="relative group">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-primary transition-colors" size={18} />
                      <input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Ex: Carolina Silva" className="ux-input h-14 pl-16 !bg-white/5 border-white/5 focus:border-primary/40 font-bold" />
                   </div>
                </div>
              )}

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-white/30 tracking-widest pl-1">Identificador de E-mail</Label>
                 <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-primary transition-colors" size={18} />
                    <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" className="ux-input h-14 pl-16 !bg-white/5 border-white/5 focus:border-primary/40 font-bold" />
                 </div>
              </div>

              {!recoveryMode && (
                <div className="space-y-2">
                   <div className="flex justify-between items-center px-1">
                      <Label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Senha Criptografada</Label>
                      {isLogin && <button type="button" onClick={() => setRecoveryMode(true)} className="text-[10px] font-black uppercase text-primary tracking-widest hover:brightness-125">Perdi o Elo</button>}
                   </div>
                   <div className="relative group">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-primary transition-colors" size={18} />
                      <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="ux-input h-14 pl-16 !bg-white/5 border-white/5 focus:border-primary/40 font-bold" />
                   </div>
                </div>
              )}

              <Button type="submit" disabled={loading} className="ux-button h-16 w-full bg-primary text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all">
                 {loading ? <Loader2 className="animate-spin" /> : recoveryMode ? 'Enviar Link de Resgate' : isLogin ? 'Sincronizar Acesso' : 'Ativar Ecossistema'}
                 {!loading && <ArrowRight size={18} strokeWidth={3} />}
              </Button>
           </form>

           {/* Alternate Action */}
           <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <button 
                onClick={() => { if(recoveryMode) setRecoveryMode(false); else setIsLogin(!isLogin); }}
                className="text-white/30 hover:text-white text-[11px] font-black uppercase tracking-widest transition-all"
              >
                 {recoveryMode ? 'Voltar ao Login' : isLogin ? 'Não possui acesso? Ativar novo ERP' : 'Já possui um elo? Entrar no sistema'}
              </button>
           </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 flex justify-center gap-12 text-white/20">
           <div className="flex items-center gap-2"><ShieldCheck size={14} /><span className="text-[9px] font-black uppercase tracking-widest">Criptografia AES-256</span></div>
           <div className="flex items-center gap-2"><Zap size={14} /><span className="text-[9px] font-black uppercase tracking-widest">Cloud Sync Realtime</span></div>
        </div>
      </div>
    </div>
  );
}
