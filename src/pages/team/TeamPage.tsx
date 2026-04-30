import React, { useState, useEffect } from 'react';
import { Button, Input } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Users, Loader2, Trash2, Mail, Shield, ShieldCheck, Eye, UserPlus, AlertCircle } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Administrador', desc: 'Acesso total ao sistema' },
  { value: 'manager', label: 'Gerente', desc: 'Estoque, Vendas e Catálogos' },
  { value: 'sales', label: 'Vendedor', desc: 'Apenas Vendas e Catálogos' },
];

const PERMISSIONS: Record<string, string[]> = {
  admin: ['dashboard', 'inventory', 'categories', 'sales', 'catalogs', 'settings', 'team'],
  manager: ['dashboard', 'inventory', 'categories', 'sales', 'catalogs'],
  sales: ['sales', 'catalogs'],
};

interface TeamMember {
  id: string;
  full_name: string | null;
  role: string;
  created_at: string;
  email?: string;
}

export default function TeamPage() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('sales');
  const [inviting, setInviting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [user]);

  async function fetchMembers() {
    setLoading(true);
    try {
      // For now, simple: you see yourself. 
      // Later: you see everyone linked to your store_id.
      const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).order('created_at');
      setMembers(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase.from('team_invites').insert({
        email: inviteEmail,
        role: inviteRole,
        invited_by: user?.id
      });

      if (error) {
        if (error.code === '23505') throw new Error('Este e-mail já possui um convite pendente.');
        throw error;
      }

      setSuccessMsg(`Convite registrado para ${inviteEmail}! Agora, peça para o membro se cadastrar na plataforma com este e-mail para entrar automaticamente no seu time.`);
      setInviteEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar convite. Verifique se o e-mail está correto.');
    } finally {
      setInviting(false);
    }
  }

  async function updateRole(id: string, role: string) {
    await supabase.from('profiles').update({ role }).eq('id', id);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
  }

  async function removeMember(id: string) {
    if (!confirm('Remover este membro da equipe?')) return;
    await supabase.from('profiles').delete().eq('id', id);
    setMembers(prev => prev.filter(m => m.id !== id));
  }

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400',
      manager: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
      sales: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    };
    const roleData = ROLES.find(r => r.value === role);
    return (
      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${colors[role] || 'bg-muted border-border text-muted-foreground'}`}>
        {roleData?.label || role}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
          <Users className="text-primary hidden md:inline" /> Gestão de Equipe
        </h1>
        <p className="text-sm text-muted-foreground">Convide membros, defina cargos e gerencie as permissões de acesso.</p>
      </div>

      {/* Invite Form */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-5 md:p-6">
        <h2 className="font-bold text-base text-foreground flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-primary" /> Convidar Novo Membro
        </h2>
        <form onSubmit={handleInvite} className="space-y-3 md:space-y-0 md:flex md:flex-row md:gap-3">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              required
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@membro.com"
              className="h-11 pl-9 font-medium bg-background rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="h-11 px-3 bg-background border border-border text-foreground font-bold text-sm rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-primary flex-1 md:w-48 appearance-none"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <Button type="submit" disabled={inviting} className="h-11 px-6 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-xl flex-1 md:flex-none">
              {inviting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Convidar
            </Button>
          </div>
        </form>

        {successMsg && (
          <div className="mt-3 flex items-start gap-2 text-sm text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-lg font-semibold">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mt-3 flex items-start gap-2 text-sm text-orange-600 bg-orange-500/10 border border-orange-500/20 px-4 py-3 rounded-lg font-semibold">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Para convidar membros por e-mail:</p>
              <p className="font-normal mt-0.5">Acesse <strong>app.supabase.com → Authentication → Users → Invite user</strong> e insira o e-mail. Após aceitar, o membro aparecerá aqui para você definir o cargo.</p>
            </div>
          </div>
        )}
      </div>

      {/* Roles Reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ROLES.map(role => (
          <div key={role.value} className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm text-foreground">{role.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{role.desc}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {PERMISSIONS[role.value].map(perm => (
                <span key={perm} className="text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                  {perm}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Members List */}
      <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/20">
          <h2 className="font-bold text-sm text-foreground uppercase tracking-widest">Membros Ativos ({members.length})</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin h-6 w-6 text-primary/50" /></div>
        ) : members.length === 0 ? (
          <div className="py-14 text-center text-muted-foreground">
            <Users className="h-10 w-10 opacity-20 mx-auto mb-3" />
            <span className="font-bold">Nenhum membro ainda — convide alguém!</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map(member => {
              const isCurrentUser = member.id === user?.id;
              return (
                <div key={member.id} className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-4 hover:bg-muted/10 transition-colors">
                  <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="font-black text-primary text-xs md:text-sm">
                      {(member.full_name || 'M')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className="font-bold text-sm text-foreground truncate">{member.full_name || 'Membro sem nome'}</span>
                      {isCurrentUser && <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded shrink-0">Você</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {getRoleBadge(member.role || 'sales')}
                      <span className="text-[9px] text-muted-foreground opacity-60">· desde {new Date(member.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</span>
                    </div>
                  </div>

                  {!isCurrentUser && (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={member.role || 'sales'}
                        onChange={e => updateRole(member.id, e.target.value)}
                        className="h-8 px-2 bg-background border border-border text-foreground font-bold text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-primary hidden sm:block"
                      >
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <Button onClick={() => removeMember(member.id)} className="h-9 w-9 px-0 bg-muted/30 border border-border/40 text-foreground hover:bg-red-500/10 hover:border-red-400 hover:text-red-500 transition-colors rounded-xl">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
        <Eye className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">Como funcionam as permissões</p>
          <p className="font-normal text-xs mt-0.5 opacity-80">Os cargos definem o que cada membro pode acessar. O controle real de acesso deve ser configurado nas políticas RLS do Supabase para segurança máxima.</p>
        </div>
      </div>
    </div>
  );
}
