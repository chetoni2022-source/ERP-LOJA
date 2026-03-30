import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { BadgeDollarSign, PackageSearch, TrendingUp, AlertCircle, Loader2, CalendarDays, BarChart2, History, X, Target, TrendingDown, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie } from 'recharts';
import { Button } from '../../components/ui';

// ─── Tooltips ────────────────────────────────────────────────────────────────
const CustomStockTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const qty = data.stock_quantity;
    const status = qty <= 0 ? 'Esgotado' : qty < 5 ? 'Baixo Estoque' : 'Saudável';
    const statusColor = qty <= 0 ? 'text-red-500 bg-red-500/10 border-red-500/20' : qty < 5 ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' : 'text-green-500 bg-green-500/10 border-green-500/20';
    const displayImg = data.images?.[0] || data.image_url;
    return (
      <div className="bg-card border border-border shadow-2xl rounded-xl p-3 max-w-[200px] backdrop-blur-md">
        {displayImg ? (
          <img src={displayImg} alt={data.name} className="w-full h-28 object-cover rounded-lg mb-3 border border-border" />
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
      <div className="bg-card border border-border shadow-2xl rounded-xl p-4 min-w-[240px]">
        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="font-black text-2xl text-primary mb-3">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.total)}
        </p>
        {data.items?.length > 0 && (
          <div className="space-y-2.5 pt-3 border-t border-border">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Peças vendidas:</span>
            {data.items.slice(0, 4).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-muted overflow-hidden flex-shrink-0 border border-border">
                  {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <PackageSearch className="w-full h-full p-2 text-muted-foreground/40" />}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs font-bold text-foreground truncate">{item.name}</span>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{item.quantity}x</span>
                    <span className="text-[10px] font-bold text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
            {data.items.length > 4 && <div className="text-[10px] text-center text-muted-foreground font-bold pt-1">+ {data.items.length - 4} outros</div>}
          </div>
        )}
      </div>
    );
  }
  return null;
};

// ─── Inline Date Picker Component ────────────────────────────────────────────
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
  const [loading, setLoading] = useState(true);

  const [monthlySalesValue, setMonthlySalesValue] = useState(0);
  const [lastMonthValue, setLastMonthValue] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [leadSourceData, setLeadSourceData] = useState<any[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchDashboardData = useCallback(async (sd?: string, ed?: string) => {
    setLoading(true);
    try {
      // Monthly goal
      const { data: settings } = await supabase.from('store_settings').select('monthly_goal').eq('user_id', user.id).limit(1).maybeSingle();
      if (settings?.monthly_goal) setMonthlyGoal(settings.monthly_goal);
      const { data: products } = await supabase.from('products').select('id, name, stock_quantity, image_url, images, price').eq('user_id', user.id).order('stock_quantity', { ascending: false });

      if (products) {
        setStockData(products);
        setTotalProducts(products.length);
        setLowStockCount(products.filter(p => p.stock_quantity < 5).length);
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
          if (!acc[date]) acc[date] = { date, total: 0, items: [] };
          acc[date].total += sale.total_price;
          const p = sale.products as any;
          const prodName = p?.name || 'Excluído';
          const prodImg = p?.images?.[0] || p?.image_url || null;
          const existing = acc[date].items.find((i: any) => i.name === prodName);
          if (existing) { existing.quantity += sale.quantity; existing.revenue += sale.total_price; }
          else acc[date].items.push({ name: prodName, image: prodImg, quantity: sale.quantity, revenue: sale.total_price });
          return acc;
        }, {});

        Object.values(dailyData).forEach((day: any) => day.items.sort((a: any, b: any) => b.revenue - a.revenue));
        setSalesData(Object.values(dailyData));

        const prodCount = sales.reduce((acc: any, sale: any) => {
          const name = (sale.products as any)?.name || 'Excluído';
          if (!acc[name]) acc[name] = { name, quantity: 0, revenue: 0 };
          acc[name].quantity += sale.quantity;
          acc[name].revenue += sale.total_price;
          return acc;
        }, {});

        setTopProducts(Object.values(prodCount).sort((a: any, b: any) => b.quantity - a.quantity).slice(0, 5));

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
            {/* Revenue Chart */}
            <div className="md:col-span-4 bg-card border border-border rounded-xl shadow-sm p-4 md:p-6 flex flex-col">
              <div className="mb-3">
                <h3 className="font-bold text-base md:text-xl text-foreground flex items-center gap-2">
                  <History className="text-primary h-5 w-5 md:h-6 md:w-6" /> Evolução de Receita Diária
                </h3>
                <p className="text-xs md:text-sm font-medium text-muted-foreground mt-0.5">Passe o mouse nas barras para ver as peças do dia.</p>
              </div>
              <div className="flex-1 min-h-[240px] md:min-h-[300px] w-full mt-3">
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                      <XAxis dataKey="date" stroke="#888" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" tickMargin={10} />
                      <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} fontWeight="bold" tickMargin={8} width={60} />
                      <Tooltip content={<CustomRevenueTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
                      <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={40}>
                        {salesData.map((_, index) => <Cell key={`cell-${index}`} className="opacity-90 hover:opacity-100" />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/10">
                    <TrendingUp className="h-10 w-10 mb-3 opacity-30" />
                    <span className="font-semibold text-sm">Nenhuma venda no período selecionado.</span>
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
