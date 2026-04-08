import { useEffect, useState, useCallback } from 'react';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { BadgeDollarSign, PackageSearch, TrendingUp, AlertCircle, Loader2, CalendarDays, BarChart2, History, X, Target, TrendingDown, Download, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie } from 'recharts';
import { Button } from '../../components/ui';

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
      <div className="bg-card/80 border border-border shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-2xl p-4 min-w-[280px] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
        <p className="font-black text-3xl text-foreground mb-4 tracking-tighter">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.total)}
        </p>
        {data.items?.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border/50">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Destaques do Dia:</span>
            {data.items.slice(0, 3).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3 bg-muted/30 p-2 rounded-xl border border-border/30 hover:bg-muted/50 transition-colors group">
                <div className="h-12 w-12 rounded-lg bg-card overflow-hidden flex-shrink-0 border border-border relative">
                  {item.image ? (
                    <img src={getProxyUrl(item.image) || ''} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <PackageSearch className="w-full h-full p-2 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-foreground truncate">{item.name}</span>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded">{item.quantity}x</span>
                    <span className="text-[10px] font-black text-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
            {data.items.length > 3 && <div className="text-[10px] text-center text-muted-foreground font-black pt-1 tracking-widest uppercase">+ {data.items.length - 3} itens</div>}
          </div>
        )}
      </div>
    );
  }
  return null;
};

// ─── 3D Cylinder Shape for Charts ───────────────────────────────────────────
const ThreeDCylinder = (props: any) => {
  const { fill, x, y, width, height } = props;
  if (!height || isNaN(height) || height <= 0) return null;
  const barX = x || 0;
  const barY = y || 0;
  const barW = width || 0;
  const barH = height || 0;

  return (
    <g className="transition-all duration-500 ease-out hover:brightness-110">
      {/* Side face for 3D effect */}
      <path
        d={`M ${barX + barW},${barY} L ${barX + barW + 5},${barY - 5} L ${barX + barW + 5},${barY + barH - 5} L ${barX + barW},${barY + barH} Z`}
        fill={fill}
        filter="brightness(0.7)"
      />
      {/* Top face for 3D effect */}
      <path
        d={`M ${barX},${barY} L ${barX + 5},${barY - 5} L ${barX + barW + 5},${barY - 5} L ${barX + barW},${barY} Z`}
        fill={fill}
        filter="brightness(1.2)"
      />
      {/* Main Bar */}
      <rect x={barX} y={barY} width={barW} height={barH} fill={fill} rx={2} />
    </g>
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
    try {
      // Monthly goal
      const { data: settings } = await supabase.from('store_settings').select('*').eq('user_id', user.id).limit(1).maybeSingle();
      if (settings?.monthly_goal) setMonthlyGoal(settings.monthly_goal);

      const { data: products } = await supabase
        .from('products')
        .select('id, name, stock_quantity, image_url, images, price, sale_price, cost_price, shopee_price, tiktok_price')
        .eq('user_id', user.id)
        .order('stock_quantity', { ascending: false });

      if (products) {
        setStockData(products);
        setTotalProducts(products.length);
        setLowStockCount(products.filter(p => p.stock_quantity < 5).length);

        // --- INVENTORY POTENTIAL CALCULATION ---
        let totalRev = 0;
        let totalProfitSite = 0;
        let totalProfitShopee = 0;
        let totalProfitTiktok = 0;
        let totalInv = 0;

        // Marketplace Fees (from store_settings or defaults)
        const shopee_comm = settings?.shopee_commission_pct ?? 20;
        const shopee_fee = settings?.shopee_fixed_fee ?? 4;
        const tiktok_comm = settings?.tiktok_commission_pct ?? 6;
        const tiktok_fee = settings?.tiktok_fixed_fee ?? 4;

        products.forEach(p => {
          if (p.stock_quantity <= 0) return;
          const qty = p.stock_quantity;
          const cost = p.cost_price || 0;
          const siteP = p.sale_price || p.price || 0;
          const shopeeP = p.shopee_price || siteP;
          const tiktokP = p.tiktok_price || siteP;

          totalRev += siteP * qty;
          totalInv += cost * qty;
          
          // Profit calculations
          totalProfitSite += (siteP - cost) * qty;
          totalProfitShopee += (shopeeP - (shopeeP * (shopee_comm / 100)) - shopee_fee - cost) * qty;
          totalProfitTiktok += (tiktokP - (tiktokP * (tiktok_comm / 100)) - tiktok_fee - cost) * qty;
        });

        const projectionData = {
          revenue: totalRev,
          profitSite: totalProfitSite,
          profitShopee: totalProfitShopee,
          profitTiktok: totalProfitTiktok,
          investment: totalInv,
          chartData: [
            { name: 'Site', Venda: totalRev, Lucro: totalProfitSite, color: 'var(--primary)' },
            { name: 'Shopee', Venda: totalRev, Lucro: totalProfitShopee, color: '#f53d2d' },
            { name: 'TikTok', Venda: totalRev, Lucro: totalProfitTiktok, color: '#000000' }
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
        .select(`*, products(name, image_url, images)`)
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

        // Last month comparison (always fetch full current month vs previous month)
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
        // Only override if we're looking at current month; otherwise use filtered total
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
            stockProjections: {
              revenue: totalRev,
              profitSite: totalProfitSite,
              profitShopee: totalProfitShopee,
              profitTiktok: totalProfitTiktok,
              investment: totalInv,
              chartData: [
                { name: 'Site', Venda: totalRev, Lucro: totalProfitSite, color: 'var(--primary)' },
                { name: 'Shopee', Venda: totalRev, Lucro: totalProfitShopee, color: '#f53d2d' },
                { name: 'TikTok', Venda: totalRev, Lucro: totalProfitTiktok, color: '#000000' }
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
    { label: 'Receita do Filtro', value: formatCurrency(monthlySalesValue), sub: 'Performance bruta no período', icon: BadgeDollarSign, color: 'text-primary' },
    { label: 'Lucro Estimado', value: formatCurrency(totalProfit), sub: 'Lucro líquido aproximado', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Alerta de Estoque', value: lowStockCount, sub: 'Peças abaixo de 5 unidades', icon: AlertCircle, color: 'text-red-500' },
    { label: 'Total de Produtos', value: totalProducts, sub: 'Modelos ativos na vitrine', icon: PackageSearch, color: 'text-violet-500' },
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
          {/* --- INVENTORY POTENTIAL SECTION (MAIN) --- */}
          <div className="grid gap-6 md:grid-cols-7 mb-2">
            {/* Main 3D Chart: Potencial por Canal */}
            <div className="md:col-span-5 bg-card border border-border rounded-2xl shadow-xl p-6 relative overflow-hidden group/pot">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 pointer-events-none blur-3xl" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="font-black text-2xl text-foreground flex items-center gap-3 tracking-tight italic">
                    <Award className="text-yellow-500 h-8 w-8 animate-bounce" /> POTENCIAL DO ESTOQUE
                  </h3>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1">Previsão de Lucro Omnichannel Baseada no Estoque Atual</p>
                </div>
                <div className="flex flex-wrap gap-4 bg-muted/30 p-3 rounded-xl border border-border/50">
                   <div className="flex items-center gap-2">
                     <div className="h-3 w-3 rounded-full bg-primary/40 p-[1px]"><div className="w-full h-full bg-primary rounded-full" /></div>
                     <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Site</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="h-3 w-3 rounded-full bg-[#f53d2d]/40 p-[1px]"><div className="w-full h-full bg-[#f53d2d] rounded-full" /></div>
                     <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Shopee</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="h-3 w-3 rounded-full bg-black/40 p-[1px]"><div className="w-full h-full bg-black rounded-full" /></div>
                     <span className="text-[10px] font-black uppercase text-foreground tracking-widest">TikTok Shop</span>
                   </div>
                </div>
              </div>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockProjections.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 'bold' }} 
                    />
                    <YAxis 
                      hide 
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card/95 border border-border shadow-2xl rounded-2xl p-4 backdrop-blur-xl animate-in zoom-in-95">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{payload[0].payload.name}</p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-8">
                                  <span className="text-xs font-bold text-muted-foreground">Venda Total:</span>
                                  <span className="text-xs font-black text-foreground">{formatCurrency(payload[0].value as number)}</span>
                                </div>
                                <div className="flex justify-between gap-8 pt-1 border-t border-border/50">
                                  <span className="text-xs font-bold text-emerald-500">Lucro Total:</span>
                                  <span className="text-xs font-black text-emerald-500">{formatCurrency(payload[1].value as number)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="Venda" shape={<ThreeDCylinder fill="var(--primary)" />} barSize={40} opacity={0.3} />
                    <Bar dataKey="Lucro" shape={<ThreeDCylinder fill="currentColor" />} barSize={40}>
                      {stockProjections.chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
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
                    {formatCurrency(Math.max(stockProjections.profitSite, stockProjections.profitShopee, stockProjections.profitTiktok))}
                  </h4>
                  <div className="h-1 w-12 bg-white/30 my-3 rounded-full" />
                  <p className="text-[9px] font-bold opacity-70 leading-relaxed uppercase">Estimado se todas as peas em estoque forem vendidas no melhor canal.</p>
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

          {/* Monthly Goal Bar */}
          {monthlyGoal > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 md:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm text-foreground">Meta Mensal</span>
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
                    background: monthlySalesValue >= monthlyGoal ? 'var(--color-emerald-500, #10b981)' : 'var(--primary)'
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
                  <h3 className="text-[11px] md:text-sm font-bold text-muted-foreground leading-tight">{card.label}</h3>
                  <card.icon className={`h-4 w-4 md:h-5 md:w-5 ${card.color} shrink-0`} />
                </div>
                <div className="text-xl md:text-3xl font-black text-foreground mt-1">{card.value}</div>
                <p className="text-[10px] md:text-xs font-semibold mt-2 text-muted-foreground leading-tight">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:gap-6 md:grid-cols-7">
            {/* Profit & Revenue Chart */}
            <div className="md:col-span-4 bg-card border border-border rounded-xl shadow-sm p-4 md:p-6 flex flex-col relative overflow-hidden group/chart">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none blur-3xl opacity-0 group-hover/chart:opacity-100 transition-opacity" />
              <div className="mb-3 flex justify-between items-start">
                <div>
                  <h3 className="font-black text-lg md:text-2xl text-foreground flex items-center gap-2 tracking-tight">
                    <TrendingUp className="text-emerald-500 h-5 w-5 md:h-7 md:w-7" /> Performance de Lucro
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
              <div className="flex-1 min-h-[300px] md:min-h-[380px] w-full mt-4">
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                        </linearGradient>
                        <filter id="3dShadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.2" />
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                      <XAxis dataKey="date" stroke="#888" fontSize={9} tickLine={false} axisLine={false} fontWeight="black" tickMargin={12} />
                      <YAxis stroke="#888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} fontWeight="black" tickMargin={10} width={50} />
                      <Tooltip content={<CustomRevenueTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                      <Bar 
                        dataKey="profit" 
                        shape={<ThreeDCylinder />}
                        maxBarSize={40}
                        animationDuration={1500}
                      >
                        {salesData.map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === salesData.length - 1 ? '#10b981' : 'url(#profitGradient)'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
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

            {/* Top Products */}
            <div className="md:col-span-3 bg-card border border-border rounded-xl shadow-sm p-4 md:p-6 flex flex-col">
              <div className="mb-4">
                <h3 className="font-bold text-base md:text-xl text-foreground">Top Peças</h3>
                <p className="text-xs md:text-sm font-medium text-muted-foreground mt-0.5">Mais vendidas por volume no período.</p>
              </div>
              <div className="space-y-3 flex-1">
                {topProducts.length > 0 ? topProducts.map((prod, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 md:p-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[11px] font-black text-muted-foreground w-5 text-center shrink-0">#{i + 1}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs md:text-sm font-bold text-foreground truncate group-hover:text-primary">{prod.name}</span>
                        <span className="text-[10px] font-semibold text-muted-foreground">{prod.quantity} un vendidas</span>
                      </div>
                    </div>
                    <div className="font-black text-primary text-xs md:text-sm flex items-center bg-primary/10 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg border border-primary/20 shrink-0 ml-2">
                      {formatCurrency(prod.revenue)}
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/10 p-8">
                    <span className="font-semibold text-sm text-center">Registre vendas para ver o ranking.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top Profitable 3D Block */}
            <div className="md:col-span-3 bg-card border border-border rounded-xl shadow-sm p-4 md:p-6 flex flex-col relative overflow-hidden group/chart2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 pointer-events-none blur-3xl opacity-0 group-hover/chart2:opacity-100 transition-opacity" />
              <div className="mb-4">
                <h3 className="font-bold text-base md:text-xl text-foreground flex items-center gap-2">
                  <Award className="text-amber-500 h-5 w-5" /> Estrelas de Lucro
                </h3>
                <p className="text-xs md:text-sm font-medium text-muted-foreground mt-0.5">Top Produtos que mais encorparam o lucro liquido (Gráfico 3D).</p>
              </div>
              <div className="flex-1 w-full mt-2 h-[280px]">
                {topProfitableProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProfitableProducts} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                          <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.3} />
                      <XAxis type="number" stroke="#888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} fontWeight="bold" />
                      <YAxis dataKey="name" type="category" stroke="#888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => v.length > 10 ? v.substring(0, 10) + '…' : v} fontWeight="bold" width={70} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                        itemStyle={{ fontWeight: 'black', color: 'var(--foreground)' }}
                        formatter={(val: any) => formatCurrency(val)} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} 
                      />
                      <Bar 
                        dataKey="profit" 
                        shape={<ThreeDCylinder />} 
                        maxBarSize={24}
                        animationDuration={1500}
                      >
                        {topProfitableProducts.map((_, index) => (
                           <Cell key={`cell-${index}`} fill={'url(#goldGradient)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-[2rem] bg-muted/10 p-4">
                    <span className="font-semibold text-sm text-center">Nenhum lucro registrado.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Lead Source Pie Chart */}
            {leadSourceData.length > 0 && (
              <div className="md:col-span-3 bg-card border border-border rounded-xl shadow-sm p-4 md:p-6 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none blur-3xl" />
                <h3 className="font-bold text-base md:text-xl text-foreground mb-1">Origem das Vendas</h3>
                <p className="text-xs text-muted-foreground mb-6">Canal de aquisição dos pedidos.</p>
                
                <div className="flex-1 min-h-[260px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {leadSourceData.map((_, index) => (
                          <linearGradient key={`grad-${index}`} id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={['#8b5cf6','#6366f1','#ec4899','#f59e0b','#10b981','#06b6d4'][index % 6]} stopOpacity={1} />
                            <stop offset="100%" stopColor={['#6d28d9','#4338ca','#be185d','#b45309','#047857','#0891b2'][index % 6]} stopOpacity={1} />
                          </linearGradient>
                        ))}
                        <filter id="shadow" height="200%">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
                        </filter>
                      </defs>
                      <Pie
                        data={leadSourceData}
                        cx="50%" cy="45%"
                        innerRadius="65%"
                        outerRadius="85%"
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        filter="url(#shadow)"
                        animationBegin={0}
                        animationDuration={1200}
                      >
                        {leadSourceData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={`url(#grad-${index})`} className="hover:opacity-80 transition-opacity cursor-pointer" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                        formatter={(v: any) => formatCurrency(v)} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Central Label for Donut */}
                  <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Total</p>
                    <p className="text-lg md:text-xl font-black text-foreground">{formatCurrency(leadSourceData.reduce((a,b)=>a+b.value, 0))}</p>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {leadSourceData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#8b5cf6','#6366f1','#ec4899','#f59e0b','#10b981','#06b6d4'][index % 6] }} />
                      <span className="text-[10px] font-bold text-muted-foreground truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Chart */}
            <div className={`${leadSourceData.length > 0 ? 'md:col-span-4' : 'md:col-span-full'} bg-card border border-border rounded-xl shadow-sm p-4 md:p-6`}>
              <div className="mb-3">
                <h3 className="font-bold text-base md:text-xl text-foreground flex items-center gap-2">
                  <BarChart2 className="text-primary w-5 h-5 md:w-6 md:h-6" /> Estoque Atual
                </h3>
                <p className="text-xs md:text-sm font-medium text-muted-foreground mt-0.5">Passe o cursor para ver a imagem e status da peça.</p>
              </div>
              <div className="h-[240px] md:h-[320px] w-full mt-3">
                {stockData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                      <XAxis dataKey="name" stroke="#888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => val.length > 12 ? val.substring(0, 12) + '…' : val} fontWeight="semibold" tickMargin={8} />
                      <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} fontWeight="semibold" tickMargin={8} />
                      <Tooltip content={<CustomStockTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                      <Bar dataKey="stock_quantity" radius={[6, 6, 0, 0]}>
                        {stockData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.stock_quantity <= 0 ? '#ef4444' : entry.stock_quantity < 5 ? '#f97316' : '#8b5cf6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/10">
                    <PackageSearch className="h-10 w-10 mb-3 opacity-30" />
                    <span className="font-semibold text-sm">Cadastre produtos para ver o gráfico de estoque.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
