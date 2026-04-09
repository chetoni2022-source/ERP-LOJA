import React, { useState, useEffect } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../components/theme-provider';
import { useToast } from '../../contexts/ToastContext';
import { Users, UserPlus, Loader2, Moon, Sun, Monitor, UploadCloud, Store, Palette, Target, ImageIcon, Crop, Phone, X, ShoppingBag, Settings2, Link as LinkIcon, Blocks } from 'lucide-react';
import { supabase, getProxyUrl } from '../../lib/supabase';

const POSITION_OPTIONS = [
  { value: 'top left',    label: '↖', title: 'Superior Esquerda' },
  { value: 'top center',  label: '↑', title: 'Superior Centro' },
  { value: 'top right',   label: '↗', title: 'Superior Direita' },
  { value: 'center left', label: '←', title: 'Centro Esquerda' },
  { value: 'center',      label: '⬤', title: 'Centro' },
  { value: 'center right',label: '→', title: 'Centro Direita' },
  { value: 'bottom left', label: '↙', title: 'Inferior Esquerda' },
  { value: 'bottom center',label:'↓', title: 'Inferior Centro' },
  { value: 'bottom right',label: '↘', title: 'Inferior Direita' },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'geral' | 'marca' | 'integracoes'>('geral');
  const [inviteEmail, setInviteEmail] = useState('');
  
  // White-label State
  const [storeName, setStoreName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [monthlyGoal, setMonthlyGoal] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [currentFaviconUrl, setCurrentFaviconUrl] = useState<string | null>(null);
  const [savingBrand, setSavingBrand] = useState(false);

  // Logo display settings
  const [logoWidth, setLogoWidth] = useState(200);
  const [logoHeight, setLogoHeight] = useState(80);
  const [logoFit, setLogoFit] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [logoPosition, setLogoPosition] = useState('center');
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [newLeadSource, setNewLeadSource] = useState('');
  const [savingDisplay, setSavingDisplay] = useState(false);

  // Shopee Integration State
  const [shopeeAppId, setShopeeAppId] = useState('');
  const [shopeeSecret, setShopeeSecret] = useState('');
  const [shopeeShopId, setShopeeShopId] = useState('');
  const [shopeeMarkup, setShopeeMarkup] = useState('0');
  const [shopeeCommission, setShopeeCommission] = useState('20');
  const [shopeeFixedFee, setShopeeFixedFee] = useState('4');
  const [shopeeCap, setShopeeCap] = useState('100');
  

  const [savingShopee, setSavingShopee] = useState(false);
  const [globalTaxPct, setGlobalTaxPct] = useState('0');

  const MAX_FILE_SIZE = 3 * 1024 * 1024;

  useEffect(() => {
    if (!user) return;
    supabase.from('store_settings')
      .select('*')
      .eq('user_id', user.id)
      .limit(1).maybeSingle().then(({ data }: { data: any }) => {
        if (data) {
          if (data.store_name) setStoreName(data.store_name);
          if (data.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
          if (data.monthly_goal) setMonthlyGoal(data.monthly_goal.toString());
          if (data.logo_url) setCurrentLogoUrl(data.logo_url);
          if (data.favicon_url) setCurrentFaviconUrl(data.favicon_url);
          if (data.logo_width) setLogoWidth(data.logo_width);
          if (data.logo_height) setLogoHeight(data.logo_height);
          if (data.logo_fit) setLogoFit(data.logo_fit);
          if (data.logo_position) setLogoPosition(data.logo_position);
          if (data.lead_sources) setLeadSources(data.lead_sources);
          if (data.shopee_app_id) setShopeeAppId(data.shopee_app_id);
          if (data.shopee_app_secret) setShopeeSecret(data.shopee_app_secret);
          if (data.shopee_shop_id) setShopeeShopId(data.shopee_shop_id);
          if (data.shopee_markup_pct !== null) setShopeeMarkup(data.shopee_markup_pct.toString());
          if (data.tiktok_markup_pct !== null) setTiktokMarkup(data.tiktok_markup_pct.toString());
          if (data.shopee_commission_pct !== null) setShopeeCommission(data.shopee_commission_pct.toString());
          if (data.shopee_fixed_fee !== null) setShopeeFixedFee(data.shopee_fixed_fee.toString());
          if (data.shopee_commission_cap !== null) setShopeeCap(data.shopee_commission_cap.toString());
          if (data.tiktok_commission_pct !== null) setTiktokCommission(data.tiktok_commission_pct.toString());
          if (data.tiktok_fixed_fee !== null) setTiktokFixedFee(data.tiktok_fixed_fee.toString());
          if (data.tiktok_commission_cap !== null) setTiktokCap(data.tiktok_commission_cap.toString());
          if (data.global_tax_pct !== null) setGlobalTaxPct(data.global_tax_pct.toString());
        }
      });
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: any, setPreview: any) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        toastError('Arquivo muito pesado! Máximo de 3MB.');
        e.target.value = '';
        return;
      }
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBrand(true);
    try {
      let logoUrl = null;
      let faviconUrl = null;

      if (logoFile) {
        const logoExt = logoFile.name.split('.').pop();
        const { error, data } = await supabase.storage.from('brand').upload(`logo-${Date.now()}.${logoExt}`, logoFile);
        if (error) throw error;
        logoUrl = supabase.storage.from('brand').getPublicUrl(data.path).data.publicUrl;
      }

      if (faviconFile) {
        const favExt = faviconFile.name.split('.').pop();
        const { error, data } = await supabase.storage.from('brand').upload(`favicon-${Date.now()}.${favExt}`, faviconFile);
        if (error) throw error;
        faviconUrl = supabase.storage.from('brand').getPublicUrl(data.path).data.publicUrl;
      }

      const { data: existing } = await supabase.from('store_settings').select('id').eq('user_id', user?.id).limit(1).maybeSingle();
      
      const payload: any = {};
      if (storeName) payload.store_name = storeName;
      if (whatsappNumber) payload.whatsapp_number = whatsappNumber;
      if (logoUrl) { payload.logo_url = logoUrl; setCurrentLogoUrl(logoUrl); }
      if (faviconUrl) { payload.favicon_url = faviconUrl; setCurrentFaviconUrl(faviconUrl); }
      if (monthlyGoal) payload.monthly_goal = parseFloat(monthlyGoal);
      payload.lead_sources = leadSources;

      if (Object.keys(payload).length === 0) { toastError('Preencha ao menos um campo para salvar.'); return; }
      if (!user?.id) { toastError('Erro: Usuário não identificado. Tente fazer login novamente.'); return; }

      if (existing) {
        const { error: upError } = await supabase.from('store_settings').update(payload).eq('id', existing.id);
        if (upError) throw upError;
      } else {
        const { error: inError } = await supabase.from('store_settings').insert([{ ...payload, user_id: user?.id }]);
        if (inError) throw inError;
      }

      setLogoFile(null); setFaviconFile(null); setLogoPreview(null); setFaviconPreview(null);
      if (faviconUrl) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = `${faviconUrl}?v=${Date.now()}`;
      }
      success('Identidade visual salva! As alterações foram aplicadas em todo o sistema.');
    } catch (err: any) { 
      console.error('Error saving branding:', err);
      toastError('Erro ao salvar: ' + (err.message || 'Verifique sua conexão ou permissões.')); 
    } 
    finally { setSavingBrand(false); }
  };

  const handleSaveDisplaySettings = async () => {
    setSavingDisplay(true);
    try {
      const { data: existing } = await supabase.from('store_settings').select('id').eq('user_id', user?.id).limit(1).maybeSingle();
      if (!user?.id) { toastError('Erro: Usuário não identificado. Tente fazer login novamente.'); return; }
      const payload = { logo_width: logoWidth, logo_height: logoHeight, logo_fit: logoFit, logo_position: logoPosition };
      
      if (existing) {
        const { error: upError } = await supabase.from('store_settings').update(payload).eq('id', existing.id);
        if (upError) throw upError;
      } else {
        const { error: inError } = await supabase.from('store_settings').insert([{ ...payload, user_id: user?.id }]);
        if (inError) throw inError;
      }
      success('Configurações de exibição salvas!');
    } catch (err: any) { 
      console.error('Error saving display settings:', err);
      toastError('Erro ao salvar display: ' + (err.message || 'Verifique permissões SQL.')); 
    }
    finally { setSavingDisplay(false); }
  };
  
  const handleSaveShopee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShopee(true);
    try {
      const { data: existing } = await supabase.from('store_settings').select('id').eq('user_id', user?.id).limit(1).maybeSingle();
      if (!user?.id) { toastError('Erro: Usuário não identificado.'); return; }
      
      const payload = { 
        shopee_app_id: shopeeAppId || null, 
        shopee_app_secret: shopeeSecret || null, 
        shopee_shop_id: shopeeShopId || null, 
        shopee_markup_pct: parseFloat(shopeeMarkup) || 0,
        tiktok_markup_pct: parseFloat(tiktokMarkup) || 0,
        shopee_commission_pct: parseFloat(shopeeCommission) || 20,
        shopee_fixed_fee: parseFloat(shopeeFixedFee) || 4,
        shopee_commission_cap: parseFloat(shopeeCap) || 100,
        tiktok_commission_pct: parseFloat(tiktokCommission) || 15,
        tiktok_fixed_fee: parseFloat(tiktokFixedFee) || 4,
        tiktok_commission_cap: parseFloat(tiktokCap) || 100,
        global_tax_pct: parseFloat(globalTaxPct) || 0
      };
      
      if (existing) {
        const { error } = await supabase.from('store_settings').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
         toastError('Erro: Registre sua marca em "Identidade Visual" primeiro.'); return;
      }
      success('Configurações de Marketplaces salvas no ERP!');
    } catch (err: any) { 
      console.error(err);
      toastError('Erro ao salvar Shopee: ' + err.message); 
    }
    finally { setSavingShopee(false); }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    if (!user?.id) return;
    
    setSavingBrand(true); // Using this as general loading for settings
    try {
      const { error } = await supabase.from('team_invites').insert([{
        email: inviteEmail.toLowerCase().trim(),
        role: 'sales',
        invited_by: user.id
      }]);
      
      if (error) {
        if (error.code === '23505') throw new Error('Este e-mail já foi convidado.');
        throw error;
      }
      
      success(`Convite enviado para ${inviteEmail}!`);
      setInviteEmail('');
    } catch (err: any) {
      console.error('Error inviting member:', err);
      toastError(err.message || 'Erro ao enviar convite.');
    } finally {
      setSavingBrand(false);
    }
  };

  const previewImg = logoPreview || getProxyUrl(currentLogoUrl);
  const faviconImg = faviconPreview || getProxyUrl(currentFaviconUrl);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center text-foreground">Configurações Base</h1>
        <p className="text-muted-foreground">Gerencie as preferências da loja, personalize sua marca e conecte ferramentas.</p>
      </div>

      {/* Menu de Abas Premium */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none snap-x relative z-10 w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <button 
          onClick={() => setActiveTab('geral')}
          className={`flex-none flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-[13px] uppercase tracking-widest whitespace-nowrap transition-all border snap-start ${activeTab === 'geral' ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]' : 'bg-card text-muted-foreground border-border hover:bg-muted/80'}`}
        >
          <Settings2 size={16} /> Geral & Equipe
        </button>
        <button 
          onClick={() => setActiveTab('marca')}
          className={`flex-none flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-[13px] uppercase tracking-widest whitespace-nowrap transition-all border snap-start ${activeTab === 'marca' ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]' : 'bg-card text-muted-foreground border-border hover:bg-muted/80'}`}
        >
          <Palette size={16} /> Identidade Visual
        </button>
        <button 
          onClick={() => setActiveTab('integracoes')}
          className={`flex-none flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-[13px] uppercase tracking-widest whitespace-nowrap transition-all border snap-start ${activeTab === 'integracoes' ? 'bg-[#f53d2d] text-white border-[#f53d2d]/80 shadow-lg scale-[1.02]' : 'bg-card text-muted-foreground border-border hover:bg-[#f53d2d]/10 hover:text-[#f53d2d]'}`}
        >
          <Blocks size={16} /> Integrações Omnichannel
        </button>
      </div>

      <div className="mt-4">
        {/* TAB 1: GERAL E EQUIPE */}
        {activeTab === 'geral' && (
          <div className="grid gap-6 lg:grid-cols-2 animate-in slide-in-from-bottom-2 duration-300">
            {/* Aparência */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center text-foreground gap-2"><Palette className="w-5 h-5 text-primary" /> Aparência do Painel</h2>
            <Label className="mb-3 block text-foreground font-semibold">Tema do Sistema ERP</Label>
            <div className="flex bg-muted/40 p-1.5 rounded-xl border border-border overflow-hidden">
              {([['light','Claro',<Sun size={16}/>],['dark','Escuro',<Moon size={16}/>],['system','Auto',<Monitor size={16}/>]] as const).map(([t,label,icon])=>(
                <button key={t} onClick={()=>setTheme(t as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${theme===t ? 'bg-background shadow-md text-foreground':'text-muted-foreground hover:text-foreground'}`}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Origens de Lead */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center text-foreground gap-2"><Target className="w-5 h-5 text-primary" /> Origens de Venda</h2>
            <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Adicione os canais por onde seus clientes chegam (ex: WhatsApp, Loja, Ads).</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {leadSources.map((source, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/20 animate-in zoom-in-50 duration-200">
                  {source}
                  <button onClick={() => setLeadSources(leadSources.filter((_, i) => i !== idx))} className="hover:text-red-500 transition-colors">
                    <X size={12} />
                  </button>
                </span>
              ))}
              {leadSources.length === 0 && <span className="text-xs italic text-muted-foreground">Nenhuma origem cadastrada. Use os padrões sugeridos no banco.</span>}
            </div>

            <div className="flex gap-2">
              <Input 
                value={newLeadSource} 
                onChange={e => setNewLeadSource(e.target.value)} 
                onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); if(newLeadSource.trim()) { setLeadSources([...leadSources, newLeadSource.trim()]); setNewLeadSource(''); } } }}
                placeholder="Ex: TikTok, Indicação..." 
                className="h-10 text-sm font-bold bg-background shadow-sm" 
              />
              <Button onClick={() => { if(newLeadSource.trim()) { setLeadSources([...leadSources, newLeadSource.trim()]); setNewLeadSource(''); } }} className="h-10 px-4 font-bold uppercase tracking-widest text-[10px]">
                Add
              </Button>
            </div>
          </div>

          {/* Equipe */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-foreground"><Users className="h-5 w-5 text-primary" /> Equipe e Acessos</h2>
            <p className="text-sm text-muted-foreground mb-4">Gerencie quem tem acesso ao painel do seu ERP.</p>
            <form onSubmit={handleInviteMember} className="flex gap-2">
              <Input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="vendedor@loja.com" className="bg-background shadow-sm h-11" required type="email" />
              <Button type="submit" disabled={savingBrand} className="bg-primary text-primary-foreground font-bold shadow-md px-4 h-11">
                {savingBrand ? <Loader2 className="animate-spin h-4 w-4 mr-1.5" /> : <UserPlus className="h-4 w-4 mr-1.5" />}
                Convidar
              </Button>
            </form>
            <div className="pt-4 border-t border-border mt-4">
              <div className="flex justify-between items-center py-3 px-4 bg-background border border-border rounded-xl shadow-sm">
                <div><p className="text-sm font-bold text-foreground">{user?.email}</p><p className="text-xs text-muted-foreground">Proprietário (Admin)</p></div>
                <span className="text-xs font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-md border border-emerald-500/20">Ativo</span>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* TAB 2: MARCA E PLATAFORMA */}
        {activeTab === 'marca' && (
          <div className="grid gap-6 lg:grid-cols-2 animate-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-6">
              {/* Identidade visual */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm border-t-4 border-t-primary">
            <h2 className="text-xl font-bold mb-1 text-foreground flex items-center gap-2"><Store className="w-5 h-5 text-primary"/> Identidade Visual (White-label)</h2>
            <p className="text-sm text-muted-foreground mb-5">Personalize o sistema com a sua marca.</p>

            <form onSubmit={handleSaveBranding} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground text-sm">Nome Principal do ERP</Label>
                <Input value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="Laris Acessórios" className="bg-background shadow-sm h-11 font-medium" />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground text-sm flex items-center gap-2"><Phone size={14} className="text-primary"/> WhatsApp de Contato</Label>
                <Input value={whatsappNumber} onChange={e=>setWhatsappNumber(e.target.value)} placeholder="5511999999999" className="bg-background shadow-sm h-11 font-medium" />
                <p className="text-[10px] text-muted-foreground">Formato: 55 + DDD + Numero (apenas números)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground text-sm flex items-center gap-2"><Target size={14} className="text-primary"/> Meta Mensal (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">R$</span>
                  <Input type="number" step="0.01" value={monthlyGoal} onChange={e=>setMonthlyGoal(e.target.value)} placeholder="5000.00" className="bg-background shadow-sm h-11 pl-10 font-bold" />
                </div>
                <p className="text-xs text-muted-foreground">Aparece como barra de progresso no Painel.</p>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Logo */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground text-sm">Logotipo Principal</Label>
                  <div className="relative border-2 border-dashed border-border rounded-xl text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group flex flex-col items-center justify-center h-[140px] overflow-hidden shadow-inner">
                    {previewImg
                      ? <img src={previewImg} alt="Logo" crossOrigin="anonymous" className="w-full h-full object-contain z-10 drop-shadow-sm p-3" />
                      : <div className="flex flex-col items-center z-10 pointer-events-none">
                          <UploadCloud className="h-7 w-7 text-muted-foreground group-hover:text-primary mb-2" />
                          <span className="text-xs font-bold">Enviar Logo</span>
                          <span className="text-[10px] text-muted-foreground mt-1">PNG/JPG/SVG · máx 3MB</span>
                        </div>
                    }
                    <Input type="file" accept="image/*" onChange={e=>handleFileChange(e,setLogoFile,setLogoPreview)} className="absolute inset-0 opacity-0 cursor-pointer h-full w-full z-20" />
                  </div>
                </div>
                {/* Favicon */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground text-sm">Ícone da Aba (Favicon)</Label>
                  <div className="relative border-2 border-dashed border-border rounded-xl text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group flex flex-col items-center justify-center h-[140px] overflow-hidden shadow-inner">
                    {faviconImg
                      ? <img src={faviconImg} alt="Favicon" crossOrigin="anonymous" className="h-14 w-14 object-contain z-10" />
                      : <div className="flex flex-col items-center z-10 pointer-events-none">
                          <UploadCloud className="h-7 w-7 text-muted-foreground group-hover:text-primary mb-2" />
                          <span className="text-xs font-bold">Enviar Favicon</span>
                          <span className="text-[10px] text-muted-foreground mt-1">ICO/PNG/JPG · 32x32px</span>
                        </div>
                    }
                    <Input type="file" accept="image/*" onChange={e=>handleFileChange(e,setFaviconFile,setFaviconPreview)} className="absolute inset-0 opacity-0 cursor-pointer h-full w-full z-20" />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={savingBrand||(!storeName&&!logoFile&&!faviconFile&&!monthlyGoal)}
                className="w-full h-12 text-sm font-black tracking-wide shadow-lg bg-primary text-primary-foreground">
                {savingBrand?<Loader2 className="animate-spin h-5 w-5 mr-2"/>:null} Salvar Identidade Visual
              </Button>
            </form>
          </div>
          </div>

          <div className="space-y-6">
          {/* ── LOGO DISPLAY SETTINGS ── */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2 text-foreground"><Crop className="w-5 h-5 text-primary"/> Exibição da Logo no Painel e Catálogo</h2>
            <p className="text-sm text-muted-foreground mb-5">Ajuste o tamanho e posição da logo que aparece no seu menu lateral e na vitrine pública.</p>

            {/* Live preview */}
            <div className="border border-border rounded-xl overflow-hidden mb-5 bg-[#0c0b09]">
              <div className="p-3 text-center">
                <p className="text-[9px] font-bold tracking-widest uppercase text-white/30 mb-2">Preview do catálogo</p>
                <div style={{width:'100%',height:logoHeight+24,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                  {previewImg
                    ? <img src={previewImg} alt="preview" crossOrigin="anonymous" style={{width:logoWidth,height:logoHeight,objectFit:logoFit,objectPosition:logoPosition,display:'block'}}/>
                    : <div style={{width:logoWidth,height:logoHeight,display:'flex',alignItems:'center',justifyContent:'center',border:'1px dashed rgba(255,255,255,0.2)',borderRadius:6}}>
                        <ImageIcon style={{width:24,height:24,color:'rgba(255,255,255,0.2)'}}/>
                      </div>
                  }
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {/* Width */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Largura</Label>
                  <span className="text-sm font-bold text-foreground tabular-nums">{logoWidth}px</span>
                </div>
                <input type="range" min="60" max="400" step="4" value={logoWidth}
                  onChange={e=>setLogoWidth(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                  style={{background:`linear-gradient(to right, hsl(var(--primary)) ${((logoWidth-60)/(400-60))*100}%, hsl(var(--border)) ${((logoWidth-60)/(400-60))*100}%)`}}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>60px</span><span>400px</span></div>
              </div>

              {/* Height */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Altura</Label>
                  <span className="text-sm font-bold text-foreground tabular-nums">{logoHeight}px</span>
                </div>
                <input type="range" min="20" max="160" step="2" value={logoHeight}
                  onChange={e=>setLogoHeight(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                  style={{background:`linear-gradient(to right, hsl(var(--primary)) ${((logoHeight-20)/(160-20))*100}%, hsl(var(--border)) ${((logoHeight-20)/(160-20))*100}%)`}}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>20px</span><span>160px</span></div>
              </div>

              {/* Fit */}
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Modo de Exibição</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([['contain','Conter','Logo completa visível'],['cover','Cobrir','Preenche o espaço (pode cortar)'],['fill','Esticar','Ocupa todo o espaço']] as const).map(([val,label])=>(
                    <button key={val} type="button" onClick={()=>setLogoFit(val)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-bold transition-all ${logoFit===val?'border-primary bg-primary/10 text-primary':'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'}`}>
                      <span className="text-lg">{val==='contain'?'□':val==='cover'?'■':'▬'}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {logoFit==='contain'?'A logo aparece inteira, com espaços em branco se necessário.':logoFit==='cover'?'A logo preenche o espaço; bordas podem ser cortadas.':'A logo se estica para preencher — pode distorcer.'}
                </p>
              </div>

              {/* Position (crop anchor) */}
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Ponto de Corte / Posição</Label>
                <div className="grid grid-cols-3 gap-1.5 p-3 bg-muted/20 border border-border rounded-xl w-fit">
                  {POSITION_OPTIONS.map(opt=>(
                    <button key={opt.value} type="button" onClick={()=>setLogoPosition(opt.value)} title={opt.title}
                      className={`w-10 h-10 flex items-center justify-center text-base rounded-lg border transition-all font-bold ${logoPosition===opt.value?'bg-primary border-primary text-primary-foreground':'border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Define de onde a logo é "ancorada" ao cortar (modo Cobrir).</p>
              </div>

              <Button onClick={handleSaveDisplaySettings} disabled={savingDisplay}
                className="w-full h-11 font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-md">
                {savingDisplay?<Loader2 className="animate-spin h-4 w-4 mr-2"/>:null} Salvar Exibição da Logo
              </Button>
            </div>
          </div>
          </div>
          </div>
        )}

        {/* TAB 3: INTEGRACOES OMNICHANNEL */}
        {activeTab === 'integracoes' && (
          <div className="grid gap-6 lg:grid-cols-2 animate-in slide-in-from-bottom-2 duration-300">
             {/* Shopee Hub */}
             <div className="bg-card border-2 border-[#f53d2d]/30 overflow-hidden rounded-2xl shadow-lg relative h-fit group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#f53d2d]/10 rounded-full -mr-20 -mt-20 pointer-events-none blur-3xl group-hover:bg-[#f53d2d]/20 transition-all" />
                <div className="p-6 md:p-8 relative z-10 w-full h-full">
                  <div className="flex items-center gap-3 mb-3">
                     <div className="h-12 w-12 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shadow-sm border border-[#f53d2d]/20">
                       <ShoppingBag className="h-6 w-6 text-[#f53d2d]" />
                     </div>
                     <div>
                       <h2 className="text-xl md:text-2xl font-black text-foreground">Shopee Open Platform</h2>
                       <p className="text-[10px] uppercase font-bold text-[#f53d2d] tracking-widest bg-[#f53d2d]/10 w-fit px-2 py-0.5 rounded-md mt-0.5">App Conector Ativo</p>
                     </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 font-medium">Insira suas chaves matrizes de desenvolvedor. Todos os anúncios criados aqui serão refletidos como mágica lá com a nova margem de impostos calculada e aplicada.</p>
                  
                  <form onSubmit={handleSaveShopee} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 bg-muted/30 p-2 rounded-xl border border-border">
                         <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest block ml-1">Shopee Comissão %</Label>
                         <Input value={shopeeCommission} onChange={e=>setShopeeCommission(e.target.value)} placeholder="20" className="bg-background shadow-sm h-10 font-bold" />
                      </div>
                      <div className="space-y-1.5 bg-muted/30 p-2 rounded-xl border border-border">
                         <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest block ml-1">Shopee Taxa Fixa</Label>
                         <Input value={shopeeFixedFee} onChange={e=>setShopeeFixedFee(e.target.value)} placeholder="4.00" className="bg-background shadow-sm h-10 font-bold" />
                      </div>
                      <div className="space-y-1.5 bg-muted/30 p-2 rounded-xl border border-border col-span-2">
                         <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest block ml-1">Teto Máximo Comissão (R$)</Label>
                         <Input value={shopeeCap} onChange={e=>setShopeeCap(e.target.value)} placeholder="100.00" className="bg-background shadow-sm h-10 font-bold" />
                      </div>
                      <div className="space-y-1.5 bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/20 col-span-2">
                         <Label className="font-bold text-[10px] uppercase text-emerald-600 tracking-widest block ml-1">Imposto Global / NF (%)</Label>
                         <div className="relative">
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-sm">%</span>
                           <Input value={globalTaxPct} onChange={e=>setGlobalTaxPct(e.target.value)} placeholder="0.00" className="bg-background shadow-sm h-10 font-bold pr-8" />
                         </div>
                         <p className="text-[9px] text-emerald-600/70 font-medium mt-1 ml-1">Usado para calcular a margem líquida real em todos os canais.</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 bg-muted/30 p-2 rounded-xl border border-border">
                       <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest block ml-1">App ID / Partner ID</Label>
                       <Input value={shopeeAppId} onChange={e=>setShopeeAppId(e.target.value)} placeholder="00000000000" className="bg-background shadow-sm h-12 font-mono text-sm border-none shadow-none focus-visible:ring-1 focus-visible:ring-[#f53d2d]" />
                    </div>
                    <div className="space-y-1.5 bg-muted/30 p-2 rounded-xl border border-border">
                       <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest block ml-1">App Secret / Partner Key</Label>
                       <Input type="password" value={shopeeSecret} onChange={e=>setShopeeSecret(e.target.value)} placeholder="********************************" className="bg-background shadow-sm h-12 font-mono text-sm border-none shadow-none focus-visible:ring-1 focus-visible:ring-[#f53d2d]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 bg-muted/30 p-2 rounded-xl border border-border">
                         <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest block ml-1">Shop ID</Label>
                         <Input value={shopeeShopId} onChange={e=>setShopeeShopId(e.target.value)} placeholder="000000" className="bg-background shadow-sm h-12 font-mono text-sm border-none shadow-none focus-visible:ring-1 focus-visible:ring-[#f53d2d]" />
                      </div>
                      <div className="space-y-1.5 bg-[#f53d2d]/5 p-2 rounded-xl border border-[#f53d2d]/20 relative overflow-hidden">
                         <Label className="font-bold text-[10px] uppercase text-[#f53d2d] tracking-widest block ml-1 z-10 relative">Mark-up Automático</Label>
                         <div className="relative z-10">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-[#f53d2d] text-sm">+</span>
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-sm">%</span>
                           <Input type="number" value={shopeeMarkup} onChange={e=>setShopeeMarkup(e.target.value)} placeholder="20" className="bg-transparent shadow-none h-12 pl-7 pr-7 font-black font-mono text-xl border-none focus-visible:ring-0 text-[#f53d2d]" />
                         </div>
                      </div>
                    </div>
                    <Button type="submit" disabled={savingShopee} className="w-full bg-[#f53d2d] hover:bg-[#d43527] text-white font-black uppercase tracking-widest h-14 shadow-xl shadow-[#f53d2d]/20 rounded-xl mt-2 transition-transform active:scale-95">
                       {savingShopee ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                       Salvar Marketplace Taxas
                    </Button>
                  </form>
                </div>
             </div>
             
             {/* TikTok Shop Hub */}
             <div className="bg-card border-2 border-black/10 overflow-hidden rounded-2xl shadow-lg relative h-fit group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-black/5 rounded-full -mr-20 -mt-20 pointer-events-none blur-3xl group-hover:bg-black/10 transition-all" />
                <div className="p-6 md:p-8 relative z-10 w-full h-full">
                  <div className="flex items-center gap-3 mb-3">
                     <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center shadow-sm border border-black">
                       <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.67c0 2.106-1.707 3.813-3.813 3.813-2.106 0-3.813-1.707-3.813-3.813 0-2.106 1.707-3.813 3.813-3.813h1.341V8.423H10.01s-5.83.172-5.83 7.247c0 7.075 5.83 7.247 5.83 7.247s5.83.172 5.83-7.247V7.953a7.105 7.105 0 0 0 3.753 1.157v-2.424z"/></svg>
                     </div>
                     <div>
                       <h2 className="text-xl md:text-2xl font-black text-foreground">TikTok Shop BR</h2>
                       <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest bg-muted w-fit px-2 py-0.5 rounded-md mt-0.5">Calculadora de Lucro</p>
                     </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 font-medium">Ajuste as taxas que o TikTok cobra em cada venda. Estes valores serão usados no simulador de lucro real dos seus acessórios.</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5 bg-muted/30 p-2 rounded-xl border border-border">
                       <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest block ml-1">TikTok Comissão %</Label>
                       <Input value={tiktokCommission} onChange={e=>setTiktokCommission(e.target.value)} placeholder="15" className="bg-background shadow-sm h-10 font-bold" />
                    </div>
                    <div className="space-y-1.5 bg-muted/30 p-2 rounded-xl border border-border">
                       <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest block ml-1">TikTok Taxa Fixa</Label>
                       <Input value={tiktokFixedFee} onChange={e=>setTiktokFixedFee(e.target.value)} placeholder="4.00" className="bg-background shadow-sm h-10 font-bold" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5 bg-muted/30 p-2 rounded-xl border border-border">
                       <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest block ml-1">Teto Máximo Comissão (R$)</Label>
                       <Input value={tiktokCap} onChange={e=>setTiktokCap(e.target.value)} placeholder="100.00" className="bg-background shadow-sm h-10 font-bold" />
                    </div>
                    <div className="space-y-1.5 bg-zinc-950 p-2 rounded-xl border border-zinc-800 relative overflow-hidden">
                       <Label className="font-bold text-[10px] uppercase text-white tracking-widest block ml-1 z-10 relative">Mark-up Automático</Label>
                       <div className="relative z-10">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-white text-sm">+</span>
                         <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-sm">%</span>
                         <Input type="number" value={tiktokMarkup} onChange={e=>setTiktokMarkup(e.target.value)} placeholder="15" className="bg-transparent shadow-none h-12 pl-7 pr-7 font-black font-mono text-xl border-none focus-visible:ring-0 text-white" />
                       </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveShopee} disabled={savingShopee} className="w-full bg-black hover:bg-zinc-800 text-white font-black uppercase tracking-widest h-14 shadow-xl shadow-black/10 rounded-xl transition-transform active:scale-95">
                     {savingShopee ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                     Salvar Taxas TikTok
                  </Button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
