import React, { useState, useEffect } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Plus, Search, Image as ImageIcon, Loader2, PackageSearch, X, Grid, List, Trash2, Edit, GripHorizontal, ArrowDownToLine } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  image_url: string | null;
  images: string[] | null;
  created_at: string;
  category_id?: string | null;
}

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export default function InventoryPage() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_desc' | 'price_asc'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [categories, setCategories] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [images, setImages] = useState<{file: File | null, preview: string, isExisting: boolean}[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [user]);

  async function fetchCategories() {
    try {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data) setCategories(data);
    } catch(err) { console.error(err); }
  }

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Falha ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  }

  const processedProducts = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const priceA = a.sale_price ? a.sale_price : a.price;
      const priceB = b.sale_price ? b.sale_price : b.price;

      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'price_asc') return priceA - priceB;
      return 0;
    });

  const openAddModal = () => {
    setEditingProduct(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || '');
    setDescription(p.description || '');
    setPrice(p.price.toString());
    setSalePrice(p.sale_price ? p.sale_price.toString() : '');
    setStock(p.stock_quantity.toString());
    
    const existingImgs = (p.images && p.images.length > 0) ? p.images : (p.image_url ? [p.image_url] : []);
    setImages(existingImgs.map(url => ({ file: null, preview: url, isExisting: true })));
    setCategoryId(p.category_id || '');
    
    setIsModalOpen(true);
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Deseja excluir "${p.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
       const { error } = await supabase.from('products').delete().eq('id', p.id);
       if (error) throw error;
       success('Produto excluído!');
       fetchProducts();
    } catch (error: any) {
       toastError('Erro ao excluir: ' + error.message);
    }
  };

  const MAX_FILE_SIZE_INVENTORY = 3 * 1024 * 1024; // 3MB

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const rawFiles = Array.from(e.target.files);
      const validFiles = rawFiles.filter(file => {
         if (file.size > MAX_FILE_SIZE_INVENTORY) {
            toastError(`"${file.name}" é maior que 3MB e foi descartada.`);
            return false;
         }
         return true;
      }).map(file => ({
        file,
        preview: URL.createObjectURL(file),
        isExisting: false
      }));
      setImages(prev => [...prev, ...validFiles]);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    
    const newImgs = [...images];
    const [removed] = newImgs.splice(draggedIdx, 1);
    newImgs.splice(targetIdx, 0, removed);
    
    setImages(newImgs);
    setDraggedIdx(null);
  };

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    
    try {
      const finalImageUrls: string[] = [];

      for (const img of images) {
        if (img.isExisting) {
           finalImageUrls.push(img.preview);
        } else if (img.file) {
          const fileExt = img.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, img.file);
          if (uploadError) throw uploadError;
          
          const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
          finalImageUrls.push(data.publicUrl);
        }
      }

      const payload = {
        name,
        sku: sku || null,
        description: description || null,
        price: parseFloat(price),
        sale_price: salePrice ? parseFloat(salePrice) : null,
        stock_quantity: parseInt(stock, 10),
        images: finalImageUrls,
        image_url: finalImageUrls[0] || null,
        category_id: categoryId || null,
        user_id: user.id
      };

      if (editingProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
        success('Produto atualizado!');
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
        success('Produto cadastrado!');
      }

      setIsModalOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toastError('Erro ao salvar produto: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setName('');
    setSku('');
    setDescription('');
    setPrice('');
    setSalePrice('');
    setStock('');
    setImages([]);
    setCategoryId('');
    setDraggedIdx(null);
  }

  // Description toolbar: wrap selected text
  function applyFormat(format: 'bold' | 'big', ref: React.RefObject<HTMLTextAreaElement>) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = description.slice(start, end);
    if (!selected) return;
    const wrapped = format === 'bold' ? `**${selected}**` : `++${selected}++`;
    const newVal = description.slice(0, start) + wrapped + description.slice(end);
    setDescription(newVal);
    setTimeout(() => { el.focus(); el.setSelectionRange(start, start + wrapped.length); }, 0);
  }

  // Pre-calculations for smart formatting
  const orgPrice = parseFloat(price) || 0;
  const promoPrice = parseFloat(salePrice) || 0;
  const isDiscountValid = salePrice && promoPrice > 0 && promoPrice < orgPrice;
  const discountAbs = orgPrice - promoPrice;
  const discountPct = orgPrice ? Math.round((discountAbs / orgPrice) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 text-foreground">Estoque & Peças</h1>
          <p className="text-sm md:text-base text-muted-foreground line-clamp-2 md:line-clamp-none">Adicione, edite ou crie promoções no seu acervo de jóias.</p>
        </div>
        <Button onClick={openAddModal} className="w-full sm:w-auto shadow-md h-12 md:h-14 px-6 font-black tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground transform duration-300 text-sm md:text-base uppercase rounded-xl">
          <Plus className="mr-2 h-5 w-5" /> Inserir Novo
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between bg-muted/20 items-center">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              className="pl-10 bg-background shadow-sm h-11 w-full text-base font-medium" 
              placeholder="Pesquisar colar, brinco..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select 
              className="h-11 px-3 bg-background border border-border text-foreground text-sm font-semibold rounded-md shadow-sm outline-none focus:ring-1 focus:ring-primary flex-1 md:flex-none"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">Mais Recentes</option>
              <option value="oldest">Mais Antigos</option>
              <option value="price_desc">Maior Preço</option>
              <option value="price_asc">Menor Preço</option>
            </select>

            <div className="flex bg-muted p-1 rounded-md border border-border shrink-0">
               <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-sm transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
               >
                 <Grid size={18} />
               </button>
               <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-sm transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
               >
                 <List size={18} />
               </button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-16"><Loader2 className="animate-spin h-10 w-10 text-primary/50" /></div>
        ) : processedProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-5">
              <PackageSearch className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-bold text-foreground">A Vitrine está vazia</h3>
            <p className="text-muted-foreground mt-2 max-w-sm text-sm font-medium">
              Use o botão lá em cima para cadastrar a sua primeira peça lindíssima.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-muted/10 p-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {processedProducts.map(product => {
                  const displayImage = product.images?.[0] || product.image_url;
                  const currentPrice = product.sale_price || product.price;
                  const isDiscount = !!product.sale_price;

                  return (
                  <div key={product.id} className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
                    <div className="aspect-[4/5] bg-muted/40 relative flex items-center justify-center overflow-hidden border-b border-border">
                      {displayImage ? (
                        <img src={displayImage} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                      )}
                      
                      {product.stock_quantity <= 0 && (
                        <div className="absolute top-2 left-2 bg-red-500/95 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-sm uppercase tracking-wide backdrop-blur-sm z-10">
                          Esgotado
                        </div>
                      )}

                      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button onClick={() => openEditModal(product)} className="h-8 w-8 bg-card/90 backdrop-blur-md text-foreground rounded flex items-center justify-center shadow-md hover:text-primary transition-colors hover:bg-card">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(product)} className="h-8 w-8 bg-red-500/90 backdrop-blur-md text-white rounded flex items-center justify-center shadow-md hover:bg-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {Array.isArray(product.images) && product.images.length > 1 && (
                        <div className="absolute bottom-2 left-2 bg-foreground/80 text-background text-[10px] font-bold px-2 py-1.5 rounded-md flex items-center gap-1.5 backdrop-blur-md">
                          <ImageIcon className="h-3 w-3" /> {product.images.length} Fotos
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 flex flex-col flex-1">
                      <h4 className="text-sm font-bold text-foreground line-clamp-1 mb-2">{product.name}</h4>
                      
                      <div className="mt-auto flex items-end justify-between">
                        <div className="flex flex-col">
                          {isDiscount && (
                            <span className="text-[10px] line-through text-muted-foreground mb-0.5 font-semibold">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                            </span>
                          )}
                          <span className={cn("font-black text-[16px] tracking-tight", isDiscount ? "text-green-600 dark:text-green-400" : "text-foreground")}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentPrice)}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider bg-muted/60 px-2 py-1 rounded-md border border-border">
                          Qtd: {product.stock_quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            ) : (
              <div className="flex flex-col space-y-3">
                {processedProducts.map(product => {
                  const displayImage = product.images?.[0] || product.image_url;
                  const currentPrice = product.sale_price || product.price;
                  
                  return (
                    <div key={product.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                       <div className="h-16 w-16 min-w-[64px] rounded-lg overflow-hidden bg-muted relative">
                           {displayImage ? (
                             <img src={displayImage} alt={product.name} className="object-cover w-full h-full" />
                           ) : (
                             <ImageIcon className="absolute inset-0 m-auto text-muted-foreground/30 h-6 w-6" />
                           )}
                       </div>
                       
                       <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-foreground truncate">{product.name}</h4>
                         <span className="text-xs text-muted-foreground flex gap-3 mt-1 font-medium">
                           <span>Estoque: {product.stock_quantity}</span>
                           {product.sale_price && <span className="text-green-600 dark:text-green-400 font-bold">Promoção Ativa</span>}
                         </span>
                       </div>

                       <div className="flex flex-col items-end px-5">
                         {product.sale_price && (
                           <span className="text-xs line-through text-muted-foreground font-semibold">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                           </span>
                         )}
                         <span className="font-black text-lg text-foreground">
                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentPrice)}
                         </span>
                       </div>

                       <div className="flex items-center gap-2 pl-5 border-l border-border/70">
                          <button onClick={() => openEditModal(product)} className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors bg-muted/30">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDelete(product)} className="p-2.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors bg-muted/30">
                            <Trash2 size={18} />
                          </button>
                       </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 py-8">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => {setIsModalOpen(false); resetForm();}}></div>
          
          <div className="bg-card w-full max-w-4xl rounded-xl shadow-2xl border border-border flex flex-col z-10 max-h-full overflow-hidden">
            <div className="p-6 border-b border-border bg-card">
              <h3 className="text-xl md:text-2xl font-black tracking-tight text-foreground">{editingProduct ? 'Editar Peça' : 'Cadastrar Nova Peça'}</h3>
              <p className="text-[11px] font-bold text-muted-foreground mt-1 uppercase tracking-widest hidden md:block">
                Campos Compactos de Preço, Categoria e Galeria Interativa
              </p>
            </div>
            
            <div className="p-5 md:p-6 overflow-y-auto bg-muted/5 flex-1 custom-scrollbar">
              <form id="productForm" onSubmit={handleSaveProduct} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-1">
                    <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest block">Título do Acessório</Label>
                    <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Choker Premium..." className="h-11 text-sm font-bold bg-background shadow-sm transition-colors" />
                  </div>
                  <div className="space-y-1.5 md:col-span-1">
                    <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest block">Coleção/Categoria (Opcional)</Label>
                    <select 
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="flex h-11 w-full rounded-md border border-border bg-background text-foreground px-3 py-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary font-bold text-sm"
                    >
                      <option value="">Não classificado</option>
                      {categories.map(cat => (
                         <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest block">SKU / Referência (Opcional)</Label>
                    <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="Ex: LAR-2024-001" className="h-11 text-sm font-mono bg-background shadow-sm" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest block">Descrição do Produto (Opcional)</Label>
                    <p className="text-[10px] text-muted-foreground mb-1">Selecione o texto e clique <span className="font-bold">N</span> para negrito ou <span className="font-bold">G</span> para texto grande. Tudo o que escrever aqui aparece no catálogo.</p>
                    <div className="flex gap-1 mb-1.5">
                      {(['bold','big'] as const).map(fmt => (
                        <button key={fmt} type="button"
                          className="h-7 px-2.5 text-xs font-bold border border-border rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
                          onClick={() => { const ref = { current: document.getElementById('descTextarea') as HTMLTextAreaElement }; const el = ref.current; if (!el) return; const s = el.selectionStart; const e2 = el.selectionEnd; const sel = description.slice(s, e2); if (!sel) return; const w = fmt === 'bold' ? `**${sel}**` : `++${sel}++`; setDescription(description.slice(0, s) + w + description.slice(e2)); }}
                        >{fmt === 'bold' ? 'N (Negrito)' : 'G (Grande)'}</button>
                      ))}
                    </div>
                    <textarea
                      id="descTextarea"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Ex: Peça produzida em aço inoxidável com banho de ouro 18k. Resistente ao suor e agua. Acompanha embalagem presente..."
                      rows={4}
                      className="w-full px-3 py-2 text-sm font-medium rounded-md border border-border bg-background text-foreground outline-none focus:ring-1 focus:ring-primary resize-y shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest block">Original</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xs">R$</span>
                      <Input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="h-11 pl-9 text-base font-black bg-background shadow-sm" />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs uppercase text-primary/80 tracking-widest block flex items-center gap-1">Promo <span className="font-normal text-[9px]">(opcional)</span></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-black text-xs">R$</span>
                      <Input type="number" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="0.00" className="h-11 pl-9 text-base font-black border-primary/30 bg-primary/5 shadow-sm focus:border-primary text-primary" />
                    </div>
                  </div>

                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest block">Estoque</Label>
                    <Input type="number" required value={stock} onChange={e => setStock(e.target.value)} placeholder="1" className="h-11 text-base font-black bg-background shadow-sm text-center" />
                  </div>
                  
                  {isDiscountValid && (
                    <div className="col-span-full mt-[-8px] text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 border border-emerald-500/20">
                      <ArrowDownToLine size={12}/> Desconto Aplicado: R$ {discountAbs.toFixed(2).replace('.', ',')} ({discountPct}%)
                    </div>
                  )}
                </div>
                
                <div className="space-y-3 pt-4 mt-2 border-t border-border">
                  <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest block">Galeria da Peça (Arraste p/ Ordenar Capa)</Label>
                  
                  <div className="border-2 border-dashed border-border rounded-xl p-5 md:p-6 text-center bg-muted/20 hover:bg-muted/40 transition-colors relative cursor-pointer group shadow-inner">
                    <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none">
                      <ImageIcon className="h-8 w-8 opacity-80" />
                      <div>
                        <span className="text-sm md:text-base font-bold block text-foreground">Aperte para subir fotos</span>
                      </div>
                    </div>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      onChange={handleImageSelect} 
                      className="absolute inset-0 opacity-0 cursor-pointer h-full w-full" 
                    />
                  </div>

                  {images.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-6 mt-4 shadow-sm">
                      <div className="flex gap-4 overflow-x-auto pb-4 snap-x custom-scrollbar">
                        {images.map((img, idx) => (
                          <div 
                            key={idx} 
                            draggable
                            onDragStart={() => setDraggedIdx(idx)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, idx)}
                            className={cn(
                              "relative flex-none w-44 aspect-[4/5] rounded-xl overflow-hidden border-2 group snap-start bg-muted shadow-md transition-all cursor-grab active:cursor-grabbing",
                              draggedIdx === idx ? "opacity-40 border-primary border-dashed scale-95" : "border-border hover:border-primary/50"
                            )}
                          >
                            <img src={img.preview} alt="preview" className="object-cover w-full h-full pointer-events-none" />
                            
                            {idx === 0 && Array.isArray(images) && (
                              <div className="absolute top-0 left-0 right-0 bg-primary/95 backdrop-blur-sm text-primary-foreground text-[11px] text-center font-black py-1.5 z-10 shadow-sm uppercase tracking-widest pointer-events-none">Capa</div>
                            )}

                            <div className="absolute inset-x-0 bottom-0 top-0 bg-background/80 dark:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 z-20">
                              <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg z-30">
                                <X className="h-5 w-5" />
                              </button>
                              
                              <div className="text-foreground flex flex-col items-center gap-2 pointer-events-none">
                                <GripHorizontal className="h-10 w-10 opacity-80" />
                                <span className="font-bold text-sm bg-background/50 px-3 py-1 rounded-full">Segure para Mover</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="p-4 md:p-5 border-t border-border bg-card flex gap-3 items-center shrink-0 mt-auto">
              <Button type="button" className="w-[120px] md:w-auto h-12 md:h-14 bg-muted border border-border text-foreground hover:bg-muted/80 font-bold shadow-sm text-sm md:text-base uppercase tracking-widest" onClick={() => {setIsModalOpen(false); resetForm();}}>
                Voltar
              </Button>
              <Button type="submit" form="productForm" className="flex-1 h-12 md:h-14 font-black text-sm md:text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg uppercase tracking-widest" disabled={saving || (!name && images.length === 0)}>
                {saving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                {editingProduct ? 'Gravar' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
