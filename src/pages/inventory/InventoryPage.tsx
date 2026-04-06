import React, { useState, useEffect } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Plus, Search, Image as ImageIcon, Loader2, PackageSearch, X, Grid, List, Trash2, Edit, GripHorizontal, ArrowDownToLine, Copy, CheckCircle2, AlertTriangle, Package, ExternalLink, PlayCircle, Barcode, Scale, Ruler, Link2, Factory, Tag, Coins, Percent } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { MediaOptimizer } from '../../lib/mediaOptimizer';

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  price: number;
  sale_price: number | null;
  cost_price: number;
  additional_costs: { label: string, value: number }[] | null;
  stock_quantity: number;
  image_url: string | null;
  images: string[] | null;
  created_at: string;
  category_id?: string | null;
  ean?: string | null;
  weight_g?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  shopee_item_id?: string | null;
  supplier_name?: string | null;
  supplier_link?: string | null;
  media_assets?: {
    shopee_video?: string;
    reels_video?: string;
    extra_videos?: string[];
  };
}

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const MAX_FILE_SIZE_INVENTORY = 3 * 1024 * 1024; // 3MB

export default function InventoryPage() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_desc' | 'price_asc'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  
  const [categories, setCategories] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'logistics' | 'media'>('basic');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [costs, setCosts] = useState<{label: string, value: string}[]>([{label: 'Preço de Custo', value: ''}, {label: 'Envio/Embalagem', value: ''}]);
  const [stock, setStock] = useState('');
  const [ean, setEan] = useState('');
  const [weight, setWeight] = useState('300'); // Padrão
  const [length, setLength] = useState('16');
  const [width, setWidth] = useState('11');
  const [height, setHeight] = useState('6');
  const [supplierName, setSupplierName] = useState('');
  const [supplierLink, setSupplierLink] = useState('');
  const [shopeeVideo, setShopeeVideo] = useState('');
  const [reelsVideo, setReelsVideo] = useState('');
  const [extraVideos, setExtraVideos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  const [images, setImages] = useState<{file: File | null, preview: string, isExisting: boolean}[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState('');

  // Video Optimizer States
  const [videoToOptimize, setVideoToOptimize] = useState<File | null>(null);
  const [isOptimizingVideo, setIsOptimizingVideo] = useState(false);
  const [optProgress, setOptProgress] = useState(0);
  const [optimizedVideoUrl, setOptimizedVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [user]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      const newFiles: {file: File | null, preview: string, isExisting: boolean}[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
             // AUTO-OPTIMIZATION STRATEGY
             try {
               const optimized = await MediaOptimizer.optimizeImage(file);
               newFiles.push({ file: optimized, preview: URL.createObjectURL(optimized), isExisting: false });
             } catch (err) {
               newFiles.push({ file, preview: URL.createObjectURL(file), isExisting: false });
             }
          }
        }
      }
      
      if (newFiles.length > 0) {
        setImages(prev => [...prev, ...newFiles]);
        success(`${newFiles.length} foto(s) otimizada(s) e importada(s)!`);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isModalOpen, toastError, success]);

  async function fetchCategories() {
    try {
      const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('name');
      setCategories(data || []);
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
    .filter(p => {
      if (stockFilter === 'in_stock') return p.stock_quantity > 0;
      if (stockFilter === 'out_of_stock') return p.stock_quantity <= 0;
      return true;
    })
    .sort((a, b) => {
      const priceA = a.sale_price ? a.sale_price : a.price;
      const priceB = b.sale_price ? b.sale_price : b.price;

      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'price_asc') return priceA - priceB;
      return 0;
    });

  const totalModels = products.length;
  const totalItems = products.reduce((acc, p) => acc + (p.stock_quantity > 0 ? p.stock_quantity : 0), 0);

  const openAddModal = () => {
    setEditingProduct(null);
    setSupplierName('');
    setShopeeVideo('');
    setReelsVideo('');
    resetForm();
    setIsModalOpen(true);
    setActiveTab('basic');
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || '');
    setDescription(p.description || '');
    setPrice(p.price.toString());
    setSalePrice(p.sale_price ? p.sale_price.toString() : '');
    
    // Convert DB additional_costs to form costs
    if (p.additional_costs && p.additional_costs.length > 0) {
      setCosts(p.additional_costs.map(c => ({ label: c.label, value: c.value.toString() })));
    } else {
      setCosts([{ label: 'Preço de Custo', value: p.cost_price.toString() }]);
    }

    setStock(p.stock_quantity.toString());
    setEan(p.ean || '');
    setWeight(p.weight_g ? p.weight_g.toString() : '');
    setLength(p.length_cm ? p.length_cm.toString() : '');
    setWidth(p.width_cm ? p.width_cm.toString() : '');
    setHeight(p.height_cm ? p.height_cm.toString() : '');
    
    const existingImgs = (p.images && p.images.length > 0) ? p.images : (p.image_url ? [p.image_url] : []);
    setImages(existingImgs.map(url => ({ file: null, preview: url, isExisting: true })));
    setCategoryId(p.category_id || '');
    setSupplierName(p.supplier_name || '');
    setSupplierLink(p.supplier_link || '');
    setShopeeVideo(p.media_assets?.shopee_video || '');
    setReelsVideo(p.media_assets?.reels_video || '');
    setExtraVideos(p.media_assets?.extra_videos || []);
    
    setIsModalOpen(true);
    setActiveTab('basic');
  };

  const handleClone = (p: Product) => {
    setEditingProduct(null);
    setName(`${p.name} (Cópia)`);
    setSku(p.sku ? `${p.sku}-COPIA` : '');
    setDescription(p.description || '');
    setPrice(p.price.toString());
    setSalePrice(p.sale_price ? p.sale_price.toString() : '');
    
    if (p.additional_costs && p.additional_costs.length > 0) {
      setCosts(p.additional_costs.map(c => ({ label: c.label, value: c.value.toString() })));
    } else {
      setCosts([{ label: 'Preço de Custo', value: p.cost_price.toString() }]);
    }

    setStock(p.stock_quantity.toString());
    setEan('');
    setWeight(p.weight_g ? p.weight_g.toString() : '');
    setLength(p.length_cm ? p.length_cm.toString() : '');
    setWidth(p.width_cm ? p.width_cm.toString() : '');
    setHeight(p.height_cm ? p.height_cm.toString() : '');
    
    const existingImgs = (p.images && p.images.length > 0) ? p.images : (p.image_url ? [p.image_url] : []);
    setImages(existingImgs.map(url => ({ file: null, preview: url, isExisting: true })));
    setCategoryId(p.category_id || '');
    setSupplierName(p.supplier_name || '');
    setSupplierLink(p.supplier_link || '');
    setShopeeVideo(p.media_assets?.shopee_video || '');
    setReelsVideo(p.media_assets?.reels_video || '');
    setExtraVideos(p.media_assets?.extra_videos || []);
    
    setIsModalOpen(true);
    setActiveTab('basic');
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    setSaving(true); // Temporary block UI for optimization
    const newFiles: {file: File | null, preview: string, isExisting: boolean}[] = [];
    
    for (const file of files) {
      try {
        const optimized = await MediaOptimizer.optimizeImage(file);
        newFiles.push({ file: optimized, preview: URL.createObjectURL(optimized), isExisting: false });
      } catch (err) {
        newFiles.push({ file, preview: URL.createObjectURL(file), isExisting: false });
      }
    }
    
    setImages(prev => [...prev, ...newFiles]);
    setSaving(false);
    success(`${newFiles.length} foto(s) preparadas.`);
  };

  const handleOptimizeVideo = async () => {
    if (!videoToOptimize) return;
    setIsOptimizingVideo(true);
    setOptProgress(0);
    try {
      const optimized = await MediaOptimizer.optimizeVideo(videoToOptimize, (p) => setOptProgress(p));
      const url = URL.createObjectURL(optimized);
      setOptimizedVideoUrl(url);
      success("Vídeo renderizado com sucesso!");

      // Auto-download to help user
      const a = document.createElement('a');
      a.href = url;
      a.download = optimized.name;
      a.click();
    } catch (err) {
      console.error(err);
      toastError("Falha na renderização. Verifique se o vídeo é compatível.");
    } finally {
      setIsOptimizingVideo(false);
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

    // --- Validação Manual Bypass HTML5 ---
    if (!name.trim()) {
      toastError('Preencha o Título do Acessório.');
      setActiveTab('basic');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      toastError('Defina o preço original do produto.');
      setActiveTab('pricing');
      return;
    }
    if (!stock || parseInt(stock, 10) < 0) {
      toastError('Informe a quantidade em estoque.');
      setActiveTab('pricing');
      return;
    }

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

      const totalCost = costs.reduce((acc, c) => acc + (parseFloat(c.value) || 0), 0);

      const payload = {
        name,
        sku: sku || null,
        description: description || null,
        price: parseFloat(price),
        sale_price: salePrice ? parseFloat(salePrice) : null,
        cost_price: totalCost,
        additional_costs: costs.map(c => ({ label: c.label, value: parseFloat(c.value) || 0 })),
        stock_quantity: parseInt(stock, 10),
        ean: ean || null,
        weight_g: parseInt(weight) || 0,
        length_cm: parseInt(length) || 0,
        width_cm: parseInt(width) || 0,
        height_cm: parseInt(height) || 0,
        images: finalImageUrls,
        image_url: finalImageUrls[0] || null,
        category_id: categoryId || null,
        supplier_name: supplierName || null,
        supplier_link: supplierLink || null,
        media_assets: {
          shopee_video: shopeeVideo || null,
          reels_video: reelsVideo || null,
          extra_videos: extraVideos.filter(v => v.trim() !== '')
        },
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
    setCosts([{label: 'Preço de Custo', value: ''}, {label: 'Envio/Embalagem', value: ''}]);
    setStock('');
    setEan('');
    setWeight('300');
    setLength('16');
    setWidth('11');
    setHeight('6');
    setImages([]);
    setCategoryId('');
    setSupplierName('');
    setSupplierLink('');
    setShopeeVideo('');
    setReelsVideo('');
    setExtraVideos([]);
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

  const totalCost = costs.reduce((acc, c) => acc + (parseFloat(c.value) || 0), 0);
  const profitPerSale = (promoPrice || orgPrice || 0) - totalCost;
  const profitColor = profitPerSale > 0 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" : 
                      profitPerSale < 0 ? "text-red-500 bg-red-500/10 border-red-500/30" : 
                      "text-muted-foreground bg-muted/30 border-border";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="flex flex-col md:flex-row justify-between gap-4 md:items-end">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1 text-foreground">Gestão de Peças</h1>
          <p className="text-sm md:text-base text-muted-foreground">O coração do seu negócio. Pressione Inserir Novo para injetar mercadoria nova no catálogo.</p>
        </div>
        <Button onClick={openAddModal} className="w-full sm:w-auto shadow-xl h-12 md:h-14 px-6 font-black tracking-widest bg-foreground hover:bg-foreground/90 text-background transform duration-300 uppercase rounded-xl">
          <Plus className="mr-2 h-5 w-5" /> Cadastrar Peça
        </Button>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-2">
         <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col justify-between group">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-2"><PackageSearch size={14} className="text-primary" /> Total Modelos</span>
            <span className="text-2xl md:text-3xl font-black text-foreground">{totalModels}</span>
         </div>
         <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col justify-between group">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-2"><Grid size={14} className="text-blue-500" /> Peças Acervo</span>
            <span className="text-2xl md:text-3xl font-black text-foreground">{totalItems}</span>
         </div>
         <div className="bg-emerald-500/10 border-l-4 border-emerald-500 rounded-2xl p-4 shadow-sm flex flex-col justify-between" onClick={() => setStockFilter('in_stock')}>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2"><CheckCircle2 size={14} /> Ativas</span>
            <span className="text-2xl md:text-3xl font-black text-emerald-700 dark:text-emerald-300">{products.filter(p => p.stock_quantity > 0).length}</span>
         </div>
         <div className="bg-red-500/10 border-l-4 border-red-500 rounded-2xl p-4 shadow-sm flex flex-col justify-between" onClick={() => setStockFilter('out_of_stock')}>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-2"><AlertTriangle size={14} /> Esgotadas</span>
            <span className="text-2xl md:text-3xl font-black text-red-700 dark:text-red-300">{products.filter(p => p.stock_quantity <= 0).length}</span>
         </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between bg-muted/20 items-center">
          <div className="flex gap-2 w-full md:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                className="pl-10 bg-background shadow-sm h-11 w-full text-base font-medium" 
                placeholder="Pesquisar colar, brinco..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              className="h-11 px-3 bg-background border border-border text-foreground text-sm font-semibold rounded-md shadow-sm outline-none focus:ring-1 focus:ring-primary flex-1 md:flex-none min-w-[140px]"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
            >
              <option value="all">Todo o Estoque</option>
              <option value="in_stock">Apenas com Estoque</option>
              <option value="out_of_stock">Filtro: Esgotados</option>
            </select>

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
                  <div key={product.id} 
                    onClick={() => openEditModal(product)}
                    className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
                  >
                    <div className="aspect-square bg-muted/40 relative flex items-center justify-center overflow-hidden border-b border-border">
                      {displayImage ? (
                        <img src={displayImage} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                      )}
                      
                      {product.stock_quantity <= 0 && (
                        <div className="absolute top-2 left-2 bg-red-500/95 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-widest backdrop-blur-sm z-10">
                          Esgotado
                        </div>
                      )}

                      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleClone(product); }} 
                          title="Duplicar Produto"
                          className="h-8 w-8 bg-blue-500/90 backdrop-blur-md text-white rounded flex items-center justify-center shadow-md hover:bg-blue-600 transition-colors"
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(product); }} 
                          className="h-8 w-8 bg-red-500/90 backdrop-blur-md text-white rounded flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {Array.isArray(product.images) && product.images.length > 1 && (
                        <div className="absolute bottom-2 left-2 bg-foreground/80 text-background text-[9px] font-black px-2 py-1.5 rounded-md flex items-center gap-1.5 backdrop-blur-md">
                          <ImageIcon className="h-3 w-3" /> {product.images.length}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 flex flex-col flex-1">
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <h4 className="text-[11px] font-bold text-foreground line-clamp-1 uppercase tracking-tight">{product.name}</h4>
                        {product.shopee_item_id && (
                           <div className="h-4 w-4 rounded bg-[#f53d2d] flex items-center justify-center shrink-0 shadow-sm" title="Sincronizado na Shopee">
                             <div className="text-white text-[8px] font-black">S</div>
                           </div>
                        )}
                      </div>
                      
                      <div className="mt-auto flex items-end justify-between">
                        <div className="flex flex-col">
                          {isDiscount && (
                            <span className="text-[9px] line-through text-muted-foreground font-semibold">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                            </span>
                          )}
                          <span className={cn("font-black text-[14px] tracking-tight", isDiscount ? "text-green-600 dark:text-green-400" : "text-foreground")}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentPrice)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                           <div className={cn("px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter border", 
                             (currentPrice - product.cost_price) > 0 ? "text-emerald-600 border-emerald-500/20 bg-emerald-500/5" : "text-red-600 border-red-500/20 bg-red-500/5")}>
                             {fmt(currentPrice - product.cost_price)}
                           </div>
                           <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-60">
                             Qtd: {product.stock_quantity}
                           </span>
                        </div>
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
                    <div key={product.id} 
                      onClick={() => openEditModal(product)}
                      className="flex items-center gap-4 bg-card border border-border rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer"
                    >
                       <div className="h-12 w-12 min-w-[48px] rounded-lg overflow-hidden bg-muted relative border border-border/50 shadow-inner">
                           {displayImage ? (
                             <img src={displayImage} alt={product.name} className="object-cover w-full h-full" />
                           ) : (
                             <ImageIcon className="absolute inset-0 m-auto text-muted-foreground/30 h-6 w-6" />
                           )}
                       </div>
                       
                       <div className="flex-1 min-w-0">
                         <h4 className="text-xs font-bold text-foreground truncate uppercase tracking-tight">{product.name}</h4>
                         <span className="text-[10px] text-muted-foreground flex gap-3 mt-0.5 font-medium uppercase tracking-widest">
                           <span>Qtd: {product.stock_quantity}</span>
                           {product.sale_price && <span className="text-green-600 dark:text-green-400 font-bold tracking-tighter">Oferta</span>}
                         </span>
                       </div>

                       <div className="flex flex-col items-end px-5">
                         <span className="font-black text-sm text-foreground tabular-nums">
                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentPrice)}
                         </span>
                       </div>

                       <div className="flex items-center gap-2 pl-3 border-l border-border/70">
                          {product.shopee_item_id && (
                             <div className="hidden sm:flex text-[10px] items-center text-[#f53d2d] font-black uppercase tracking-widest gap-1 mr-2" title="Peça na Shopee ativa">
                               <div className="h-1.5 w-1.5 rounded-full bg-[#f53d2d] animate-pulse" /> Shopee
                             </div>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleClone(product); }} 
                            title="Duplicar Produto"
                            className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                          >
                            <Copy size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(product); }} 
                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                          >
                            <Trash2 size={16} />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:py-8">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={() => {setIsModalOpen(false); resetForm();}}></div>
          
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col z-10 max-h-[90vh] md:max-h-[85vh] overflow-hidden">
            <div className="px-6 py-5 border-b border-border bg-card flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black tracking-tight text-foreground">{editingProduct ? 'Editar Peça' : 'Nova Peça'}</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Gestão de Preço, Estoque e Custos Reais
                </p>
              </div>
              <button onClick={() => {setIsModalOpen(false); resetForm();}} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-5 md:p-6 overflow-y-auto bg-muted/5 flex-1 custom-scrollbar">
              <div className="sticky top-0 z-50 flex flex-wrap gap-1 bg-background/80 backdrop-blur-xl p-1.5 rounded-xl mb-6 border border-border/60 shadow-lg mx-[-4px]">
                 {['basic', 'pricing', 'logistics', 'media'].map(tab => (
                   <button
                     key={tab}
                     type="button"
                     onClick={() => setActiveTab(tab as any)}
                     className={cn(
                       "flex-1 text-[10px] md:text-xs uppercase font-black tracking-widest py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap min-w-[80px]",
                       activeTab === tab 
                         ? "bg-foreground text-background shadow-[0_0_15px_rgba(0,0,0,0.1)] border-transparent scale-[1.02] ring-1 ring-foreground/10" 
                         : "text-muted-foreground hover:bg-muted/80 hover:text-foreground active:scale-95"
                     )}
                   >
                     {tab === 'basic' && 'Info 📝'}
                     {tab === 'pricing' && 'Lucros 💸'}
                     {tab === 'logistics' && 'Frete 📦'}
                     {tab === 'media' && 'Mídia 🎥'}
                   </button>
                 ))}
              </div>

              <form id="productForm" onSubmit={handleSaveProduct} className="space-y-4 md:space-y-5" noValidate>
                
                {/* --- TAB: BÁSICOS --- */}
                <div className={cn("space-y-5", activeTab !== 'basic' && "hidden")}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-1 border border-border/40 p-4 rounded-xl bg-card/40">
                      <Label className="font-bold text-xs uppercase text-foreground tracking-widest block flex gap-1">Título da Peça <span className="text-[#f53d2d]">*</span></Label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Choker Premium..." className="h-11 pl-9 text-sm font-bold bg-background shadow-sm transition-colors border-primary/20 focus-visible:ring-primary" />
                      </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-1 border border-border/40 p-4 rounded-xl bg-card/40">
                      <Label className="font-bold text-xs uppercase text-foreground tracking-widest block">Coleção/Categoria</Label>
                      <div className="relative">
                        <List className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <select 
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          className="flex h-11 w-full rounded-md border border-border bg-background text-foreground pl-9 pr-3 py-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary font-bold text-sm"
                        >
                          <option value="">Não classificado</option>
                          {categories.map(cat => (
                             <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:col-span-2 border border-border/40 p-4 rounded-xl bg-card/40">
                      <div className="space-y-1.5">
                        <Label className="font-bold text-[10px] md:text-xs uppercase text-muted-foreground tracking-widest block">GTIN/EAN</Label>
                        <div className="relative">
                          <Barcode className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-60" />
                          <Input value={ean} onChange={e => setEan(e.target.value)} placeholder="789... (Opcional)" className="h-11 pl-8 text-xs md:text-sm font-mono bg-background shadow-sm border-primary/20" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="font-bold text-[10px] md:text-xs uppercase text-muted-foreground tracking-widest block">SKU / Referência</Label>
                        <div className="relative">
                          <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-60" />
                          <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="Opcional" className="h-11 pl-8 text-xs md:text-sm font-mono bg-background shadow-sm" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2 border border-border/40 p-4 rounded-xl bg-card/40 group/desc">
                      <Label className="font-bold text-xs uppercase text-foreground tracking-widest block flex items-center gap-2">
                        <List size={14} className="text-muted-foreground" /> Descrição do Produto
                      </Label>
                      <p className="text-[10px] text-muted-foreground mb-1">Destaque os diferenciais e use formatação para converter vendas.</p>
                      <div className="flex gap-1 mb-1.5">
                        {(['bold','big'] as const).map(fmtTag => (
                          <button key={fmtTag} type="button"
                            className="h-7 px-3 text-[10px] uppercase font-black tracking-tighter border border-border/60 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                            onClick={() => { const el = document.getElementById('descTextarea') as HTMLTextAreaElement; if (!el) return; const s = el.selectionStart; const e2 = el.selectionEnd; const sel = description.slice(s, e2); if (!sel) return; const w = fmtTag === 'bold' ? `**${sel}**` : `++${sel}++`; setDescription(description.slice(0, s) + w + description.slice(e2)); el.focus(); }}
                          >{fmtTag === 'bold' ? 'Negrito' : 'Texto Grande'}</button>
                        ))}
                      </div>
                      <textarea
                        id="descTextarea"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Ex: Peça produzida em aço inoxidável com banho de ouro 18k..."
                        rows={5}
                        className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-border/60 bg-background/50 text-foreground outline-none focus:ring-1 focus:ring-primary focus:bg-background resize-none shadow-inner transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* --- TAB: PRICING --- */}
                <div className={cn("space-y-5 animate-in fade-in zoom-in duration-300", activeTab !== 'pricing' && "hidden")}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 border border-border/40 p-4 rounded-xl bg-card/40">
                      <Label className="font-bold text-xs uppercase text-foreground tracking-widest block flex gap-1">Preço Original <span className="text-[#f53d2d]">*</span></Label>
                      <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="h-11 pl-9 text-base font-black bg-background shadow-sm border-primary/20" />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 border border-border/40 p-4 rounded-xl bg-card/40">
                      <Label className="font-bold text-xs uppercase text-primary/80 tracking-widest block flex items-center gap-1">Preço Promo <span className="font-normal text-[9px]">(opcional)</span></Label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                        <Input type="number" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="0.00" className="h-11 pl-9 text-base font-black border-primary/30 bg-primary/5 shadow-sm focus:border-primary text-primary" />
                      </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-2 border border-border/40 p-4 rounded-xl bg-card/40">
                      <Label className="font-bold text-xs uppercase text-foreground tracking-widest block flex gap-1">Quantidade em Estoque <span className="text-[#f53d2d]">*</span></Label>
                      <div className="relative">
                        <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-60" />
                        <Input type="number" required value={stock} onChange={e => setStock(e.target.value)} placeholder="1" className="h-11 pl-11 text-base font-black bg-background shadow-sm text-center md:text-left" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-border/50">
                      <div>
                        <Label className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-widest">Estrutura de Custos</Label>
                        <p className="text-[9px] text-muted-foreground/60 font-medium">Cadastre insumos, fretes e embalagens.</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setCosts([...costs, { label: '', value: '' }])} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all active:scale-95"
                      >
                        <Plus className="h-3 w-3" /> Adicionar Custo
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {costs.map((c, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-card border border-border/50 p-2 rounded-xl shadow-sm hover:border-primary/30 transition-all group/cost">
                          <div className="flex-1 space-y-1">
                            <span className="text-[8px] font-black text-muted-foreground uppercase ml-1 opacity-40">Descrição</span>
                            <Input 
                              value={c.label} 
                              onChange={e => { const nc = [...costs]; nc[idx].label = e.target.value; setCosts(nc); }} 
                              placeholder="Ex: Embalagem..." 
                              className="h-9 text-xs font-bold bg-muted/5 border-none shadow-none focus-visible:ring-0 focus-visible:bg-muted/10" 
                            />
                          </div>
                          <div className="w-24 space-y-1">
                             <span className="text-[8px] font-black text-muted-foreground uppercase ml-1 opacity-40">Valor</span>
                             <div className="relative">
                               <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground/60">R$</span>
                               <Input 
                                  type="number" 
                                  step="0.01" 
                                  value={c.value} 
                                  onChange={e => { const nc = [...costs]; nc[idx].value = e.target.value; setCosts(nc); }} 
                                  placeholder="0,00" 
                                  className="h-9 pl-6 text-xs font-black bg-muted/5 border-none shadow-none focus-visible:ring-0 focus-visible:bg-muted/10" 
                               />
                             </div>
                          </div>
                          {costs.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => setCosts(costs.filter((_, i) => i !== idx))} 
                              className="h-8 w-8 flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest block">Lucro Real Estimado</Label>
                    <div className={cn("h-14 flex items-center justify-center border rounded-xl font-black text-2xl transition-colors duration-300 shadow-inner", profitColor)}>
                      R$ {profitPerSale.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>

                {/* --- TAB: LOGISTIC --- */}
                <div className={cn("space-y-5 animate-in fade-in zoom-in duration-300", activeTab !== 'logistics' && "hidden")}>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                       <div>
                         <Label className="font-bold text-xs uppercase text-foreground tracking-widest block flex items-center gap-2"><Scale size={14} className="text-primary"/> Logística e Frete</Label>
                         <p className="text-[10px] text-muted-foreground mt-0.5">Essenciais para cálculo automático de frete Shopee/Correios.</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-card/40 border border-border/40 p-4 rounded-xl shadow-sm">
                      <div className="space-y-1.5">
                         <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Peso (g)</Label>
                         <div className="relative">
                           <Scale className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-40" />
                           <Input type="number" required value={weight} onChange={e => setWeight(e.target.value)} className="h-10 pl-7 text-sm font-black text-center" />
                         </div>
                      </div>
                      <div className="space-y-1.5">
                         <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Comp. (cm)</Label>
                         <div className="relative">
                           <Ruler className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-40" rotate={90} />
                           <Input type="number" required value={length} onChange={e => setLength(e.target.value)} className="h-10 pl-7 text-sm font-black text-center" />
                         </div>
                      </div>
                      <div className="space-y-1.5">
                         <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Larg. (cm)</Label>
                         <div className="relative">
                           <Ruler className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-40" />
                           <Input type="number" required value={width} onChange={e => setWidth(e.target.value)} className="h-10 pl-7 text-sm font-black text-center" />
                         </div>
                      </div>
                      <div className="space-y-1.5">
                         <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Alt. (cm)</Label>
                         <div className="relative">
                           <Ruler className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-40" rotate={-90} />
                           <Input type="number" required value={height} onChange={e => setHeight(e.target.value)} className="h-10 pl-7 text-sm font-black text-center" />
                         </div>
                      </div>
                    </div>
                    
                    {/* Ghost box to give tab a bit more content so it doesn't look empty */}
                    <div className="bg-muted/30 p-4 rounded-xl opacity-60 flex items-center gap-3 border border-dashed border-border/60">
                       <Package className="h-6 w-6 text-muted-foreground/60" />
                       <p className="text-xs font-medium text-muted-foreground">Atentar-se às tabelas oficiais dos Correios para evitar multas de cubagem e reingresso.</p>
                    </div>
                  </div>
                </div>

                {/* --- TAB: MEDIA --- */}
                <div className={cn("space-y-5 animate-in fade-in zoom-in duration-300", activeTab !== 'media' && "hidden")}>
                  <div>
                    <div>
                      <Label className="font-bold text-xs uppercase text-foreground tracking-widest block">🎥 Mídias p/ Redes & 🏭 Fornecedores</Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Registre a origem e estruture os links dos vídeos para sua equipe não os perder jamais.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2 border border-border/40 p-4 rounded-xl bg-card/40">
                          <div className="space-y-1.5">
                            <Label className="font-bold text-[10px] uppercase text-foreground tracking-widest block ml-1 flex items-center gap-1.5"><Factory size={12} className="text-primary"/> Fornecedor / Fabricante</Label>
                            <div className="relative">
                              <Factory className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-60" />
                              <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Ex: Galeria do Brás, Fornecedor X..." className="h-11 pl-9 text-sm font-bold bg-background shadow-sm border-primary/20" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="font-bold text-[10px] uppercase text-foreground tracking-widest block ml-1 flex justify-between items-center">
                              <span className="flex items-center gap-1.5"><Link2 size={12} className="text-primary"/> Link do Fornecedor</span>
                              {supplierLink && (
                                <a href={supplierLink.startsWith('http') ? supplierLink : `https://${supplierLink}`} target="_blank" rel="noopener noreferrer" className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors flex items-center gap-1">
                                  Abrir <ExternalLink size={10} />
                                </a>
                              )}
                            </Label>
                            <div className="relative">
                              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-60" />
                              <Input value={supplierLink} onChange={e => setSupplierLink(e.target.value)} placeholder="https://..." className="h-11 pl-9 text-xs font-mono bg-background shadow-sm border-primary/20" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 p-4 bg-[#f53d2d]/5 border border-[#f53d2d]/20 rounded-xl relative overflow-hidden group/media shadow-sm">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-[#f53d2d]/10 rounded-full -mr-8 -mt-8 pointer-events-none blur-xl group-hover/media:bg-[#f53d2d]/20 transition-all" />
                          <Label className="font-black text-[10px] uppercase text-[#f53d2d] tracking-widest block relative z-10">Shopee Vídeo / Foto (1:1)</Label>
                          <div className="relative z-10 flex items-center">
                            <Link2 className="absolute left-3 h-3.5 w-3.5 text-[#f53d2d]/60" />
                            <Input 
                              value={shopeeVideo} 
                              onChange={e => setShopeeVideo(e.target.value)} 
                              placeholder="Link Drive/Canva..." 
                              className="h-10 pl-9 pr-10 text-xs font-mono bg-background/80 shadow-sm border-none focus-visible:ring-1 focus-visible:ring-[#f53d2d] w-full" 
                            />
                            {shopeeVideo && (
                              <a 
                                href={shopeeVideo.startsWith('http') ? shopeeVideo : `https://${shopeeVideo}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="absolute right-2 h-7 w-7 flex items-center justify-center bg-[#f53d2d] text-white rounded-lg shadow-lg hover:scale-110 active:scale-95 transition-all"
                                title="Abrir Preview"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <p className="text-[9px] font-bold text-muted-foreground opacity-60 mt-1.5 italic">Padrão Shopee: 1:1 (Quadrado), no max 10MB.</p>
                        </div>

                        <div className="space-y-1.5 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl relative overflow-hidden group/media shadow-sm">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full -mr-8 -mt-8 pointer-events-none blur-xl group-hover/media:bg-purple-500/20 transition-all" />
                          <Label className="font-black text-[10px] uppercase text-purple-600 dark:text-purple-400 tracking-widest block relative z-10">TikTok / Reels (9:16)</Label>
                          <div className="relative z-10 flex items-center">
                            <PlayCircle className="absolute left-3 h-3.5 w-3.5 text-purple-600/60" />
                            <Input 
                              value={reelsVideo} 
                              onChange={e => setReelsVideo(e.target.value)} 
                              placeholder="Link Drive/CapCut..." 
                              className="h-10 pl-9 pr-10 text-xs font-mono bg-background/80 shadow-sm border-none focus-visible:ring-1 focus-visible:ring-purple-500 w-full" 
                            />
                            {reelsVideo && (
                              <a 
                                href={reelsVideo.startsWith('http') ? reelsVideo : `https://${reelsVideo}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="absolute right-2 h-7 w-7 flex items-center justify-center bg-purple-600 text-white rounded-lg shadow-lg hover:scale-110 active:scale-95 transition-all"
                                title="Ver Vídeo"
                              >
                                <PlayCircle size={14} />
                              </a>
                            )}
                          </div>
                          <p className="text-[9px] font-bold text-muted-foreground opacity-60 mt-1.5 italic">Qualidade total para Redes Sociais.</p>
                        </div>
                        
                        <div className="space-y-4 pt-4 md:col-span-2 border-t border-border/60 mt-4 bg-muted/20 p-5 rounded-2xl relative overflow-hidden group/renderer">
                           <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover/renderer:bg-primary/10 transition-all" />
                           
                           <div>
                             <Label className="font-black text-xs uppercase text-foreground tracking-widest block flex items-center gap-2">
                               <PlayCircle size={14} className="text-primary" /> Renderizador de Vídeos (Shopee Mode)
                             </Label>
                             <p className="text-[10px] text-muted-foreground mt-1">Garante que seus vídeos fiquem abaixo de 10MB sem travar o seu ERP.</p>
                           </div>

                           {!isOptimizingVideo && !optimizedVideoUrl && (
                             <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 p-6 rounded-xl bg-background/50 hover:border-primary/40 transition-all cursor-pointer relative">
                               <input 
                                 type="file" 
                                 accept="video/*" 
                                 className="absolute inset-0 opacity-0 cursor-pointer" 
                                 onChange={e => setVideoToOptimize(e.target.files?.[0] || null)}
                               />
                               {videoToOptimize ? (
                                 <div className="text-center font-black">
                                   <p className="text-xs text-primary">{videoToOptimize.name}</p>
                                   <p className="text-[10px] text-muted-foreground">Original: {(videoToOptimize.size / (1024*1024)).toFixed(1)}MB</p>
                                   <Button 
                                      variant="outline" 
                                      className="mt-3 h-8 text-[10px] uppercase font-black"
                                      onClick={(e) => { e.stopPropagation(); handleOptimizeVideo(); }}
                                   >Começar Renderização</Button>
                                 </div>
                               ) : (
                                 <div className="text-center">
                                   <ImageIcon className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                                   <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2">Arraste o vídeo pesado aqui</p>
                                 </div>
                               )}
                             </div>
                           )}

                           {isOptimizingVideo && (
                             <div className="space-y-4 py-4">
                               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                 <span className="flex items-center gap-2 anime-pulse"><Loader2 className="h-3 w-3 animate-spin text-primary" /> Processando...</span>
                                 <span>{optProgress}%</span>
                               </div>
                               <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                 <div 
                                   className="h-full bg-primary transition-all duration-300" 
                                   style={{ width: `${optProgress}%` }}
                                 />
                               </div>
                               <p className="text-[9px] text-center text-muted-foreground italic">Isso pode levar alguns segundos dependendo do tamanho.</p>
                             </div>
                           )}

                           {optimizedVideoUrl && (
                             <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex flex-col items-center gap-3 animate-in zoom-in duration-300">
                                <CheckCircle2 className="text-primary h-8 w-8" />
                                <div className="text-center">
                                  <p className="text-xs font-black text-foreground">Vídeo Pronto para Shopee!</p>
                                  <p className="text-[10px] text-muted-foreground">O arquivo foi compactado e o download iniciou.</p>
                                </div>
                                <div className="flex gap-2">
                                  <a href={optimizedVideoUrl} download="shopee_optimized.mp4" className="h-9 px-4 flex items-center gap-2 bg-primary text-primary-foreground text-[10px] font-black uppercase rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all">
                                    <ArrowDownToLine size={14} /> Download Manual
                                  </a>
                                  <button onClick={() => { setOptimizedVideoUrl(null); setVideoToOptimize(null); }} className="h-9 px-4 text-[10px] font-black uppercase border border-border rounded-lg hover:bg-muted transition-all">Limpar</button>
                                </div>
                             </div>
                           )}
                        </div>
                          
                          <div className="space-y-2">
                             {extraVideos.map((url, idx) => (
                               <div key={idx} className="flex gap-2 items-center bg-card/40 p-2 rounded-xl border border-border/40 group/extra animate-in slide-in-from-right-2 duration-300">
                                 <div className="relative flex-1">
                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-60" />
                                    <Input 
                                      value={url} 
                                      onChange={e => {
                                        const newLinks = [...extraVideos];
                                        newLinks[idx] = e.target.value;
                                        setExtraVideos(newLinks);
                                      }}
                                      placeholder="https://..."
                                      className="h-10 pl-9 pr-10 text-xs font-mono bg-background/50 border-none shadow-none focus-visible:ring-1"
                                    />
                                    {url && (
                                       <a 
                                         href={url.startsWith('http') ? url : `https://${url}`} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center bg-foreground text-background rounded-lg shadow-sm hover:scale-110 active:scale-95 transition-all"
                                       >
                                         <ExternalLink size={12} />
                                       </a>
                                    )}
                                 </div>
                                 <button 
                                   type="button"
                                   onClick={() => setExtraVideos(extraVideos.filter((_, i) => i !== idx))}
                                   className="h-10 w-10 flex items-center justify-center text-muted-foreground opacity-20 hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                 >
                                   <Trash2 size={16} />
                                 </button>
                               </div>
                             ))}
                             {extraVideos.length === 0 && (
                               <div className="text-center py-6 border border-dashed border-border/60 rounded-xl opacity-40">
                                 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nenhum link adicional cadastrado</p>
                               </div>
                             )}
                          </div>
                        </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 mt-4 border-t border-border/80">
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

            <div className="p-4 md:p-5 border-t border-border bg-card flex flex-wrap gap-3 items-center shrink-0 mt-auto">
              <Button type="button" className="w-[120px] h-12 md:h-14 bg-muted border border-border text-foreground hover:bg-muted/80 font-bold shadow-sm text-sm uppercase tracking-widest" onClick={() => {setIsModalOpen(false); resetForm();}}>
                Voltar
              </Button>
              {editingProduct && (
                 <Button type="button" onClick={() => {
                     if (!weight || !images.length) toastError("Preencha dimensões e coloque fotos para publicar.");
                     else success("Shopee Hub não ativado. Cadastre as chaves de integração primeiro.");
                 }} className="flex-1 md:flex-none border border-[#f53d2d] bg-[#f53d2d]/10 text-[#f53d2d] hover:bg-[#f53d2d]/20 h-12 md:h-14 font-black uppercase tracking-widest text-xs">
                   Subir Shopee
                 </Button>
              )}
              <Button type="submit" form="productForm" className="flex-1 h-12 md:h-14 font-black text-sm md:text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg uppercase tracking-widest w-full md:w-auto" disabled={saving || (!name && images.length === 0)}>
                {saving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                {editingProduct ? 'Gravar Alterações' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
