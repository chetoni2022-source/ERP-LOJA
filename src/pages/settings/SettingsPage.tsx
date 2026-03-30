import React, { useState, useEffect } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../components/theme-provider';
import { useToast } from '../../contexts/ToastContext';
import { Users, UserPlus, Loader2, Moon, Sun, Monitor, UploadCloud, Store, Palette, Target, ImageIcon, Crop, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
  const [savingDisplay, setSavingDisplay] = useState(false);

  const MAX_FILE_SIZE = 3 * 1024 * 1024;

  useEffect(() => {
    if (!user) return;
    supabase.from('store_settings')
      .select('store_name, monthly_goal, logo_url, favicon_url, logo_width, logo_height, logo_fit, logo_position, whatsapp_number')
      .eq('user_id', user.id)
      .limit(1).maybeSingle().then(({ data }) => {
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
      success('Identidade visual salva! Recarregue a página para sincronizar.');
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

  const previewImg = logoPreview || currentLogoUrl;
  const faviconImg = faviconPreview || currentFaviconUrl;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center text-foreground">Configurações Avançadas</h1>
        <p className="text-muted-foreground">Gerencie as preferências da loja, convide a equipe e personalize a identidade visual.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          
          {/* Aparência */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center text-foreground gap-2"><Palette className="w-5 h-5 text-primary" /> Aparência do Painel</h2>
            <Label className="mb-3 block text-foreground font-semibold">Tema do Sistema ERP</Label>
            <div className="flex bg-muted/40 p-1.5 rounded-xl border border-border overflow-hidden">
              {([['light','Claro',<Sun size={16}/>],['dark','Escuro',<Moon size={16}/>],['system','Auto',<Monitor size={16}/>]] as const).map(([t,label,icon])=>(
                <button key={t} onClick={()=>setTheme(t as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${theme===t?'bg-background shadow-md text-foreground border border-border/70':'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}>
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Equipe */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-foreground"><Users className="h-5 w-5 text-primary" /> Equipe e Acessos</h2>
            <p className="text-sm text-muted-foreground mb-4">Gerencie quem tem acesso ao painel do seu ERP.</p>
            <div className="flex gap-2">
              <Input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="vendedor@loja.com" className="bg-background shadow-sm h-11" />
              <Button className="bg-primary text-primary-foreground font-bold shadow-md px-4 h-11"><UserPlus className="h-4 w-4 mr-1.5" /> Convidar</Button>
            </div>
            <div className="pt-4 border-t border-border mt-4">
              <div className="flex justify-between items-center py-3 px-4 bg-background border border-border rounded-xl shadow-sm">
                <div><p className="text-sm font-bold text-foreground">{user?.email}</p><p className="text-xs text-muted-foreground">Proprietário (Admin)</p></div>
                <span className="text-xs font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-md border border-emerald-500/20">Ativo</span>
              </div>
            </div>
          </div>
        </div>

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
                      ? <img src={previewImg} alt="Logo" className="w-full h-full object-contain z-10 drop-shadow-sm p-3" />
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
                      ? <img src={faviconImg} alt="Favicon" className="h-14 w-14 object-contain z-10" />
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

          {/* ── LOGO DISPLAY SETTINGS ── */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2 text-foreground"><Crop className="w-5 h-5 text-primary"/> Exibição da Logo no Catálogo</h2>
            <p className="text-sm text-muted-foreground mb-5">Ajuste o tamanho, modo de corte e posição da logo que aparece na vitrine pública.</p>

            {/* Live preview */}
            <div className="border border-border rounded-xl overflow-hidden mb-5 bg-[#0c0b09]">
              <div className="p-3 text-center">
                <p className="text-[9px] font-bold tracking-widest uppercase text-white/30 mb-2">Preview do catálogo</p>
                <div style={{width:'100%',height:logoHeight+24,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                  {previewImg
                    ? <img src={previewImg} alt="preview" style={{width:logoWidth,height:logoHeight,objectFit:logoFit,objectPosition:logoPosition,display:'block'}}/>
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
    </div>
  );
}
