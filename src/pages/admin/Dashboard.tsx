import React from 'react';
import { 
  ClipboardList, 
  PlayCircle, 
  Clock, 
  CheckCircle2, 
  BadgeDollarSign,
  Plus,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';

const stats = [
  { label: 'OS Abertas', value: 12, icon: ClipboardList, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Em Execução', value: 5, icon: PlayCircle, color: 'text-secondary', bg: 'bg-secondary/10' },
  { label: 'Aguardando Retirada', value: 3, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { label: 'Finalizadas', value: 142, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
  { label: 'Faturamento Mês', value: 'R$ 15.420', icon: BadgeDollarSign, color: 'text-primary', bg: 'bg-primary/20', glow: true },
];

const data = [
  { name: 'Seg', total: 4 },
  { name: 'Ter', total: 7 },
  { name: 'Qua', total: 5 },
  { name: 'Qui', total: 8 },
  { name: 'Sex', total: 12 },
  { name: 'Sáb', total: 6 },
  { name: 'Dom', total: 2 },
];

const recentOS = [
  { id: '1024', cliente: 'Carlos Alberto', veiculo: 'Toyota Corolla - ABC-1234', status: 'Em Execução', data: '14/04 10:30' },
  { id: '1023', cliente: 'Marina Silva', veiculo: 'Honda Civic - DEF-5678', status: 'Aguardando Aprovação', data: '14/04 09:15' },
  { id: '1022', cliente: 'Joaquim Souza', veiculo: 'Fiat Toro - BRA2E19', status: 'Finalizado', data: '13/04 16:45' },
  { id: '1021', cliente: 'Roberto Lima', veiculo: 'VW Golf - GHI-9012', status: 'Aguardando Retirada', data: '13/04 14:20' },
  { id: '1020', cliente: 'Ana Paula', veiculo: 'Ford Ka - JKL-3456', status: 'Em Execução', data: '13/04 11:00' },
];

const statusColors: Record<string, string> = {
  'Em Execução': 'text-secondary bg-secondary/10 border-secondary/20',
  'Aguardando Aprovação': 'text-primary bg-primary/10 border-primary/20',
  'Finalizado': 'text-green-400 bg-green-400/10 border-green-400/20',
  'Aguardando Retirada': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
};

export default function Dashboard() {
  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Painel <span className="text-primary italic">Estratégico</span></h1>
          <p className="text-white/40 font-medium">Bem-vindo de volta, Thiago. Aqui está o desempenho da sua oficina hoje.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="btn-orange flex gap-2">
            <Plus size={20} />
            Nova OS
          </button>
          <button className="p-3 glass-bright rounded-xl hover:bg-white/10 transition-colors">
            <TrendingUp size={24} className="text-secondary" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "glass p-6 rounded-2xl relative overflow-hidden group border border-white/5",
              stat.glow && "glow-primary border-primary/20"
            )}
          >
            <div className={cn("p-2 rounded-lg w-fit mb-4 transition-transform group-hover:scale-110", stat.bg)}>
              <stat.icon size={22} className={stat.color} />
            </div>
            <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black tabular-nums">{stat.value}</h3>
            
            {/* Background decoration */}
            <div className="absolute right-[-10px] bottom-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon size={80} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 glass rounded-3xl p-8 border border-white/5 flex flex-col h-[450px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black flex items-center gap-3">
              <TrendingUp className="text-secondary" size={24} />
              Serviços Concluídos (Semana)
            </h3>
            <select className="bg-white/5 border border-white/10 rounded-lg text-sm font-bold px-3 py-1 outline-none text-white/70">
              <optgroup className='bg-[#111]'>
                <option>Últimos 7 dias</option>
                <option>Este mês</option>
              </optgroup>
            </select>
          </div>
          
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700 }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 8 }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.total > 7 ? 'var(--primary)' : 'var(--secondary)'} 
                      className="drop-shadow-lg"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent OS */}
        <div className="glass rounded-3xl p-8 border border-white/5 space-y-6 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black flex items-center gap-3">
              <ClipboardList className="text-primary" size={24} />
              Últimas OS
            </h3>
            <button className="text-white/40 hover:text-primary transition-colors text-xs font-black uppercase tracking-widest flex items-center gap-1 group">
              Ver Todas
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {recentOS.map((os, i) => (
              <motion.div 
                key={os.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="group p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">#OS-{os.id}</span>
                  <span className="text-[10px] font-bold text-white/30">{os.data}</span>
                </div>
                <h4 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">{os.cliente}</h4>
                <p className="text-xs text-white/50 mono-font mb-3">{os.veiculo}</p>
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border",
                    statusColors[os.status] || "text-white/40 bg-white/5 border-white/10"
                  )}>
                    {os.status}
                  </span>
                  <div className="hidden group-hover:flex items-center text-primary">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-bright p-6 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer border border-primary/5">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center glow-primary">
            <Plus size={24} />
          </div>
          <div>
            <h4 className="font-black text-lg">Novo Produto</h4>
            <p className="text-xs text-white/40">Adicionar ao catálogo</p>
          </div>
        </div>

        <div className="glass-bright p-6 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer border border-secondary/5">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center glow-secondary">
            <FileText size={24} />
          </div>
          <div>
            <h4 className="font-black text-lg">Gerar Orçamento</h4>
            <p className="text-xs text-white/40">Link rápido para WhatsApp</p>
          </div>
        </div>

        <div className="glass-bright p-6 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer border border-white/10">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <h4 className="font-black text-lg">Novo Cliente</h4>
            <p className="text-xs text-white/40">Acelerar atendimento</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
