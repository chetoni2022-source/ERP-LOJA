import React, { useState, useEffect } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../components/theme-provider';
import { useToast } from '../../contexts/ToastContext';
import { Users, UserPlus, Loader2, Moon, Sun, Monitor, UploadCloud, Store, Palette, Target, ImageIcon, Crop, Phone, X, ShoppingBag, Settings2, Blocks, Layout } from 'lucide-react';
import { supabase, getProxyUrl } from '../../lib/supabase';

const POSITION_OPTIONS = [
  { value: 'top left', label: '↖', title: 'Superior esquerda' },
  { value: 'top center', label: '↑', title: 'Superior centro' },
  { value: 'top right', label: '↗', title: 'Superior direita' },
  { value: 'center left', label: '←', title: 'Centro esquerda' },
  { value: 'center', label: '•', title: 'Centro' },
  { value: 'center right', label: '→', title: 'Centro direita' },
  { value: 'bottom left', label: '↙', title: 'Inferior esquerda' },
  { value: 'bottom center', label: '↓', title: 'Inferior centro' },
  { value: 'bottom right', label: '↘', title: 'Inferior direita' },
];

function selectLatestStoreSettings(tenantId: string, columns = '*') {
  return supabase
    .from('store_settings')
    .select(columns)
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
}

function storagePathFor(finalTenantId: string, prefix: string, file: File) {
  const fallbackExt = file.type.split('/')[1] || 'png';
  const ext = (file.name.split('.').pop() || fallbackExt).toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  return `${finalTenantId}/${prefix}-${Date.now()}.${ext}`;
}

export default function SettingsPage() {
  const { user, profile } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'geral' | 'marca' | 'integracoes'>('geral');
  const [inviteEmail, setInviteEmail] = useState('');
  
  // White-label State
  const { tenantId } = useTenant();
  const [storeName, setStoreName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [monthlyGoal, setMonthlyGoal] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#a855f7');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [loginBgFile, setLoginBgFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [loginBgPreview, setLoginBgPreview] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [currentFaviconUrl, setCurrentFaviconUrl] = useState<string | null>(null);
  const [currentLoginBgUrl, setCurrentLoginBgUrl] = useState<string | null>(null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [faviconLoadFailed, setFaviconLoadFailed] = useState(false);
  const [loginBgLoadFailed, setLoginBgLoadFailed] = useState(false);
  const [loginBgColor, setLoginBgColor] = useState('#000000');
  const [loginBgMode, setLoginBgMode] = useState<'image' | 'color' | 'gradient'>('image');
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

  // TikTok Integration State
  const [tiktokMarkup, setTiktokMarkup] = useState('0');
  const [tiktokCommission, setTiktokCommission] = useState('15');
  const [tiktokFixedFee, setTiktokFixedFee] = useState('4');
  const [tiktokCap, setTiktokCap] = useState('100');

  const MAX_FILE_SIZE = 3 * 1024 * 1024;

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [logoPreview, currentLogoUrl]);

  useEffect(() => {
    setFaviconLoadFailed(false);
  }, [faviconPreview, currentFaviconUrl]);

  useEffect(() => {
    setLoginBgLoadFailed(false);
  }, [loginBgPreview, currentLoginBgUrl]);

  useEffect(() => {
    if (!user || !tenantId) return;

    // Load tenant branding
    supabase.from('tenant_branding')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.warn('Tenant branding columns missing?', error);
          // Fallback: try selecting only common columns
          return supabase.from('tenant_branding')
            .select('store_name, logo_url, favicon_url, login_bg_url, login_bg_color, login_bg_mode, primary_color, whatsapp_number')
            .eq('tenant_id', tenantId)
            .maybeSingle();
        }
        return { data };
      })
      .then(({ data }: any) => {
        if (data) {
          if (data.store_name) setStoreName(data.store_name);
          if (data.logo_url) setCurrentLogoUrl(data.logo_url);
          if (data.favicon_url) setCurrentFaviconUrl(data.favicon_url);
          if (data.login_bg_url) setCurrentLoginBgUrl(data.login_bg_url);
          if (data.primary_color) setPrimaryColor(data.primary_color);
          if (data.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
          if (data.login_bg_color) setLoginBgColor(data.login_bg_color);
          if (data.login_bg_mode) setLoginBgMode(data.login_bg_mode);
        }
      });

    // Load other settings
    selectLatestStoreSettings(tenantId).then(({ data }: { data: any }) => {
        if (data) {
          // Backward compatibility: if tenant_branding was empty, use these
          if (data.store_name) setStoreName((prev) => prev || data.store_name);
          if (data.whatsapp_number) setWhatsappNumber((prev) => prev || data.whatsapp_number);
          
          if (data.monthly_goal) setMonthlyGoal(data.monthly_goal.toString());
          if (data.logo_url) setCurrentLogoUrl((prev) => prev || data.logo_url);
          if (data.favicon_url) setCurrentFaviconUrl((prev) => prev || data.favicon_url);
          
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
  }, [user, tenantId]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
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

  const resolveActiveTenantId = async () => {
    if (tenantId) return tenantId;
    return null;
  };

  const rememberTenantForLogin = async (finalTenantId: string) => {
    localStorage.setItem('lastTenantId', finalTenantId);
    const { data } = await supabase
      .from('tenant_login_branding')
      .select('tenant_slug')
      .eq('tenant_id', finalTenantId)
      .maybeSingle();
    if (data?.tenant_slug) {
      localStorage.setItem('lastTenantSlug', data.tenant_slug);
    }
  };

  const saveStoreSettings = async (finalTenantId: string, payload: Record<string, unknown>) => {
    const values = { ...payload, updated_at: new Date().toISOString() };
    const { data: existing, error: selectError } = await selectLatestStoreSettings(finalTenantId, 'id');
    if (selectError) throw selectError;

    if (existing?.id) {
      const { error } = await supabase.from('store_settings').update(values).eq('id', existing.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('store_settings')
      .insert([{ ...values, tenant_id: finalTenantId, user_id: user?.id }]);
    if (error) throw error;
  };

  const handleSaveBranding = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    
    const activeTenantId = await resolveActiveTenantId();
    
    // Fallback de emergência para garantir que identifique a empresa (Laris)
    if (!activeTenantId) {
      toastError('Erro: Empresa não identificada. Selecione uma empresa ou recarregue a página.');
      return;
    }
    const finalTenantId = activeTenantId;
    
    setSavingBrand(true);
    try {
      let logoUrl = null;
      let faviconUrl = null;
      let loginBgUrl = null;

      if (logoFile) {
        const { error, data } = await supabase.storage.from('brand').upload(storagePathFor(finalTenantId, 'logo', logoFile), logoFile);
        if (error) throw error;
        logoUrl = supabase.storage.from('brand').getPublicUrl(data.path).data.publicUrl;
      }

      if (faviconFile) {
        const { error, data } = await supabase.storage.from('brand').upload(storagePathFor(finalTenantId, 'favicon', faviconFile), faviconFile);
        if (error) throw error;
        faviconUrl = supabase.storage.from('brand').getPublicUrl(data.path).data.publicUrl;
      }

      if (loginBgFile) {
        const { error, data } = await supabase.storage.from('brand').upload(storagePathFor(finalTenantId, 'login-bg', loginBgFile), loginBgFile);
        if (error) throw error;
        loginBgUrl = supabase.storage.from('brand').getPublicUrl(data.path).data.publicUrl;
      }

      // 1. Save to tenant_branding
      const brandingPayload: any = {
        store_name: storeName,
        whatsapp_number: whatsappNumber,
        primary_color: primaryColor,
      };
      if (logoUrl) { brandingPayload.logo_url = logoUrl; setCurrentLogoUrl(logoUrl); }
      if (faviconUrl) { brandingPayload.favicon_url = faviconUrl; setCurrentFaviconUrl(faviconUrl); }
      if (loginBgUrl) { brandingPayload.login_bg_url = loginBgUrl; setCurrentLoginBgUrl(loginBgUrl); }
      brandingPayload.login_bg_color = loginBgColor;
      brandingPayload.login_bg_mode = loginBgMode;
      brandingPayload.updated_at = new Date().toISOString();

      const { data: existingBranding } = await supabase.from('tenant_branding').select('id').eq('tenant_id', finalTenantId).maybeSingle();
      if (existingBranding) {
        const { error } = await supabase.from('tenant_branding').update(brandingPayload).eq('id', existingBranding.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tenant_branding').insert([{ ...brandingPayload, tenant_id: finalTenantId }]);
        if (error) throw error;
      }

      // 2. Save common settings to store_settings
      const settingsPayload: any = {
        store_name: storeName,
        whatsapp_number: whatsappNumber,
        monthly_goal: parseFloat(monthlyGoal) || 0,
        lead_sources: leadSources
      };
      if (logoUrl) settingsPayload.logo_url = logoUrl;
      if (faviconUrl) settingsPayload.favicon_url = faviconUrl;

      await saveStoreSettings(finalTenantId, settingsPayload);
      await rememberTenantForLogin(finalTenantId);

      setLogoFile(null); setFaviconFile(null); setLoginBgFile(null);
      setLogoPreview(null); setFaviconPreview(null); setLoginBgPreview(null);
      
      success('Identidade visual salva! As alterações foram aplicadas para toda a empresa.');
    } catch (err: any) { 
      console.error('Error saving branding:', err);
      toastError('Erro ao salvar: ' + (err.message || 'Verifique sua conexão.')); 
    } 
    finally { setSavingBrand(false); }
  };

  const handleSaveDisplaySettings = async () => {
    setSavingDisplay(true);
    try {
      const activeTenantId = await resolveActiveTenantId();
      if (!activeTenantId) throw new Error('Empresa nÃ£o identificada para salvar a exibiÃ§Ã£o.');
      const payload = { logo_width: logoWidth, logo_height: logoHeight, logo_fit: logoFit, logo_position: logoPosition };
      await saveStoreSettings(activeTenantId, payload);
      await rememberTenantForLogin(activeTenantId);
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
      const activeTenantId = await resolveActiveTenantId();
      if (!activeTenantId) throw new Error('Empresa nÃ£o identificada para salvar integraÃ§Ãµes.');
      
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
      
      await saveStoreSettings(activeTenantId, payload);
      await rememberTenantForLogin(activeTenantId);
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
      if (!tenantId) {
        throw new Error('Empresa não identificada para o convite.');
      }
      const { error } = await supabase.from('team_invites').insert([{
        email: inviteEmail.toLowerCase().trim(),
        role: 'sales',
        invited_by: user.id,
        tenant_id: tenantId
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

  const previewImg = logoPreview || (logoLoadFailed ? null : getProxyUrl(currentLogoUrl));
  const faviconImg = faviconPreview || (faviconLoadFailed ? null : getProxyUrl(currentFaviconUrl));
  const loginBgImg = loginBgPreview || (loginBgLoadFailed ? null : getProxyUrl(currentLoginBgUrl));

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-3 pb-24 sm:p-4 md:p-8 md:pb-20 animate-in fade-in duration-300">
      <div className="rounded-lg border border-border bg-card/90 p-4 shadow-sm sm:p-5 md:p-6">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Central do sistema</p>
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Ajustes e Identidade Visual</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Controle marca, equipe, canais e integrações em um layout preparado para notebook e celular.</p>
        
        {/* Contexto de Tenant para Admin/Super Admin */}
        {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
          <div className="mt-5 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/10 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Store size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">Contexto de edição</p>
                <p className="text-sm font-bold text-foreground">
                  {tenantId ? `Editando Tenant ID: ${tenantId}` : 'Nenhuma empresa selecionada'}
                </p>
              </div>
            </div>
            {!tenantId && (
              <p className="text-[10px] italic text-muted-foreground">
                Dica: selecione uma empresa no Painel Master antes de editar uma marca.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Menu de Abas Premium */}
      <div className="flex w-full snap-x gap-2 overflow-x-auto rounded-lg border border-border bg-card/70 p-1.5 shadow-sm scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <button 
          onClick={() => setActiveTab('geral')}
          className={`flex-none flex items-center gap-2 px-4 md:px-5 py-3 rounded-md font-bold text-[11px] md:text-[13px] uppercase tracking-widest whitespace-nowrap transition-all snap-start ${activeTab === 'geral' ? 'bg-zinc-950 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
        >
          <Settings2 size={16} /> Geral & Equipe
        </button>
        <button 
          onClick={() => setActiveTab('marca')}
          className={`flex-none flex items-center gap-2 px-4 md:px-5 py-3 rounded-md font-bold text-[11px] md:text-[13px] uppercase tracking-widest whitespace-nowrap transition-all snap-start ${activeTab === 'marca' ? 'bg-zinc-950 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
        >
          <Palette size={16} /> Identidade Visual
        </button>
        <button 
          onClick={() => setActiveTab('integracoes')}
          className={`flex-none flex items-center gap-2 px-4 md:px-5 py-3 rounded-md font-bold text-[11px] md:text-[13px] uppercase tracking-widest whitespace-nowrap transition-all snap-start ${activeTab === 'integracoes' ? 'bg-[#f53d2d] text-white shadow-sm' : 'text-muted-foreground hover:bg-[#f53d2d]/10 hover:text-[#f53d2d]'}`}
        >
          <Blocks size={16} /> Integrações Omnichannel
        </button>
      </div>

      <div className="mt-4">
        {/* TAB 1: GERAL E EQUIPE */}
        {activeTab === 'geral' && (
          <div className="grid gap-6 lg:grid-cols-2 animate-in slide-in-from-bottom-2 duration-300">
            {/* Aparência */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm xl:sticky xl:top-24">
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
              <Button type="submit" disabled={savingBrand} className="bg-zinc-950 text-white hover:bg-zinc-800 font-bold shadow-md px-4 h-11">
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
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] animate-in slide-in-from-bottom-2 duration-300">
            <div className="xl:col-span-2 sticky top-14 md:top-0 z-30 -mx-1 rounded-lg border border-border bg-background/95 p-3 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/85">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Identidade visual</p>
                  <p className="text-sm font-semibold text-foreground">Configure nome, imagens, cores e preview do login da empresa.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:min-w-[320px] lg:min-w-[420px]">
                  <Button type="button" onClick={handleSaveBranding} disabled={savingBrand}
                    className="h-11 rounded-md bg-zinc-950 text-[10px] font-black uppercase tracking-widest text-white shadow-sm hover:bg-zinc-800">
                    {savingBrand ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Target className="h-4 w-4 mr-2" />}
                    Salvar Marca
                  </Button>
                  <Button type="button" onClick={handleSaveDisplaySettings} disabled={savingDisplay}
                    className="h-11 rounded-md bg-foreground text-[10px] font-black uppercase tracking-widest text-background shadow-sm hover:bg-foreground/90">
                    {savingDisplay ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Crop className="h-4 w-4 mr-2" />}
                    Salvar Exibição
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-5 min-w-0">
              {/* Identidade visual */}
              <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground"><Store className="h-5 w-5 text-primary"/> Marca da empresa</h2>
              <p className="mt-1 text-sm text-muted-foreground">Dados principais aplicados no painel, catalogo e tela de login.</p>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-5 p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground text-sm">Nome Principal do ERP</Label>
                <Input value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="Laris Acessórios" className="h-12 rounded-md bg-background font-semibold shadow-none" />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground text-sm flex items-center gap-2"><Phone size={14} className="text-primary"/> WhatsApp de Contato</Label>
                <Input value={whatsappNumber} onChange={e=>setWhatsappNumber(e.target.value)} placeholder="5511999999999" className="h-12 rounded-md bg-background font-semibold shadow-none" />
                <p className="text-[10px] text-muted-foreground">Formato: 55 + DDD + Numero (apenas números)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground text-sm flex items-center gap-2"><Palette size={14} className="text-primary"/> Cor Primária do Sistema</Label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="h-12 w-12 cursor-pointer rounded-md border border-border bg-background p-1"
                  />
                  <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-12 rounded-md bg-background font-mono font-bold uppercase shadow-none" />
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Esta cor será aplicada em botões e destaques para toda sua equipe.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground text-sm flex items-center gap-2"><Target size={14} className="text-primary"/> Meta Mensal (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">R$</span>
                  <Input type="number" step="0.01" value={monthlyGoal} onChange={e=>setMonthlyGoal(e.target.value)} placeholder="5000.00" className="h-12 rounded-md bg-background pl-10 font-bold shadow-none" />
                </div>
                <p className="text-xs text-muted-foreground">Aparece como barra de progresso no Painel.</p>
              </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {/* Logo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="font-semibold text-foreground text-sm">Logotipo principal</Label>
                    <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">PNG/SVG</span>
                  </div>
                  <div className="group relative flex h-[160px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/20 text-center transition-colors hover:bg-muted/40">
                    {previewImg
                      ? <img src={previewImg} alt="Logo" onError={() => setLogoLoadFailed(true)} className="z-10 h-full w-full object-contain p-4 drop-shadow-sm" />
                      : <div className="flex flex-col items-center z-10 pointer-events-none">
                          <UploadCloud className="h-7 w-7 text-muted-foreground group-hover:text-primary mb-2" />
                          <span className="text-xs font-bold">Enviar Logo</span>
                          <span className="mt-1 px-4 text-[10px] text-muted-foreground">Fundo transparente, ate 3MB, recomendado 600x240px</span>
                        </div>
                    }
                    <Input type="file" accept="image/*" onChange={e=>handleFileChange(e,setLogoFile,setLogoPreview)} className="absolute inset-0 opacity-0 cursor-pointer h-full w-full z-20" />
                  </div>
                </div>
                {/* Favicon */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="font-semibold text-foreground text-sm">Icone da aba</Label>
                    <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">512x512</span>
                  </div>
                  <div className="group relative flex h-[160px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/20 text-center transition-colors hover:bg-muted/40">
                    {faviconImg
                      ? <img src={faviconImg} alt="Favicon" onError={() => setFaviconLoadFailed(true)} className="h-14 w-14 object-contain z-10" />
                      : <div className="flex flex-col items-center z-10 pointer-events-none">
                          <UploadCloud className="h-7 w-7 text-muted-foreground group-hover:text-primary mb-2" />
                          <span className="text-xs font-bold">Enviar Favicon</span>
                          <span className="mt-1 px-4 text-[10px] text-muted-foreground">PNG quadrado ou ICO, ate 3MB</span>
                        </div>
                    }
                    <Input type="file" accept="image/*" onChange={e=>handleFileChange(e,setFaviconFile,setFaviconPreview)} className="absolute inset-0 opacity-0 cursor-pointer h-full w-full z-20" />
                  </div>
                </div>
              </div>

              {/* ── LOGIN EXPERIENCE ── */}
              <div className="border-t border-border pt-5">
                <h2 className="mb-1 flex items-center gap-2 text-xl font-black tracking-tight text-foreground"><Layout className="h-5 w-5 text-primary"/> Tela de login</h2>
                <p className="mb-5 text-sm text-muted-foreground">Escolha o fundo e confira o resultado no preview ao lado.</p>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Tipo de Fundo</Label>
                    <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/40 p-1">
                      {([['image','Imagem'],['color','Cor Sólida'],['gradient','Gradiente Profissional']] as const).map(([val,label])=>(
                        <button key={val} type="button" onClick={()=>setLoginBgMode(val)}
                          className={`min-h-10 rounded-md px-2 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${loginBgMode===val?'bg-background text-foreground shadow-sm':'text-muted-foreground hover:text-foreground'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loginBgMode === 'image' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label className="font-semibold text-foreground text-sm flex items-center gap-2">Imagem de Fundo</Label>
                      <div className="group relative flex h-[190px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/20 text-center transition-colors hover:bg-muted/40">
                        {loginBgImg
                          ? <img src={loginBgImg} alt="Login Background" onError={() => setLoginBgLoadFailed(true)} className="w-full h-full object-cover z-10" />
                          : <div className="flex flex-col items-center z-10 pointer-events-none">
                              <UploadCloud className="h-7 w-7 text-muted-foreground group-hover:text-primary mb-2" />
                              <span className="text-xs font-bold">Enviar Imagem</span>
                              <span className="mt-1 px-4 text-[10px] text-muted-foreground">JPG/PNG horizontal, recomendado 1920x1080px, ate 3MB</span>
                            </div>
                        }
                        <Input type="file" accept="image/*" onChange={e=>handleFileChange(e,setLoginBgFile,setLoginBgPreview)} className="absolute inset-0 opacity-0 cursor-pointer h-full w-full z-20" />
                      </div>
                    </div>
                  )}

                  {(loginBgMode === 'color' || loginBgMode === 'gradient') && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label className="font-semibold text-foreground text-sm flex items-center gap-2">Cor de Fundo da Tela</Label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={loginBgColor} 
                          onChange={e => setLoginBgColor(e.target.value)}
                          className="h-14 w-14 cursor-pointer rounded-md border border-border bg-background p-1"
                        />
                        <Input value={loginBgColor} onChange={e => setLoginBgColor(e.target.value)} className="h-14 rounded-md bg-background font-mono text-lg font-black uppercase shadow-none" />
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Essa cor será usada no fundo da tela de login {loginBgMode==='gradient'?'como base do gradiente':''}.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-background/70 p-3 shadow-sm">
                <Button type="button" onClick={handleSaveBranding} disabled={savingBrand}
                  className="h-12 w-full rounded-md bg-zinc-950 text-sm font-black uppercase tracking-[0.18em] text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98]">
                  {savingBrand?<Loader2 className="animate-spin h-5 w-5 mr-2"/>:<Target className="h-5 w-5 mr-2"/>} Salvar Identidade
                </Button>
              </div>
            </form>
          </div>
          </div>

          <div className="space-y-5 min-w-0">
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Preview ao vivo</p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-foreground"><Layout className="h-5 w-5 text-primary" /> Tela de login</h2>
            </div>
            <div
              className="relative min-h-[360px] p-4"
              style={{
                background: loginBgMode === 'image' && loginBgImg
                  ? `url(${loginBgImg}) center/cover no-repeat`
                  : loginBgMode === 'gradient'
                    ? `linear-gradient(135deg, ${loginBgColor} 0%, ${primaryColor} 100%)`
                    : loginBgColor
              }}
            >
              <div className="absolute inset-0 bg-black/42" />
              <div className="relative mx-auto flex min-h-[320px] max-w-[320px] flex-col justify-center rounded-lg border border-white/20 bg-white/92 p-4 shadow-2xl backdrop-blur">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                    {previewImg ? (
                      <img src={previewImg} alt="Logo" onError={() => setLogoLoadFailed(true)} className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <Store className="h-5 w-5" style={{ color: primaryColor }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-zinc-950">{storeName || 'Nome da empresa'}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Portal de acesso</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="h-10 rounded-md border border-zinc-200 bg-zinc-50" />
                  <div className="h-10 rounded-md border border-zinc-200 bg-zinc-50" />
                  <div className="mt-3 h-11 rounded-md" style={{ background: primaryColor }} />
                </div>
              </div>
            </div>
          </div>
          {/* ── LOGO DISPLAY SETTINGS ── */}
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border p-4">
              <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><Crop className="h-5 w-5 text-primary"/> Exibição da logo</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ajuste como a logo aparece no menu, painel e catálogo público.</p>
            </div>

            {/* Live preview */}
            <div className="m-4 overflow-hidden rounded-lg border border-border bg-[#0c0b09]">
              <div className="p-3 text-center">
                <p className="text-[9px] font-bold tracking-widest uppercase text-white/30 mb-2">Preview do catálogo</p>
                <div style={{width:'100%',minHeight:104,height:Math.min(logoHeight+24,184),display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                  {previewImg
                    ? <img src={previewImg} alt="preview" onError={() => setLogoLoadFailed(true)} style={{width:logoWidth,height:logoHeight,objectFit:logoFit,objectPosition:logoPosition,display:'block'}}/>
                    : <div style={{width:logoWidth,height:logoHeight,display:'flex',alignItems:'center',justifyContent:'center',border:'1px dashed rgba(255,255,255,0.2)',borderRadius:6}}>
                        <ImageIcon style={{width:24,height:24,color:'rgba(255,255,255,0.2)'}}/>
                      </div>
                  }
                </div>
              </div>
            </div>

            <div className="space-y-5 p-4 pt-1">
              {/* Width */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Largura</Label>
                  <span className="text-sm font-bold text-foreground tabular-nums">{logoWidth}px</span>
                </div>
                <input type="range" min="60" max="400" step="4" value={logoWidth}
                  onChange={e=>setLogoWidth(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                  style={{background:`linear-gradient(to right, hsl(var(--primary)) ${((logoWidth-60)/(400-60))*100}%, var(--border) ${((logoWidth-60)/(400-60))*100}%)`}}
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
                  style={{background:`linear-gradient(to right, hsl(var(--primary)) ${((logoHeight-20)/(160-20))*100}%, var(--border) ${((logoHeight-20)/(160-20))*100}%)`}}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>20px</span><span>160px</span></div>
              </div>

              {/* Fit */}
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Modo de Exibição</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {([['contain','Conter','Logo completa visível'],['cover','Cobrir','Preenche o espaço (pode cortar)'],['fill','Esticar','Ocupa todo o espaço']] as const).map(([val,label])=>(
                    <button key={val} type="button" onClick={()=>setLogoFit(val)}
                      className={`flex min-h-[74px] flex-col items-center gap-1 rounded-lg border p-3 text-xs font-bold transition-all ${logoFit===val?'border-primary bg-primary/10 text-primary':'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'}`}>
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
                <div className="grid w-fit grid-cols-3 gap-1.5 rounded-lg border border-border bg-muted/20 p-3">
                  {POSITION_OPTIONS.map(opt=>(
                    <button key={opt.value} type="button" onClick={()=>setLogoPosition(opt.value)} title={opt.title}
                      className={`flex h-10 w-10 items-center justify-center rounded-md border text-base font-bold transition-all ${logoPosition===opt.value?'border-zinc-950 bg-zinc-950 text-white':'border-border bg-background text-muted-foreground hover:border-zinc-500 hover:text-foreground'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Define de onde a logo é "ancorada" ao cortar (modo Cobrir).</p>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-background/70 p-3 shadow-sm">
                <Button onClick={handleSaveDisplaySettings} disabled={savingDisplay}
                  className="h-11 w-full rounded-md bg-zinc-950 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98]">
                  {savingDisplay?<Loader2 className="animate-spin h-4 w-4 mr-2"/>:null} Salvar Exibição
                </Button>
              </div>
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
                    <div className="mt-4 p-3 rounded-xl border border-border bg-background/70 backdrop-blur-sm shadow-sm">
                      <Button type="submit" disabled={savingShopee} className="w-full bg-[#f53d2d] hover:bg-[#d43527] text-white font-black uppercase tracking-widest h-14 shadow-xl shadow-[#f53d2d]/20 rounded-xl transition-all active:scale-[0.98]">
                         {savingShopee ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                         Salvar Taxas Marketplaces
                      </Button>
                    </div>
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
