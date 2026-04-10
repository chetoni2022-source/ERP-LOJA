import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { Loader2, ShoppingBag, ShoppingCart, Search, X, Plus, Minus, Trash2, Package, ChevronDown, ChevronUp, SlidersHorizontal, Image as ImageIcon, Sparkles, Heart, Share2, Zap, ArrowRight, Check } from 'lucide-react';

interface CatalogItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  sale_price?: number | null;
  stock_quantity: number;
  image_url?: string | null;
  images?: string[] | null;
  category_id?: string | null;
  _categoryName?: string;
  variations?: { name: string, type: 'size'|'color'|'style', stock?: number | null, image_url?: string }[] | null;
}

interface CartItem { item: CatalogItem; qty: number; vIdx?: number | null; }

interface Theme {
  bg: string; accent: string; text: string;
  cardBg: string; border: string; muted: string;
  serif: string; sans: string;
}

const PRESETS: Record<string, Theme> = {
  luxury:   { bg:'#0a0a0a', accent:'#c9a96e', text:'#f5f0eb', cardBg:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.05)', muted:'rgba(255,255,255,0.3)', serif:"'Cormorant Garamond', serif", sans:"'Inter', sans-serif" },
  rose:     { bg:'#fff8f5', accent:'#cb8474', text:'#2a1a14', cardBg:'rgba(42,26,20,0.03)', border:'rgba(42,26,20,0.05)', muted:'rgba(42,26,20,0.3)', serif:"'Cormorant Garamond', serif", sans:"'Inter', sans-serif" },
  midnight: { bg:'#050a12', accent:'#7eb8f7', text:'#e8eef5', cardBg:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.05)', muted:'rgba(255,255,255,0.3)', serif:"'Cormorant Garamond', serif", sans:"'Inter', sans-serif" },
  pearl:    { bg:'#fafaf7', accent:'#8a7560', text:'#1a1a1a', cardBg:'rgba(26,26,26,0.03)', border:'rgba(26,26,26,0.05)', muted:'rgba(26,26,26,0.3)', serif:"'Cormorant Garamond', serif", sans:"'Inter', sans-serif" },
};

const SOCIAL_NAMES = ['Sofia', 'Amanda', 'Beatriz', 'Camila', 'Isabela', 'Larissa', 'Mariana', 'Natalia', 'Patricia', 'Thais'];
const SOCIAL_ACTIONS = ['vendo a coleção agora', 'visualizou uma peça', 'acabou de entrar', 'se interessou por um item', 'adorando os detalhes'];

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

function resolveTheme(catalog: any): Theme {
  if (catalog?.theme === 'custom' && catalog?.custom_colors) {
    const { bg, accent, text } = catalog.custom_colors;
    return { bg, accent, text, cardBg:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.05)', muted:'rgba(255,255,255,0.2)', serif:"'Cormorant Garamond', serif", sans:"'Inter', sans-serif" };
  }
  return PRESETS[catalog?.theme||'luxury']||PRESETS.luxury;
}

function fmt(v:number){ return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v); }

export default function CatalogPublicView() {
  const { id } = useParams<{ id: string }>();
  const [catalog, setCatalog] = useState<any>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string,string>>({});
  const [brand, setBrand] = useState<any>({name:'Aura Store', logo:null, logoW:200, logoH:80, logoFit:'contain', logoPos:'center', whatsapp:null});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [social, setSocial] = useState<{name:string;action:string}|null>(null);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<CatalogItem|null>(null);
  const [selectedVarIdx, setSelectedVarIdx] = useState<number|null>(null);

  useEffect(()=>{ if(id) fetchCatalog(); },[id]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const name = SOCIAL_NAMES[Math.floor(Math.random() * SOCIAL_NAMES.length)];
      const action = SOCIAL_ACTIONS[Math.floor(Math.random() * SOCIAL_ACTIONS.length)];
      setSocial({ name, action });
      setTimeout(() => setSocial(null), 5000);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  async function fetchCatalog(){
    try{
      const isUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase.from('catalogs').select('*');
      if (isUuid) query = query.or(`id.eq.${id},slug.eq.${id}`);
      else query = query.eq('slug', id);
      const { data: cat, error: ce } = await query.single();
      if(ce||!cat) throw new Error('Vitrine não localizada.');
      setCatalog(cat);

      const [itemsRes, settingsRes] = await Promise.all([
        fetchItems(cat.id),
        supabase.from('store_settings').select('*').eq('user_id', cat.user_id).limit(1).maybeSingle()
      ]);

      const sd = settingsRes.data;
      setBrand({
        name: sd?.store_name || 'Aura Store',
        logo: sd?.logo_url || null,
        logoW: sd?.logo_width || 200,
        logoH: sd?.logo_height || 80,
        logoFit: sd?.logo_fit || 'contain',
        logoPos: sd?.logo_position || 'center',
        whatsapp: sd?.whatsapp_number || null
      });
      document.title = `${cat.name} — ${sd?.store_name || 'Aura'}`;
    }catch(e:any){ setError(e.message); }
    finally{ setLoading(false); }
  }

  async function fetchItems(catalogId: string) {
    const {data:rel}=await supabase.from('catalog_items').select('product_id').eq('catalog_id', catalogId);
    let pids=rel?.map((r:any)=>r.product_id)||[];
    const {data:cl}=await supabase.from('catalog_categories').select('category_id').eq('catalog_id', catalogId);
    if(cl && cl.length > 0){
      const {data:cp}=await supabase.from('products').select('id').in('category_id', cl.map((l:any)=>l.category_id));
      if(cp) pids = [...new Set([...pids, ...cp.map((p:any)=>p.id)])];
    }
    let all:CatalogItem[]=[];
    if(pids.length > 0){
      const {data:pd}=await supabase.from('products').select('*').in('id', pids);
      all = pd || [];
    }
    const cids = [...new Set(all.map(p=>p.category_id).filter(Boolean))];
    if(cids.length > 0){
      const {data:cd}=await supabase.from('categories').select('id,name').in('id', cids);
      const m:Record<string,string>={};
      (cd||[]).forEach((c:any)=>{ m[c.id]=c.name; });
      setCategoryMap(m);
      all = all.map(p => ({...p, _categoryName: p.category_id ? m[p.category_id] : undefined}));
    }
    setItems(all);
  }

  const theme = resolveTheme(catalog);
  const catalogCats = useMemo(() => {
    const seen = new Set<string>();
    const out: {id:string; name:string}[] = [];
    items.forEach(i => {
      if(i.category_id && categoryMap[i.category_id] && !seen.has(i.category_id)){
        seen.add(i.category_id);
        out.push({id:i.category_id, name:categoryMap[i.category_id]});
      }
    });
    return out;
  }, [items, categoryMap]);

  const filtered = useMemo(() => items.filter(i => {
    const ms = !search || i.name.toLowerCase().includes(search.toLowerCase());
    const mc = activeCat === 'all' || i.category_id === activeCat;
    const hide = catalog?.settings?.hide_out_of_stock;
    return ms && mc && (!hide || i.stock_quantity > 0);
  }), [items, search, activeCat, catalog]);

  const cartCount = cart.reduce((s,c)=>s+c.qty,0);
  const cartTotal = cart.reduce((s,c)=>s+(c.item.sale_price||c.item.price)*c.qty,0);

  function addToCart(item:CatalogItem, qty=1, vIdx: number | null = null){
    setCart(prev => {
      const ex = prev.find(c => c.item.id === item.id && c.vIdx === vIdx);
      if(ex) return prev.map(c => (c.item.id === item.id && c.vIdx === vIdx) ? {...c, qty: c.qty + qty} : c);
      return [...prev, {item, qty, vIdx}];
    });
  }

  function sendCart(){
    if(!cart.length) return;
    const lines = cart.map(c => `- ${c.item.name}${c.vIdx!==null?` (${c.item.variations?.[c.vIdx].name})`:''} | ${c.qty}x | ${fmt(c.item.sale_price||c.item.price)}`);
    const msg = [`Olá! Quero estas peças da vitrine *${catalog?.name}*:`, '', ...lines, '', `*Total: ${fmt(cartTotal)}*`, '', 'Como posso finalizar o pedido?'].join('\n');
    window.open(`https://wa.me/${brand.whatsapp || '5511945421583'}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  if(error) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8 text-center">
       <div className="space-y-4">
          <ShoppingBag size={64} className="mx-auto text-primary/20" />
          <h1 className="text-2xl font-black text-white italic tracking-tighter">Vitrini Aura <span className="text-primary">Indisponível</span></h1>
          <p className="text-white/40 text-sm max-w-xs mx-auto">Esta coleção pública expirou ou o link está incorreto. Entre em contato com a loja.</p>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden text-white" style={{ backgroundColor: theme.bg, fontFamily: "'Inter', sans-serif" }}>
      {/* 🔮 Aura Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* 🚀 Sticky Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5" style={{ backgroundColor: `${theme.bg}bf` }}>
         <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">
            <div className="flex-1">
               {brand.logo ? (
                 <img src={getProxyUrl(brand.logo)} style={{ maxHeight: '40px', width: 'auto', objectFit: 'contain' }} alt={brand.name} />
               ) : (
                 <h1 className="text-xl font-black tracking-tighter italic uppercase">{brand.name}</h1>
               )}
            </div>
            
            <div className="hidden md:flex flex-1 max-w-md relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
               <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar peças..." className="w-full h-11 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-xs font-bold focus:border-primary/40 outline-none transition-all" />
            </div>

            <div className="flex-1 flex justify-end items-center gap-4">
               <button onClick={()=>setCartOpen(true)} className="relative h-12 w-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl hover:text-primary transition-all">
                  <ShoppingCart size={20} />
                  {cartCount > 0 && <span className="absolute -top-2 -right-2 h-6 w-6 bg-primary text-white text-[10px] font-black rounded-lg flex items-center justify-center animate-bounce">{cartCount}</span>}
               </button>
            </div>
         </div>
      </header>

      {loading ? (
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
           <Loader2 className="animate-spin text-primary" size={32} />
           <p className="text-[10px] font-black uppercase tracking-widest text-primary">Sincronizando Vitrine...</p>
        </div>
      ) : (
        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 pb-32">
           {/* Vitrine Info */}
           <div className="mb-12 text-center space-y-4">
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic uppercase">{catalog?.name}</h1>
              <p className="text-white/40 text-sm md:text-lg max-w-2xl mx-auto font-medium">{catalog?.description || 'Uma curadoria exclusiva para você.'}</p>
           </div>

           {/* Categories Filter */}
           {catalogCats.length > 0 && (
              <div className="flex overflow-x-auto gap-2 pb-8 no-scrollbar justify-center">
                 <button onClick={()=>setActiveCat('all')} className={cn("px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", activeCat === 'all' ? "bg-primary text-white shadow-lg" : "bg-white/5 text-white/40 hover:text-white")}>Tudo</button>
                 {catalogCats.map(c => (
                    <button key={c.id} onClick={()=>setActiveCat(c.id)} className={cn("px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all", activeCat === c.id ? "bg-primary text-white shadow-lg" : "bg-white/5 text-white/40 hover:text-white")}>{c.name}</button>
                 ))}
              </div>
           )}

           {/* Mobile Search */}
           <div className="md:hidden relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar na vitrine..." className="w-full h-14 bg-white/5 border border-white/10 rounded-3xl pl-12 font-bold text-sm" />
           </div>

           {/* Grid */}
           {filtered.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center gap-4 text-center grayscale opacity-20">
                 <Package size={80} />
                 <p className="font-black uppercase tracking-widest">Nenhuma peça localizada</p>
              </div>
           ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
                 {filtered.map((item, i) => (
                    <div key={item.id} onClick={() => setDetailItem(item)} className="group cursor-pointer space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${i * 100}ms` }}>
                       <div className="relative aspect-[4/5] bg-white/5 rounded-[32px] overflow-hidden border border-white/5 group-hover:border-primary/30 transition-all duration-500">
                          {item.image_url ? (
                            <img src={getProxyUrl(item.images?.[0] || item.image_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center"><ShoppingBag size={48} className="text-white/5" /></div>
                          )}
                          <div className="absolute top-4 right-4 h-10 w-10 bg-black/40 backdrop-blur-md rounded-2xl flex items-center justify-center text-white/40 group-hover:text-primary transition-all">
                             <Heart size={18} />
                          </div>
                          {item.stock_quantity <= 0 && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"><span className="text-[10px] font-black uppercase font-black bg-white/10 rounded-lg px-4 py-2 border border-white/10">Esgotado</span></div>}
                       </div>
                       <div className="px-2">
                          <h3 className="text-sm font-black uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-all">{item.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-lg font-black text-white">{fmt(item.sale_price || item.price)}</span>
                             {item.sale_price && <span className="text-[11px] text-white/20 line-through font-bold">{fmt(item.price)}</span>}
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </main>
      )}

      {/* 📦 Floating WhatsApp Button */}
      {cartCount > 0 && (
         <button onClick={()=>setCartOpen(true)} className="fixed bottom-8 right-8 z-[60] bg-emerald-500 text-white h-16 px-8 rounded-3xl flex items-center gap-4 font-black uppercase text-[12px] tracking-widest shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all">
            <div className="relative">
               <ShoppingCart size={22} />
               <span className="absolute -top-3 -right-3 h-6 w-6 bg-white text-emerald-500 rounded-full flex items-center justify-center font-black animate-pulse">{cartCount}</span>
            </div>
            Finalizar no WhatsApp
         </button>
      )}

      {/* 🎭 Product Detail Drawer */}
      {detailItem && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={()=>setDetailItem(null)} />
           <div className="relative w-full max-w-lg bg-[#0c0c0c] border-t sm:border border-white/10 rounded-t-[40px] sm:rounded-[48px] overflow-hidden animate-in slide-in-from-bottom-6 duration-400">
              <div className="aspect-square bg-white/5 relative">
                 <img src={getProxyUrl(detailItem.images?.[0] || detailItem.image_url)} className="w-full h-full object-cover" />
                 <button onClick={()=>setDetailItem(null)} className="absolute top-6 right-6 h-12 w-12 bg-black/40 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all"><X size={20} /></button>
                 <div className="absolute top-6 left-6 flex items-center gap-2">
                    <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5"><Sparkles size={10} strokeWidth={3} /> Best Seller</span>
                 </div>
              </div>
              <div className="p-10 space-y-8">
                 <div>
                    <h3 className="text-3xl font-black italic tracking-tighter uppercase">{detailItem.name}</h3>
                    <div className="flex items-center gap-4 mt-2">
                       <span className="text-2xl font-black text-primary">{fmt(detailItem.sale_price || detailItem.price)}</span>
                       {detailItem.sale_price && <span className="text-base text-white/20 line-through font-bold">{fmt(detailItem.price)}</span>}
                    </div>
                 </div>

                 {detailItem.description && <p className="text-white/40 text-sm leading-relaxed font-medium italic">"{detailItem.description}"</p>}

                 {detailItem.variations && detailItem.variations.length > 0 && (
                    <div className="space-y-4">
                       <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Selecione a Opção</p>
                       <div className="flex flex-wrap gap-2">
                          {detailItem.variations.map((v, i) => (
                             <button key={i} onClick={()=>setSelectedVarIdx(i)} className={cn("px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all", selectedVarIdx === i ? "bg-primary text-white border-primary shadow-lg" : "bg-white/5 text-white/40 border-white/5")}>{v.name}</button>
                          ))}
                       </div>
                    </div>
                 )}

                 <div className="flex gap-4">
                    <button onClick={()=>{
                       if(detailItem.stock_quantity <= 0) return;
                       addToCart(detailItem, 1, selectedVarIdx);
                       setDetailItem(null);
                    }} className="ux-button h-16 flex-1 bg-white text-black font-black uppercase text-[12px] tracking-[0.2em] shadow-xl active:scale-95 transition-all">Colocar no Carrinho</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 🧾 Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={()=>setCartOpen(false)} />
           <div className="relative w-full max-w-md bg-[#0c0c0c] border-t sm:border border-white/10 rounded-t-[40px] sm:rounded-[40px] overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                 <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2"><ShoppingCart className="text-primary" /> Meu Carrinho</h3>
                 <button onClick={()=>setCartOpen(false)} className="text-white/20 hover:text-white transition-all"><X size={20} /></button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto p-8 space-y-4 no-scrollbar">
                 {cart.length === 0 ? (
                    <div className="py-20 text-center opacity-20"><Package className="mx-auto mb-4" size={48} /><p className="text-[11px] font-black uppercase tracking-widest">O carrinho está limpo</p></div>
                 ) : (
                    cart.map((c, i) => (
                       <div key={i} className="flex items-center justify-between gap-4 p-4 bg-white/5 rounded-3xl border border-white/5">
                          <div className="flex items-center gap-4">
                             <div className="h-16 w-16 bg-black rounded-2xl overflow-hidden shrink-0"><img src={getProxyUrl(c.item.images?.[0] || c.item.image_url)} className="w-full h-full object-cover" /></div>
                             <div>
                                <p className="text-[11px] font-black text-white uppercase truncate max-w-[120px]">{c.item.name}</p>
                                <p className="text-[10px] font-bold text-primary">{fmt(c.item.sale_price || c.item.price)}</p>
                                {c.vIdx !== null && <p className="text-[9px] font-black text-white/20 uppercase mt-0.5">{c.item.variations?.[c.vIdx].name}</p>}
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="flex items-center bg-black/40 px-2 py-1 rounded-xl">
                                <button onClick={()=>{ if(c.qty > 1) setCart(cart.map((it, idx) => idx === i ? {...it, qty: it.qty - 1} : it))}} className="p-1 text-white/20"><Minus size={14} /></button>
                                <span className="w-6 text-center text-[11px] font-black">{c.qty}</span>
                                <button onClick={()=>{ if(c.qty < c.item.stock_quantity) setCart(cart.map((it, idx) => idx === i ? {...it, qty: it.qty + 1} : it))}} className="p-1 text-white/20"><Plus size={14} /></button>
                             </div>
                             <button onClick={()=>setCart(cart.filter((_, idx)=>idx!==i))} className="text-red-500/40 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                       </div>
                    ))
                 )}
              </div>
              <div className="p-8 border-t border-white/5 space-y-6">
                 <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Total Sincronizado</span>
                    <span className="text-3xl font-black text-white italic tracking-tighter">{fmt(cartTotal)}</span>
                 </div>
                 <button onClick={sendCart} className="ux-button h-16 w-full bg-emerald-500 text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl shadow-emerald-500/40 flex items-center justify-center gap-3 active:scale-95 transition-all">
                    Finalizar no WhatsApp <ArrowRight size={18} />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 📣 Social Proof */}
      <div className={cn("fixed bottom-8 left-8 z-50 transform transition-all duration-700 pointer-events-none", social ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0")}>
         <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-2xl">
            <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary font-black uppercase">{social?.name[0]}</div>
            <div>
               <p className="text-[10px] font-black text-primary uppercase tracking-tight">{social?.name}</p>
               <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{social?.action}</p>
            </div>
         </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
