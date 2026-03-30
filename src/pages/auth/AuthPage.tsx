import React, { useState, useEffect } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { LayoutDashboard, Loader2, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // White-label state - Keep it generic on login to prevent cross-tenant branding leak
  const [brand] = useState<{name: string, logo: string | null}>({ 
    name: 'Laris ERP', 
    logo: null 
  });

  useEffect(() => {
    // Branding is applied after login in AppLayout based on the specific user.
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate('/dashboard');
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        alert('Confirme seu e-mail para continuar ou tente logar direto.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-sm bg-background border border-border rounded-xl shadow-lg p-8 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          {brand.logo ? (
            <img src={brand.logo} alt="Logo" className="h-16 w-16 object-contain mb-4 drop-shadow-sm" />
          ) : (
            <div className="h-14 w-14 bg-primary text-primary-foreground rounded-xl flex items-center justify-center mb-4 shadow-sm">
              <Store size={28} />
            </div>
          )}
          
          <h2 className="text-2xl font-bold tracking-tight text-foreground text-center line-clamp-1">
            {isLogin ? `Acessar ${brand.name}` : `Cadastro em ${brand.name}`}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {isLogin ? 'Bem-vindo de volta! Insira suas credenciais.' : 'Crie sua conta administrativa.'}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4 border border-destructive/20 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail Comercial</Label>
            <Input 
              id="email" 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              {isLogin && <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors hover:underline outline-none">Recuperar senha</a>}
            </div>
            <Input 
              id="password" 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-background"
            />
          </div>
          <Button type="submit" className="w-full mt-2 shadow-sm font-semibold" disabled={loading}>
            {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
            {isLogin ? 'Entrar no Sistema' : 'Prosseguir e Criar'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          {isLogin ? 'Ainda não habilitou sua loja? ' : 'Já é administrador? '}
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-primary font-semibold hover:underline outline-none transition-colors"
          >
            {isLogin ? 'Criar Loja' : 'Acessar agora'}
          </button>
        </div>
      </div>
    </div>
  );
}
