import React, { useState, useEffect } from 'react';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { Loader2, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AUTH_STYLES = `
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
    40%, 60% { transform: translate3d(4px, 0, 0); }
  }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  body { margin: 0; -webkit-font-smoothing: antialiased; background-color: #f9fafb; }
`;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [brand, setBrand] = useState<{name: string, logo: string | null, favicon: string | null}>({ 
    name: 'LARIS ACESSÓRIOS', 
    logo: null,
    favicon: null
  });

  useEffect(() => {
    async function loadBranding() {
      try {
        const { data: settings } = await supabase
          .from('store_settings')
          .select('store_name, logo_url, favicon_url')
          .limit(1)
          .maybeSingle();
        
        if (settings) {
          const proxyLogo = getProxyUrl(settings.logo_url);
          const proxyFavicon = getProxyUrl(settings.favicon_url);

          setBrand({
            name: settings.store_name || 'LARIS ACESSÓRIOS',
            logo: proxyLogo,
            favicon: proxyFavicon
          });
          
          if (proxyFavicon) {
             let link: HTMLLinkElement = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
             if (!link) { link = document.createElement('link'); link.rel = 'shortcut icon'; document.head.appendChild(link); }
             link.type = 'image/x-icon';
             link.crossOrigin = "anonymous";
             link.href = `${proxyFavicon}?v=${Date.now()}`;
          }
        }
      } catch (e) {
        console.error("Error loading branding:", e);
      }
    }
    loadBranding();
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
        alert('Confirme seu e-mail para continuar.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '24px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        animation: 'fadeInUp 0.6s ease-out'
      }}>
        
        {/* Superior: Branding Minimalista */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {brand.favicon ? (
            <img 
              src={brand.favicon} 
              alt="Favicon" 
              crossOrigin="anonymous"
              style={{ width: '48px', height: '48px', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
            />
          ) : (
            <div style={{ 
              width: '48px', height: '48px', background: '#E91E8C', borderRadius: '12px', 
              display: 'inline-flex', alignItems: 'center', justifyCenter: 'center', marginBottom: '16px' 
            }}>
              <Zap size={24} color="white" />
            </div>
          )}
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            {brand.name}
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px', fontWeight: 500 }}>
            {isLogin ? 'Faça login para gerenciar seu negócio' : 'Crie sua conta administrativa'}
          </p>
        </div>

        {/* Card de Autenticação */}
        <div style={{
          background: '#ffffff',
          padding: '40px',
          borderRadius: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #f3f4f6'
        }}>
          {error && (
            <div style={{
              background: '#FEF2F2', color: '#B91C1C', padding: '12px 16px', borderRadius: '12px',
              fontSize: '13px', fontWeight: 600, marginBottom: '24px', border: '1px solid #FEE2E2',
              animation: 'shake 0.4s ease-in-out'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@empresa.com"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #D1D5DB',
                  fontSize: '15px', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box'
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#E91E8C')}
                onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #D1D5DB',
                  fontSize: '15px', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box'
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#E91E8C')}
                onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', background: '#111827', color: '#ffffff',
                border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
              }}
            >
              {loading ? <Loader2 className="animate-spin" style={{ margin: '0 auto' }} /> : (isLogin ? 'Entrar no Sistema' : 'Criar Conta')}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já possui conta? Faça login'}
            </button>
          </div>
        </div>

        {/* Rodapé Interno */}
        <div style={{ marginTop: '32px', textAlign: 'center', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
           <ShieldCheck size={14} color="#6B7280" />
           <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
             Painel Administrativo Seguro
           </span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: AUTH_STYLES }} />
    </div>
  );
}
