import React, { useState, useEffect } from 'react';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { Loader2, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// High-quality fallbacks if the user has no products yet
const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573408339177-331590e87b7a?w=1200&auto=format&fit=crop&q=80'
];

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

  const [bgImages, setBgImages] = useState<string[]>(FALLBACK_PHOTOS);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Load Branding
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

        // 2. Load Real Product Images for Carousel
        const { data: products } = await supabase
          .from('products')
          .select('images, image_url')
          .not('images', 'is', null)
          .limit(5);

        if (products && products.length > 0) {
           const extracted = products.map(p => {
             const raw = (p.images && p.images.length > 0) ? p.images[0] : p.image_url;
             return getProxyUrl(raw) || '';
           }).filter(url => url !== '');
           
           if (extracted.length > 0) {
             setBgImages([...extracted, ...FALLBACK_PHOTOS].slice(0, 6));
           }
        }
      } catch (e) {
        console.error("Error loading login data:", e);
      }
    }
    loadData();
  }, []);

  // Carousel timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveImgIdx(prev => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [bgImages]);

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
        maxWidth: 580,
        zIndex: 10
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 48, animation: 'fadeInDown 0.8s ease-out' }}>
          {brand.logo ? (
            <img
              src={brand.logo}
              alt="Logo"
              crossOrigin="anonymous"
              style={{ height: 58, objectFit: 'contain' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#E91E8C', padding: 8, borderRadius: 12, boxShadow: '0 4px 12px rgba(233, 30, 140, 0.2)' }}>
                <svg width="24" height="24" viewBox="0 0 34 34" fill="none">
                  <path d="M17 3L29 13L17 31L5 13L17 3Z" fill="white" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {brand.name.split(' ')[0]}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#E91E8C', letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 2 }}>
                  {brand.name.split(' ').slice(1).join(' ') || 'ERP SYSTEM'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 42, animation: 'fadeInLeft 0.8s ease-out 0.1s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
             <span style={{ padding: '4px 10px', background: '#E91E8C15', color: '#E91E8C', fontSize: 10, fontWeight: 800, borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
               Versão 2026 PRO
             </span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#111', margin: 0, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            {isLogin ? 'Bem-vindo de volta' : 'Comece sua jornada'}
          </h1>
          <p style={{ fontSize: 16, color: '#6b7280', marginTop: 12, fontWeight: 500 }}>
            {isLogin
              ? 'Gerencie seu catálogo, estoque e lucros em um só lugar.'
              : 'Tudo o que sua marca precisa para escalar a operação.'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fff1f2', color: '#e11d48', padding: '14px 18px', borderRadius: 12,
            border: '1px solid #fecdd3', fontSize: 14, marginBottom: 24, fontWeight: 600,
            animation: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeInUp 0.8s ease-out 0.2s both' }}>
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              E-mail Profissional
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="exemplo@suamarca.com"
              style={{
                width: '100%', padding: '16px 18px', border: '2px solid #f3f4f6',
                borderRadius: 14, fontSize: 15, color: '#111', background: '#f9fafb',
                outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                fontWeight: 600
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = '#E91E8C';
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(233, 30, 140, 0.1)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#f3f4f6';
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sua Senha</label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={{
                width: '100%', padding: '16px 18px', border: '2px solid #f3f4f6',
                borderRadius: 14, fontSize: 15, color: '#111', background: '#f9fafb',
                outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                fontWeight: 600
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = '#E91E8C';
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(233, 30, 140, 0.1)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#f3f4f6';
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '18px', background: loading ? '#f9a8d4' : '#E91E8C',
              color: '#fff', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10, marginTop: 12, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 10px 25px -5px rgba(233, 30, 140, 0.4)',
              transform: loading ? 'none' : 'translateY(0)'
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {loading ? (
              <Loader2 style={{ width: 22, height: 22, animation: 'spin 1.2s linear infinite' }} />
            ) : (
              <>
                {isLogin ? 'Acessar Painel de Controle' : 'Criar minha conta Grátis'}
                <Zap size={18} fill="currentColor" />
              </>
            )}
          </button>
        </form>

        {/* Toggle & Footer */}
        <div style={{ marginTop: 42, textAlign: 'center', animation: 'fadeIn 1s ease-out 0.5s both' }}>
          <p style={{ fontSize: 15, color: '#6b7280', fontWeight: 500 }}>
            {isLogin ? 'Ainda não possui acesso? ' : 'Já faz parte do time? '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              style={{ background: 'none', border: 'none', color: '#E91E8C', fontWeight: 800, cursor: 'pointer', fontSize: 15, padding: 0, textDecoration: 'underline', textUnderlineOffset: 4 }}
            >
              {isLogin ? 'Solicitar Acesso' : 'Entrar na conta'}
            </button>
          </p>
          
          <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center', gap: 24, opacity: 0.5 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
               <ShieldCheck size={14} /> 100% Seguro
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
               <Sparkles size={14} /> Design Premium
             </div>
          </div>
        </div>
      </div>

      {/* ── DIREITA: Premium Carousel (Dinamico com fotos do Usuario) ── */}
      <div style={{
        flex: 1,
        position: 'relative',
        backgroundColor: '#111',
        overflow: 'hidden'
      }}>
        {/* Images with cross-fade */}
        {bgImages.map((img, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'opacity 1.5s ease-in-out, transform 10s linear',
              opacity: activeImgIdx === idx ? 1 : 0,
              transform: activeImgIdx === idx ? 'scale(1.1)' : 'scale(1.0)',
              zIndex: activeImgIdx === idx ? 1 : 0
            }}
          />
        ))}

        {/* Dark overlay & Branded Content */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.8))',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 64
        }}>
           <div style={{ maxWidth: 500, animation: 'fadeInUp 1s ease-out' }}>
              <div style={{ height: 2, width: 48, background: '#E91E8C', marginBottom: 24 }} />
              <h2 style={{ color: 'white', fontSize: 42, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0 }}>
                Seu acervo.<br />Seu império.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, marginTop: 16, fontWeight: 500, lineHeight: 1.6 }}>
                A evolução do seu negócio começa por aqui. Visualize cada detalhe, controle cada centavo.
              </p>
           </div>
           
           {/* Navigation Dots */}
           <div style={{ position: 'absolute', bottom: 32, right: 64, display: 'flex', gap: 8 }}>
              {bgImages.map((_, i) => (
                <div key={i} style={{ 
                  width: activeImgIdx === i ? 24 : 6, 
                  height: 6, 
                  borderRadius: 3, 
                  background: activeImgIdx === i ? '#E91E8C' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.3s ease'
                }} />
              ))}
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        body { margin: 0; -webkit-font-smoothing: antialiased; }
      `}} />
    </div>
  );
}
