import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircle2, 
  Car, 
  MessageSquare, 
  ShieldCheck, 
  Phone, 
  ShoppingBag,
  Plus,
  ArrowRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// Mock data for the demonstration
const mockOrder = {
  cliente: 'Carlos Alberto',
  veiculo: {
    modelo: 'Toyota Corolla',
    placa: 'ABC-1234',
    ano: 2021
  },
  itens: [
    { id: '1', nome: 'Carga de Gás R134a', preco: 180, desc: 'Recarga completa com vácuo e teste de vazamento.', recomended: true, foto: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=300' },
    { id: '2', nome: 'Troca de Filtro de Cabine', preco: 85, desc: 'Filtro de carvão ativado contra odores e bactérias.', foto: 'https://images.unsplash.com/photo-1635773054018-209228805f42?auto=format&fit=crop&w=300' },
    { id: '3', nome: 'Higienização por Ozônio', preco: 120, desc: 'Eliminação total de fungos e odores persistentes.', foto: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300' },
  ],
  total: 385
};

export default function PublicCatalog() {
  const { slug } = useParams();
  const [cart, setCart] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

  const toggleItem = (id: string) => {
    setCart(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectedTotal = mockOrder.itens
    .filter(item => cart.includes(item.id))
    .reduce((acc, item) => acc + item.preco, 0);

  const handleConfirm = () => {
    const selectedItems = mockOrder.itens.filter(i => cart.includes(i.id));
    const message = `Olá TMC AR! Acabei de conferir o orçamento para o meu ${mockOrder.veiculo.modelo} (${mockOrder.veiculo.placa}).\n\n*Itens Escolhidos:*\n${selectedItems.map(i => `• ${i.nome} - R$ ${i.preco}`).join('\n')}\n\n*Total: R$ ${selectedTotal}*\n\nPodemos prosseguir com o serviço?`;
    
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/5511999999999?text=${encoded}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-32">
      {/* ── Header ────────────────────────────────────────── */}
      <header className="glass sticky top-0 z-40 p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
              <img src="/src/assets/logo.png" alt="TMC AR" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-xl tracking-tighter uppercase italic">TMC<span className="text-primary">AR</span></span>
          </div>
          <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Orçamento On-line</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black">Olá, {mockOrder.cliente}!</h1>
          <p className="text-white/40 text-sm font-bold flex items-center gap-2">
            <Car size={14} className="text-primary" />
            {mockOrder.veiculo.modelo} • <span className="mono-font">{mockOrder.veiculo.placa}</span>
          </p>
        </div>
      </header>

      {/* ── Trust Badge ───────────────────────────────────── */}
      <div className="px-6 py-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="text-primary" size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold">Oficina especializada</h3>
            <p className="text-white/40 text-[11px] font-medium leading-tight">Serviço garantido com técnicos certificados e gás ecológico premium.</p>
          </div>
        </div>
      </div>

      {/* ── Items List ────────────────────────────────────── */}
      <div className="px-6 space-y-6 mt-4">
        <h2 className="text-lg font-black uppercase tracking-wider text-white/30 px-2">Itens Recomendados</h2>
        
        {mockOrder.itens.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "glass rounded-3xl overflow-hidden border border-white/5 transition-all duration-300",
              cart.includes(item.id) && "border-primary/50 shadow-[0_0_20px_rgba(255,107,0,0.1)]"
            )}
          >
            <div className="relative h-48">
              <img src={item.foto} alt={item.nome} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
              {item.recomended && (
                <div className="absolute top-4 left-4 bg-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                  <Info size={12} />
                  Recomendado pelo Técnico
                </div>
              )}
              <div className="absolute bottom-4 left-6">
                <h3 className="text-xl font-black">{item.nome}</h3>
                <p className="text-white/60 text-xs font-bold mt-1">✓ Garantia de 6 meses</p>
              </div>
            </div>
            
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs leading-relaxed max-w-[200px] mb-3">{item.desc}</p>
                <span className="text-2xl font-black italic tracking-tight text-white/90">
                  R$ <span className="text-3xl">{item.preco}</span>
                </span>
              </div>
              
              <button 
                onClick={() => toggleItem(item.id)}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                  cart.includes(item.id) 
                    ? "bg-green-500 text-white animate-pulse-orange" 
                    : "bg-primary text-white glow-primary"
                )}
              >
                {cart.includes(item.id) ? <CheckCircle2 size={32} /> : <Plus size={32} />}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Floating Bar ──────────────────────────────────── */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-6 z-50 overflow-hidden"
          >
            <div className="max-w-md mx-auto rounded-3xl p-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 shadow-[0_0_40px_rgba(255,107,0,0.3)]">
              <div className="glass rounded-[22px] px-6 py-4 flex items-center justify-between backdrop-blur-2xl">
                <div className="flex flex-col">
                  <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{cart.length} itens selecionados</span>
                  <span className="text-2xl font-black italic">R$ {selectedTotal}</span>
                </div>
                
                <button 
                  onClick={() => setIsConfirming(true)}
                  className="bg-primary hover:bg-white hover:text-black text-white px-6 py-3 rounded-2xl font-black uppercase tracking-tighter flex items-center gap-3 transition-all active:scale-95 group"
                >
                  Confirmar
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirmation Modal ────────────────────────────── */}
      <AnimatePresence>
        {isConfirming && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass max-w-sm w-full rounded-[40px] p-8 border border-white/10 text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6 glow-primary border border-primary/20">
                <MessageSquare className="text-primary" size={40} />
              </div>
              <h2 className="text-2xl font-black mb-3 italic uppercase tracking-tighter">Quase lá!</h2>
              <p className="text-white/40 text-sm font-bold mb-8 leading-relaxed">
                Ao clicar no botão abaixo, enviaremos sua escolha para o técnico via WhatsApp para iniciar a execução.
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={handleConfirm}
                  className="w-full bg-primary py-5 rounded-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 glow-primary hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Phone size={24} />
                  Enviar p/ WhatsApp
                </button>
                <button 
                  onClick={() => setIsConfirming(false)}
                  className="w-full py-4 text-white/30 font-bold hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
