import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Car, 
  Camera, 
  Thermometer, 
  Gauge, 
  Wind, 
  Plus, 
  Trash2, 
  Share2,
  ChevronRight,
  ChevronLeft,
  FileText,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const steps = [
  { id: 1, label: 'Entrada & Checklist', icon: Camera },
  { id: 2, label: 'Diagnóstico Técnico', icon: Gauge },
  { id: 3, label: 'Orçamento', icon: FileText },
  { id: 4, label: 'Finalização', icon: Share2 },
];

export default function OSFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    cliente: '',
    veiculo: '',
    placa: '',
    fotos: [] as string[],
    pressaoAlta: '',
    pressaoBaixa: '',
    tempSaida: '',
    estadoCompressor: '',
    estadoFiltro: '',
    gas: 'R134a',
    qtdGas: '',
    itens: [] as any[],
  });

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Stepper */}
      <div className="flex items-center justify-between glass p-6 rounded-3xl border border-white/5">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => step.id < currentStep && setCurrentStep(step.id)}>
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                currentStep >= step.id ? "bg-primary text-white glow-primary" : "bg-white/5 text-white/20 border border-white/5"
              )}>
                <step.icon size={20} />
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest text-center max-w-[80px]",
                currentStep >= step.id ? "text-white" : "text-white/20"
              )}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-[2px] mb-6 mx-4 rounded-full transition-all duration-1000",
                currentStep > step.id ? "bg-primary/50" : "bg-white/5"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="glass rounded-[40px] p-8 md:p-12 border border-white/5 min-h-[500px] flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            {currentStep === 1 && <StepChecklist formData={formData} setFormData={setFormData} />}
            {currentStep === 2 && <StepDiagnosis formData={formData} setFormData={setFormData} />}
            {currentStep === 3 && <StepBudget formData={formData} setFormData={setFormData} />}
            {currentStep === 4 && <StepFinish formData={formData} />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-10 mt-10 border-t border-white/5">
          <button 
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-3 rounded-2xl text-white/40 hover:text-white disabled:opacity-0 transition-all flex items-center gap-2 font-bold uppercase tracking-widest text-xs"
          >
            <ChevronLeft size={18} />
            Voltar
          </button>
          
          <button 
            onClick={nextStep}
            className="btn-orange flex items-center gap-2"
          >
            {currentStep === 4 ? 'Gerar OS & Link' : 'Continuar'}
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StepChecklist({ formData, setFormData }: any) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black italic uppercase tracking-tighter">Checklist de <span className="text-primary italic">Entrada</span></h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Cliente / Veículo</label>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={20} />
            <input type="text" placeholder="Buscar cliente ou placa..." className="input-glass w-full pl-12 h-14" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">KM Atual</label>
          <input type="number" placeholder="Ex: 45000" className="input-glass h-14" />
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Fotos do Veículo (Máx 6)</label>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl border-2 border-dashed border-white/5 hover:border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-center text-white/20 cursor-pointer group">
              <Camera size={24} className="group-hover:text-primary transition-all group-hover:scale-110" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepDiagnosis({ formData, setFormData }: any) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black italic uppercase tracking-tighter">Diagnóstico <span className="text-secondary italic">Técnico</span></h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">P. Lado Alto (BAR)</label>
          <div className="relative">
            <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input type="number" step="0.1" className="input-glass w-full pl-12 h-14" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">P. Lado Baixo (BAR)</label>
          <div className="relative">
            <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input type="number" step="0.1" className="input-glass w-full pl-12 h-14" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Temp. Saída (°C)</label>
          <div className="relative">
            <Thermometer className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input type="number" step="0.1" className="input-glass w-full pl-12 h-14" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Gás Utilizado</label>
          <select className="input-glass h-14 w-full">
            <option className='bg-[#111]'>R134a</option>
            <option className='bg-[#111]'>R1234yf</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Qtd. Gás Adicionada (G)</label>
          <input type="number" className="input-glass h-14" placeholder="Ex: 500" />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Observações Técnicas</label>
        <textarea className="input-glass min-h-[120px]" placeholder="Relate o estado do compressor, filtro de cabine, vazamentos..."></textarea>
      </div>
    </div>
  );
}

function StepBudget({ formData, setFormData }: any) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Montagem do <span className="text-primary italic">Orçamento</span></h2>
        <button className="bg-white/5 hover:bg-primary/20 text-white/60 hover:text-primary p-3 rounded-2xl transition-all border border-white/5">
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {[1, 2].map((_, i) => (
          <div key={i} className="glass-bright p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row items-center gap-6 group">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
              <Wind size={32} />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-black text-lg">Carga de Gás Premium</h3>
              <p className="text-xs text-white/40 font-medium italic uppercase tracking-widest">Serviço Técnico</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Preço Unit.</p>
                <p className="font-black text-xl italic">R$ 180,00</p>
              </div>
              <button className="p-3 text-white/20 hover:text-red-500 transition-colors">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="glass p-8 rounded-3xl border border-primary/20 bg-primary/5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Subtotal Acumulado</p>
          <h3 className="text-3xl font-black tabular-nums">R$ 360,00</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Descounto (%)</p>
            <input type="number" className="bg-transparent text-right font-black text-2xl outline-none w-20" defaultValue="0" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepFinish({ formData }: any) {
  return (
    <div className="space-y-10 text-center py-10">
      <div className="w-24 h-24 rounded-[40px] bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto glow-secondary shadow-[0_0_40px_rgba(34,197,94,0.2)]">
        <CheckCircle2 className="text-green-500" size={56} />
      </div>
      
      <div>
        <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4">Tudo <span className="text-green-500">Pronto!</span></h2>
        <p className="text-white/40 font-bold max-w-sm mx-auto leading-relaxed">
          A OS foi gerada com sucesso. Agora você pode compartilhar o link de orçamento diretamente com o cliente.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <div className="glass p-6 rounded-3xl border border-white/10 flex items-center justify-between">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Status Atual</p>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest">Aguardando Aprovação</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Total do Orçamento</p>
            <h4 className="text-2xl font-black italic tracking-tighter tabular-nums">R$ 360,00</h4>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="btn-orange w-full !py-4 flex items-center justify-center gap-3">
            <MessageSquare size={20} />
            Enviar WhatsApp
          </button>
          <button className="glass-bright w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/10 transition-all border border-white/5">
            <Share2 size={20} />
            Copiar Link
          </button>
        </div>
      </div>

      <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">
        Link expira em 48 horas automaticamente
      </p>
    </div>
  );
}
