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
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

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
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6 selection:bg-zinc-900 selection:text-white font-sans antialiased">
      
      {/* 🏙️ Sophisticated Background (Radial Depth) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.02)_0%,transparent_50%)]" />
      </div>

      <div className="w-full max-w-[360px] relative z-10 flex flex-col space-y-12 animate-in fade-in duration-700">
        
        {/* Header - Editorial Style */}
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center mb-6">
             <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center text-white font-black text-xs tracking-tighter">A</div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              {recoveryMode ? 'Recuperar acesso' : isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p className="text-[13px] text-zinc-500 font-medium">
              {recoveryMode 
                ? 'Insira seu e-mail para receber as instruções' 
                : isLogin 
                  ? 'Acesse sua conta para gerenciar seu negócio' 
                  : 'Comece a gerenciar suas vendas hoje mesmo'}
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="space-y-8">
          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && !recoveryMode && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Nome Completo</Label>
                <Input 
                  required 
                  value={form.fullName} 
                  onChange={e => setForm({...form, fullName: e.target.value})} 
                  placeholder="Ex: João Silva" 
                  className="h-11 bg-white border-zinc-200 text-zinc-900 rounded-lg focus:border-zinc-900 focus:ring-0 transition-all font-medium placeholder:text-zinc-300 text-sm shadow-sm"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Endereço de E-mail</Label>
              <Input 
                required 
                type="email" 
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
                placeholder="nome@empresa.com" 
                className="h-11 bg-white border-zinc-200 text-zinc-900 rounded-lg focus:border-zinc-900 focus:ring-0 transition-all font-medium placeholder:text-zinc-300 text-sm shadow-sm"
              />
            </div>

            {!recoveryMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Senha</Label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => setRecoveryMode(true)} 
                      className="text-[10px] font-black uppercase tracking-widest text-zinc-900 hover:opacity-60 transition-opacity"
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
                  className="h-11 bg-white border-zinc-200 text-zinc-900 rounded-lg focus:border-zinc-900 focus:ring-0 transition-all font-medium placeholder:text-zinc-300 text-sm shadow-sm"
                />
              </div>
            )}

            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-11 bg-zinc-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-lg hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-200"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : (
                  <>
                    {recoveryMode ? 'Enviar Link' : isLogin ? 'Entrar no Sistema' : 'Criar minha conta'}
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
              className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              {recoveryMode ? 'Voltar para o Login' : isLogin ? 'Não possui conta? Registre-se' : 'Já possui conta? Faça login'}
            </button>
          </div>
        </div>

        {/* Minimalist Brand Footer (Optional) */}
        <div className="pt-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300">Aura ERP &copy; 2026</p>
        </div>

      </div>
    </div>
  );
}
