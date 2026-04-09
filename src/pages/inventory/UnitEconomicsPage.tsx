import React, { useState, useEffect } from 'react';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Button, Input, Label } from '../../components/ui';
import { Link } from 'react-router-dom';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  ShoppingBag, 
  Monitor, 
  Package,
  Info,
  Calculator,
  Loader2,
  HelpCircle,
  LayoutGrid,
  ExternalLink,
  Target,
  TrendingUp,
  Zap,
  ArrowRight
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  sale_price: number | null;
  cost_price: number;
  additional_costs: { label: string, value: number }[] | null;
  shopee_price?: number | null;
  tiktok_price?: number | null;
  image_url?: string | null;
  images?: string[] | null;
}

interface TaxSettings {
  shopee_comm: number;
  shopee_fee: number;
  shopee_cap: number;
  tiktok_comm: number;
  tiktok_fee: number;
  tiktok_cap: number;
  global_tax: number;
}

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// Common Grid Classes for perfect alignment
const GRID_CLASSES = "grid grid-cols-[1fr_80px_100px_100px_100px_100px_100px_110px_130px_48px] gap-2 items-center";

const HeaderTooltip = ({ title, content, align = 'center' }: { title: string, content: string, align?: 'center' | 'left' | 'right' }) => (
  <div className="group relative inline-block ml-1 align-middle">
    <HelpCircle size={10} className="text-muted-foreground/50 group-hover:text-primary transition-colors cursor-help" />
    <div className={cn(
        "absolute bottom-full mb-2 w-56 p-4 bg-card border border-border shadow-2xl rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100] text-[11px] leading-relaxed font-semibold text-foreground text-center pointer-events-none backdrop-blur-md",
        align === 'center' ? "left-1/2 -translate-x-1/2" : align === 'left' ? "left-0" : "right-0"
    )}>
       <div className="font-black border-b border-border/40 mb-2 pb-1.5 uppercase tracking-widest text-primary flex items-center justify-center gap-2">
         <Info size={12} /> {title}
       </div>
       {content}
       <div className={cn(
         "absolute top-full border-8 border-transparent border-t-card drop-shadow-[0_1px_0_rgba(0,0,0,0.1)]",
         align === 'center' ? "left-1/2 -translate-x-1/2" : align === 'left' ? "left-4" : "right-4"
       )} />
    </div>
  </div>
);

export default function UnitEconomicsPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [expandedSimulators, setExpandedSimulators] = useState<Record<string, boolean>>({});
  const [visiblePlatforms, setVisiblePlatforms] = useState({
    site: true,
    shopee: true,
    tiktok: true
  });

  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    shopee_comm: 20,
    shopee_fee: 4,
    shopee_cap: 100,
    tiktok_comm: 15,
    tiktok_fee: 4,
    tiktok_cap: 100,
    global_tax: 0
  });

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const [productsRes, settingsRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('store_settings').select('*').eq('user_id', user?.id).maybeSingle()
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (settingsRes.data) {
        setTaxSettings({
          shopee_comm: settingsRes.data.shopee_commission_pct ?? 20,
          shopee_fee: settingsRes.data.shopee_fixed_fee ?? 4,
          shopee_cap: settingsRes.data.shopee_commission_cap ?? 100,
          tiktok_comm: settingsRes.data.tiktok_commission_pct ?? 15,
          tiktok_fee: settingsRes.data.tiktok_fixed_fee ?? 4,
          tiktok_cap: settingsRes.data.tiktok_commission_cap ?? 100,
          global_tax: settingsRes.data.global_tax_pct ?? 0,
        });
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      setLoading(false);
    }
  }

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSimulator = (productId: string, platform: string) => {
    const key = `${productId}-${platform}`;
    setExpandedSimulators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const calculateUnitEconomics = (product: Product, platform: 'site' | 'shopee' | 'tiktok') => {
    let price = 0;
    let commPct = 0;
    let fixedFee = 0;
    let cap = Infinity;

    const totalProductCost = product.cost_price;

    if (platform === 'site') {
      price = product.sale_price || product.price;
      commPct = 0; 
      fixedFee = 0;
    } else if (platform === 'shopee') {
      price = product.shopee_price || product.sale_price || product.price;
      commPct = taxSettings.shopee_comm;
      fixedFee = taxSettings.shopee_fee;
      cap = taxSettings.shopee_cap;
    } else if (platform === 'tiktok') {
      price = product.tiktok_price || product.sale_price || product.price;
      commPct = taxSettings.tiktok_comm;
      fixedFee = taxSettings.tiktok_fee;
      cap = taxSettings.tiktok_cap;
    }

    const commissionValue = Math.min(price * (commPct / 100), cap);
    const taxValue = price * (taxSettings.global_tax / 100);
    const repasse = price - commissionValue - fixedFee - taxValue;
    const result = repasse - totalProductCost;
    const margin = (result / price) * 100;

    return {
      price,
      cost: totalProductCost,
      commission: commissionValue,
      tax: taxValue,
      fee: fixedFee,
      repasse,
      result,
      margin
    };
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/60 backdrop-blur-md border border-border/40 p-6 md:p-10 rounded-[3rem] shadow-2xl shadow-primary/5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
               <Calculator className="h-7 w-7" />
            </div>
            <div>
               <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase">Análise de Lucros</h1>
               <p className="text-muted-foreground font-semibold flex items-center gap-2">
                 <Target size={14} className="text-primary" /> Simulador de Repasse e Unit Economics de Próxima Geração
               </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center relative z-10">
          <div className="relative group/search w-full sm:w-96">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/search:text-primary transition-all" />
             <Input 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               placeholder="Buscar peça ou SKU..." 
               className="pl-11 h-14 bg-background/80 border-border/60 font-bold rounded-[1.5rem] focus:ring-primary/20 transition-all shadow-inner text-lg"
             />
          </div>
          <div className="flex bg-muted/40 p-1.5 rounded-[1.5rem] border border-border/40 gap-1.5 shrink-0">
             <button 
               onClick={() => setVisiblePlatforms(p => ({ ...p, site: !p.site }))}
               className={cn("px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", visiblePlatforms.site ? "bg-primary text-primary-foreground shadow-lg scale-105" : "text-muted-foreground hover:bg-muted")}
             >SITE</button>
             <button 
               onClick={() => setVisiblePlatforms(p => ({ ...p, shopee: !p.shopee }))}
               className={cn("px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", visiblePlatforms.shopee ? "bg-[#f53d2d] text-white shadow-lg shadow-[#f53d2d]/20 scale-105" : "text-muted-foreground hover:bg-muted")}
             >SHOPEE</button>
             <button 
               onClick={() => setVisiblePlatforms(p => ({ ...p, tiktok: !p.tiktok }))}
               className={cn("px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", visiblePlatforms.tiktok ? "bg-black text-white shadow-lg shadow-black/20 scale-105" : "text-muted-foreground hover:bg-muted")}
             >TIKTOK</button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/80 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] overflow-visible relative group/table">
        {/* STICKY HEADER - FIXING STICKINESS & Z-INDEX */}
        <div className={cn(
          "hidden lg:grid gap-2 px-8 py-6 bg-card/95 border-b border-border items-center sticky top-0 md:top-0 z-[60] backdrop-blur-2xl transition-all duration-500 shadow-sm",
          GRID_CLASSES
        )}>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Produto / SKU</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Canal</span>
          
          <div className="text-center group/h">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total</span>
             <HeaderTooltip align="center" title="Preço de Venda" content="Valor final exibido ao cliente. No ERP, é o maior valor entre preço base e valor promocional." />
          </div>
          
          <div className="text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Custo</span>
             <HeaderTooltip align="center" title="Composição de Custo" content="Inclui o preço de fábrica mais todos os insumos (embalagem, mimos, etc) cadastrados na peça." />
          </div>
          
          <div className="text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Comis.</span>
             <HeaderTooltip align="center" title="Taxa Marketplace" content="Comissão da plataforma aplicada sobre o valor total da venda, respeitando o teto de R$100 se houver." />
          </div>
          
          <div className="text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Taxa</span>
             <HeaderTooltip align="center" title="Taxa de Envio/Fixa" content="Valor fixo debitado por cada pedido realizado, independente do valor do produto." />
          </div>
          
          <div className="text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Imp.</span>
             <HeaderTooltip align="center" title="Imposto Médio" content="Estimativa de imposto global (ex: Simples Nacional) configurado em seus Ajustes." />
          </div>
          
          <div className="text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Repasse</span>
             <HeaderTooltip align="right" title="Repasse Líquido" content="O saldo final que cairá na sua conta bancária após todos os descontos da plataforma." />
          </div>
          
          <div className="text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Lucro</span>
             <HeaderTooltip align="right" title="Resultado Real" content="O lucro líquido que fica com você após pagar o custo do produto e as taxas. (Repasse - Custo)" />
          </div>
          <div />
        </div>

        {loading ? (
          <div className="p-40 flex flex-col items-center justify-center gap-8">
             <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse" />
                <Loader2 className="animate-spin h-16 w-16 text-primary relative" />
             </div>
             <p className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Auditando Margens de Lucro...</p>
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {filteredProducts.length === 0 ? (
              <div className="p-32 text-center space-y-6">
                 <LayoutGrid className="h-16 w-16 text-muted-foreground/10 mx-auto" />
                 <p className="text-lg font-black uppercase tracking-[0.2em] text-muted-foreground/40">Acervo não localizado</p>
              </div>
            ) : filteredProducts.map(product => {
              const isExpanded = expandedRows[product.id];
              const displayImg = getProxyUrl(product.images?.[0] || product.image_url);

              return (
                <div key={product.id} className={cn("transition-all duration-500", isExpanded ? "bg-primary/[0.03] shadow-inner" : "hover:bg-muted/30")}>
                  {/* Main Product Row */}
                  <div 
                    className="group-row cursor-pointer select-none"
                    onClick={() => toggleRow(product.id)}
                  >
                    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_848px_48px] gap-2 px-8 lg:px-10 py-5 items-center">
                      <div className="flex items-center gap-6 w-full lg:w-auto">
                          <div className="h-14 w-14 rounded-[1.25rem] bg-muted overflow-hidden shrink-0 border border-border/40 shadow-sm group-hover:scale-110 transition-all duration-700">
                             {displayImg ? (
                               <img src={displayImg} alt={product.name} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><Package size={24} /></div>
                             )}
                          </div>
                          <div className="min-w-0">
                             <h3 className="text-xs font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors leading-none mb-1">{product.name}</h3>
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-muted-foreground/50 tracking-[0.2em]">{product.sku || 'N/A'}</span>
                                <div className="h-0.5 w-0.5 rounded-full bg-border" />
                                <Link to={`/inventory?search=${product.sku || product.name}`} className="text-[8px] font-black text-primary/60 hover:text-primary uppercase tracking-widest flex items-center gap-1 transition-colors" onClick={e=>e.stopPropagation()}>
                                   <ExternalLink size={9} /> Gerenciar Peça
                                </Link>
                             </div>
                          </div>
                      </div>
                      
                      <div className="hidden lg:flex items-center justify-end flex-1 gap-10">
                         <div className="flex -space-x-4">
                            {visiblePlatforms.site && <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center border-4 border-card shadow-2xl relative z-30" title="Site"><Monitor size={12} className="text-primary-foreground" /></div>}
                            {visiblePlatforms.shopee && <div className="h-8 w-8 rounded-xl bg-[#f53d2d] flex items-center justify-center border-4 border-card shadow-2xl relative z-20" title="Shopee"><ShoppingBag size={12} className="text-white" /></div>}
                            {visiblePlatforms.tiktok && <div className="h-8 w-8 rounded-xl bg-black flex items-center justify-center border-4 border-card shadow-2xl relative z-10" title="TikTok"><div className="w-2 h-2 text-white font-black text-[8px]">T</div></div>}
                         </div>
                         <div className="h-6 w-px bg-border/40" />
                         <span className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] group-hover:tracking-[0.3em] group-hover:text-primary transition-all duration-500">Audit Unitário</span>
                      </div>

                      <div className="flex items-center justify-center">
                         <div className={cn("p-2.5 rounded-2xl transition-all duration-700 shadow-sm", isExpanded ? "bg-primary text-primary-foreground rotate-180 scale-110 shadow-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                            <ChevronDown size={18} />
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="px-8 lg:px-10 pb-8 animate-in slide-in-from-top-6 duration-700">
                      <div className="bg-background/60 border border-border/40 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl">
                        <div className="divide-y divide-border/20">
                          {(['site', 'shopee', 'tiktok'] as const).map(platform => {
                            if (!visiblePlatforms[platform]) return null;
                            const ecc = calculateUnitEconomics(product, platform);
                            const isNeg = ecc.result < 0;
                            const isSimOpen = expandedSimulators[`${product.id}-${platform}`];
                            
                            return (
                              <div key={platform}>
                                <div className={cn("transition-colors hover:bg-muted/10", GRID_CLASSES, "p-4 lg:p-5")}>
                                  {/* Platform Label */}
                                  <div className="col-span-2 lg:col-span-1 flex items-center gap-4 pl-4 lg:pl-6">
                                    <div className={cn(
                                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg border-2 border-white/10 transition-transform",
                                      platform === 'site' ? "bg-primary text-primary-foreground shadow-primary/20" : 
                                      platform === 'shopee' ? "bg-[#f53d2d] text-white shadow-[#f53d2d]/20" : 
                                      "bg-black text-white shadow-black/20"
                                    )}>
                                      {platform === 'site' && <Monitor size={18} />}
                                      {platform === 'shopee' && <ShoppingBag size={18} />}
                                      {platform === 'tiktok' && <div className="font-black text-base">T</div>}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black uppercase tracking-[0.15em] leading-none mb-1">
                                          {platform === 'site' ? 'Padrão / Site' : platform === 'shopee' ? 'Shopee BR' : 'TikTok Shop'}
                                        </span>
                                        <div className="flex items-center gap-1.5 opacity-40">
                                           <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                                           <button 
                                              onClick={() => toggleSimulator(product.id, platform)}
                                              className="text-[8px] font-black uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1"
                                           >
                                              {isSimOpen ? 'Ocultar Escala' : 'Projetar Escala'}
                                              {isSimOpen ? <ChevronUp size={8} /> : <Zap size={8} />}
                                           </button>
                                        </div>
                                    </div>
                                  </div>

                                  <div className="hidden lg:block h-6 w-full" /> {/* Alinhamento Canal */}
                                  
                                  <div className="text-center lg:block">
                                    <p className="lg:hidden text-[9px] font-black text-muted-foreground uppercase mb-1">Total</p>
                                    <span className="text-xs font-black font-mono tracking-tight">{fmt(ecc.price)}</span>
                                  </div>
                                  <div className="text-center lg:block">
                                    <p className="lg:hidden text-[9px] font-black text-muted-foreground uppercase mb-1">Custo</p>
                                    <span className="text-xs font-bold font-mono text-muted-foreground/80 tracking-tight">{fmt(ecc.cost)}</span>
                                  </div>
                                  <div className="text-center lg:block">
                                    <p className="lg:hidden text-[9px] font-black text-muted-foreground uppercase mb-1">Comis.</p>
                                    <span className="text-xs font-bold font-mono text-red-500/80 tracking-tight">-{fmt(ecc.commission)}</span>
                                  </div>
                                  <div className="text-center lg:block">
                                    <p className="lg:hidden text-[9px] font-black text-muted-foreground uppercase mb-1">Taxa</p>
                                    <span className="text-xs font-bold font-mono text-red-500/80 tracking-tight">-{fmt(ecc.fee)}</span>
                                  </div>
                                  <div className="text-center lg:block">
                                    <p className="lg:hidden text-[9px] font-black text-muted-foreground uppercase mb-1">Imposto</p>
                                    <span className="text-xs font-bold font-mono text-amber-600/80 tracking-tight">-{fmt(ecc.tax)}</span>
                                  </div>
                                  <div className="text-center lg:block">
                                    <p className="lg:hidden text-[9px] font-black text-primary uppercase mb-1">Repasse</p>
                                    <div className="bg-primary/5 rounded-xl px-2 py-1 inline-block">
                                        <span className="text-xs font-black font-mono text-primary tracking-tight">{fmt(ecc.repasse)}</span>
                                    </div>
                                  </div>
                                  <div className="text-center lg:block">
                                    <p className="lg:hidden text-[9px] font-black text-foreground uppercase mb-1">Resultado</p>
                                    <div className="flex flex-col items-center">
                                        <span className={cn("text-sm font-black font-mono tracking-tighter", isNeg ? "text-red-500" : "text-emerald-500")}>
                                          {ecc.result > 0 ? '+' : ''}{fmt(ecc.result)}
                                        </span>
                                        <div className={cn(
                                          "text-[9px] font-black px-1.5 py-0.5 rounded-full mt-0.5 border", 
                                          isNeg ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                                          ecc.margin > 20 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                                          "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                        )}>
                                          {ecc.margin.toFixed(1)}% MG
                                        </div>
                                    </div>
                                  </div>
                                  <div className="hidden lg:block w-full" />
                                </div>

                                {/* SCALABILITY SIMULATOR "LEQUE" (ACCORDION) */}
                                {isSimOpen && ecc.result !== 0 && (
                                  <div className="px-6 lg:px-10 pb-6 animate-in slide-in-from-top-4 duration-500">
                                     <div className="bg-primary/[0.04] border border-primary/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:bg-primary/[0.06] shadow-inner">
                                        <div className="flex items-center gap-4">
                                           <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                                              <TrendingUp size={20} />
                                           </div>
                                           <div>
                                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Projeção {platform === 'site' ? 'SITE' : platform === 'shopee' ? 'SHOPEE' : 'TIKTOK'}</h4>
                                              <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Estimativa baseada em volume</p>
                                           </div>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1 max-w-2xl">
                                           {[50, 100, 500, 1000].map(qty => (
                                             <div key={qty} className="bg-card border border-border/80 p-3 rounded-2xl text-center shadow-sm hover:border-primary/40 transition-all">
                                                <div className="text-[8px] font-black text-muted-foreground uppercase mb-0.5 tracking-[0.15em]">{qty} Unid.</div>
                                                <div className={cn("text-[13px] font-black font-mono", isNeg ? "text-red-500" : "text-emerald-500")}>
                                                   {fmt(ecc.result * qty)}
                                                </div>
                                             </div>
                                           ))}
                                        </div>
                                        <button onClick={() => toggleSimulator(product.id, platform)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                                            <X size={16} />
                                        </button>
                                     </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Card - Final Redesign */}
      <div className="bg-card/60 backdrop-blur-md border border-border p-10 rounded-[3rem] relative shadow-2xl overflow-hidden group/info">
         <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-10 transition-all duration-1000 pointer-events-none">
            <Calculator size={160} className="text-primary -rotate-12 translate-x-20 translate-y-[-20px]" />
         </div>
         <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
            <div className="h-20 w-20 rounded-[2.5rem] bg-primary text-primary-foreground flex items-center justify-center shadow-[0_20px_40px_-5px_hsl(var(--primary)/0.4)] shrink-0 animate-bounce-slow">
               <Info size={40} />
            </div>
            <div className="flex-1 text-center md:text-left space-y-3">
               <h4 className="font-black text-3xl text-foreground uppercase tracking-tight">Estratégia Unitária</h4>
               <p className="text-base text-muted-foreground font-medium leading-relaxed max-w-3xl">
                 Este simulador não apenas mostra números, ele projeta o seu futuro. Entender quanto você ganha por cada acessório vendido 
                 é o primeiro passo para escalar seu estoque para <strong>1.000+ vendas mensais</strong>. 
                 Mantenha suas taxas de comissão e impostos atualizadas para uma auditoria de lucro sem falhas.
               </p>
            </div>
            <Button onClick={() => window.location.href = '/settings'} className="h-16 px-12 bg-primary hover:bg-primary/90 text-primary-foreground uppercase font-black text-sm tracking-[0.25em] rounded-[1.5rem] shadow-xl shadow-primary/25 shrink-0 transition-transform active:scale-95">
               CONFIGURAR MARKUP
            </Button>
         </div>
      </div>
    </div>
  );
}
