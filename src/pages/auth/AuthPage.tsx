import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Label } from '../../components/ui';
import { Loader2, ArrowRight, ShieldCheck, Mail, Lock, User, Sparkles } from 'lucide-react';

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
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  useEffect(() => {
    supabase.from('store_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data);
    });
  }, []);

  const theme = useMemo(() => {
    const t = settings?.theme || 'luxury';
    const preset = THEME_PRESETS[t] || THEME_PRESETS.luxury;
    const colors = settings?.custom_colors || {};
    return {
       bg: colors.bg || preset.bg,
       accent: colors.accent || preset.accent,
       text: colors.text || preset.text,
       isDark: t === 'luxury' || t === 'midnight'
    };
  }, [settings]);

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

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6 font-sans transition-colors duration-700"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* 🌑 Subtle Background Gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div 
          className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[150px]"
          style={{ background: `radial-gradient(circle, ${theme.accent} 0%, transparent 70%)` }}
        />
        <div 
          className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[150px]"
          style={{ background: `radial-gradient(circle, ${theme.accent} 0%, transparent 70%)` }}
        />
      </div>

      <div className="w-full max-w-[400px] relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Logo/Branding */}
        <div className="text-center space-y-6">
          {settings?.logo_url ? (
            <img src={settings.logo_url} className="h-12 mx-auto object-contain" alt="Logo" />
          ) : (
            <div className="h-14 w-14 mx-auto rounded-2xl flex items-center justify-center bg-white/5 border border-white/10">
              <Sparkles size={28} style={{ color: theme.accent }} />
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.text }}>
              {settings?.store_name || 'Aura Workspace'}
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30">
              Gestão de Alta Performance
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-xl font-bold">
              {recoveryMode ? 'Recuperar Senha' : isLogin ? 'Login' : 'Criar Conta'}
            </h2>
            <p className="text-sm opacity-40 mt-1">
              {recoveryMode ? 'Enviaremos um link para o seu e-mail.' : 'Bem-vindo ao centro de comando.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && !recoveryMode && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest opacity-40 font-bold ml-1">Nome</Label>
                <div className="relative group">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity" style={{ color: theme.accent }} />
                  <Input 
                    required 
                    value={form.fullName} 
                    onChange={e => setForm({...form, fullName: e.target.value})} 
                    placeholder="Seu nome completo" 
                    className="h-12 pl-12 bg-black/20 border-white/5 rounded-xl focus:border-white/20 transition-all font-medium text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest opacity-40 font-bold ml-1">E-mail</Label>
              <div className="relative group">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity" style={{ color: theme.accent }} />
                <Input 
                  required 
                  type="email" 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})} 
                  placeholder="exemplo@email.com" 
                  className="h-12 pl-12 bg-black/20 border-white/5 rounded-xl focus:border-white/20 transition-all font-medium text-sm text-white"
                />
              </div>
            </div>

            {!recoveryMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Label className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Senha</Label>
                  {isLogin && (
                    <button type="button" onClick={() => setRecoveryMode(true)} className="text-[10px] uppercase tracking-widest font-bold hover:opacity-80 transition-opacity" style={{ color: theme.accent }}>
                      Esqueci a senha
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity" style={{ color: theme.accent }} />
                  <Input 
                    required 
                    type="password" 
                    value={form.password} 
                    onChange={e => setForm({...form, password: e.target.value})} 
                    placeholder="••••••••" 
                    className="h-12 pl-12 bg-black/20 border-white/5 rounded-xl focus:border-white/20 transition-all font-medium text-sm text-white"
                  />
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-12 rounded-xl bg-white text-black font-bold text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
              style={{ backgroundColor: theme.accent, color: theme.isDark ? '#000' : '#fff' }}
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                <>
                  {recoveryMode ? 'Enviar Instruções' : isLogin ? 'Entrar' : 'Começar Agora'}
                  {!loading && <ArrowRight size={16} />}
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <button 
              type="button" 
              onClick={() => { if(recoveryMode) setRecoveryMode(false); else setIsLogin(!isLogin); }}
              className="text-[11px] uppercase tracking-widest font-black opacity-40 hover:opacity-100 transition-all"
            >
              {recoveryMode ? 'Voltar para o Login' : isLogin ? 'Ainda não tem conta? Criar conta' : 'Já possui conta? Fazer login'}
            </button>
          </div>
        </div>

        {/* Security / Trust */}
        <div className="flex items-center justify-center gap-6 opacity-20">
          <div className="flex items-center gap-2"><ShieldCheck size={14} /><span className="text-[9px] font-bold uppercase tracking-widest">AES-256 Crypto</span></div>
          <div className="h-1 w-1 rounded-full bg-white/20" />
          <div className="flex items-center gap-2"><Sparkles size={14} /><span className="text-[9px] font-bold uppercase tracking-widest">SaaS Edition</span></div>
        </div>
      </div>
    </div>
  );
}
