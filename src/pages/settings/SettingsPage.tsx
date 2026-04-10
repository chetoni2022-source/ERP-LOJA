import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Label } from '../../components/ui';
import { 
  Settings, Save, Globe, Palette, ShoppingBag, ShieldCheck, 
  Upload, Image as ImageIcon, Loader2, Smartphone, 
  CreditCard, MessageCircle, BarChart, Target, Zap, Sparkles,
  RefreshCw, Lock, Terminal, Box, Share2, Facebook, Instagram
} from 'lucide-react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'api' | 'security'>('brand');

  const [settings, setSettings] = useState<any>({
    store_name: '',
    whatsapp_number: '',
    logo_url: '',
    favicon_url: '',
    logo_width: 200,
    logo_height: 80,
    logo_fit: 'contain',
    logo_position: 'center',
    meta_title: '',
    meta_description: ''
  });

  useEffect(() => { if (user) fetchSettings(); }, [user]);

  async function fetchSettings() {
    setLoading(true);
    try {
      const { data } = await supabase.from('store_settings').select('*').eq('user_id', user?.id).maybeSingle();
      if (data) setSettings(data);
    } catch (err: any) { toastError(err.message); }
    finally { setLoading(false); }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('store_settings').upsert({ ...settings, user_id: user?.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      success('Configurações sincronizadas no ecossistema.');
    } catch (err: any) { toastError(err.message); }
    finally { setSaving(false); }
  };

  const tabs = [
    { id: 'brand', label: 'Branding & Identidade', icon: Palette },
    { id: 'api', label: 'Integrações & Marketplace', icon: Zap },
    { id: 'security', label: 'Segurança & Backend', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 🏁 Aura Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 lg:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1.5"><Settings size={10} /> Centro de Comando Master</span>
            <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Aura Workspace v2.0.0</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-white">Definições do <span className="text-primary italic">Sistema</span></h1>
          <p className="text-muted-foreground font-medium text-sm lg:text-base max-w-2xl">
            Orquestre a identidade visual, integrações externas e protocolos de segurança da sua operação global.
          </p>
        </div>
        
        <button onClick={handleSave} disabled={saving} className="ux-button h-14 px-8 bg-primary text-white shadow-xl shadow-primary/20 text-[13px] uppercase tracking-widest gap-3 active:scale-95 transition-all">
          {saving ? <Loader2 className="animate-spin" /> : <Save size={20} strokeWidth={3} />}
          {saving ? 'Sincronizando...' : 'Publicar Alterações'}
        </button>
      </div>

      {/* 📑 Tab Navigation */}
      <div className="flex bg-white/5 p-2 rounded-[28px] border border-white/5 max-w-fit">
         {tabs.map(t => (
           <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={cn("px-8 py-3 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3", activeTab === t.id ? "bg-white text-black shadow-2xl" : "text-white/30 hover:text-white hover:bg-white/5")}>
              <t.icon size={16} /> {t.label}
           </button>
         ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
         {/* 🛠 Configuration Surface */}
         <div className="lg:col-span-8 space-y-8">
            {activeTab === 'brand' && (
               <div className="glass-card p-10 space-y-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 text-white/[0.02] -mr-16 -mt-16 rotate-12 pointer-events-none"><Palette size={280} /></div>
                  
                  <div className="space-y-6 relative z-10">
                     <h3 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3 border-b border-white/5 pb-6"><Sparkles className="text-primary" /> Atributos de Marca</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-white/30 tracking-widest pl-1">Nome Fantasia da Operação</Label>
                           <Input value={settings.store_name} onChange={e => setSettings({...settings, store_name: e.target.value})} placeholder="Ex: Aura Luxury Store" className="ux-input h-14 !bg-white/5 font-black text-lg" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-white/30 tracking-widest pl-1">WhatsApp SAC (Internacional)</Label>
                           <Input value={settings.whatsapp_number} onChange={e => setSettings({...settings, whatsapp_number: e.target.value})} placeholder="5511999999999" className="ux-input h-14 !bg-white/5 font-black" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-8 relative z-10 border-t border-white/5 pt-10">
                     <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3"><ImageIcon className="text-primary" /> Assets de Visibilidade</h3>
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Formatos: PNG, SVG ou WEBP</span>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <div className="h-48 w-full bg-white/5 rounded-[40px] border border-white/10 border-dashed flex flex-col items-center justify-center p-8 group relative overflow-hidden transition-all hover:border-primary/40">
                              {settings.logo_url ? (
                                <img src={settings.logo_url} className="max-h-full object-contain drop-shadow-2xl" alt="Logo Preview" />
                              ) : <Upload size={32} className="text-white/10 group-hover:text-primary transition-colors" />}
                              <input type="text" value={settings.logo_url} onChange={e => setSettings({...settings, logo_url: e.target.value})} className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md h-12 text-[10px] font-black p-4 outline-none text-white transition-all opacity-0 group-hover:opacity-100" placeholder="URL da Logo Master..." />
                           </div>
                           <p className="text-[10px] font-black uppercase text-center text-white/20 tracking-widest">Logo Principal Workspace</p>
                        </div>
                        <div className="space-y-4">
                           <div className="h-48 w-full bg-white/5 rounded-[40px] border border-white/10 border-dashed flex flex-col items-center justify-center p-8 group relative overflow-hidden transition-all hover:border-primary/40">
                              {settings.favicon_url ? (
                                <img src={settings.favicon_url} className="h-16 w-16 object-contain drop-shadow-2xl" alt="Favicon Preview" />
                              ) : <Box size={32} className="text-white/10 group-hover:text-primary transition-colors" />}
                              <input type="text" value={settings.favicon_url} onChange={e => setSettings({...settings, favicon_url: e.target.value})} className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md h-12 text-[10px] font-black p-4 outline-none text-white transition-all opacity-0 group-hover:opacity-100" placeholder="URL do Favicon..." />
                           </div>
                           <p className="text-[10px] font-black uppercase text-center text-white/20 tracking-widest">Ícone de Navegação (Favicon)</p>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'api' && (
               <div className="space-y-8">
                  <div className="glass-card p-10 bg-gradient-to-br from-[#EE4D2D]/10 to-transparent border-[#EE4D2D]/20 overflow-hidden relative">
                     <div className="absolute top-0 right-0 p-10 text-[#EE4D2D]/5 -mr-16 -mt-16 rotate-12"><Share2 size={240} /></div>
                     <div className="flex items-center gap-6 mb-8 relative z-10">
                        <div className="h-16 w-16 bg-[#EE4D2D] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#EE4D2D]/30"><ShoppingBag className="text-white" size={32} /></div>
                        <div>
                           <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">Shopee Open Platform</h3>
                           <p className="text-[#EE4D2D] text-[10px] font-black uppercase tracking-widest">Status: Sincronização Desativada</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        <Input placeholder="Partner ID" className="ux-input h-14 !bg-black/20 border-white/5" />
                        <Input placeholder="Shop ID" className="ux-input h-14 !bg-black/20 border-white/5" />
                     </div>
                  </div>

                  <div className="glass-card p-10 bg-gradient-to-br from-black to-white/5 border-white/10 overflow-hidden relative">
                     <div className="absolute top-0 right-0 p-10 text-white/5 -mr-16 -mt-16 rotate-12"><Terminal size={240} /></div>
                     <div className="flex items-center gap-6 mb-8 relative z-10">
                        <div className="h-16 w-16 bg-white text-black rounded-2xl flex items-center justify-center shadow-2xl shadow-white/10 font-black italic tracking-tighter">TT</div>
                        <div>
                           <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">TikTok Shop API</h3>
                           <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Status: Aguardando Handshake</p>
                        </div>
                     </div>
                     <Input placeholder="V2 Developer App Secret" className="ux-input h-14 !bg-white/5 border-white/5 relative z-10" />
                  </div>
               </div>
            )}

            {activeTab === 'security' && (
               <div className="glass-card p-10 space-y-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 text-white/[0.02] -mr-16 -mt-16 rotate-12 pointer-events-none"><ShieldCheck size={280} /></div>
                  <div className="space-y-6 relative z-10">
                     <h3 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3"><Lock className="text-primary" /> Hardening do Backend</h3>
                     <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl flex items-start gap-4">
                        <ShieldCheck className="text-primary shrink-0" size={24} />
                        <div className="space-y-1">
                           <p className="text-[11px] font-black uppercase text-primary tracking-widest">Protocolo de Segurança v2 Ativo</p>
                           <p className="text-[10px] text-white/40 font-medium leading-relaxed italic">Suas tabelas estão blindadas por políticas de Row Level Security (RLS). Somente usuários autenticados com o token JWT correto podem manipular dados do seu store_id.</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 gap-4">
                        <button className="ux-button h-16 w-full bg-white/5 border border-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest gap-3 justify-center hover:text-white transition-all"><RefreshCw size={14} /> Rotacionar Chaves Secretas</button>
                        <button className="ux-button h-16 w-full bg-rose-500/10 border border-rose-500/20 text-rose-500 font-black text-[10px] uppercase tracking-widest gap-3 justify-center hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={14} /> Encerrar Todas as Sessões</button>
                     </div>
                  </div>
               </div>
            )}
         </div>

         {/* 📱 Preview Hub */}
         <div className="lg:col-span-4 space-y-6">
            <h3 className="text-[11px] font-black uppercase text-white/20 tracking-[0.3em] font-mono px-4">Live Preview • Digital Vitrine</h3>
            <div className="glass-card !p-0 overflow-hidden relative group">
               <div className="absolute inset-0 bg-primary/20 blur-[100px] opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity" />
               <div className="relative aspect-[9/16] bg-[#0c0c0c] border-white/10 border-8 rounded-[48px] m-4 shadow-2xl overflow-hidden flex flex-col">
                  {/* Mock Mobile UI */}
                  <div className="p-6 flex items-center justify-center border-b border-white/5 mb-8">
                     {settings.logo_url ? <img src={settings.logo_url} className="h-8 object-contain" alt="Logo Preview" /> : <div className="h-8 w-24 bg-white/5 rounded-lg" />}
                  </div>
                  <div className="px-8 space-y-6 flex-1">
                     <div className="h-40 w-full bg-white/5 rounded-3xl animate-pulse" />
                     <div className="space-y-3">
                        <div className="h-4 w-3/4 bg-white/5 rounded-full" />
                        <div className="h-4 w-1/2 bg-white/5 rounded-full" />
                     </div>
                     <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="h-24 bg-white/5 rounded-2xl" />
                        <div className="h-24 bg-white/5 rounded-2xl" />
                     </div>
                  </div>
                  <div className="p-8 border-t border-white/5 bg-white/[0.02]">
                     <div className="h-12 w-full bg-primary rounded-2xl shadow-xl shadow-primary/20" />
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
