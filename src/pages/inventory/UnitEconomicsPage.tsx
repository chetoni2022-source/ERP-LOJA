import React, { useState, useEffect } from 'react';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Button, Input, Label } from '../../components/ui';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  ShoppingBag, 
  Monitor, 
  TrendingUp, 
  TrendingDown, 
  Filter,
  Package,
  ArrowRight,
  Info,
  DollarSign,
  Percent,
  Calculator,
  ExternalLink
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

export default function ProfitAnalysisPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
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

  const calculateUnitEconomics = (product: Product, platform: 'site' | 'shopee' | 'tiktok') => {
    let price = 0;
    let commPct = 0;
    let fixedFee = 0;
    let cap = Infinity;

    const totalProductCost = product.cost_price;

    if (platform === 'site') {
      price = product.sale_price || product.price;
      commPct = 0; // Site usually has gateway fees, but here we assume internal pricing
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
    const roi = (result / totalProductCost) * 100;

    return {
      price,
      cost: totalProductCost,
      commission: commissionValue,
      tax: taxValue,
      fee: fixedFee,
      repasse,
      result,
      margin,
      roi
    };
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Calculator className="text-primary h-8 w-8" />
            Análise de Lucros
          </h1>
          <p className="text-muted-foreground font-medium mt-1">Simulador de repasse e lucratividade real por canal de venda.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group/search sm:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
             <Input 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               placeholder="Buscar peça ou SKU..." 
               className="pl-9 h-11 bg-card border-border/40 font-bold"
             />
          </div>
          <div className="flex bg-muted/40 p-1 rounded-xl border border-border/40">
             <button 
               onClick={() => setVisiblePlatforms(p => ({ ...p, site: !p.site }))}
               className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all transition-colors", visiblePlatforms.site ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}
             >Site</button>
             <button 
               onClick={() => setVisiblePlatforms(p => ({ ...p, shopee: !p.shopee }))}
               className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all transition-colors", visiblePlatforms.shopee ? "bg-[#f53d2d] text-white shadow-sm" : "text-muted-foreground hover:bg-muted")}
             >Shopee</button>
             <button 
               onClick={() => setVisiblePlatforms(p => ({ ...p, tiktok: !p.tiktok }))}
               className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all transition-colors", visiblePlatforms.tiktok ? "bg-black text-white shadow-sm" : "text-muted-foreground hover:bg-muted")}
             >TikTok</button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-2xl relative">
        {/* Table Header */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_repeat(8,100px)_48px] gap-2 px-6 py-4 bg-muted/30 border-b border-border items-center sticky top-0 z-20 backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Produto / SKU</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Canal</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right font-mono">Total</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right font-mono">Custo</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right font-mono">Comissão</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right font-mono">Taxa</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right font-mono">Imposto</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary text-right font-mono">Repasse</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground text-right font-mono">Lucro</span>
          <div />
        </div>

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
             <Loader2 className="animate-spin h-10 w-10 text-primary" />
             <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Calculando rentabilidade...</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredProducts.map(product => {
              const isExpanded = expandedRows[product.id];
              const rawImg = product.images?.[0] || product.image_url;
              const displayImg = getProxyUrl(rawImg);

              return (
                <div key={product.id} className={cn("transition-colors", isExpanded ? "bg-primary/5" : "hover:bg-muted/20")}>
                  {/* Main Product Row */}
                  <div 
                    className="flex flex-col lg:grid lg:grid-cols-[1fr_848px_48px] gap-2 px-4 lg:px-6 py-4 items-center cursor-pointer"
                    onClick={() => toggleRow(product.id)}
                  >
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/40">
                           {displayImg ? (
                             <img src={displayImg} alt={product.name} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><Package size={20} /></div>
                           )}
                        </div>
                        <div className="min-w-0">
                           <h3 className="text-xs font-black uppercase tracking-tight text-foreground truncate">{product.name}</h3>
                           <span className="text-[10px] font-mono text-muted-foreground">{product.sku || 'SEM SKU'}</span>
                        </div>
                    </div>
                    
                    <div className="hidden lg:flex items-center justify-end flex-1 gap-2">
                       <div className="flex -space-x-2">
                          {visiblePlatforms.site && <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-sm" title="Site"><Monitor size={10} className="text-primary-foreground" /></div>}
                          {visiblePlatforms.shopee && <div className="h-6 w-6 rounded-full bg-[#f53d2d] flex items-center justify-center border-2 border-background shadow-sm" title="Shopee"><ShoppingBag size={10} className="text-white" /></div>}
                          {visiblePlatforms.tiktok && <div className="h-6 w-6 rounded-full bg-black flex items-center justify-center border-2 border-background shadow-sm" title="TikTok"><div className="w-2 h-2 text-white font-black text-[6px]">T</div></div>}
                       </div>
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-3">Clique para ver detalhes</span>
                    </div>

                    <div className="flex items-center justify-center">
                       {isExpanded ? <ChevronUp size={20} className="text-primary" /> : <ChevronDown size={20} className="text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="px-4 lg:px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-inner">
                        <div className="divide-y divide-border/40">
                          {/* Platforms Sub-rows */}
                          {(['site', 'shopee', 'tiktok'] as const).map(platform => {
                            if (!visiblePlatforms[platform]) return null;
                            const economics = calculateUnitEconomics(product, platform);
                            
                            return (
                              <div key={platform} className="grid grid-cols-2 lg:grid-cols-[1fr_repeat(8,100px)] gap-2 p-4 items-center hover:bg-muted/30 transition-colors">
                                <div className="col-span-2 lg:col-span-1 flex items-center gap-3">
                                   <div className={cn(
                                     "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                                     platform === 'site' ? "bg-primary/10 text-primary" : 
                                     platform === 'shopee' ? "bg-[#f53d2d]/10 text-[#f53d2d]" : 
                                     "bg-black/10 text-black dark:text-white"
                                   )}>
                                     {platform === 'site' && <Monitor size={14} />}
                                     {platform === 'shopee' && <ShoppingBag size={14} />}
                                     {platform === 'tiktok' && <div className="font-black text-xs">T</div>}
                                   </div>
                                   <span className="text-[11px] font-black uppercase tracking-widest">
                                     {platform === 'site' ? 'Padrão / Site' : platform === 'shopee' ? 'Shopee BR' : 'TikTok Shop'}
                                   </span>
                                </div>

                                {/* Data Points */}
                                <div className="lg:block text-right">
                                   <p className="lg:hidden text-[8px] font-black text-muted-foreground uppercase text-left">Total</p>
                                   <span className="text-[11px] font-bold font-mono">{fmt(economics.price)}</span>
                                </div>
                                <div className="lg:block text-right">
                                   <p className="lg:hidden text-[8px] font-black text-muted-foreground uppercase text-left">Custo</p>
                                   <span className="text-[11px] font-bold font-mono text-muted-foreground">{fmt(economics.cost)}</span>
                                </div>
                                <div className="lg:block text-right">
                                   <p className="lg:hidden text-[8px] font-black text-muted-foreground uppercase text-left">Comis.</p>
                                   <span className="text-[11px] font-bold font-mono text-red-500/70">-{fmt(economics.commission)}</span>
                                </div>
                                <div className="lg:block text-right">
                                   <p className="lg:hidden text-[8px] font-black text-muted-foreground uppercase text-left">Taxa</p>
                                   <span className="text-[11px] font-bold font-mono text-red-500/70">-{fmt(economics.fee)}</span>
                                </div>
                                <div className="lg:block text-right">
                                   <p className="lg:hidden text-[8px] font-black text-muted-foreground uppercase text-left">Imposto</p>
                                   <span className="text-[11px] font-bold font-mono text-amber-600/70">-{fmt(economics.tax)}</span>
                                </div>
                                <div className="lg:block text-right bg-primary/5 rounded-md px-1 py-0.5">
                                   <p className="lg:hidden text-[8px] font-black text-primary uppercase text-left">Repasse</p>
                                   <span className="text-[11px] font-black font-mono text-primary">{fmt(economics.repasse)}</span>
                                </div>
                                <div className="lg:block text-right">
                                   <p className="lg:hidden text-[8px] font-black text-foreground uppercase text-left">Resultado</p>
                                   <div className="flex flex-col items-end">
                                      <span className={cn("text-xs font-black font-mono", economics.result > 0 ? "text-emerald-500" : "text-red-500")}>
                                        {economics.result > 0 ? '+' : ''}{fmt(economics.result)}
                                      </span>
                                      <span className={cn("text-[9px] font-black ", economics.margin > 20 ? "text-emerald-500/80" : "text-orange-500/80")}>
                                        {economics.margin.toFixed(1)}% MG
                                      </span>
                                   </div>
                                </div>
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

      {/* Info Card */}
      <div className="bg-primary/5 border border-primary/20 p-6 rounded-[2rem] flex flex-col md:flex-row items-center gap-6">
         <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Info size={28} />
         </div>
         <div className="flex-1 text-center md:text-left">
            <h4 className="font-black text-lg text-primary uppercase tracking-tight">Como são feitos os cálculos?</h4>
            <p className="text-sm text-foreground/70 font-medium leading-relaxed mt-1">
              Os valores de **Comissão** e **Taxa Fixa** são buscados das suas configurações globais de integração. O **Custo** leva em conta todos os insumos cadastrados na peça. 
              O **Repasse** é o valor bruto líquido que a plataforma deposita na sua conta, já descontando as taxas e impostos selecionados.
            </p>
         </div>
         <Button onClick={() => window.location.href = '/settings'} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 shrink-0 uppercase font-black text-[10px] tracking-widest h-12 px-6">
            Ajustar Taxas nas Configurações
         </Button>
      </div>
    </div>
  );
}
