import React, { useState, useEffect } from 'react';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { Loader2, ShieldCheck, Zap, Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AUTH_STYLES = `
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes auraMove {
    0% { transform: scale(1) translate(0, 0); }
    50% { transform: scale(1.2) translate(-2%, 2%); }
    100% { transform: scale(1) translate(0, 0); }
  }
  @keyframes shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
    40%, 60% { transform: translate3d(4px, 0, 0); }
  }
  body { 
    margin: 0; 
    -webkit-font-smoothing: antialiased; 
    background-color: #030712; 
    overflow: hidden;
  }
  .focus-ring:focus {
    border-color: #E91E8C !important;
    box-shadow: 0 0 0 4px rgba(233, 30, 140, 0.15) !important;
  }
`;

type AuthView = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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
    setSuccessMsg(null);
    
    try {
      if (view === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate('/dashboard');
      } else if (view === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setSuccessMsg('Confirme seu e-mail para ativar sua conta administrativa.');
        setView('login');
      } else if (view === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setSuccessMsg('Link de recuperação enviado.');
        setView('login');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado');
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
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* ── Background Aura ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        background: 'radial-gradient(circle at 50% 50%, #111827 0%, #030712 100%)'
      }} />
      
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(circle at center, rgba(233, 30, 140, 0.08) 0%, transparent 60%)',
        zIndex: 1,
        animation: 'auraMove 10s infinite ease-in-out',
        filter: 'blur(80px)'
      }} />

      {/* ── Content ── */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        zIndex: 3,
        animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Superior: Logo Pod */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            display: 'inline-flex',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: '20px',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
          }}>
            {brand.logo ? (
               <img 
                 src={brand.logo} 
                 alt="Logo" 
                 style={{ height: '48px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.1))' }} 
               />
            ) : brand.favicon ? (
               <img src={brand.favicon} alt="Favicon" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
            ) : (
               <Zap size={32} color="#E91E8C" />
            )}
          </div>
          
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', margin: '0 0 8px 0', letterSpacing: '-0.04em' }}>
            {view === 'forgot' ? 'Recuperar Acesso' : brand.name}
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            {view === 'login' && 'O controle total do seu império começa aqui'}
            {view === 'signup' && 'Crie sua conta administrativa em segundos'}
            {view === 'forgot' && 'Insira seu e-mail para receber um link seguro'}
          </p>
        </div>

        {/* Card: Glassmorphism */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '48px',
          borderRadius: '32px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '14px', borderRadius: '14px',
              fontSize: '13px', fontWeight: 600, marginBottom: '24px', border: '1px solid rgba(239, 68, 68, 0.2)',
              animation: 'shake 0.4s ease-in-out', textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '14px', borderRadius: '14px',
              fontSize: '13px', fontWeight: 600, marginBottom: '24px', border: '1px solid rgba(16, 185, 129, 0.2)',
              textAlign: 'center'
            }}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Endereço de E-mail
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={20} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Seu e-mail corporativo"
                  className="focus-ring"
                  style={{
                    width: '100%', padding: '14px 16px 14px 48px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '15px', color: '#fff', outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box',
                    background: 'rgba(255, 255, 255, 0.02)'
                  }}
                />
              </div>
            </div>

            {view !== 'forgot' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Senha de Acesso
                  </label>
                  {view === 'login' && (
                    <button type="button" onClick={() => setView('forgot')} style={{ background: 'none', border: 'none', padding: 0, color: '#E91E8C', fontSize: '11px', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
                      Esqueci
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={20} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="focus-ring"
                    style={{
                      width: '100%', padding: '14px 16px 14px 48px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '15px', color: '#fff', outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box',
                      background: 'rgba(255, 255, 255, 0.02)'
                    }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '16px', 
                background: view === 'forgot' ? '#ffffff' : '#E91E8C', 
                color: view === 'forgot' ? '#000000' : '#ffffff',
                border: 'none', borderRadius: '18px', fontSize: '16px', fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.3s',
                marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                boxShadow: view === 'forgot' ? 'none' : '0 10px 25px -5px rgba(233, 30, 140, 0.4)'
              }}
              onMouseEnter={e => {
                if (!loading) e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                <>
                  {view === 'login' && 'Acessar Painel'}
                  {view === 'signup' && 'Criar Minha Conta'}
                  {view === 'forgot' && 'Enviar Recuperação'}
                </>
              )}
            </button>
          </form>

          <footer style={{ marginTop: '32px', textAlign: 'center' }}>
             <button
                type="button"
                onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                {view === 'login' ? 'Criar nova conta admin' : 'Voltar para o acesso'}
              </button>
          </footer>
        </div>

        {/* Rodapé: Trust Badge */}
        <div style={{ marginTop: '40px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
           <div style={{ height: '1px', width: '24px', background: 'rgba(255,255,255,0.05)' }} />
           <ShieldCheck size={16} color="rgba(255,255,255,0.15)" />
           <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
             Encrypted Enterprise Access
           </span>
           <div style={{ height: '1px', width: '24px', background: 'rgba(255,255,255,0.05)' }} />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: AUTH_STYLES }} />
    </div>
  );
}
