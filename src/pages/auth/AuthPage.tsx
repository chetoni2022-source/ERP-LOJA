import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Label, Card } from '../../components/ui';
import { Loader2, ArrowRight, ShieldCheck, Mail, Lock, User, Sparkles, Zap, ShieldAlert, CheckCircle2, Globe, Heart } from 'lucide-react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

interface StoreSettings {
  store_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  theme: string | null;
  custom_colors: any | null;
}

const THEME_PRESETS: Record<string, { bg: string, accent: string, text: string }> = {
  luxury:   { bg: '#0a0a0a', accent: '#c9a96e', text: '#f5f0eb' },
  rose:     { bg: '#fff8f5', accent: '#cb8474', text: '#2a1a14' },
  midnight: { bg: '#050a12', accent: '#7eb8f7', text: '#e8eef5' },
  pearl:    { bg: '#fafaf7', accent: '#8a7560', text: '#1a1a1a' },
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);

  useEffect(() => {
    supabase.from('store_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setSettings(data);
        if (data.favicon_url) {
          const l = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (l) l.href = data.favicon_url;
        }
      }
    });
  }, []);

  const themeVars = useMemo(() => {
    const t = settings?.theme || 'luxury';
    const preset = THEME_PRESETS[t] || THEME_PRESETS.luxury;
    
    // If custom colors exist, they override the preset
    const colors = settings?.custom_colors || {};
    return {
       bg: colors.bg || preset.bg,
       accent: colors.accent || preset.accent,
       text: colors.text || preset.text
    };
  }, [settings]);

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
    <div 
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-primary/30 transition-colors duration-1000"
      style={{ backgroundColor: themeVars.bg, color: themeVars.text }}
    >
      {/* 🔮 Dynamic Aura Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div 
           className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] animate-pulse opacity-20" 
           style={{ backgroundColor: themeVars.accent }} 
         />
         <div 
           className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] animate-pulse opacity-10" 
           style={{ backgroundColor: themeVars.accent, animationDelay: '2s' }} 
         />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        {/* Branding Area */}
        <div className="text-center mb-10 space-y-4">
           {settings?.logo_url ? (
             <img src={settings.logo_url} className="h-16 mx-auto object-contain drop-shadow-2xl" alt={settings.store_name || 'Store'} />
           ) : (
             <div 
               className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto border shadow-2xl transition-all"
               style={{ backgroundColor: `${themeVars.accent}15`, borderColor: `${themeVars.accent}30`, boxShadow: `0 20px 40px ${themeVars.accent}15` }}
             >
                <Sparkles size={32} style={{ color: themeVars.accent }} className="animate-pulse" />
             </div>
           )}
           <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter italic uppercase transition-colors" style={{ color: themeVars.text }}>
                {settings?.store_name || 'Aura Workspace'}
              </h1>
              <p className="opacity-30 text-[10px] uppercase font-bold tracking-[0.3em] font-mono">Enterprise SaaS Ecosystem</p>
           </div>
        </div>

        {/* Auth Interface */}
        <div 
          className="glass-card !p-10 shadow-2xl relative overflow-hidden border-white/5"
          style={{ backgroundColor: 'transparent', backdropFilter: 'blur(32px)', border: `1px solid ${themeVars.text}10` }}
        >
           <div className="absolute top-0 right-0 p-10 opacity-[0.02] -mr-16 -mt-16 rotate-12 pointer-events-none" style={{ color: themeVars.text }}>
             <ShieldCheck size={280} />
           </div>
           
           <div className="mb-8 flex justify-between items-center">
              <h2 className="text-2xl font-black italic tracking-tighter">
                 {recoveryMode ? 'Recuperação' : isLogin ? 'Acesso' : 'Registro'} 
                 <span className="ml-2" style={{ color: themeVars.accent }}>
                   {recoveryMode ? 'de Elo' : 'Aura'}
                 </span>
              </h2>
           </div>

           <form onSubmit={handleAuth} className="space-y-6 relative z-10">
              {!isLogin && !recoveryMode && (
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase opacity-30 tracking-widest pl-1">Nome Completo</Label>
                   <div className="relative group">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-100 transition-all transition-colors" size={18} style={{ color: themeVars.accent }} />
                      <input 
                        required 
                        value={form.fullName} 
                        onChange={e => setForm({ ...form, fullName: e.target.value })} 
                        placeholder="Ex: Carolina Silva" 
                        className="ux-input h-14 pl-16 font-bold"
                        style={{ backgroundColor: `${themeVars.text}05`, borderColor: `${themeVars.text}10`, color: themeVars.text }}
                      />
                   </div>
                </div>
              )}

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase opacity-30 tracking-widest pl-1">Identificador de E-mail</Label>
                 <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-100 transition-all" size={18} style={{ color: themeVars.accent }} />
                    <input 
                      required 
                      type="email" 
                      value={form.email} 
                      onChange={e => setForm({ ...form, email: e.target.value })} 
                      placeholder="seu@email.com" 
                      className="ux-input h-14 pl-16 font-bold"
                      style={{ backgroundColor: `${themeVars.text}05`, borderColor: `${themeVars.text}10`, color: themeVars.text }}
                    />
                 </div>
              </div>

              {!recoveryMode && (
                <div className="space-y-2">
                   <div className="flex justify-between items-center px-1">
                      <Label className="text-[10px] font-black uppercase opacity-30 tracking-widest">Senha Criptografada</Label>
                      {isLogin && (
                        <button 
                          type="button" 
                          onClick={() => setRecoveryMode(true)} 
                          className="text-[10px] font-black uppercase tracking-widest hover:brightness-125"
                          style={{ color: themeVars.accent }}
                        >
                          Perdi o Elo
                        </button>
                      )}
                   </div>
                   <div className="relative group">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-100 transition-all" size={18} style={{ color: themeVars.accent }} />
                      <input 
                        required 
                        type="password" 
                        value={form.password} 
                        onChange={e => setForm({ ...form, password: e.target.value })} 
                        placeholder="••••••••" 
                        className="ux-input h-14 pl-16 font-bold"
                        style={{ backgroundColor: `${themeVars.text}05`, borderColor: `${themeVars.text}10`, color: themeVars.text }}
                      />
                   </div>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading} 
                className="ux-button h-16 w-full font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                style={{ backgroundColor: themeVars.accent, color: themeVars.bg, boxShadow: `0 20px 40px ${themeVars.accent}30` }}
              >
                 {loading ? <Loader2 className="animate-spin" /> : recoveryMode ? 'Enviar Link de Resgate' : isLogin ? 'Sincronizar Acesso' : 'Ativar Ecossistema'}
                 {!loading && <ArrowRight size={18} strokeWidth={3} />}
              </Button>
           </form>

           {/* Alternate Action */}
           <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <button 
                onClick={() => { if(recoveryMode) setRecoveryMode(false); else setIsLogin(!isLogin); }}
                className="opacity-30 hover:opacity-100 text-[11px] font-black uppercase tracking-widest transition-all"
                style={{ color: themeVars.text }}
              >
                 {recoveryMode ? 'Voltar ao Login' : isLogin ? 'Não possui acesso? Ativar novo ERP' : 'Já possui um elo? Entrar no sistema'}
              </button>
           </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 flex justify-center gap-12 opacity-20" style={{ color: themeVars.text }}>
           <div className="flex items-center gap-2"><ShieldCheck size={14} /><span className="text-[9px] font-black uppercase tracking-widest">AES-256</span></div>
           <div className="flex items-center gap-2"><Zap size={14} /><span className="text-[9px] font-black uppercase tracking-widest">Cloud Sync</span></div>
        </div>
      </div>
    </div>
  );
}
