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
  Package,
  Info,
  Calculator,
  Loader2,
  HelpCircle,
  LayoutGrid
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
const GRID_CLASSES = "grid grid-cols-2 lg:grid-cols-[1fr_80px_100px_100px_100px_100px_100px_110px_130px_48px] gap-2 items-center";

const HeaderTooltip = ({ title, content }: { title: string, content: string }) => (
  <div className="group relative inline-block ml-1 align-middle">
    <HelpCircle size={10} className="text-muted-foreground/50 group-hover:text-primary transition-colors cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-card border border-border shadow-2xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 text-[10px] leading-relaxed font-medium text-foreground text-center pointer-events-none">
       <div className="font-black border-b border-border mb-1.5 pb-1 uppercase tracking-widest text-primary">{title}</div>
       {content}
       <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-card drop-shadow-[0_1px_0_rgba(0,0,0,0.1)]" />
    </div>
  </div>
);

export default function UnitEconomicsPage() {
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card border border-border/40 p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-primary/5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
               <Calculator className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Análise de Lucros</h1>
          </div>
          <p className="text-muted-foreground font-medium pl-15">Simulador de repasse e lucratividade real por canal de venda.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative group/search w-full sm:w-80">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/search:text-primary transition-all" />
             <Input 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               placeholder="Buscar peça ou SKU..." 
               className="pl-11 h-12 bg-background border-border/60 font-bold rounded-2xl focus:ring-primary/20 transition-all shadow-sm"
             />
          </div>
          <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/40 gap-1 shrink-0">
             <button 
               onClick={() => setVisiblePlatforms(p => ({ ...p, site: !p.site }))}
               className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", visiblePlatforms.site ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted")}
             >SITE</button>
             <button 
               onClick={() => setVisiblePlatforms(p => ({ ...p, shopee: !p.shopee }))}
               className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", visiblePlatforms.shopee ? "bg-[#f53d2d] text-white shadow-md shadow-[#f53d2d]/20" : "text-muted-foreground hover:bg-muted")}
             >SHOPEE</button>
             <button 
               onClick={() => setVisiblePlatforms(p => ({ ...p, tiktok: !p.tiktok }))}
               className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", visiblePlatforms.tiktok ? "bg-black text-white shadow-md shadow-black/20" : "text-muted-foreground hover:bg-muted")}
             >TIKTOK</button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/80 rounded-[2.5rem] shadow-2xl overflow-hidden relative group/table">
        {/* STICKY HEADER */}
        <div className={cn(
          "hidden lg:grid gap-2 px-8 py-5 bg-card/85 border-b border-border items-center sticky top-0 z-40 backdrop-blur-xl transition-all duration-300",
          GRID_CLASSES
        )}>
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1">Produto / SKU</span>
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground text-center">Canal</span>
          <div className="text-center group/h">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total</span>
             <HeaderTooltip title="Venda Total" content="O preço final de venda configurado para este canal específico." />
          </div>
          <div className="text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Custo</span>
             <HeaderTooltip title="Custo Insumos" content="Soma de todos os custos adicionais e preço de fábrica cadastrados." />
          </div>
          <div className="text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Comis.</span>
             <HeaderTooltip title="Comissão" content="Calculado com base na % da plataforma (Ex: 20% Shopee) limitado ao teto máximo." />
          </div>
          <div className="text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Taxa</span>
             <HeaderTooltip title="Taxa Fixa" content="Valor fixo por pedido configurado nos Ajustes de Integração." />
          </div>
          <div className="text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Imp.</span>
             <HeaderTooltip title="Imposto" content="Calculado com base no seu Imposto Global / NF (%) configurado nos Ajustes." />
          </div>
          <div className="text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">Repasse</span>
             <HeaderTooltip title="Repasse Líquido" content="Valor bruto menos as taxas e impostos. É o dinheiro que de fato entra na sua conta." />
          </div>
          <div className="text-center">
             <span className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground">Lucro</span>
             <HeaderTooltip title="Lucro Líquido" content="O quanto sobra após pagar o produto e as taxas. Fórmula: Repasse - Custo." />
          </div>
          <div />
        </div>

        {loading ? (
          <div className="p-32 flex flex-col items-center justify-center gap-6">
             <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                <Loader2 className="animate-spin h-12 w-12 text-primary relative" />
             </div>
             <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Inteligência Financeira</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredProducts.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                 <LayoutGrid className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                 <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Nenhum produto encontrado</p>
              </div>
            ) : filteredProducts.map(product => {
              const isExpanded = expandedRows[product.id];
              const displayImg = getProxyUrl(product.images?.[0] || product.image_url);

              return (
                <div key={product.id} className={cn("transition-all duration-300", isExpanded ? "bg-primary/[0.02]" : "hover:bg-muted/30")}>
                  {/* Main Product Row */}
                  <div 
                    className="group-row cursor-pointer select-none"
                    onClick={() => toggleRow(product.id)}
                  >
                    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_848px_48px] gap-2 px-6 lg:px-8 py-5 items-center">
                      <div className="flex items-center gap-5 w-full lg:w-auto">
                          <div className="h-14 w-14 rounded-2xl bg-muted overflow-hidden shrink-0 border border-border/40 shadow-inner group-hover:scale-105 transition-transform duration-500">
                             {displayImg ? (
                               <img src={displayImg} alt={product.name} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><Package size={24} /></div>
                             )}
                          </div>
                          <div className="min-w-0">
                             <h3 className="text-sm font-black uppercase tracking-tight text-foreground truncate group-hover:text-primary transition-colors">{product.name}</h3>
                             <span className="text-[10px] font-black text-muted-foreground/60 tracking-widest">{product.sku || 'SEM SKU'}</span>
                          </div>
                      </div>
                      
                      <div className="hidden lg:flex items-center justify-end flex-1 gap-6">
                         <div className="flex -space-x-3">
                            {visiblePlatforms.site && <div className="h-8 w-8 rounded-2xl bg-primary flex items-center justify-center border-4 border-card shadow-lg" title="Site"><Monitor size={14} className="text-primary-foreground" /></div>}
                            {visiblePlatforms.shopee && <div className="h-8 w-8 rounded-2xl bg-[#f53d2d] flex items-center justify-center border-4 border-card shadow-lg" title="Shopee"><ShoppingBag size={14} className="text-white" /></div>}
                            {visiblePlatforms.tiktok && <div className="h-8 w-8 rounded-2xl bg-black flex items-center justify-center border-4 border-card shadow-lg" title="TikTok"><div className="w-2 h-2 text-white font-black text-[8px]">T</div></div>}
                         </div>
                         <div className="h-6 w-px bg-border/40" />
                         <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest group-hover:text-primary/60 transition-colors">Ver Detalhes Unitários</span>
                      </div>

                      <div className="flex items-center justify-center">
                         <div className={cn("p-2 rounded-full transition-all duration-500", isExpanded ? "bg-primary/10 text-primary rotate-180" : "bg-muted text-muted-foreground")}>
                            <ChevronDown size={18} />
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="px-6 lg:px-8 pb-8 animate-in slide-in-from-top-4 duration-500">
                      <div className="bg-background/40 border border-border/40 rounded-[2rem] overflow-hidden shadow-inner backdrop-blur-sm">
                        <div className="divide-y divide-border/20">
                          {(['site', 'shopee', 'tiktok'] as const).map(platform => {
                            if (!visiblePlatforms[platform]) return null;
                            const ecc = calculateUnitEconomics(product, platform);
                            
                            return (
                              <div key={platform} className={cn("transition-colors hover:bg-muted/10", GRID_CLASSES, "p-4 lg:p-4")}>
                                {/* Platform Label */}
                                <div className="col-span-2 lg:col-span-1 flex items-center gap-4 pl-2 lg:pl-4">
                                   <div className={cn(
                                     "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-white/10",
                                     platform === 'site' ? "bg-primary text-primary-foreground shadow-primary/20" : 
                                     platform === 'shopee' ? "bg-[#f53d2d] text-white shadow-[#f53d2d]/20" : 
                                     "bg-black text-white shadow-black/20"
                                   )}>
                                     {platform === 'site' && <Monitor size={16} />}
                                     {platform === 'shopee' && <ShoppingBag size={16} />}
                                     {platform === 'tiktok' && <div className="font-black text-sm">T</div>}
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                        {platform === 'site' ? 'SITE' : platform === 'shopee' ? 'SHOPEE' : 'TIKTOK'}
                                      </span>
                                      <span className="text-[8px] font-bold text-muted-foreground tracking-tighter uppercase opacity-60">Canal Ativo</span>
                                   </div>
                                </div>

                                {/* ALIGNED DATA POINTS */}
                                <div className="hidden lg:block h-6 w-full" /> {/* Spacer for Canal align */}
                                
                                <div className="text-center lg:block">
                                   <p className="lg:hidden text-[9px] font-black text-muted-foreground uppercase mb-1">Total</p>
                                   <span className="text-xs font-black font-mono tracking-tight">{fmt(ecc.price)}</span>
                                </div>
                                <div className="text-center lg:block">
                                   <p className="lg:hidden text-[9px] font-black text-muted-foreground uppercase mb-1">Custo</p>
                                   <span className="text-xs font-black font-mono text-muted-foreground tracking-tight">{fmt(ecc.cost)}</span>
                                </div>
                                <div className="text-center lg:block">
                                   <p className="lg:hidden text-[9px] font-black text-muted-foreground uppercase mb-1">Comis.</p>
                                   <span className="text-xs font-black font-mono text-pink-500/80 tracking-tight">-{fmt(ecc.commission)}</span>
                                </div>
                                <div className="text-center lg:block">
                                   <p className="lg:hidden text-[9px] font-black text-muted-foreground uppercase mb-1">Taxa</p>
                                   <span className="text-xs font-black font-mono text-pink-500/80 tracking-tight">-{fmt(ecc.fee)}</span>
                                </div>
                                <div className="text-center lg:block">
                                   <p className="lg:hidden text-[9px] font-black text-muted-foreground uppercase mb-1">Imposto</p>
                                   <span className="text-xs font-black font-mono text-amber-500/80 tracking-tight">-{fmt(ecc.tax)}</span>
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
                                      <span className={cn("text-sm font-black font-mono tracking-tighter", ecc.result > 0 ? "text-emerald-500" : "text-red-500")}>
                                        {ecc.result > 0 ? '+' : ''}{fmt(ecc.result)}
                                      </span>
                                      <div className={cn(
                                        "text-[9px] font-black px-1.5 rounded-full mt-0.5", 
                                        ecc.margin > 20 ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                                      )}>
                                        {ecc.margin.toFixed(1)}% MG
                                      </div>
                                   </div>
                                </div>
                                <div className="hidden lg:block" /> {/* Toggle spacer */}
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

      {/* Info Card - Redesigned */}
      <div className="bg-card border border-border/60 p-8 rounded-[3rem] relative overflow-hidden group/info shadow-xl shadow-primary/5">
         <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Calculator size={120} className="text-primary rotate-12" />
         </div>
         <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="h-16 w-16 rounded-[2rem] bg-primary text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/30 shrink-0">
               <Info size={32} />
            </div>
            <div className="flex-1 text-center md:text-left space-y-2">
               <h4 className="font-black text-2xl text-foreground uppercase tracking-tight">Transparência Financeira</h4>
               <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-2xl">
                 Este simulador decompõe cada centavo do seu faturamento em métricas de <strong>Economia Unitária</strong>. Passando o mouse sobre os títulos no cabeçalho, 
                 você verá a composição de cada cálculo. Ajuste suas taxas preventivamente para garantir que seu lucro acompanhe o crescimento de suas vendas.
               </p>
            </div>
            <Button onClick={() => window.location.href = '/settings'} className="h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground uppercase font-black text-xs tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/20 shrink-0">
               ABRIR CONFIGURAÇÕES
            </Button>
         </div>
      </div>
    </div>
  );
}
