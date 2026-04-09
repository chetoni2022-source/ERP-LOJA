import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { Loader2, ShoppingBag, ShoppingCart, Search, X, Plus, Minus, Trash2, Package, ChevronDown, ChevronUp, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';

const WA_NUMBER = '5511945421583';

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
  luxury:   { bg:'#0c0b09', accent:'#c9a96e', text:'#f0ebe3', cardBg:'#161410', border:'#2e2820', muted:'#8a7e6e', serif:"'Cormorant Garamond',Georgia,serif", sans:"'Montserrat',sans-serif" },
  rose:     { bg:'#fdf8f5', accent:'#c4826e', text:'#2c1a12', cardBg:'#ffffff',  border:'#edddd6', muted:'#9a7060', serif:"'Cormorant Garamond',Georgia,serif", sans:"'Montserrat',sans-serif" },
  midnight: { bg:'#06080f', accent:'#8ab4e8', text:'#d8e6f5', cardBg:'#0c1220',  border:'#1c2840', muted:'#5878a0', serif:"'Cormorant Garamond',Georgia,serif", sans:"'Montserrat',sans-serif" },
  pearl:    { bg:'#f8f6f2', accent:'#9a8060', text:'#1c1a16', cardBg:'#ffffff',  border:'#e4ddd4', muted:'#8a7865', serif:"'Cormorant Garamond',Georgia,serif", sans:"'Montserrat',sans-serif" },
};

const SOCIALS = { names: ['Sofia C.','Amanda R.','Beatriz L.','Camila S.','Isabela M.','Larissa F.','Mariana T.','Natalia A.','Patricia V.','Thais S.'], actions: ['esta vendo o catalogo agora','visualizou uma peca','acabou de entrar','se interessou por uma peca','esta adorando a colecao'] };

function resolveTheme(catalog: any): Theme {
  if (catalog?.theme === 'custom' && catalog?.custom_colors) {
    const { bg, accent, text } = catalog.custom_colors;
    const h=bg.replace('#',''); const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
    const lum=(0.2126*r+0.7152*g+0.0722*b)/255; const isDark=lum<0.45;
    const lighten=(c:string,a:number)=>'#'+c.replace('#','').match(/.{2}/g)!.map(x=>Math.min(parseInt(x,16)+a,255).toString(16).padStart(2,'0')).join('');
    return { bg, accent, text, cardBg:isDark?lighten(bg,18):'#ffffff', border:isDark?`${accent}28`:`${accent}22`, muted:isDark?`${text}60`:`${text}65`, serif:"'Cormorant Garamond',Georgia,serif", sans:"'Montserrat',sans-serif" };
  }
  return PRESETS[catalog?.theme||'luxury']||PRESETS.luxury;
}

function fmt(v:number){ return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v); }

/** Render description: **bold** and ++big++ */
function renderDesc(text: string, accentColor: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\+\+[^+]+\+\+)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} style={{ color: accentColor, fontWeight: 700 }}>{p.slice(2,-2)}</strong>;
    if (p.startsWith('++') && p.endsWith('++')) return <span key={i} style={{ fontSize: '1.15em', fontWeight: 500 }}>{p.slice(2,-2)}</span>;
    return <span key={i}>{p}</span>;
  });
}

const clamp = (min: number, max: number) => `clamp(${min}px, 5vw, ${max}px)`;

const Skeleton = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`animate-pulse bg-muted/20 rounded-lg ${className}`} style={style} />
);

const CatalogSkeleton = () => (
  <div className="catalog-container py-8">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function CatalogPublicView() {
  const { id } = useParams<{ id: string }>();
  const [catalog, setCatalog] = useState<any>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string,string>>({});
  const [brand, setBrand] = useState<{name:string;logo:string|null;favicon:string|null;logoW:number;logoH:number;logoFit:string;logoPos:string;whatsapp:string|null}>({name:'Laris Acessórios',logo:null,favicon:null,logoW:200,logoH:80,logoFit:'contain',logoPos:'center',whatsapp:null});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewers, setViewers] = useState(Math.floor(Math.random()*5)+3);
  const [social, setSocial] = useState<{name:string;action:string}|null>(null);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<CatalogItem|null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [selectedVarIdx, setSelectedVarIdx] = useState<number|null>(null);
  const [varImage, setVarImage] = useState<string|null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const socialTimer = useRef<ReturnType<typeof setTimeout>|undefined>(undefined);

  useEffect(()=>{ if(id) fetchCatalog(); },[id]);
  useEffect(() => { 
    if(!detailItem) {
      setVarImage(null);
      setSelectedVarIdx(null);
    } 
  }, [detailItem]);
  useEffect(()=>{
    const sp=setInterval(()=>{ const n=SOCIALS.names[Math.floor(Math.random()*10)];const a=SOCIALS.actions[Math.floor(Math.random()*5)];setSocial({name:n,action:a});clearTimeout(socialTimer.current);socialTimer.current=setTimeout(()=>setSocial(null),5000); },12000+Math.random()*8000);
    const vp=setInterval(()=>setViewers(v=>Math.max(1,v+(Math.random()>0.5?1:-1))),18000);
    setTimeout(()=>{setSocial({name:'Beatriz L.',action:'acabou de entrar'});socialTimer.current=setTimeout(()=>setSocial(null),5000);},4000);
    return()=>{clearInterval(sp);clearInterval(vp);clearTimeout(socialTimer.current);};
  },[]);

  async function fetchCatalog(){
    try{
      // First, find the catalog by ID or Slug
      // UUID check prevents "invalid input syntax" error on Postgres
      const isUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      let query = supabase.from('catalogs').select('*');
      if (isUuid) {
        query = query.or(`id.eq.${id},slug.eq.${id}`);
      } else {
        query = query.eq('slug', id);
      }
      
      const { data: cat, error: ce } = await query.single();

      if(ce||!cat) throw new Error('Catálogo não encontrado.');
      setCatalog(cat);

      // Parallel fetch items and brand settings
      const [itemsRes, settingsRes] = await Promise.all([
        fetchItems(cat.id),
        supabase.from('store_settings').select('store_name,logo_url,favicon_url,logo_width,logo_height,logo_fit,logo_position,whatsapp_number').eq('user_id', cat.user_id).limit(1).maybeSingle()
      ]);

      const sd = settingsRes.data;
      const b={name:sd?.store_name||'Laris Acessórios',logo:sd?.logo_url||null,favicon:sd?.favicon_url||null,logoW:sd?.logo_width||200,logoH:sd?.logo_height||80,logoFit:sd?.logo_fit||'contain',logoPos:sd?.logo_position||'center',whatsapp:sd?.whatsapp_number||null};
      setBrand(b);
      
      if(b.favicon){
        const proxyFav=getProxyUrl(b.favicon);
        let l=document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if(!l){l=document.createElement('link');l.rel='icon';document.head.appendChild(l);}
        l.href=proxyFav || b.favicon;
      }
      document.title=`${cat.name} — ${b.name}`;
    }catch(e:any){
      console.error(e);
      setError(e.message);
    }finally{
      setLoading(false);
    }
  }

  async function fetchItems(catalogId: string) {
    const {data:rel}=await supabase.from('catalog_items').select('product_id').eq('catalog_id', catalogId);
    let pids=rel?.map((r:any)=>r.product_id)||[];
    const {data:cl}=await supabase.from('catalog_categories').select('category_id').eq('catalog_id', catalogId);
    if(cl&&cl.length>0){const {data:cp}=await supabase.from('products').select('id').in('category_id',cl.map((l:any)=>l.category_id));if(cp)pids=[...new Set([...pids,...cp.map((p:any)=>p.id)])]; }

    let all:CatalogItem[]=[];
    if(pids.length>0){const {data:pd}=await supabase.from('products').select('*').in('id',pids);all=pd||[];}

    const cids=[...new Set(all.map(p=>p.category_id).filter(Boolean))];
    if(cids.length>0){const {data:cd}=await supabase.from('categories').select('id,name').in('id',cids);const m:Record<string,string>={};(cd||[]).forEach((c:any)=>{m[c.id]=c.name;});setCategoryMap(m);all=all.map(p=>({...p,_categoryName:p.category_id?m[p.category_id]:undefined}));}
    setItems(all);
  }

  const theme=resolveTheme(catalog);
  const isLight=useMemo(()=>{if(!catalog)return false;const h=theme.bg.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return(0.2126*r+0.7152*g+0.0722*b)/255>0.55;},[catalog,theme]);
  const onAccent=isLight?'#fff':theme.bg;

  const catalogCats=useMemo(()=>{const seen=new Set<string>();const out:{id:string;name:string}[]=[];items.forEach(i=>{if(i.category_id&&categoryMap[i.category_id]&&!seen.has(i.category_id)){seen.add(i.category_id);out.push({id:i.category_id,name:categoryMap[i.category_id]});}});return out;},[items,categoryMap]);
  const filtered=useMemo(()=>items.filter(i=>{
    const ms=!search||i.name.toLowerCase().includes(search.toLowerCase());
    const mc=activeCat==='all'||i.category_id===activeCat;
    const hideOutOfStock = catalog?.settings?.hide_out_of_stock;
    const isAvailable = !hideOutOfStock || i.stock_quantity > 0;
    return ms && mc && isAvailable;
  }),[items,search,activeCat,catalog]);

  const cartCount=cart.reduce((s,c)=>s+c.qty,0);
  const cartTotal=cart.reduce((s,c)=>s+(c.item.sale_price||c.item.price)*c.qty,0);

  function addToCart(item:CatalogItem,qty=1, vIdx: number | null = null){
    const max = vIdx !== null ? (item.variations?.[vIdx]?.stock ?? 0) : item.stock_quantity;
    if (max <= 0) return;

    setCart(prev=>{
      const ex=prev.find(c=>c.item.id===item.id && c.vIdx === vIdx);
      if(ex) return prev.map(c=> (c.item.id===item.id && c.vIdx === vIdx) ? {...c,qty:Math.min(c.qty+qty, max)} : c);
      return [...prev,{item,qty:Math.min(qty, max), vIdx}];
    });
  }
  function changeQty(itemId:string, vIdx: number | null, delta:number){
    setCart(prev=>prev.map(c=>{
      if(c.item.id!==itemId || c.vIdx !== vIdx) return c;
      const max = c.vIdx !== null ? (c.item.variations?.[c.vIdx]?.stock ?? 0) : c.item.stock_quantity;
      return {...c,qty:Math.min(Math.max(1,c.qty+delta), max)};
    }));
  }
  function removeFromCart(itemId:string, vIdx: number | null){
    setCart(prev=>prev.filter(c=> !(c.item.id===itemId && c.vIdx === vIdx)));
  }

  function sendCart(){
    if(!cart.length)return;
    const lines=cart.map(c=>{
      const varName = c.vIdx !== null ? `(${c.item.variations?.[c.vIdx]?.name})` : '';
      return `- ${c.item.name} ${varName} - ${c.qty}x - ${fmt(c.item.sale_price||c.item.price)} cada (Total: ${fmt((c.item.sale_price||c.item.price)*c.qty)})`;
    });
    const msg=[`Olá! Gostaria de fazer um pedido do catálogo "${catalog?.name||brand.name}":`,'',...lines,'',`Total: ${fmt(cartTotal)}`,'','Poderia confirmar a disponibilidade?'].join('\n');
    const phone = brand.whatsapp || WA_NUMBER;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`,'_blank');
  }

  if(error) return(<div style={{background:'#0c0b09',color:'#f0ebe3',minHeight:'100svh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,textAlign:'center'}}><ShoppingBag style={{width:44,height:44,marginBottom:14,opacity:0.2,color:'#c9a96e'}}/><h1 style={{fontSize:20,fontFamily:'Georgia,serif'}}>Coleção Indisponível</h1><p style={{opacity:0.4,marginTop:8,fontSize:12}}>Este catálogo expirou ou o link está incorreto.</p></div>);

  return(
    <div style={{background:theme.bg,color:theme.text,minHeight:'100svh',fontFamily:theme.sans}}>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::selection{background:${theme.accent}40}
        input::placeholder,textarea::placeholder{color:${theme.muted}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:${theme.accent}30;border-radius:99px}
        
        .catalog-container {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 16px; /* Reduced for better mobile spacing */
        }
        
        @media (min-width: 640px) {
          .catalog-container {
            padding: 0 32px;
          }
        }

        .sticky-inner {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        @media (min-width: 768px) {
          .sticky-inner {
            flex-direction: row !important;
            align-items: center !important;
          }
          .search-container {
            flex: 1 !important;
          }
        }
        
        @media (min-width: 1024px) {
          .product-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 20px !important;
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .product-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 16px !important;
          }
        }

        .categories-wrapper {
          width: 100%;
          position: relative;
          overflow: hidden;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 8px 4px 20px;
          width: 100%;
        }

        .menu-trigger {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 12px;
          margin: 8px 0;
          background: var(--theme-card-bg);
          border: 1px solid var(--theme-border);
          border-radius: 14px;
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--theme-text);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          transition: all 0.3s ease;
        }
        .menu-trigger:active { transform: scale(0.98); }

        @media (min-width: 768px) {
          .menu-trigger { display: none !important; }
          .categories-wrapper {
            max-height: none !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            margin-bottom: 12px !important;
            overflow: visible !important;
          }
          .categories-grid {
            grid-template-columns: repeat(auto-fit, minmax(130px, auto));
            justify-content: center;
            gap: 16px;
            padding: 16px 4px;
          }
        }
      `}</style>

      {/* ── STICKY HEADER ── */}
      <div style={{
        position:'sticky',
        top:0,
        zIndex:100,
        background:`${theme.cardBg}f8`,
        backdropFilter:'blur(24px)',
        WebkitBackdropFilter:'blur(24px)',
        borderBottom:`1px solid ${theme.border}`,
        boxShadow:'0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div className="catalog-container" style={{paddingTop:12, paddingBottom:12}}>
          {/* Logo */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',paddingBottom:12}}>
            {brand.logo
              ? <img 
                  src={getProxyUrl(brand.logo) || ''} 
                  alt={brand.name} 
                  style={{
                    height:'auto',
                    maxHeight: Math.min(brand.logoH, 60), // Smaller for sticky header
                    width:'auto',
                    maxWidth: brand.logoW,
                    objectFit: brand.logoFit as any,
                    objectPosition: brand.logoPos,
                    display: 'block'
                  }}
                />
              : <div style={{textAlign:'center'}}><p style={{fontFamily:theme.serif,fontSize:24,fontWeight:500,color:theme.text,letterSpacing:'-0.01em'}}>{brand.name}</p></div>
            }
          </div>

          <div className="sticky-inner">
            <div className="search-container" style={{position:'relative'}}>
              <Search style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',width:14,height:14,color:theme.muted,pointerEvents:'none'}}/>
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar na coleção..."
                style={{width:'100%',height:40,paddingLeft:36,paddingRight:search?32:16,fontSize:13,fontFamily:theme.sans,background:theme.bg,color:theme.text,border:`1px solid ${theme.border}`,borderRadius:10,outline:'none',transition:'border-color 0.2s'}}
              />
              {search&&<button onClick={()=>setSearch('')} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:theme.muted,padding:4}}><X style={{width:14,height:14}}/></button>}
            </div>
            
            {catalogCats.length>0&&(
              <>
                <button 
                  className="menu-trigger" 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  style={{'--theme-muted': theme.muted, '--theme-accent': theme.accent, '--font-sans': theme.sans, '--theme-card-bg': theme.cardBg, '--theme-border': theme.border, '--theme-text': theme.text} as any}
                >
                  <SlidersHorizontal style={{width:14,height:14,color:theme.accent}}/>
                  {isMenuOpen ? 'Fechar Categorias' : 'Categorias'}
                  {isMenuOpen ? <ChevronUp style={{width:14,height:14,opacity:0.5}}/> : <ChevronDown style={{width:14,height:14,opacity:0.5}}/>}
                </button>

                <div 
                  className="categories-wrapper" 
                  style={{
                    maxHeight: isMenuOpen ? '800px' : '0',
                    opacity: isMenuOpen ? 1 : 0,
                    marginBottom: isMenuOpen ? 12 : 0,
                    pointerEvents: isMenuOpen ? 'auto' : 'none'
                  }}
                >
                  <div className="categories-grid">
                    {[{id:'all',name:'Todas'},...catalogCats].map(c=>{
                      const active=activeCat===c.id;
                      return(
                        <button 
                          key={c.id} 
                          onClick={()=>{
                            setActiveCat(c.id);
                          }} 
                          style={{
                            padding:'14px 12px',
                            fontSize: 11,
                            fontFamily:theme.sans,
                            fontWeight:800,
                            letterSpacing:'0.1em',
                            textTransform:'uppercase',
                            borderRadius:14,
                            cursor:'pointer',
                            transition:'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            background:active?theme.accent:theme.bg,
                            color:active?onAccent:theme.text,
                            border:`1px solid ${active?theme.accent:theme.border}`,
                            boxShadow:active?`0 10px 20px ${theme.accent}40`:'0 2px 10px rgba(0,0,0,0.02)',
                            outline: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center'
                          }}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── GRID ── */}
      {loading ? <CatalogSkeleton /> : (
        <div className="catalog-container" style={{padding:'32px 0 120px'}}>
          <p style={{fontFamily:theme.sans,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:theme.muted,marginBottom:20,fontWeight:600}}>
            {filtered.length} {filtered.length===1?'item encontrado':'itens encontrados'} {search&&`para "${search}"`}
          </p>
          {filtered.length===0
            ? <div style={{textAlign:'center',padding:'80px 0',color:theme.muted,background:theme.cardBg,borderRadius:20,border:`1px dashed ${theme.border}`}}><ShoppingBag style={{width:40,height:40,margin:'0 auto 16px',opacity:0.2,color:theme.accent}}/><p style={{fontSize:14,fontFamily:theme.sans,fontWeight:500}}>Nenhuma peça encontrada nesta categoria.</p></div>
            : <div className="product-grid" style={{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:12}}>
                {filtered.map((item, i) => {
                  const isSoldOut = item.stock_quantity <= 0;
                  const displayImg = item.images?.[0] || item.image_url;
                  const price = item.sale_price || item.price;
                  const isOnSale = !!(item.sale_price && item.sale_price < item.price);
                  const inCart = cart.find(c => c.item.id === item.id);
                  const maxQty = item.stock_quantity;
                  
                  return (
                    <div key={item.id} className="animate-in fade-in zoom-in-95 fill-mode-both" style={{animationDelay:`${i*40}ms`,display:'flex',flexDirection:'column',opacity:isSoldOut?0.5:1,transition:'transform 0.3s ease',cursor:'pointer'}}
                      onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-4px)')} onMouseLeave={e=>(e.currentTarget.style.transform='translateY(0)')}>
                      {/* Image */}
                      <div style={{position:'relative',aspectRatio:'1/1',background:theme.cardBg,border:`1px solid ${theme.border}`,overflow:'hidden',marginBottom:12,borderRadius:12}}
                        onClick={()=>{if(!isSoldOut){setDetailItem(item);setDetailQty(inCart?inCart.qty:1);}}}>
                        {displayImg
                          ? <img src={getProxyUrl(displayImg) || ''} alt={item.name} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',}}
                              onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.1)')} onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}/>
                          : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',opacity:0.15}}><ShoppingBag style={{width:32,height:32,color:theme.text}}/></div>
                        }
                        {isSoldOut&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:`${theme.bg}b0`,backdropFilter:'blur(4px)'}}><span style={{fontSize:10,fontFamily:theme.sans,fontWeight:800,letterSpacing:'0.2em',textTransform:'uppercase',padding:'6px 14px',color:'#fff',background:theme.accent,borderRadius:6,boxShadow:'0 4px 12px rgba(0,0,0,0.3)'}}>Esgotado</span></div>}
                        {isOnSale&&!isSoldOut&&<div style={{position:'absolute',top:10,left:10,fontSize:8,fontFamily:theme.sans,fontWeight:800,letterSpacing:'0.15em',textTransform:'uppercase',padding:'4px 10px',background:theme.accent,color:onAccent,borderRadius:6,boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>Oferta</div>}
                        {item._categoryName&&<div style={{position:'absolute',bottom:10,right:10,fontSize:8,fontFamily:theme.sans,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',padding:'3px 10px',background:`${theme.bg}e0`,color:theme.accent,border:`1px solid ${theme.accent}30`,backdropFilter:'blur(10px)',borderRadius:6}}>{item._categoryName}</div>}
                      </div>
                      {/* Info */}
                      <div style={{flex:1,display:'flex',flexDirection:'column',padding:'0 4px'}}>
                        <p style={{fontFamily:theme.serif,fontSize:16,fontWeight:500,lineHeight:1.25,color:theme.text,marginBottom:6,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}
                          onClick={()=>{if(!isSoldOut){setDetailItem(item);setDetailQty(inCart?inCart.qty:1);}}}>{item.name}</p>
                        <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:12}}>
                          <span style={{fontFamily:theme.sans,fontSize:15,fontWeight:700,color:isOnSale?theme.accent:theme.text}}>{fmt(price)}</span>
                          {isOnSale&&<span style={{fontFamily:theme.sans,fontSize:11,color:theme.muted,textDecoration:'line-through',fontWeight:500}}>{fmt(item.price)}</span>}
                        </div>
                        {item.variations && item.variations.length > 0 && (
                          <div style={{display:'flex',gap:4,marginBottom:12,flexWrap:'wrap'}}>
                            <span style={{fontSize:8,fontFamily:theme.sans,fontWeight:800,color:theme.muted,background:`${theme.border}60`,padding:'3px 6px',borderRadius:4,textTransform:'uppercase',letterSpacing:'0.1em'}}>+{item.variations.length} Opções Disp.</span>
                          </div>
                        )}
                        {/* Cart button */}
                        {!isSoldOut&&(
                          inCart
                            ? <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:theme.accent,padding:'10px 14px',borderRadius:8,boxShadow:`0 4px 14px ${theme.accent}40`}}>
                                <button onClick={()=>changeQty(item.id, null, -1)} style={{background:'none',border:'none',cursor:'pointer',color:onAccent,display:'flex',padding:4}}><Minus style={{width:14,height:14,strokeWidth:3}}/></button>
                                <span style={{fontFamily:theme.sans,fontSize:11,fontWeight:800,color:onAccent,letterSpacing:'0.05em'}}>{inCart.qty} no carrinho</span>
                                <button onClick={()=>{if(inCart.qty < maxQty) changeQty(item.id, null, 1);}} style={{background:'none',border:'none',cursor:inCart.qty>=maxQty?'not-allowed':'pointer',color:onAccent,display:'flex',padding:4,opacity:inCart.qty>=maxQty?0.4:1}}><Plus style={{width:14,height:14,strokeWidth:3}}/></button>
                              </div>
                            : <button onClick={()=>{
                                if (item.variations && item.variations.length > 0) {
                                  setDetailItem(item);
                                  return;
                                }
                                addToCart(item,1);
                              }}
                                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px 0',fontSize:10,fontFamily:theme.sans,fontWeight:800,letterSpacing:'0.18em',textTransform:'uppercase',background:theme.accent,color:onAccent,border:'none',cursor:'pointer',borderRadius:8,transition:'all 0.3s',boxShadow:`0 4px 14px ${theme.accent}30`}}
                                onMouseEnter={e=>{e.currentTarget.style.opacity='0.9';e.currentTarget.style.transform='scale(1.02)'}} onMouseLeave={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='scale(1)'}}>
                                <ShoppingCart style={{width:14,height:14,strokeWidth:2.5}}/> Comprar
                              </button>
                        )}
                        {isSoldOut&&<div style={{padding:'12px 0',fontSize:10,fontFamily:theme.sans,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:theme.muted,textAlign:'center',border:`1px solid ${theme.border}`,borderRadius:8,background:`${theme.border}10`}}>Indisponível</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{borderTop:`1px solid ${theme.border}`,padding:'64px 0 48px',background:theme.cardBg,position:'relative',zIndex:10}}>
        <div className="catalog-container">
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:40,textAlign:'center',marginBottom:48}}>
            <div>
              <h4 style={{fontFamily:theme.serif,fontSize:18,color:theme.text,marginBottom:16}}>{brand.name}</h4>
              <p style={{fontFamily:theme.sans,fontSize:12,lineHeight:1.8,color:theme.muted}}>Excelência em acessórios e semijoias curadas para realçar sua essência. Design exclusivo e qualidade premium em cada detalhe.</p>
            </div>
            <div>
              <h4 style={{fontFamily:theme.sans,fontSize:10,fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:theme.accent,marginBottom:20}}>Atendimento</h4>
              <p style={{fontFamily:theme.sans,fontSize:13,color:theme.text,fontWeight:600,marginBottom:8}}>Dúvidas ou Pedidos?</p>
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" style={{display:'inline-block',padding:'10px 24px',background:'#25d366',color:'#fff',borderRadius:99,textDecoration:'none',fontSize:12,fontWeight:700,letterSpacing:'0.05em'}}>Chamar no WhatsApp</a>
            </div>
            <div>
              <h4 style={{fontFamily:theme.sans,fontSize:10,fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:theme.accent,marginBottom:20}}>Pagamento</h4>
              <div style={{display:'flex',justifyContent:'center',gap:12,opacity:0.6}}>
                {['PIX','CARTÃO','BOLETO'].map(t=>(
                  <span key={t} style={{fontSize:9,fontWeight:800,border:`1px solid ${theme.text}`,padding:'4px 8px',borderRadius:4}}>{t}</span>
                ))}
              </div>
            </div>
          </div>
          
          <div style={{height:1,background:theme.border,marginBottom:24}}/>
          
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
            {brand.logo&&<img src={getProxyUrl(brand.logo) || ''} alt={brand.name} style={{height:30,maxWidth:180,objectFit:'contain',opacity:0.6}}/>}
            <p style={{fontFamily:theme.sans,fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:theme.muted,fontWeight:500}}>&copy; {new Date().getFullYear()} {brand.name} • Todos os direitos reservados</p>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
               <span style={{fontFamily:theme.sans,fontSize:10,color:`${theme.text}40`}}>Desenvolvido por</span>
               <span style={{fontFamily:theme.sans,fontSize:10,fontWeight:800,color:theme.accent,letterSpacing:'0.1em'}}>LARIS ERP</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── FLOATING WHATSAPP CART BUTTON ── */}
      {cartCount>0&&!cartOpen&&(
        <button onClick={()=>setCartOpen(true)}
          style={{position:'fixed',bottom:24,right:20,zIndex:80,display:'flex',alignItems:'center',gap:10,padding:'14px 22px',background:'#25d366',color:'#fff',border:'none',cursor:'pointer',boxShadow:`0 8px 32px rgba(37, 211, 102, 0.5)`,fontFamily:theme.sans,fontWeight:800,fontSize:12,letterSpacing:'0.04em',borderRadius:12,transition:'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',animation:'pulse-green 2s infinite'}}
          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.05) translateY(-4px)')} onMouseLeave={e=>(e.currentTarget.style.transform='scale(1) translateY(0)')}>
          <div style={{position:'relative'}}>
            <ShoppingCart style={{width:18,height:18}}/>
            <span style={{position:'absolute',top:-8,right:-8,background:'#ff3b30',color:'#fff',fontSize:9,fontWeight:900,minWidth:16,height:16,borderRadius:99,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #25d366'}}>{cartCount}</span>
          </div>
          <span style={{borderLeft:'1px solid rgba(255,255,255,0.3)',paddingLeft:10}}>Finalizar no WhatsApp</span>
        </button>
      )}
      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(37, 211, 102, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
      `}</style>

      {/* ── CART DRAWER ── */}
      {cartOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:100,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(4px)'}} onClick={()=>setCartOpen(false)}/>
          <div className="animate-in slide-in-from-bottom-4 duration-300" style={{position:'relative',background:theme.cardBg,border:`1px solid ${theme.border}`,borderBottom:'none',maxHeight:'80svh',display:'flex',flexDirection:'column',width:'100%',maxWidth:640,margin:'0 auto',borderRadius:'14px 14px 0 0'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px',borderBottom:`1px solid ${theme.border}`}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <ShoppingCart style={{width:16,height:16,color:theme.accent}}/>
                <span style={{fontFamily:theme.serif,fontSize:17,fontWeight:500,color:theme.text}}>Meu Carrinho</span>
                <span style={{fontFamily:theme.sans,fontSize:9,fontWeight:700,padding:'2px 7px',background:`${theme.accent}20`,color:theme.accent,borderRadius:99}}>{cartCount}</span>
              </div>
              <button onClick={()=>setCartOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:theme.muted,display:'flex',padding:4}}><X style={{width:16,height:16}}/></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'10px 14px',display:'flex',flexDirection:'column',gap:10}}>
              {cart.map(c=>{
                const price=(c.item.sale_price||c.item.price);
                const img=c.item.images?.[0]||c.item.image_url;
                return(
                  <div key={c.item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',background:theme.bg,border:`1px solid ${theme.border}`,borderRadius:8}}>
                    <div style={{width:46,height:46,background:theme.cardBg,overflow:'hidden',borderRadius:6,flexShrink:0}}>
                      {img?<img src={getProxyUrl(img) || ''} alt={c.item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<ShoppingBag style={{width:'100%',height:'100%',padding:12,color:theme.muted,opacity:0.2}}/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        <p style={{fontFamily:theme.serif,fontSize:12,fontWeight:500,color:theme.text,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{c.item.name}</p>
                        {c.vIdx !== null && <span style={{fontSize:9,fontWeight:700,color:theme.accent,whiteSpace:'nowrap'}}>({c.item.variations?.[c.vIdx]?.name})</span>}
                      </div>
                      <p style={{fontFamily:theme.sans,fontSize:10,fontWeight:600,color:theme.accent,marginTop:2}}>{fmt(price)} cada</p>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                      <button onClick={()=>changeQty(c.item.id, c.vIdx ?? null, -1)} style={{width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',background:theme.cardBg,border:`1px solid ${theme.border}`,cursor:'pointer',color:theme.text,borderRadius:4}}><Minus style={{width:9,height:9}}/></button>
                      <span style={{fontFamily:theme.sans,fontSize:11,fontWeight:700,color:theme.text,minWidth:14,textAlign:'center'}}>{c.qty}</span>
                      <button onClick={()=>{
                        const m = c.vIdx !== null ? (c.item.variations?.[c.vIdx]?.stock ?? 0) : c.item.stock_quantity;
                        if(c.qty < m) changeQty(c.item.id, c.vIdx ?? null, 1);
                      }} style={{width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',background:theme.cardBg,border:`1px solid ${theme.border}`,cursor: (c.qty >= (c.vIdx !== null ? (c.item.variations?.[c.vIdx]?.stock ?? 0) : c.item.stock_quantity)) ? 'not-allowed' : 'pointer',color:theme.text,opacity: (c.qty >= (c.vIdx !== null ? (c.item.variations?.[c.vIdx]?.stock ?? 0) : c.item.stock_quantity)) ? 0.4 : 1,borderRadius:4}}><Plus style={{width:9,height:9}}/></button>
                      <button onClick={()=>removeFromCart(c.item.id, c.vIdx ?? null)} style={{width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',cursor:'pointer',color:theme.muted,marginLeft:2}}><Trash2 style={{width:12,height:12}}/></button>
                    </div>
                    <p style={{fontFamily:theme.sans,fontSize:11,fontWeight:700,color:theme.text,minWidth:58,textAlign:'right'}}>{fmt(price*c.qty)}</p>
                  </div>
                );
              })}
            </div>
            <div style={{padding:'14px 18px',borderTop:`1px solid ${theme.border}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <span style={{fontFamily:theme.sans,fontSize:10,textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:600,color:theme.muted}}>Total do Pedido</span>
                <span style={{fontFamily:theme.serif,fontSize:20,fontWeight:600,color:theme.accent}}>{fmt(cartTotal)}</span>
              </div>
              <button onClick={sendCart}
                style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'16px 20px',background:'#25d366',color:'#fff',border:'none',cursor:'pointer',fontFamily:theme.sans,fontWeight:800,fontSize:13,letterSpacing:'0.06em',borderRadius:10,transition:'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',boxShadow:'0 10px 25px rgba(37, 211, 102, 0.4)'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 30px rgba(37, 211, 102, 0.5)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 10px 25px rgba(37, 211, 102, 0.4)'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.529 5.853L.054 23.925a.5.5 0 0 0 .613.613l6.114-1.468A11.955 11.955 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.96 9.96 0 0 1-5.085-1.395l-.361-.214-3.755.903.926-3.689-.235-.375A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                ENVIAR PEDIDO PELO WHATSAPP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCT DETAIL MODAL ── */}
      {detailItem&&(
        <div style={{position:'fixed',inset:0,zIndex:110,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.78)',backdropFilter:'blur(6px)'}} onClick={()=>setDetailItem(null)}/>
          <div className="animate-in slide-in-from-bottom-4 duration-300" style={{position:'relative',background:theme.cardBg,border:`1px solid ${theme.border}`,borderBottom:'none',maxHeight:'92svh',display:'flex',flexDirection:'column',width:'100%',maxWidth:640,margin:'0 auto',borderRadius:'16px 16px 0 0',overflow:'hidden'}}>
            {/* Image */}
            <div style={{position:'relative',width:'100%',maxHeight:'40vh',minHeight:'280px',background:theme.bg,flexShrink:0}}>
              {(varImage||detailItem.images?.[0]||detailItem.image_url)
                ? <img src={getProxyUrl(varImage||detailItem.images?.[0]||detailItem.image_url) || ''} alt={detailItem.name} style={{width:'100%',height:'100%',objectFit:'contain',padding:'16px',transition:'opacity 0.3s ease-in-out'}}/>
                : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',opacity:0.15}}><ShoppingBag style={{width:48,height:48,color:theme.text}}/></div>
              }
              <button onClick={()=>setDetailItem(null)} style={{position:'absolute',top:12,right:12,width:34,height:34,borderRadius:'50%',background:`${theme.bg}d0`,backdropFilter:'blur(8px)',border:`1px solid ${theme.border}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:theme.text}}>
                <X style={{width:16,height:16}}/>
              </button>
            </div>
            {/* Info */}
            <div style={{flex:1,overflowY:'auto',padding:'18px 18px 0'}}>
              {detailItem._categoryName&&<span style={{fontSize:9,fontFamily:theme.sans,fontWeight:600,letterSpacing:'0.15em',textTransform:'uppercase',color:theme.accent,display:'block',marginBottom:6}}>{detailItem._categoryName}</span>}
              <h2 style={{fontFamily:theme.serif,fontSize:22,fontWeight:500,color:theme.text,lineHeight:1.2,marginBottom:8}}>{detailItem.name}</h2>
              <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:12}}>
                <span style={{fontFamily:theme.sans,fontSize:18,fontWeight:700,color:detailItem.sale_price?theme.accent:theme.text}}>{fmt(detailItem.sale_price||detailItem.price)}</span>
                {detailItem.sale_price&&<span style={{fontFamily:theme.sans,fontSize:12,color:theme.muted,textDecoration:'line-through'}}>{fmt(detailItem.price)}</span>}
              </div>
              {/* Stock indicator */}
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',background:((selectedVarIdx !== null ? detailItem.variations?.[selectedVarIdx]?.stock : detailItem.stock_quantity) || 0) <= 0 ? '#ef444415' : `${theme.accent}12`,border:`1px solid ${((selectedVarIdx !== null ? detailItem.variations?.[selectedVarIdx]?.stock : detailItem.stock_quantity) || 0) <= 0 ? '#ef444440' : `${theme.accent}30`}`,borderRadius:6,marginBottom:14}}>
                <Package style={{width:13,height:13,color:((selectedVarIdx !== null ? detailItem.variations?.[selectedVarIdx]?.stock : detailItem.stock_quantity) || 0) <= 0 ? '#ef4444' : theme.accent}}/>
                <span style={{fontFamily:theme.sans,fontSize:10,fontWeight:600,color:((selectedVarIdx !== null ? detailItem.variations?.[selectedVarIdx]?.stock : detailItem.stock_quantity) || 0) <= 0 ? '#ef4444' : theme.accent,letterSpacing:'0.05em'}}>
                  {selectedVarIdx !== null 
                    ? (detailItem.variations?.[selectedVarIdx]?.stock || 0) <= 0 
                      ? 'Opção Esgotada' 
                      : `${detailItem.variations?.[selectedVarIdx]?.stock} disponíveis desta opção`
                    : `${detailItem.stock_quantity} unidades disponíveis no estoque`
                  }
                </span>
              </div>
              {/* Variations */}
              {detailItem.variations && detailItem.variations.length > 0 && (
                <div style={{marginBottom:16}}>
                  <p style={{fontFamily:theme.sans,fontSize:9,fontWeight:600,letterSpacing:'0.2em',textTransform:'uppercase',color:theme.muted,marginBottom:8}}>Opções Neste Modelo</p>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {detailItem.variations.map((v, i) => {
                      const isImgActive = varImage === v.image_url && v.image_url;
                      const isVarActive = selectedVarIdx === i;
                      const isOutOfStock = (v.stock ?? 1) <= 0;
                      
                      return (
                      <button 
                        key={i} 
                        onClick={() => {
                          setSelectedVarIdx(i);
                          if(v.image_url) setVarImage(v.image_url);
                        }} 
                        style={{
                          padding:'4px 10px',
                          background:isVarActive?`${theme.accent}20`:`${theme.border}40`,
                          border:`1px solid ${isVarActive?theme.accent:theme.border}`,
                          borderRadius:20,
                          fontSize:10,
                          fontFamily:theme.sans,
                          fontWeight:600,
                          color:isVarActive?theme.accent:theme.text,
                          display:'flex',
                          alignItems:'center',
                          gap:5,
                          cursor:'pointer',
                          transition:'all 0.2s',
                          outline:'none',
                          opacity:isOutOfStock?0.5:1,
                          textDecoration:isOutOfStock?'line-through':'none'
                        }}
                      >
                        {v.image_url && <ImageIcon style={{width:10,height:10,opacity:isImgActive?1:0.6}}/>}
                        <span style={{width:6,height:6,borderRadius:'50%',background:v.type==='size'?'#3b82f6':v.type==='color'?'#f59e0b':'#8b5cf6'}}/>
                        {v.name}
                      </button>
                    )})}
                  </div>
                </div>
              )}
              {/* Description */}
              {detailItem.description&&(
                <div style={{marginBottom:14,marginTop:16}}>
                  <p style={{fontFamily:theme.sans,fontSize:10,fontWeight:600,letterSpacing:'0.15em',textTransform:'uppercase',color:theme.muted,marginBottom:6}}>Sobre a Peça</p>
                  <p style={{fontFamily:theme.sans,fontSize:12,lineHeight:1.75,color:theme.text,opacity:0.85}}>
                    {renderDesc(detailItem.description,theme.accent)}
                  </p>
                </div>
              )}
            </div>
              </div>
              <button
                onClick={()=>{addToCart(detailItem,detailQty);setDetailItem(null);}}
                style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:7,height:44,background:theme.accent,color:onAccent,border:'none',cursor:'pointer',fontFamily:theme.sans,fontWeight:700,fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',borderRadius:4,transition:'opacity 0.18s'}}
                onMouseEnter={e=>(e.currentTarget.style.opacity='0.85')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                <ShoppingCart style={{width:14,height:14}}/> Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SOCIAL PROOF ── */}
      <div style={{position:'fixed',bottom:24,left:14,zIndex:90,transition:'all 0.45s cubic-bezier(0.34,1.56,0.64,1)',transform:social?'translateY(0)':'translateY(160%)',opacity:social?1:0,pointerEvents:'none'}}>
        <div style={{display:'flex',alignItems:'center',gap:9,padding:'9px 12px',background:theme.cardBg,border:`1px solid ${theme.border}`,borderLeft:`3px solid ${theme.accent}`,boxShadow:`0 6px 28px rgba(0,0,0,0.4)`,maxWidth:210,borderRadius:8}}>
          <div style={{width:26,height:26,borderRadius:'50%',background:theme.accent,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:theme.sans,fontWeight:700,fontSize:10,color:onAccent,flexShrink:0}}>{social?.name[0]}</div>
          <div><p style={{fontFamily:theme.sans,fontSize:10,fontWeight:700,color:theme.accent,lineHeight:1.2}}>{social?.name}</p><p style={{fontFamily:theme.sans,fontSize:9,color:theme.muted,marginTop:2,lineHeight:1.3}}>{social?.action}</p></div>
        </div>
      </div>
    </div>
  );
}
