import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, KeyRound, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RESET_STYLES = `
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
    40%, 60% { transform: translate3d(4px, 0, 0); }
  }
  body { margin: 0; -webkit-font-smoothing: antialiased; background-color: #f9fafb; }
`;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate('/auth'), 3000);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao atualizar a senha');
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
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '56px', height: '56px', background: '#111827', borderRadius: '14px', 
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' 
          }}>
            <KeyRound size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            Definir Nova Senha
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px', fontWeight: 500 }}>
            Escolha uma senha forte e segura para sua conta.
          </p>
        </div>

        <div style={{
          background: '#ffffff',
          padding: '40px',
          borderRadius: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #f3f4f6'
        }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
               <CheckCircle2 size={48} color="#166534" style={{ margin: '0 auto 16px auto' }} />
               <h3 style={{ color: '#166534', fontSize: '18px', fontWeight: 700 }}>Senha Atualizada!</h3>
               <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
                 Redirecionando para o login em instantes...
               </p>
            </div>
          ) : (
            <>
              {error && (
                <div style={{
                  background: '#FEF2F2', color: '#B91C1C', padding: '12px 16px', borderRadius: '12px',
                  fontSize: '13px', fontWeight: 600, marginBottom: '24px', border: '1px solid #FEE2E2',
                  animation: 'shake 0.4s ease-in-out'
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Nova Senha
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={18} color="#9CA3AF" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="No mínimo 6 caracteres"
                      style={{
                        width: '100%', padding: '12px 16px 12px 42px', borderRadius: '12px', border: '1px solid #D1D5DB',
                        fontSize: '15px', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box'
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#111827')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Confirmar Senha
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={18} color="#9CA3AF" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      style={{
                        width: '100%', padding: '12px 16px 12px 42px', borderRadius: '12px', border: '1px solid #D1D5DB',
                        fontSize: '15px', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box'
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#111827')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#D1D5DB')}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px', background: '#111827', color: '#ffffff',
                    border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                    marginTop: '10px'
                  }}
                >
                  {loading ? <Loader2 className="animate-spin" size={20} style={{ margin: '0 auto' }} /> : 'Salvar Nova Senha'}
                </button>
              </form>
            </>
          )}
        </div>

        <div style={{ marginTop: '32px', textAlign: 'center', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
           <ShieldCheck size={14} color="#6B7280" />
           <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
             Redefinição Segura & Verificada
           </span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: RESET_STYLES }} />
    </div>
  );
}
