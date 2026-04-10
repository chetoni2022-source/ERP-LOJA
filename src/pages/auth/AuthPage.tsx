import React, { useState, useEffect } from 'react';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Beautiful jewelry photo for the right panel
const JEWELRY_PHOTO = 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&auto=format&fit=crop&q=80';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [brand, setBrand] = useState<{name: string, logo: string | null}>({ 
    name: 'LARIS ACESSÓRIOS', 
    logo: null 
  });

  useEffect(() => {
    async function loadBranding() {
      try {
        const { data } = await supabase
          .from('store_settings')
          .select('store_name, logo_url, favicon_url')
          .limit(1)
          .maybeSingle();
        
        if (data) {
          const proxyLogo = getProxyUrl(data.logo_url);
          const proxyFavicon = getProxyUrl(data.favicon_url);

          setBrand({
            name: data.store_name || 'LARIS ACESSÓRIOS',
            logo: proxyLogo
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
        console.error("Error loading login branding:", e);
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
        alert('Confirme seu e-mail para continuar ou tente logar direto.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* ── ESQUERDA: Formulário ── */}
      <div style={{
        flex: '0 0 50%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 64px',
        background: '#ffffff',
        maxWidth: 560,
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 48 }}>
          {brand.logo ? (
            <img
              src={brand.logo}
              alt="Logo"
              crossOrigin="anonymous"
              style={{ height: 52, objectFit: 'contain' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Diamond SVG logo */}
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                <path d="M17 3L29 13L17 31L5 13L17 3Z" fill="#E91E8C" stroke="#E91E8C" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M5 13H29" stroke="white" strokeWidth="1.5"/>
                <path d="M17 3L11 13M17 3L23 13" stroke="white" strokeWidth="1.5"/>
              </svg>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.01em', lineHeight: 1 }}>
                  {brand.name.split(' ')[0]}
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: '#E91E8C', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  {brand.name.split(' ').slice(1).join(' ') || 'ACESSÓRIOS'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111', margin: 0, lineHeight: 1.2 }}>
            {isLogin ? 'Seja bem-vindo(a)' : 'Criar conta'}
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280', marginTop: 8 }}>
            {isLogin
              ? 'Preencha as informações abaixo para entrar na plataforma'
              : 'Crie sua conta de administrador da plataforma'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: 8,
            border: '1px solid #fecaca', fontSize: 13, marginBottom: 20, fontWeight: 500
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{
                width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb',
                borderRadius: 8, fontSize: 15, color: '#111', background: '#f9fafb',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#E91E8C'}
              onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>Senha</label>
              {isLogin && (
                <a href="#" style={{ fontSize: 13, color: '#E91E8C', textDecoration: 'none', fontWeight: 500 }}>
                  Esqueceu sua senha?
                </a>
              )}
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb',
                borderRadius: 8, fontSize: 15, color: '#111', background: '#f9fafb',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#E91E8C'}
              onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', background: loading ? '#f9a8d4' : '#E91E8C',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, marginTop: 4, transition: 'background 0.15s',
              letterSpacing: '0.01em'
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#c41878'; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#E91E8C'; }}
          >
            {loading && <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />}
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        {/* Toggle */}
        <p style={{ marginTop: 28, fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
          {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'none', border: 'none', color: '#E91E8C', fontWeight: 600, cursor: 'pointer', fontSize: 14, padding: 0 }}
          >
            {isLogin ? 'Criar conta' : 'Entrar agora'}
          </button>
        </p>
      </div>

      {/* ── DIREITA: Foto ── */}
      <div style={{
        flex: 1,
        backgroundImage: `url(${JEWELRY_PHOTO})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
      }} />
    </div>
  );
}
