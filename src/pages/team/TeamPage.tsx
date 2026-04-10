import React, { useState, useEffect } from 'react';
import { Button, Input } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Users, Loader2, Trash2, Mail, Shield, ShieldCheck, Eye, UserPlus, AlertCircle, Zap, Sparkles, UserCheck, Settings2, Target, Crosshair, Crown } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Fundador/Master', desc: 'Soberania total sobre o ecossistema' },
  { value: 'manager', label: 'Gerente Operacional', desc: 'Gestão de estoque e catalogações' },
  { value: 'sales', label: 'Estrategista de Vendas', desc: 'Foco exclusivo em PDV e vitrines' },
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

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

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
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).order('created_at');
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
        if (error.code === '23505') throw new Error('Convite já em órbita para este e-mail.');
        throw error;
      }
      setSuccessMsg(`Elo estendido a ${inviteEmail}! Solicite o registro deste membro na Aura.`);
      setInviteEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de rede ao estender elo.');
    } finally {
      setInviting(false);
    }
  }

  async function updateRole(id: string, role: string) {
    if (!user) return;
    await supabase.from('profiles').update({ role }).eq('id', id);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
  }

  async function removeMember(id: string) {
    if (!confirm('Cortar conexão deste membro com o time?')) return;
    await supabase.from('profiles').delete().eq('id', id);
    setMembers(prev => prev.filter(m => m.id !== id));
  }

  const getRoleBadge = (role: string) => {
    const roles: Record<string, {label: string, color: string, icon: any}> = {
      admin: { label: 'Administrador', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', icon: Crown },
      manager: { label: 'Gerente', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: UserCheck },
      sales: { label: 'Estrategista', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Zap },
    };
    const r = roles[role] || roles.sales;
    return (
      <span className={cn("text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-md border flex items-center gap-1.5", r.color)}>
        <r.icon size={10} /> {r.label}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 🏁 Aura Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 lg:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1.5"><Users size={10} /> Ecossistema Humano</span>
            <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Aura Workspace</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-white italic">Gestão de <span className="text-primary">Membros</span></h1>
          <p className="text-muted-foreground font-medium text-sm lg:text-base max-w-2xl">Aumente sua escala operacional distribuindo acessos e monitorando permissões.</p>
        </div>
      </div>

      {/* 🧬 Invite Hub */}
      <div className="glass-card p-8 group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 text-white/[0.02] -mr-16 -mt-16 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-700"><UserPlus size={240} /></div>
        
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2 mb-8 italic relative z-10"><Sparkles size={16} className="text-primary" /> Estender Conexão ao Time</h2>
        
        <form onSubmit={handleInvite} className="flex flex-col lg:flex-row gap-4 relative z-10">
           <div className="flex-1 relative group">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-primary transition-colors" size={18} />
              <Input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="vendedor@aura.is" className="ux-input h-14 pl-16 !bg-white/5 border-white/5 font-black text-lg" />
           </div>
           
           <div className="relative group min-w-[240px]">
              <Shield className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-primary transition-colors" size={18} />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full h-14 pl-16 pr-8 bg-white/5 border border-white/5 text-white font-black text-xs uppercase tracking-widest rounded-3xl outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer">
                 {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
           </div>

           <button type="submit" disabled={inviting} className="ux-button h-14 px-10 bg-primary text-white shadow-xl shadow-primary/20 text-[13px] uppercase tracking-widest gap-3 active:scale-95 transition-all">
              {inviting ? <Loader2 className="animate-spin" /> : <Plus size={20} strokeWidth={3} />}
              Vincular
           </button>
        </form>

        {(successMsg || errorMsg) && (
           <div className={cn("mt-6 p-6 rounded-3xl border flex items-start gap-4 animate-in slide-in-from-top-2", successMsg ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" : "bg-orange-500/5 border-orange-500/20 text-orange-400")}>
              {successMsg ? <ShieldCheck className="shrink-0" size={20} /> : <AlertCircle className="shrink-0" size={20} />}
              <p className="text-xs font-bold leading-relaxed">{successMsg || errorMsg}</p>
           </div>
        )}
      </div>

      {/* 🏛 Hierarchy Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ROLES.map(role => (
          <div key={role.value} className="glass-card p-8 space-y-4 hover:border-primary/20 transition-all group">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-primary/10 group-hover:text-primary transition-all"><Shield size={20} /></div>
              <span className="text-[9px] font-black uppercase text-white/10 tracking-[0.2em]">Escopo Nível {role.value === 'admin' ? 3 : role.value === 'manager' ? 2 : 1}</span>
            </div>
            <div>
               <h3 className="text-sm font-black text-white uppercase tracking-wider italic">{role.label}</h3>
               <p className="text-[11px] text-white/30 font-medium leading-relaxed mt-1 italic">"{role.desc}"</p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-4">
              {PERMISSIONS[role.value].map(perm => (
                <span key={perm} className="text-[8px] font-black uppercase tracking-widest bg-white/5 text-white/20 px-2 py-1 rounded border border-white/5 group-hover:text-primary/50 group-hover:border-primary/20 transition-all">
                  {perm}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 👥 Member Command Center */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-10 py-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
           <h2 className="text-[11px] font-black uppercase text-white/30 tracking-[0.2em] flex items-center gap-3 italic"><Users size={16} className="text-primary" /> Colaboradores Federados</h2>
           <span className="bg-primary/10 text-primary text-[9px] font-black px-3 py-1 rounded-full border border-primary/20 uppercase tracking-widest">{members.length} Ativos na Célula</span>
        </div>
        
        {loading ? (
           <div className="py-24 flex flex-col items-center justify-center gap-4 text-white/20"><Loader2 className="animate-spin" /> <span className="text-[10px] font-black uppercase tracking-widest italic">Sincronizando Time...</span></div>
        ) : members.length === 0 ? (
           <div className="py-24 text-center grayscale opacity-30 space-y-4">
              <Users size={64} className="mx-auto text-white/10" />
              <p className="text-[11px] font-black uppercase tracking-widest">Nenhum membro vinculado</p>
           </div>
        ) : (
           <div className="divide-y divide-white/[0.03]">
              {members.map(member => {
                const isUser = member.id === user?.id;
                return (
                  <div key={member.id} className="flex items-center gap-8 px-10 py-8 hover:bg-white/[0.02] transition-colors group">
                     <div className="relative">
                        <div className={cn("h-16 w-16 rounded-[22px] bg-white/5 flex items-center justify-center font-black text-2xl transition-all shadow-xl", isUser ? "bg-primary text-white rotate-12" : "text-white/20 group-hover:text-primary group-hover:bg-primary/5")}>
                           {(member.full_name || 'A')[0].toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full border-4 border-[#0c0c0c]" />
                     </div>
                     
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                           <span className="text-lg font-black text-white uppercase tracking-tight truncate italic">{member.full_name || 'Estrategista Aura'}</span>
                           {isUser && <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-md italic">Soberano (Você)</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                           {getRoleBadge(member.role || 'sales')}
                           <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Vínculo: {new Date(member.created_at).toLocaleDateString()}</span>
                        </div>
                     </div>

                     <div className="flex items-center gap-4">
                        {!isUser && (
                           <>
                              <div className="relative group">
                                 <select value={member.role || 'sales'} onChange={e => updateRole(member.id, e.target.value)} className="h-10 px-4 pr-8 bg-white/5 border border-white/5 text-white font-black text-[10px] uppercase tracking-widest rounded-xl outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer">
                                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                 </select>
                                 <Eye size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20" />
                              </div>
                              <button onClick={() => removeMember(member.id)} className="h-10 w-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-white/20 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all"><Trash2 size={16} /></button>
                           </>
                        )}
                        {isUser && <button className="h-10 px-4 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/20 cursor-default flex items-center gap-2"><Settings2 size={14} /> Definições Master</button>}
                     </div>
                  </div>
                );
              })}
           </div>
        )}
      </div>

      {/* ⚠️ Info Terminal */}
      <div className="glass-card p-6 !bg-primary/[0.02] border-primary/20 flex items-start gap-4 animate-pulse">
         <Crosshair className="text-primary shrink-0" size={20} />
         <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] italic">Protocolo de Segurança Ativo</p>
            <p className="text-[11px] text-white/40 font-medium italic">As permissões de cargo restringem a navegação no Workspace. A integridade dos dados no banco é assegurada por políticas de RLS de segurança escalar.</p>
         </div>
      </div>
    </div>
  );
}
