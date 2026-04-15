import React, { useState } from 'react';
import { 
  Users, 
  Car, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  Calendar,
  ChevronRight,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const mockClientes = [
  { id: '1', nome: 'Carlos Alberto', telefone: '(11) 98888-7777', email: 'carlos@email.com', veiculos: 2 },
  { id: '2', nome: 'Marina Silva', telefone: '(11) 97777-6666', email: 'marina@email.com', veiculos: 1 },
  { id: '3', nome: 'Joaquim Souza', telefone: '(11) 96666-5555', email: 'joaquim@email.com', veiculos: 3 },
];

export default function CRM() {
  const [activeTab, setActiveTab] = useState<'clientes' | 'veiculos'>('clientes');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Relacionamento <span className="text-primary italic">& Clientes</span></h1>
          <p className="text-white/40 font-medium">Gerencie sua base de clientes e a frota vinculada.</p>
        </div>
        
        <button className="btn-orange flex gap-2">
          <Plus size={20} />
          {activeTab === 'clientes' ? 'Novo Cliente' : 'Novo Veículo'}
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex p-1 glass rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('clientes')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === 'clientes' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/40 hover:text-white"
            )}
          >
            Clientes
          </button>
          <button 
            onClick={() => setActiveTab('veiculos')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === 'veiculos' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/40 hover:text-white"
            )}
          >
            Veículos
          </button>
        </div>

        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text" 
            placeholder={`Buscar por ${activeTab === 'clientes' ? 'nome, telefone...' : 'placa, modelo...'}`}
            className="input-glass w-full pl-12 h-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockClientes.map((cliente, i) => (
          <motion.div
            key={cliente.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass p-6 rounded-[32px] border border-white/5 hover:border-primary/20 transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                <Users size={28} />
              </div>
              <button className="p-2 text-white/20 hover:text-white transition-colors">
                <MoreHorizontal size={20} />
              </button>
            </div>

            <h3 className="text-xl font-black mb-4 group-hover:text-primary transition-colors">{cliente.nome}</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-white/60 font-medium">
                <Phone size={16} className="text-primary/60" />
                {cliente.telefone}
              </div>
              <div className="flex items-center gap-3 text-sm text-white/60 font-medium">
                <Mail size={16} className="text-primary/60" />
                {cliente.email}
              </div>
              <div className="flex items-center gap-3 text-sm text-white/60 font-medium">
                <Car size={16} className="text-secondary/60" />
                {cliente.veiculos} veículos vinculados
              </div>
            </div>

            <button className="w-full py-3 rounded-2xl bg-white/5 text-white/40 text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 group/btn">
              Ver Detalhes
              <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}

        {/* New Button Card */}
        <button className="border-2 border-dashed border-white/5 rounded-[32px] p-6 flex flex-col items-center justify-center gap-4 text-white/20 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all group">
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={32} />
          </div>
          <span className="font-black uppercase tracking-widest text-xs">Adicionar Novo</span>
        </button>
      </div>
    </div>
  );
}
