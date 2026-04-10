import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package, 
  Users, AlertCircle, Calendar, ArrowUpRight, ArrowDownRight,
  Loader2, Sparkles, Zap, ShieldCheck, Target, CreditCard, BarChart3, PieChart
} from 'lucide-react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>(null);

  useEffect(() => { if (user) fetchData(); }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const [{ data: sData }, { data: pData }, { data: cData }, { data: stData }] = await Promise.all([
        supabase.from('sales').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('user_id', user?.id),
        supabase.from('customers').select('*').eq('user_id', user?.id),
        supabase.from('store_settings').select('*').eq('user_id', user?.id).maybeSingle()
      ]);
      setSales(sData || []);
      setProducts(pData || []);
      setCustomers(cData || []);
      setStoreSettings(stData);
    } catch (err: any) { toastError(err.message); }
    finally { setLoading(false); }
  }

  const stats = useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + s.total_price, 0);
    const totalCost = sales.reduce((acc, s) => acc + (s.cost_price * s.quantity || 0), 0);
    const profit = totalSales - totalCost;
    const avgTicket = sales.length > 0 ? totalSales / sales.length : 0;
    const conversion = customers.length > 0 ? (sales.length / customers.length) * 100 : 0;
    
    return { totalSales, profit, avgTicket, conversion, salesCount: sales.length, customerCount: customers.length };
  }, [sales, customers]);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 🏁 Aura Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 lg:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={10} /> Operação Segura</span>
            <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Aura Workspace</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-white">Painel de <span className="text-primary italic">Performance</span></h1>
          <p className="text-muted-foreground font-medium text-sm lg:text-base max-w-2xl">
            Sincronização em tempo real de lucratividade, fluxo de caixa e inteligência de mercado.
          </p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
           {['Hoje', '7 dias', '30 dias'].map(t => (
             <button key={t} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", t === '30 dias' ? "bg-white text-black shadow-xl" : "text-white/30 hover:text-white")}>{t}</button>
           ))}
        </div>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4 text-white/20"><Loader2 className="animate-spin" /> <span className="text-[10px] font-black uppercase tracking-widest">Calculando Algoritmos...</span></div>
      ) : (
        <>
          {/* 💎 Premium Metrics Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Receita Bruta', val: fmt(stats.totalSales), icon: DollarSign, trend: '+12.5%', isUp: true },
              { label: 'Lucro Líquido', val: fmt(stats.profit), icon: Zap, trend: '+8.2%', isUp: true },
              { label: 'Ticket Médio', val: fmt(stats.avgTicket), icon: Target, trend: '-2.1%', isUp: false },
              { label: 'Volume Vendas', val: stats.salesCount, icon: ShoppingBag, trend: '+15.0%', isUp: true },
            ].map((m, i) => (
              <div key={i} className="glass-card p-8 group relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-10 text-white/[0.02] -mr-16 -mt-16 rotate-12 group-hover:scale-110 transition-transform duration-700"><m.icon size={160} /></div>
                 <div className="flex justify-between items-start relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 italic">{m.label}</p>
                    <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg", m.isUp ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                       {m.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {m.trend}
                    </span>
                 </div>
                 <h2 className="text-3xl font-black text-white italic tracking-tighter mt-4 relative z-10">{m.val}</h2>
                 <div className="mt-4 flex items-center gap-2 relative z-10">
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-primary animate-in slide-in-from-left duration-1000" style={{ width: `${Math.random()*40+60}%` }} />
                    </div>
                 </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             {/* 📈 Performance Chart Mockup */}
             <div className="lg:col-span-8 glass-card p-8 space-y-8">
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2"><BarChart3 size={16} className="text-primary" /> Histórico de Crescimento</h3>
                   <div className="h-4 w-4 rounded-full bg-primary/20 animate-pulse" />
                </div>
                <div className="h-64 w-full flex items-end justify-between gap-1 pt-4">
                   {[40, 70, 45, 90, 65, 80, 50, 95, 60, 85, 75, 100].map((h, i) => (
                      <div key={i} className="flex-1 bg-white/5 rounded-t-xl group relative cursor-pointer hover:bg-primary/20 transition-all" style={{ height: `${h}%` }}>
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all shadow-xl">R$ {(h*240).toLocaleString()}</div>
                      </div>
                   ))}
                </div>
                <div className="flex justify-between border-t border-white/5 pt-4">
                   {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(m => (
                      <span key={m} className="text-[9px] font-black uppercase text-white/20 tracking-widest">{m}</span>
                   ))}
                </div>
             </div>

             {/* 🎯 Real-time Activity */}
             <div className="lg:col-span-4 glass-card p-8 space-y-8">
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2"><Sparkles size={16} className="text-primary" /> Feed de Operações</h3>
                </div>
                <div className="space-y-6">
                   {sales.slice(0, 5).map((s, i) => (
                      <div key={i} className="flex items-center gap-4 group">
                         <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all"><ShoppingBag size={20} /></div>
                         <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-white uppercase tracking-tight truncate italic">Venda #{s.id.slice(0, 5)}</p>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{new Date(s.created_at).toLocaleTimeString()}</p>
                         </div>
                         <p className="text-sm font-black text-white italic">{fmt(s.total_price)}</p>
                      </div>
                   ))}
                   {sales.length === 0 && (
                      <div className="py-12 text-center grayscale opacity-20"><Zap size={40} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Aguardando Transações...</p></div>
                   )}
                </div>
                <button className="ux-button h-14 w-full bg-white/5 border border-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">Ver Relatório Completo</button>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
