import { useEffect, useState, useCallback } from 'react';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { BadgeDollarSign, PackageSearch, TrendingUp, AlertCircle, Loader2, CalendarDays, BarChart2, History, X, Target, TrendingDown, Download, Award, Info, Users, Tags, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Button } from '../../components/ui';

// ─── Help Tooltip ───────────────────────────────────────────────────────────
const MetricInfo = ({ title, content }: { title: string, content: string }) => (
  <div className="group relative inline-block ml-1 text-left align-middle">
    <button type="button" className="p-0.5 rounded-full hover:bg-muted transition-colors outline-none">
      <Info className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors cursor-help" />
    </button>
    <div className="absolute top-full left-14 -translate-x-1/2 mt-2 w-56 p-3 bg-popover text-popover-foreground text-[11px] font-bold rounded-2xl border border-border shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] backdrop-blur-xl pointer-events-none scale-95 group-hover:scale-100 origin-top">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
        <Info className="h-3 w-3 text-primary shrink-0" />
        <p className="text-primary uppercase tracking-[0.15em] font-black">{title}</p>
      </div>
      <p className="font-semibold text-muted-foreground leading-relaxed italic">"{content}"</p>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-popover" />
    </div>
  </div>
);

// ─── Tooltips ────────────────────────────────────────────────────────────────
const CustomStockTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const qty = data.stock_quantity;
    const status = qty <= 0 ? 'Esgotado' : qty < 5 ? 'Baixo Estoque' : 'Saudável';
    const statusColor = qty <= 0 ? 'text-red-500 bg-red-500/10 border-red-500/20' : qty < 5 ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' : 'text-green-500 bg-green-500/10 border-green-500/20';
    const rawImg = data.images?.[0] || data.image_url;
    const displayImg = getProxyUrl(rawImg);
    return (
      <div className="bg-card border border-border shadow-2xl rounded-xl p-3 max-w-[200px] backdrop-blur-md">
        {displayImg ? (
          <img src={displayImg} alt={data.name} crossOrigin="anonymous" className="w-full h-28 object-cover rounded-lg mb-3 border border-border" />
        ) : (
          <div className="w-full h-28 bg-muted rounded-lg mb-3 flex items-center justify-center border border-border">
            <PackageSearch className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        <p className="font-bold text-xs text-foreground line-clamp-2">{data.name}</p>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Qtd</span>
          <span className="font-black text-base text-foreground">{qty}</span>
        </div>
        <span className={`mt-1 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md border block w-full text-center ${statusColor}`}>{status}</span>
      </div>
    );
  }
  return null;
};

const CustomRevenueTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/80 dark:bg-black/80 border border-border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] rounded-2xl p-4 min-w-[280px] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">{label}</span>
          <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <TrendingUp size={10} className="text-emerald-500" />
            <span className="text-[9px] font-black text-emerald-600 uppercase">Em Alta</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Lucro Líquido</p>
              <h4 className="text-xl font-black text-emerald-500 tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.profit)}</h4>
            </div>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
               <BadgeDollarSign size={16} />
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 flex justify-between items-center opacity-60">
             <span className="text-[9px] font-bold text-muted-foreground uppercase">Receita Bruta</span>
             <span className="text-[11px] font-black text-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.total)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// ─── Rounded Bar Shape for Modern Charts ──────────────────────────────────
const RoundedBar = (props: any) => {
  const { fill, x, y, width, height } = props;
  if (!height || isNaN(height) || height === 0) return null;
  const radius = 6;
  return (
    <path
      d={`M${x},${y + height} 
         L${x},${y + radius} 
         Q${x},${y} ${x + radius},${y} 
         L${x + width - radius},${y} 
         Q${x + width},${y} ${x + width},${y + radius} 
         L${x + width},${y + height} Z`}
      fill={fill}
      className="transition-all duration-300 hover:brightness-110"
    />
  );
};
const QUICK_RANGES = [
  { label: 'Hoje', days: 0 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '3 meses', days: 90 },
  { label: 'Este ano', days: 365 },
];

function DateRangePicker({ startDate, endDate, onStartChange, onEndChange, onApply }: {
  startDate: string; endDate: string;
  onStartChange: (v: string) => void; onEndChange: (v: string) => void;
  onApply: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeRange, setActiveRange] = useState(30);

  const applyQuick = (days: number) => {
    setActiveRange(days);
    const end = new Date();
    const start = new Date();
    if (days === 0) {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(end.getDate() - days);
    }
    onStartChange(start.toISOString().split('T')[0]);
    onEndChange(end.toISOString().split('T')[0]);
  };

  const formatDisplay = (d: string) => {
    if (!d) return '--';
    return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 h-10 px-4 bg-card border border-border rounded-xl shadow-sm text-sm font-bold text-foreground hover:border-primary/50 hover:bg-muted/40 transition-all"
      >
        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
        <span className="hidden sm:inline">{formatDisplay(startDate)}</span>
        <span className="hidden sm:inline text-muted-foreground font-normal mx-0.5">—</span>
        <span className="hidden sm:inline">{formatDisplay(endDate)}</span>
        <span className="sm:hidden text-muted-foreground text-xs">Filtrar data</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 bg-card border border-border rounded-2xl shadow-2xl p-5 w-[320px] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-sm text-foreground">Período de Análise</h4>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1"><X className="h-4 w-4" /></button>
            </div>

            {/* Quick ranges */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {QUICK_RANGES.map(r => (
                <button
                  key={r.days}
                  onClick={() => applyQuick(r.days)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${activeRange === r.days ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-muted/40 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Custom range */}
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Intervalo personalizado</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1.5">De</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => { onStartChange(e.target.value); setActiveRange(-1); }}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1.5">Até</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => { onEndChange(e.target.value); setActiveRange(-1); }}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={() => { onApply(); setOpen(false); }}
              className="w-full mt-4 h-10 bg-primary text-primary-foreground font-black text-sm hover:bg-primary/90 shadow-sm"
            >
              Aplicar Filtro
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const { cachedData, setCachedData } = useDashboardStore();
  
  const [loading, setLoading] = useState(!cachedData);

  const [monthlySalesValue, setMonthlySalesValue] = useState(cachedData?.monthlySalesValue || 0);
  const [lastMonthValue, setLastMonthValue] = useState(cachedData?.lastMonthValue || 0);
  const [monthlyGoal, setMonthlyGoal] = useState(cachedData?.monthlyGoal || 0);
  const [lowStockCount, setLowStockCount] = useState(cachedData?.lowStockCount || 0);
  const [totalProducts, setTotalProducts] = useState(cachedData?.totalProducts || 0);
  const [salesData, setSalesData] = useState<any[]>(cachedData?.salesData || []);
  const [topProducts, setTopProducts] = useState<any[]>(cachedData?.topProducts || []);
  const [topProfitableProducts, setTopProfitableProducts] = useState<any[]>(cachedData?.topProfitableProducts || []);
  const [stockData, setStockData] = useState<any[]>(cachedData?.stockData || []);
  const [leadSourceData, setLeadSourceData] = useState<any[]>(cachedData?.leadSourceData || []);
  const [totalProfit, setTotalProfit] = useState(cachedData?.totalProfit || 0);
  const [stockHealthStats, setStockHealthStats] = useState<any>(cachedData?.stockHealthStats || { healthy: 0, low: 0, out: 0 });
  const [topCustomers, setTopCustomers] = useState<any[]>(cachedData?.topCustomers || []);
  const [settings, setSettings] = useState<any>(cachedData?.settings || null);

  // Inventory Potential States
  const [stockProjections, setStockProjections] = useState<any>(cachedData?.stockProjections || {
    revenue: 0,
    profitSite: 0,
    profitShopee: 0,
    profitTiktok: 0,
    investment: 0,
    chartData: []
  });

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchDashboardData = useCallback(async (sd?: string, ed?: string) => {
    if (!user) return;
    
    // Variables for inventory potential (Moved to top scope to avoid ReferenceError)
    let totalInventoryRevenue = 0;
    let totalProfitSite = 0;
    let totalProfitShopee = 0;
    let totalProfitTiktok = 0;
    let totalInv = 0;
    let totalBestProfit = 0;

    try {
      // Monthly goal and Marketplace Taxes
      const { data: stgs } = await supabase.from('store_settings').select('*').eq('user_id', user.id).limit(1).maybeSingle();
      if (stgs) {
        setSettings(stgs);
        if (stgs.monthly_goal) setMonthlyGoal(stgs.monthly_goal);
      }

      const { data: products } = await supabase
        .from('products')
        .select('id, name, stock_quantity, image_url, images, price, sale_price, cost_price, shopee_price, tiktok_price, category_id, categories(name)')
        .eq('user_id', user.id)
        .order('stock_quantity', { ascending: false });

      if (products) {
        setStockData(products);
        setTotalProducts(products.length);
        setLowStockCount(products.filter(p => p.stock_quantity < 5).length);

        // --- STOCK HEALTH CALCULATION ---
        const health = products.reduce((acc: any, p: any) => {
          if (p.stock_quantity <= 0) acc.out++;
          else if (p.stock_quantity < 5) acc.low++;
          else acc.healthy++;
          return acc;
        }, { healthy: 0, low: 0, out: 0 });
        setStockHealthStats(health);

        // --- INVENTORY POTENTIAL CALCULATION ---

        // Marketplace Fees (from store_settings or defaults)
        const shopee_comm = settings?.shopee_commission_pct ?? 20;
        const shopee_fee = settings?.shopee_fixed_fee ?? 4;
        const shopee_cap = settings?.shopee_commission_cap ?? 100;

        const tiktok_comm = settings?.tiktok_commission_pct ?? 15;
        const tiktok_fee = settings?.tiktok_fixed_fee ?? 4;
        const tiktok_cap = settings?.tiktok_commission_cap ?? 100;

        const global_tax = settings?.global_tax_pct ?? 0;

        products.forEach(p => {
          if (p.stock_quantity <= 0) return;
          const qty = p.stock_quantity;
          const cost = p.cost_price || 0;
          const siteP = p.sale_price || p.price || 0;
          const shopeeP = p.shopee_price || siteP;
          const tiktokP = p.tiktok_price || siteP;

          const taxValueSite = siteP * (global_tax / 100);
          const taxValueShopee = shopeeP * (global_tax / 100);
          const taxValueTiktok = tiktokP * (global_tax / 100);

          totalInventoryRevenue += siteP * qty;
          totalInv += cost * qty;
          
          // Profit calculations per unit (Consider commission caps and global taxes)
          const commShopee = Math.min(shopeeP * (shopee_comm / 100), shopee_cap);
          const commTiktok = Math.min(tiktokP * (tiktok_comm / 100), tiktok_cap);

          const pSite = (siteP - taxValueSite - cost);
          const pShopee = (shopeeP - commShopee - shopee_fee - taxValueShopee - cost);
          const pTiktok = (tiktokP - commTiktok - tiktok_fee - taxValueTiktok - cost);

          totalProfitSite += pSite * qty;
          totalProfitShopee += pShopee * qty;
          totalProfitTiktok += pTiktok * qty;

          // "Best Channel" logic: sum of max profit possible for each specific product
          const bestChannelProfit = Math.max(pSite, pShopee, pTiktok);
          totalBestProfit += bestChannelProfit * qty;
        });

        const projectionData = {
          revenue: totalInventoryRevenue,
          profitSite: totalProfitSite,
          profitShopee: totalProfitShopee,
          profitTiktok: totalProfitTiktok,
          profitBest: totalBestProfit,
          investment: totalInv,
          chartData: [
            { name: 'Site', Venda: totalInventoryRevenue, Lucro: totalProfitSite, color: 'var(--primary)' },
            { name: 'Shopee', Venda: totalInventoryRevenue, Lucro: totalProfitShopee, color: '#f53d2d' },
            { name: 'TikTok Shop', Venda: totalInventoryRevenue, Lucro: totalProfitTiktok, color: '#000000' }
          ]
        };
        setStockProjections(projectionData);
      }

      const s = sd || startDate;
      const e = ed || endDate;

      const startDT = new Date(s); startDT.setUTCHours(0, 0, 0, 0);
      const endDT = new Date(e); endDT.setUTCHours(23, 59, 59, 999);

      const { data: sales } = await supabase
        .from('sales')
        .select(`*, products(name, image_url, images, category_id, categories(name))`)
        .eq('user_id', user.id)
        .gte('created_at', startDT.toISOString())
        .lte('created_at', endDT.toISOString())
        .order('created_at', { ascending: true });

      if (sales) {
        const total = sales.reduce((acc, s) => acc + s.total_price, 0);
        const profit = sales.reduce((acc, s) => acc + (s.total_price - (s.unit_cost_at_sale * s.quantity)), 0);
        setMonthlySalesValue(total);
        setTotalProfit(profit);

        const dailyData = sales.reduce((acc: any, sale: any) => {
          const date = new Date(sale.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
          if (!acc[date]) acc[date] = { date, total: 0, profit: 0, items: [] };
          acc[date].total += sale.total_price;
          acc[date].profit += (sale.total_price - (sale.unit_cost_at_sale * sale.quantity));
          const p = sale.products as any;
          const prodName = p?.name || 'Excluído';
          const prodImg = p?.images?.[0] || p?.image_url || null;
          const existing = acc[date].items.find((i: any) => i.name === prodName);
          if (existing) { 
            existing.quantity += sale.quantity; 
            existing.revenue += sale.total_price;
            existing.profit += (sale.total_price - (sale.unit_cost_at_sale * sale.quantity));
          }
          else acc[date].items.push({ 
            name: prodName, 
            image: prodImg, 
            quantity: sale.quantity, 
            revenue: sale.total_price,
            profit: (sale.total_price - (sale.unit_cost_at_sale * sale.quantity))
          });
          return acc;
        }, {});

        Object.values(dailyData).forEach((day: any) => day.items.sort((a: any, b: any) => b.profit - a.profit));
        setSalesData(Object.values(dailyData));

        const prodCount = sales.reduce((acc: any, sale: any) => {
          const name = (sale.products as any)?.name || 'Excluído';
          if (!acc[name]) acc[name] = { name, quantity: 0, revenue: 0, profit: 0 };
          acc[name].quantity += sale.quantity;
          acc[name].revenue += sale.total_price;
          acc[name].profit += (sale.total_price - (sale.unit_cost_at_sale * sale.quantity));
          return acc;
        }, {});

        const allProductsList = Object.values(prodCount);
        const tp = [...allProductsList].sort((a: any, b: any) => b.quantity - a.quantity).slice(0, 5);
        const tpp = [...allProductsList].sort((a: any, b: any) => b.profit - a.profit).slice(0, 5);
        
        setTopProducts(tp);
        setTopProfitableProducts(tpp);

        // Lead source breakdown
        const sourceCount = sales.reduce((acc: any, sale: any) => {
          const src = sale.lead_source || 'Não informado';
          acc[src] = (acc[src] || 0) + sale.total_price;
          return acc;
        }, {});
        setLeadSourceData(Object.entries(sourceCount).map(([name, value]) => ({ name, value })));

        // Top Customers (Ranking LTV)
        const custDist = sales.reduce((acc: any, sale: any) => {
          const custName = sale.customer_name || 'Consumidor Final';
          if (!acc[custName]) acc[custName] = { name: custName, total: 0, count: 0 };
          acc[custName].total += sale.total_price;
          acc[custName].count += 1;
          return acc;
        }, {});
        setTopCustomers(Object.values(custDist).sort((a: any, b: any) => b.total - a.total).slice(0, 5));

        // Last month comparison
        const now = new Date();
        const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const { data: lastMonthSales } = await supabase
          .from('sales')
          .select('total_price')
          .gte('created_at', prevMonthStart.toISOString())
          .lte('created_at', prevMonthEnd.toISOString());
        setLastMonthValue((lastMonthSales || []).reduce((a, s) => a + s.total_price, 0));

        const { data: thisMonthSales } = await supabase
          .from('sales')
          .select('total_price, unit_cost_at_sale, quantity')
          .eq('user_id', user.id)
          .gte('created_at', curMonthStart.toISOString());
        const thisMonth = (thisMonthSales || []).reduce((a, s) => a + s.total_price, 0);
        const thisMonthProfit = (thisMonthSales || []).reduce((a, s) => a + (s.total_price - (s.unit_cost_at_sale * s.quantity)), 0);
        
        if (sd === undefined) {
          setMonthlySalesValue(thisMonth);
          setTotalProfit(thisMonthProfit);

          setCachedData({
            monthlySalesValue: thisMonth,
            lastMonthValue: lastMonthSales ? lastMonthSales.reduce((a, s) => a + s.total_price, 0) : 0,
            monthlyGoal: settings?.monthly_goal || 0,
            lowStockCount: products ? products.filter(p => p.stock_quantity < 5).length : 0,
            totalProducts: products ? products.length : 0,
            salesData: Object.values(dailyData),
            topProducts: tp,
            topProfitableProducts: tpp,
            stockData: products || [],
            leadSourceData: Object.entries(sourceCount).map(([n, v]) => ({ name: n, value: v })),
            totalProfit: thisMonthProfit,
            settings: stgs,
            stockProjections: {
              revenue: totalInventoryRevenue,
              profitSite: totalProfitSite,
              profitShopee: totalProfitShopee,
              profitTiktok: totalProfitTiktok,
              profitBest: totalBestProfit,
              investment: totalInv,
              chartData: [
                { name: 'Site', Venda: totalInventoryRevenue, Lucro: totalProfitSite, color: 'var(--primary)' },
                { name: 'Shopee', Venda: totalInventoryRevenue, Lucro: totalProfitShopee, color: '#f53d2d' },
                { name: 'TikTok Shop', Venda: totalInventoryRevenue, Lucro: totalProfitTiktok, color: '#000000' }
              ]
            }
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchDashboardData(); }, [user]);

  const handleApply = () => fetchDashboardData(startDate, endDate);

  const exportCSV = () => {
    if (salesData.length === 0) return;
    const rows = [['Data', 'Total (R$)']];
    salesData.forEach(d => rows.push([d.date, d.total.toFixed(2)]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `vendas_${startDate}_${endDate}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const statCards = [
    { 
      label: 'Receita do Filtro', 
      value: formatCurrency(monthlySalesValue), 
      sub: 'Performance bruta no período', 
      icon: BadgeDollarSign, 
      color: 'text-primary',
      info: 'Faturamento bruto total considerando todas as vendas realizadas no intervalo selecionado.'
    },
    { 
      label: 'Lucro Estimado', 
      value: formatCurrency(totalProfit), 
      sub: 'Lucro líquido aproximado', 
      icon: TrendingUp, 
      color: 'text-emerald-500',
      info: 'Margem líquida aproximada após descontar o custo das peças das vendas realizadas.'
    },
    { 
      label: 'Alerta de Estoque', 
      value: lowStockCount, 
      sub: 'Peças abaixo de 5 unidades', 
      icon: AlertCircle, 
      color: 'text-red-500',
      info: 'Quantidade de modelos diferentes que estão com o estoque crítico (menos de 5 unidades).'
    },
    { 
      label: 'Total de Produtos', 
      value: totalProducts, 
      sub: 'Modelos ativos na vitrine', 
      icon: PackageSearch, 
      color: 'text-violet-500',
      info: 'Total de produtos cadastrados no seu inventário que estão ativos para venda.'
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-0.5 text-foreground">Visão Geral</h1>
          <p className="text-sm text-muted-foreground">Métricas e acompanhamento financeiro da loja.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportCSV} disabled={salesData.length === 0} className="h-10 px-3 bg-muted border border-border text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors text-xs font-bold gap-1.5">
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
            onApply={handleApply}
          />
        </div>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary/50" /></div>
      ) : (
        <>
          {/* Monthly Goal Bar */}
          {monthlyGoal > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 md:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm text-foreground">
                    Meta Mensal 
                    <MetricInfo title="Meta de Faturamento" content="Acompanhamento do seu faturamente bruto neste mês em relação ao objetivo configurado nos Ajustes." />
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-sm text-primary">{formatCurrency(monthlySalesValue)}</span>
                  <span className="text-xs text-muted-foreground">de {formatCurrency(monthlyGoal)}</span>
                  {lastMonthValue > 0 && (
                    <span className={`text-[11px] font-black flex items-center gap-0.5 px-2 py-0.5 rounded-md border ${
                      monthlySalesValue >= lastMonthValue
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                        : 'bg-red-500/10 border-red-500/20 text-red-500'
                    }`}>
                      {monthlySalesValue >= lastMonthValue ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {lastMonthValue > 0 ? `${Math.abs(Math.round(((monthlySalesValue - lastMonthValue) / lastMonthValue) * 100))}% vs mês ant.` : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((monthlySalesValue / monthlyGoal) * 100, 100)}%`,
                    background: monthlySalesValue >= monthlyGoal ? '#10b981' : 'var(--primary)'
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground font-semibold">0%</span>
                <span className="text-[10px] font-black text-primary">{Math.min(Math.round((monthlySalesValue / monthlyGoal) * 100), 100)}% atingido</span>
                <span className="text-[10px] text-muted-foreground font-semibold">100%</span>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {statCards.map((card, i) => (
              <div key={i} className="bg-card border border-border p-4 md:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[80px] pointer-events-none" />
                <div className="flex items-center justify-between pb-2">
                  <h3 className="text-[11px] md:text-sm font-bold text-muted-foreground leading-tight flex items-center">
                    {card.label}
                    <MetricInfo title={card.label} content={card.info} />
                  </h3>
                  <card.icon className={`h-4 w-4 md:h-5 md:w-5 ${card.color} shrink-0`} />
                </div>
                <div className="text-xl md:text-3xl font-black text-foreground mt-1">{card.value}</div>
                <p className="text-[10px] md:text-xs font-semibold mt-2 text-muted-foreground leading-tight">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* --- INVENTORY POTENTIAL SECTION --- */}
          <div className="grid gap-6 md:grid-cols-7">
            {/* Main 3D Chart: Potencial por Canal */}
            <div className="md:col-span-5 bg-card border border-border rounded-2xl shadow-xl p-6 relative overflow-hidden group/pot">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 pointer-events-none blur-3xl opacity-50" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full -ml-16 -mb-16 pointer-events-none blur-3xl opacity-50" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="font-black text-2xl text-foreground flex items-center gap-3 tracking-tight italic">
                    <Award className="text-yellow-500 h-8 w-8 animate-bounce" /> 
                    POTENCIAL DO ESTOQUE
                    <MetricInfo title="Potencial de Retorno" content="Este gráfico mostra quanto você pode lucrar se vender todo o seu estoque atual em cada canal. O card ao lado soma o lucro máximo possível para cada peça individualmente (Visão Otimista)." />
                  </h3>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1">Estimativa de Retorno Omnichannel do Estoque Ativo</p>
                </div>
                <div className="flex flex-wrap gap-4 bg-muted/30 p-3 rounded-xl border border-border/50 backdrop-blur-sm">
                   <div className="flex items-center gap-2">
                     <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                     <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Site</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="h-3 w-3 rounded-full bg-[#f53d2d] shadow-[0_0_10px_rgba(245,61,45,0.5)]" />
                     <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Shopee</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="h-3 w-3 rounded-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.5)] dark:bg-white dark:shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                     <span className="text-[10px] font-black uppercase text-foreground tracking-widest">TikTok Shop</span>
                   </div>
                </div>
              </div>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockProjections.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={8}>
                    <defs>
                      <linearGradient id="siteGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.7} />
                      </linearGradient>
                      <linearGradient id="shopeeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff4700" stopOpacity={1} />
                        <stop offset="100%" stopColor="#ff8a00" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="tiktokGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#333333" stopOpacity={1} />
                        <stop offset="100%" stopColor="#000000" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: '900' }} 
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border border-border shadow-2xl rounded-2xl p-5 min-w-[200px] backdrop-blur-xl animate-in zoom-in-95">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">{payload[0].payload.name}</p>
                              <div className="space-y-3">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Potencial de Venda</span>
                                  <span className="text-sm font-black text-foreground">{formatCurrency(payload[0].value as number)}</span>
                                </div>
                                <div className="flex flex-col pt-2 border-t border-border/50">
                                  <span className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Lucro Estimado</span>
                                  <span className="text-lg font-black text-emerald-500">{formatCurrency(payload[1].value as number)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="Venda" shape={<RoundedBar />} barSize={35} fill="rgba(0,0,0,0.05)" />
                    <Bar dataKey="Lucro" shape={<RoundedBar />} barSize={35}>
                      {stockProjections.chartData.map((entry: any, index: number) => {
                         let fill = 'var(--primary)';
                         if (entry.name === 'Shopee') fill = 'url(#shopeeGradient)';
                         if (entry.name === 'TikTok Shop') fill = 'url(#tiktokGradient)';
                         if (entry.name === 'Site') fill = 'url(#siteGradient)';
                         return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Projection KPI Column */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-emerald-500 border border-emerald-400/50 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500" />
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Lucro Total Disponível</p>
                  <h4 className="text-2xl font-black italic tracking-tighter">
                    {formatCurrency(stockProjections.profitBest)}
                  </h4>
                  <div className="h-1 w-12 bg-white/30 my-3 rounded-full" />
                  <p className="text-[9px] font-bold opacity-70 leading-relaxed uppercase">Estimado se todas as peças em estoque forem vendidas no melhor canal.</p>
                </div>
              </div>

              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative group">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Capital Imobilizado</p>
                <h4 className="text-2xl font-black text-foreground tracking-tighter">{formatCurrency(stockProjections.investment)}</h4>
                <div className="flex items-center gap-2 mt-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Investimento em estoque</span>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Volume Total</p>
                  <p className="text-sm font-black text-foreground">{stockProjections.revenue ? formatCurrency(stockProjections.revenue) : 'R$ 0,00'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:gap-6 md:grid-cols-7">
            {/* Profit & Revenue Chart - Full width Row */}
            <div className="md:col-span-7 bg-card border border-border rounded-xl shadow-sm p-4 md:p-6 flex flex-col relative overflow-hidden group/chart h-[400px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none blur-3xl opacity-0 group-hover/chart:opacity-100 transition-opacity" />
              <div className="mb-3 flex justify-between items-start">
                <div>
                  <h3 className="font-black text-lg md:text-2xl text-foreground flex items-center gap-2 tracking-tight">
                    <TrendingUp className="text-emerald-500 h-5 w-5 md:h-7 md:w-7" /> 
                    Performance de Lucro
                    <MetricInfo title="Evolução de Lucro" content="Mostra o lucro líquido diário acumulado no período selecionado. Acompanhe a saúde financeira dia após dia." />
                  </h3>
                  <p className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">Evolução Diária Real</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Lucro</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-40">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Receita</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-[200px] md:min-h-[220px] w-full mt-4">
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                    <ComposedChart data={salesData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                      <XAxis dataKey="date" stroke="#888" fontSize={9} tickLine={false} axisLine={false} fontWeight="black" tickMargin={12} />
                      <YAxis stroke="#888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} fontWeight="black" tickMargin={10} width={50} />
                      <Tooltip 
                        content={<CustomRevenueTooltip />} 
                        cursor={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5 5' }}
                        animationDuration={200}
                      />
                      <Area 
                        type="natural"
                        dataKey="profit" 
                        stroke="none"
                        fill="url(#profitGradient)"
                        animationDuration={1500}
                        activeDot={false}
                      />
                      <Line
                        type="natural"
                        dataKey="profit"
                        stroke="#10b981"
                        strokeWidth={4}
                        filter="url(#glow)"
                        dot={false}
                        activeDot={{ r: 6, fill: '#fff', stroke: '#10b981', strokeWidth: 3 }}
                        animationDuration={1000}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-4 border-dashed border-border/50 rounded-[2rem] bg-muted/5 p-10 animate-in fade-in duration-700">
                    <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                       <TrendingUp className="h-10 w-10 opacity-20" />
                    </div>
                    <span className="font-black text-xs uppercase tracking-[0.3em] opacity-40 text-center">Nenhum dado financeiro<br/>disponível no período</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top Products - Elite Leaderboard (3D Style) */}
            <div className="md:col-span-3 bg-card border-t-4 border-t-yellow-500/30 border border-border rounded-xl shadow-lg p-4 md:p-6 flex flex-col hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group/ranking">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg md:text-xl text-foreground flex items-center">
                    <Award className="h-5 w-5 text-yellow-500 mr-2 animate-bounce" /> 
                    Produtos Elite
                  </h3>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Ranking por Volume</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {topProducts.length > 0 ? topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between group/item p-3 rounded-2xl hover:bg-muted/30 border border-transparent hover:border-border transition-all cursor-default">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 flex items-center justify-center rounded-xl font-black text-sm relative shadow-sm ${
                        i === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white shadow-yellow-500/20' : 
                        i === 1 ? 'bg-gradient-to-br from-zinc-200 to-zinc-400 text-zinc-800' : 
                        i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-500/20' : 
                        'bg-muted text-muted-foreground'
                      }`}>
                         {i + 1}
                         {i < 3 && <div className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <div className="h-1.5 w-1.5 bg-black rounded-full animate-pulse" />
                         </div>}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-foreground">{p.name}</span>
                        <span className="text-[10px] font-bold text-muted-foreground tracking-tighter uppercase">{p.quantity} Unidades vendidas</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(p.revenue)}</span>
                    </div>
                  </div>
                )) : (
                  <div className="h-40 flex items-center justify-center opacity-20"><Award size={48} /></div>
                )}
              </div>
            </div>

            {/* Top Patients/Customers - LTV Podium (3D Style) */}
            <div className="md:col-span-4 bg-card border-t-4 border-t-violet-500/30 border border-border rounded-xl shadow-lg p-4 md:p-6 flex flex-col hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg md:text-xl text-foreground flex items-center">
                    <Users className="h-5 w-5 text-violet-500 mr-2" /> 
                    Compradores Ouro
                  </h3>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Potencial de LTV (Retenção)</p>
                </div>
              </div>

              <div className="space-y-4">
                {topCustomers.length > 0 ? topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center justify-between group/item p-3 rounded-2xl hover:bg-violet-500/5 border border-transparent hover:border-violet-500/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 flex items-center justify-center rounded-xl font-black text-sm relative transition-all group-hover/item:rotate-6 ${
                        i === 0 ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-muted text-muted-foreground'
                      }`}>
                         {i === 0 ? '🏆' : i + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-foreground">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-violet-500/70 border border-violet-500/20 px-1.5 rounded-sm uppercase tracking-tighter">{c.count} Pedidos</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col">
                       <span className="text-sm font-black text-violet-600">{formatCurrency(c.total)}</span>
                       <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none">VPD Total</span>
                    </div>
                  </div>
                )) : (
                  <div className="h-40 flex items-center justify-center opacity-20"><Users size={48} /></div>
                )}
              </div>
            </div>
          </div>

          {/* Stock Health Row */}
          <div className="grid gap-4 md:gap-6 md:grid-cols-1">
             <div className="bg-card border border-border rounded-xl shadow-sm p-4 md:p-6 flex flex-col h-[300px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-base md:text-xl text-foreground flex items-center">
                  <PackageSearch className="h-4 w-4 md:h-5 md:w-5 text-primary mr-2" /> Saúde do Inventário
                </h3>
              </div>
              <div className="flex-1 flex flex-col md:flex-row items-center gap-12 overflow-hidden">
                <div className="h-full w-full max-w-[180px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Saudável', value: stockHealthStats.healthy },
                          { name: 'Alerta', value: stockHealthStats.low },
                          { name: 'Esgotado', value: stockHealthStats.out }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                         <Cell key="cell-h" fill="var(--primary)" />
                         <Cell key="cell-l" fill="#71717a" />
                         <Cell key="cell-o" fill="#27272a" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-2">Saudável</span>
                      <span className="text-2xl font-black text-foreground">{stockHealthStats.healthy}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-2">Atenção</span>
                      <span className="text-2xl font-black text-foreground">{stockHealthStats.low}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-2">Esgotado</span>
                      <span className="text-2xl font-black text-foreground">{stockHealthStats.out}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
