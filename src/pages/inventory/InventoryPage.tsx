import React, { useState, useEffect } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Plus, Search, Image as ImageIcon, Loader2, PackageSearch, X, Grid, List, Trash2, Edit, GripHorizontal, ArrowDownToLine, Copy, CheckCircle2, AlertTriangle, Package, ExternalLink, PlayCircle, Barcode, Scale, Ruler, Link2, Factory, Tag, Coins, Percent, Eye, Download, MoreVertical, FolderArchive, Layers, Monitor, ShoppingBag } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { MediaOptimizer } from '../../lib/mediaOptimizer';
import JSZip from 'jszip';

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
  
  const [images, setImages] = useState<{file: File | null, preview: string, isExisting: boolean, processing?: boolean}[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [isZipping, setIsZipping] = useState(false);

  // Video Optimizer States
  const [videoToOptimize, setVideoToOptimize] = useState<File | null>(null);
  const [isOptimizingVideo, setIsOptimizingVideo] = useState(false);
  const [optProgress, setOptProgress] = useState(0);
  const [optimizedVideoUrl, setOptimizedVideoUrl] = useState<string | null>(null);
  const [optimizedVideoSize, setOptimizedVideoSize] = useState<number | null>(null);

  // Store settings for tax simulation
  const [taxSettings, setTaxSettings] = useState({
    shopee_comm: 20,
    shopee_fee: 4,
    shopee_cap: 100,
    tiktok_comm: 15,
    tiktok_fee: 4,
    tiktok_cap: 100
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchTaxSettings();
  }, [user]);

  async function fetchTaxSettings() {
    if (!user) return;
    const { data } = await supabase.from('store_settings').select('*').eq('user_id', user.id).maybeSingle();
    if (data) {
      setTaxSettings({
        shopee_comm: data.shopee_commission_pct ?? 20,
        shopee_fee: data.shopee_fixed_fee ?? 4,
        shopee_cap: data.shopee_commission_cap ?? 100,
        tiktok_comm: data.tiktok_commission_pct ?? 15,
        tiktok_fee: data.tiktok_fixed_fee ?? 4,
        tiktok_cap: data.tiktok_commission_cap ?? 100
      });
    }
  }

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
    
    // Initial placeholders to show immediate feedback
    const placeholders = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isExisting: false,
      processing: true
    }));
    
    setImages(prev => [...prev, ...placeholders]);
    
    // Process each one
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const optimized = await MediaOptimizer.optimizeImage(file);
            setImages(prev => {
                const next = [...prev];
                // Find the index of the placeholder we just added
                const placeholderIdx = prev.length - files.length + i;
                if (next[placeholderIdx]) {
                    next[placeholderIdx] = {
                        file: optimized,
                        preview: URL.createObjectURL(optimized),
                        isExisting: false,
                        processing: false
                    };
                }
                return next;
            });
        } catch (err) {
            console.error("Optimization failed:", err);
            setImages(prev => {
                const next = [...prev];
                const placeholderIdx = prev.length - files.length + i;
                if (next[placeholderIdx]) next[placeholderIdx].processing = false;
                return next;
            });
        }
    }
    
    success(`${files.length} foto(s) preparadas.`);
  };

  const handleOptimizeVideo = async () => {
    if (!videoToOptimize) return;
    setIsOptimizingVideo(true);
    setOptProgress(0);
    try {
      const optimized = await MediaOptimizer.optimizeVideo(videoToOptimize, (p) => setOptProgress(p));
      const url = URL.createObjectURL(optimized);
      setOptimizedVideoUrl(url);
      setOptimizedVideoSize(optimized.size);
      success("Vídeo renderizado com sucesso!");

      // Auto-download to help user
      const a = document.createElement('a');
      a.href = url;
      a.download = optimized.name;
      a.click();
    } catch (err: any) {
      // If it was cancelled, we don't treat it as a scary error
      if (err.message && (err.message.includes('terminate') || err.message.includes('aborted'))) {
        console.log("Renderização interrompida pelo usuário.");
      } else {
        console.error(err);
        toastError("Falha na renderização. Verifique se o vídeo é compatível.");
      }
    } finally {
      setIsOptimizingVideo(false);
    }
  };

  const handleCancelVideoOptimization = async () => {
    if (!isOptimizingVideo) return;
    try {
      await MediaOptimizer.terminateFFmpeg();
      setIsOptimizingVideo(false);
      setOptProgress(0);
      success("Renderização cancelada!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folderName = `fotos-${name || 'produto'}`.toLowerCase().replace(/\s+/g, '-');
      
      // Download all images and add to zip
      const promises = images.map(async (img, idx) => {
        const response = await fetch(img.preview);
        const blob = await response.blob();
        const extension = img.file?.name.split('.').pop() || 'jpg';
        zip.file(`${folderName}-${idx + 1}.${extension}`, blob);
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${folderName}.zip`;
      link.click();
      success("ZIP gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toastError("Erro ao gerar o ZIP.");
    } finally {
      setIsZipping(false);
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
                  const rawImage = product.images?.[0] || product.image_url;
                  const displayImage = getProxyUrl(rawImage);
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
                  const rawImage = product.images?.[0] || product.image_url;
                  const displayImage = getProxyUrl(rawImage);
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
          
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col z-10 max-h-[90vh] md:max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-5 border-b border-border bg-card/50 backdrop-blur-md flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-foreground">{editingProduct ? 'Editar Peça' : 'Nova Peça'}</h3>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                       Gestão de Ativos & Lucratividade
                    </p>
                  </div>
                </div>
              </div>
              <button onClick={() => {setIsModalOpen(false); resetForm();}} className="h-10 w-10 flex items-center justify-center hover:bg-muted rounded-xl transition-all border border-border group">
                <X size={20} className="text-muted-foreground group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
            
            <div className="overflow-y-auto bg-muted/5 flex-1 custom-scrollbar relative">
              <div className="sticky top-0 z-[60] bg-background border-b border-border shadow-sm px-5 md:px-6 py-3 mb-6 opacity-100">
                 <div className="flex flex-nowrap overflow-x-auto custom-scrollbar gap-1 bg-muted/30 p-1 rounded-xl">
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
              </div>

              <form id="productForm" onSubmit={handleSaveProduct} className="space-y-4 md:space-y-5 px-5 md:px-6 pb-8" noValidate>
                
                <div className={cn("space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== 'basic' && "hidden")}>
                  <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                      <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                        <Tag size={20} />
                      </div>
                      <div>
                        <Label className="font-black text-sm uppercase text-foreground tracking-widest block">Informações Essenciais</Label>
                        <p className="text-[10px] text-muted-foreground font-medium">Nome, categoria e identificadores únicos</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="font-bold text-[10px] uppercase text-foreground/70 tracking-widest block flex gap-1 ml-1">Título da Peça <span className="text-[#f53d2d]">*</span></Label>
                        <div className="relative group/input">
                          <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                          <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Choker Premium..." className="h-12 pl-10 text-sm font-bold bg-background/50 shadow-none border-border/60 focus-visible:ring-primary focus-visible:bg-background transition-all" />
                        </div>
                      </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="font-bold text-[10px] uppercase text-foreground/70 tracking-widest block ml-1">Categoria / Coleção</Label>
                      <div className="relative group/input">
                        <List className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                        <select 
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          className="flex h-12 w-full rounded-md border border-border/60 bg-background/50 text-foreground pl-10 pr-3 py-1 shadow-none focus:outline-none focus:ring-1 focus:ring-primary font-bold text-sm focus:bg-background transition-all"
                        >
                          <option value="">Não classificado</option>
                          {categories.map(cat => (
                             <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:col-span-2 rounded-xl">
                      <div className="space-y-1">
                        <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest block ml-1">GTIN / EAN</Label>
                        <div className="relative">
                          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-50" />
                          <Input value={ean} onChange={e => setEan(e.target.value)} placeholder="000... (Opcional)" className="h-10 pl-9 text-xs font-mono bg-background/50 border-border/40 shadow-none focus-visible:ring-border transition-all" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest block ml-1">Referência (SKU)</Label>
                        <div className="relative">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-50" />
                          <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="Opcional" className="h-10 pl-9 text-xs font-mono bg-background/50 border-border/40 shadow-none focus-visible:ring-border transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm space-y-3 group/desc">
                    <Label className="font-black text-[10px] uppercase text-foreground/80 tracking-widest block flex items-center gap-2">
                       Descrição da Peça
                    </Label>
                    <p className="text-[10px] text-muted-foreground font-medium">Destaque os diferenciais e materiais do produto.</p>
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

                <div className={cn("space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== 'pricing' && "hidden")}>
                  <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Coins size={20} />
                      </div>
                      <div>
                        <Label className="font-black text-sm uppercase text-foreground tracking-widest block">Gestão de Lucros</Label>
                        <p className="text-[10px] text-muted-foreground font-medium">Preços de venda e ofertas limitadas</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="font-bold text-[10px] uppercase text-foreground/70 tracking-widest block ml-1">Preço Público <span className="text-[#f53d2d]">*</span></Label>
                        <div className="relative group/input">
                          <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                          <Input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="h-12 pl-10 text-base font-black bg-background/50 border-border/60 focus-visible:ring-primary focus-visible:bg-background transition-all" />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="font-bold text-[10px] uppercase text-primary/70 tracking-widest block ml-1">Preço de Oferta</Label>
                        <div className="relative group/input">
                          <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                          <Input type="number" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="0.00" className="h-12 pl-10 text-base font-black border-primary/30 bg-primary/5 shadow-none focus:border-primary text-primary transition-all" />
                        </div>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="font-bold text-[10px] uppercase text-foreground/70 tracking-widest block ml-1">Estoque Disponível <span className="text-[#f53d2d]">*</span></Label>
                        <div className="relative group/input">
                          <PackageSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-60" />
                          <Input type="number" required value={stock} onChange={e => setStock(e.target.value)} placeholder="1" className="h-12 pl-11 text-base font-black bg-background/50 border-border/60 focus-visible:ring-primary transition-all text-center md:text-left" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-border/40 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                          <Scale size={20} />
                        </div>
                        <div>
                          <Label className="font-black text-sm uppercase text-foreground tracking-widest block">Estrutura de Custos</Label>
                          <p className="text-[10px] text-muted-foreground font-medium">Insumos, impostos e taxas</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setCosts([...costs, { label: '', value: '' }])} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all active:scale-95"
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
                      <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest block">Lucro Real Estimado (Catálogo)</Label>
                      <div className={cn("h-14 flex items-center justify-center border rounded-xl font-black text-2xl transition-colors duration-300 shadow-inner", profitColor)}>
                        R$ {profitPerSale.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  {/* Marketplace Multi-Channel Profits moved inside the tab */}
                  <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm space-y-4 mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Monitor size={20} />
                      </div>
                      <div>
                        <Label className="font-black text-sm uppercase text-foreground tracking-widest block">Simulador Omnichannel</Label>
                        <p className="text-[10px] text-muted-foreground font-medium">Margem líquida em outros canais de venda</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Shopee Profit Card */}
                      <div className="p-4 rounded-2xl border-2 border-[#f53d2d]/20 bg-[#f53d2d]/5 relative group cursor-help transition-all hover:bg-[#f53d2d]/10" 
                           title={`Shopee: ${taxSettings.shopee_comm}% de comissão (máx R$${taxSettings.shopee_cap}) + R$${taxSettings.shopee_fee} de taxa fixa.`}>
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[9px] font-black uppercase tracking-widest text-[#f53d2d]">Shopee</span>
                           <ShoppingBag size={14} className="text-[#f53d2d] opacity-40" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xl font-black text-foreground tabular-nums">
                            R$ {( () => {
                              const p = parseFloat(salePrice || price || '0');
                              const cost = parseFloat(costs[0].value || '0');
                              const extra = costs.slice(1).reduce((acc, c) => acc + (parseFloat(c.value) || 0), 0);
                              const comm = Math.min(p * (taxSettings.shopee_comm/100), taxSettings.shopee_cap);
                              const res = p - cost - extra - comm - taxSettings.shopee_fee;
                              return Math.max(0, res).toFixed(2).replace('.', ',');
                            })() }
                          </p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Lucro Líquido</p>
                        </div>
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className="bg-foreground text-background text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter shadow-lg">Info</div>
                        </div>
                      </div>

                      {/* TikTok Profit Card */}
                      <div className="p-4 rounded-2xl border-2 border-black/20 bg-black/5 relative group cursor-help transition-all hover:bg-black/10"
                           title={`TikTok Shop: ${taxSettings.tiktok_comm}% de comissão (máx R$${taxSettings.tiktok_cap}) + R$${taxSettings.tiktok_fee} de taxa fixa.`}>
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[9px] font-black uppercase tracking-widest text-foreground">TikTok Shop</span>
                           <svg className="h-3.5 w-3.5 text-foreground opacity-40" viewBox="0 0 24 24" fill="currentColor"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.67c0 2.106-1.707 3.813-3.813 3.813-2.106 0-3.813-1.707-3.813-3.813 0-2.106 1.707-3.813 3.813-3.813h1.341V8.423H10.01s-5.83.172-5.83 7.247c0 7.075 5.83 7.247 5.83 7.247s5.83.172 5.83-7.247V7.953a7.105 7.105 0 0 0 3.753 1.157v-2.424z"/></svg>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xl font-black text-foreground tabular-nums">
                            R$ {( () => {
                              const p = parseFloat(salePrice || price || '0');
                              const cost = parseFloat(costs[0].value || '0');
                              const extra = costs.slice(1).reduce((acc, c) => acc + (parseFloat(c.value) || 0), 0);
                              const comm = Math.min(p * (taxSettings.tiktok_comm/100), taxSettings.tiktok_cap);
                              const res = p - cost - extra - comm - taxSettings.tiktok_fee;
                              return Math.max(0, res).toFixed(2).replace('.', ',');
                            })() }
                          </p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Lucro Líquido</p>
                        </div>
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className="bg-foreground text-background text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter shadow-lg">Info</div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[9px] text-muted-foreground text-center italic bg-muted/30 py-2 rounded-lg border border-dashed border-border/60">
                      * Tarifas base configuadas em <strong>Ajustes &gt; Integrações</strong>. <br />
                      Passe o mouse nos cards para detalhamento.
                    </p>
                  </div>
                </div>

                {/* --- TAB: LOGISTIC --- */}
                <div className={cn("space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== 'logistics' && "hidden")}>
                  <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Ruler size={20} />
                      </div>
                      <div>
                        <Label className="font-black text-sm uppercase text-foreground tracking-widest block">Dimensões & Frete</Label>
                        <p className="text-[10px] text-muted-foreground font-medium">Cálculos automáticos de logística</p>
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

                <div className={cn("space-y-4 animate-in fade-in zoom-in duration-300", activeTab !== 'media' && "hidden")}>
                  <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <PlayCircle size={24} />
                      </div>
                      <div>
                        <Label className="font-black text-sm uppercase text-foreground tracking-widest block">Mídias & Ativos Premium</Label>
                        <p className="text-[10px] text-muted-foreground font-medium">Gestão de vídeos e links de fabricação</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        {/* Compact Supplier Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:col-span-2 bg-muted/20 p-3 rounded-xl border border-border/40">
                          <div className="space-y-1">
                            <Label className="font-bold text-[9px] uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-1.5">Fornecedor</Label>
                            <div className="relative">
                              <Factory className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-50" />
                              <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Nome do Fornecedor" className="h-9 pl-8 text-xs font-bold bg-background/50 border-none shadow-none focus-visible:ring-1" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="font-bold text-[9px] uppercase text-muted-foreground tracking-widest ml-1 flex justify-between items-center">
                              Link
                              {supplierLink && <ExternalLink size={10} className="text-primary" />}
                            </Label>
                            <div className="relative">
                              <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-50" />
                              <Input value={supplierLink} onChange={e => setSupplierLink(e.target.value)} placeholder="https://..." className="h-9 pl-8 text-[10px] font-mono bg-background/50 border-none shadow-none focus-visible:ring-1" />
                            </div>
                          </div>
                        </div>

                        {/* Social Links Row */}
                        <div className="space-y-1.5 p-3 bg-[#f53d2d]/5 border border-[#f53d2d]/10 rounded-xl relative group/media">
                          <Label className="font-black text-[9px] uppercase text-[#f53d2d] tracking-widest block relative z-10">Shopee (1:1)</Label>
                          <div className="relative z-10 flex items-center">
                            <Link2 className="absolute left-2.5 h-3 w-3 text-[#f53d2d]/50" />
                            <Input 
                              value={shopeeVideo} 
                              onChange={e => setShopeeVideo(e.target.value)} 
                              placeholder="Link Drive/Vídeo..." 
                              className="h-8 pl-8 pr-8 text-[10px] font-mono bg-background/70 border-none focus-visible:ring-1 focus-visible:ring-[#f53d2d] w-full" 
                            />
                            {shopeeVideo && (
                              <a href={shopeeVideo.startsWith('http') ? shopeeVideo : `https://${shopeeVideo}`} target="_blank" rel="noopener noreferrer" className="absolute right-1.5 h-5 w-5 flex items-center justify-center bg-[#f53d2d] text-white rounded-md shadow-sm hover:scale-110 transition-all">
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5 p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl relative group/media">
                          <Label className="font-black text-[9px] uppercase text-purple-600 tracking-widest block relative z-10">Reels (9:16)</Label>
                          <div className="relative z-10 flex items-center">
                            <PlayCircle className="absolute left-2.5 h-3 w-3 text-purple-600/50" />
                            <Input 
                              value={reelsVideo} 
                              onChange={e => setReelsVideo(e.target.value)} 
                              placeholder="Link Reels/TikTok..." 
                              className="h-8 pl-8 pr-8 text-[10px] font-mono bg-background/70 border-none focus-visible:ring-1 focus-visible:ring-purple-500 w-full" 
                            />
                            {reelsVideo && (
                              <a href={reelsVideo.startsWith('http') ? reelsVideo : `https://${reelsVideo}`} target="_blank" rel="noopener noreferrer" className="absolute right-1.5 h-5 w-5 flex items-center justify-center bg-purple-600 text-white rounded-md shadow-sm hover:scale-110 transition-all">
                                <PlayCircle size={10} />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Extra Videos Dynamic List */}
                        <div className="md:col-span-2 space-y-2">
                           <div className="flex justify-between items-center">
                             <Label className="font-black text-[9px] uppercase text-muted-foreground tracking-widest ml-1">Mais Links de Vídeo</Label>
                             <button type="button" onClick={() => setExtraVideos(prev => [...prev, ''])} className="text-[9px] font-black uppercase text-primary hover:underline">+ Adicionar Link</button>
                           </div>
                           <div className="space-y-1.5">
                             {extraVideos.map((link, idx) => (
                               <div key={idx} className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
                                 <div className="relative flex-1">
                                   <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-50" />
                                   <Input 
                                      value={link} 
                                      onChange={e => {
                                        const next = [...extraVideos];
                                        next[idx] = e.target.value;
                                        setExtraVideos(next);
                                      }}
                                      placeholder="https://..." 
                                      className="h-8 pl-8 text-[10px] font-mono bg-muted/20 border-none shadow-none" 
                                   />
                                 </div>
                                 <button type="button" onClick={() => setExtraVideos(prev => prev.filter((_, i) => i !== idx))} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors">
                                   <X size={14} />
                                 </button>
                               </div>
                             ))}
                             {extraVideos.length === 0 && <p className="text-[9px] text-muted-foreground italic ml-1">Nenhum link extra adicionado.</p>}
                           </div>
                        </div>
                        
                        <div className="space-y-3 pt-3 md:col-span-2 border-t border-border/60 mt-2 bg-muted/40 p-4 rounded-xl relative group/renderer">
                           <div className="flex items-center justify-between">
                             <div>
                               <Label className="font-black text-[10px] uppercase text-foreground tracking-widest block flex items-center gap-1.5">
                                 <PlayCircle size={12} className="text-primary" /> Renderizador 10MB
                               </Label>
                             </div>
                             <p className="text-[9px] text-muted-foreground italic">Reduz vídeos pesados para a Shopee</p>
                           </div>

                           {!isOptimizingVideo && !optimizedVideoUrl && (
                             <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 p-6 rounded-xl bg-background/50 hover:border-primary/40 transition-all cursor-pointer relative">
                               {videoToOptimize ? (
                                  <div className="text-center font-black animate-in fade-in scale-95 duration-200">
                                    <div className="bg-muted px-4 py-2 rounded-lg mb-2 flex items-center gap-3">
                                      <PlayCircle className="text-primary h-4 w-4" />
                                      <div className="text-left">
                                        <p className="text-[10px] text-foreground truncate max-w-[140px]">{videoToOptimize.name}</p>
                                        <p className="text-[9px] text-muted-foreground">Original: {(videoToOptimize.size / (1024*1024)).toFixed(1)}MB</p>
                                      </div>
                                    </div>
                                    <Button 
                                       className="mt-1 h-9 w-full text-[10px] uppercase font-black bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform"
                                       onClick={(e) => { e.stopPropagation(); handleOptimizeVideo(); }}
                                    >Começar Renderização</Button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setVideoToOptimize(null); }} 
                                      className="mt-2 text-[9px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                                    >Escolher outro vídeo</button>
                                  </div>
                                ) : (
                                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                                    <input 
                                      type="file" 
                                      accept="video/*,.mov,.mp4" 
                                      className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                      onChange={e => setVideoToOptimize(e.target.files?.[0] || null)}
                                    />
                                    <div className="text-center">
                                      <ImageIcon className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2">Arraste o vídeo pesado aqui</p>
                                    </div>
                                  </div>
                                )}
                             </div>
                           )}

                           {isOptimizingVideo && (
                             <div className="space-y-4 py-4">
                               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                 <span className="flex items-center gap-2 anime-pulse"><Loader2 className="h-3 w-3 animate-spin text-primary" /> Processando...</span>
                                 <div className="flex items-center gap-3">
                                   <span>{optProgress}%</span>
                                   <button 
                                     type="button"
                                     onClick={handleCancelVideoOptimization}
                                     className="h-5 px-2 flex items-center justify-center bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 text-[8px] font-black uppercase rounded-md transition-all shadow-sm"
                                   >
                                     Cancelar
                                   </button>
                                 </div>
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
                              <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 flex flex-col items-center gap-4 animate-in zoom-in duration-300 shadow-sm relative overflow-hidden">
                                 {/* Reduction Badge */}
                                 {videoToOptimize && optimizedVideoSize && (
                                   <div className="absolute top-2 -right-12 bg-primary rotate-45 px-12 py-1 shadow-md">
                                     <span className="text-[9px] font-black text-white uppercase tracking-tighter">
                                       -{Math.round((1 - (optimizedVideoSize / videoToOptimize.size)) * 100)}% Economia
                                     </span>
                                   </div>
                                 )}

                                 <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                                   <CheckCircle2 className="text-primary h-6 w-6" />
                                 </div>

                                 <div className="text-center space-y-1">
                                   <p className="text-xs font-black text-foreground uppercase tracking-widest">Vídeo Shopee Pronto!</p>
                                   <div className="flex items-center justify-center gap-2 mt-2">
                                     <div className="px-2 py-1 bg-muted rounded-md border border-border/40">
                                       <p className="text-[8px] uppercase text-muted-foreground font-bold">Antes</p>
                                       <p className="text-[10px] font-mono text-muted-foreground line-through">{(videoToOptimize?.size || 0 / (1024*1024)).toFixed(1)}MB</p>
                                     </div>
                                     <div className="h-4 w-4 flex items-center justify-center text-primary/40">→</div>
                                     <div className="px-2 py-1 bg-primary/10 rounded-md border border-primary/20">
                                       <p className="text-[8px] uppercase text-primary font-bold">Agora</p>
                                       <p className="text-[10px] font-mono font-black text-primary">{( (optimizedVideoSize || 0) / (1024*1024)).toFixed(1)}MB</p>
                                     </div>
                                   </div>
                                 </div>

                                 <div className="flex gap-2 w-full">
                                    <Button 
                                      onClick={() => {
                                        const a = document.createElement('a');
                                        a.href = optimizedVideoUrl;
                                        a.download = videoToOptimize?.name.replace(/\.[^/.]+$/, "_otimizado.mp4") || "shopee_optimized.mp4";
                                        a.click();
                                      }}
                                      className="flex-1 h-9 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-[10px] font-black uppercase rounded-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                      <ArrowDownToLine size={14} /> Baixar
                                    </Button>
                                    
                                    <button 
                                      onClick={() => { 
                                        setOptimizedVideoUrl(null); 
                                        setVideoToOptimize(null); 
                                        setOptimizedVideoSize(null);
                                      }} 
                                      className="h-9 px-4 text-[10px] font-black uppercase border border-border rounded-lg hover:bg-muted transition-all active:scale-95"
                                    >
                                      Limpar
                                    </button>
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

                  <div className="space-y-4 pt-6 mt-4 border-t border-border/80">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <Label className="font-black text-[11px] uppercase text-foreground tracking-widest block flex items-center gap-2">
                          <Layers size={14} className="text-primary" /> Galeria da Peça
                        </Label>
                        <p className="text-[10px] text-muted-foreground">Arraste as fotos para definir a capa principal.</p>
                      </div>
                      {images.length > 0 && (
                        <Button 
                          type="button" 
                          onClick={handleDownloadAll} 
                          disabled={isZipping}
                          variant="outline" 
                          className="h-8 px-3 text-[10px] font-black uppercase flex items-center gap-2 border-primary/20 hover:bg-primary/5 text-primary"
                        >
                          {isZipping ? <Loader2 size={12} className="animate-spin" /> : <FolderArchive size={14} />}
                          {isZipping ? "Gerando..." : "Baixar Tudo (.zip)"}
                        </Button>
                      )}
                    </div>
                    
                    <div className="border-2 border-dashed border-border rounded-xl p-5 md:p-6 text-center bg-muted/20 hover:bg-muted/40 transition-colors relative cursor-pointer group shadow-inner">
                      <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none">
                        <ImageIcon className="h-8 w-8 opacity-80" />
                        <div>
                          <span className="text-sm md:text-base font-bold block text-foreground">Aperte para subir fotos</span>
                        </div>
                      </div>
                      <Input 
                        type="file" 
                        accept="image/*,.heic,.heif" 
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
                             <img src={getProxyUrl(img.preview) || ''} alt="preview" className="object-cover w-full h-full pointer-events-none" />
                             
                             {img.processing && (
                               <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 animate-in fade-in duration-300">
                                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                 <span className="text-[10px] font-black uppercase mt-2 text-primary tracking-widest">Otimizando...</span>
                               </div>
                             )}
                            
                            {idx === 0 && Array.isArray(images) && (
                              <div className="absolute top-0 left-0 right-0 bg-primary/95 backdrop-blur-sm text-primary-foreground text-[11px] text-center font-black py-1.5 z-10 shadow-sm uppercase tracking-widest pointer-events-none">Capa</div>
                            )}

                            <div className="absolute inset-x-0 bottom-0 top-0 bg-background/80 dark:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 z-20">
                              <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-30">
                                <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="h-8 w-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg">
                                  <X className="h-4 w-4" />
                                </button>
                                
                                {!img.processing && (
                                  <>
                                    <button 
                                      type="button" 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        const a = document.createElement('a'); 
                                        a.href = img.preview; 
                                        a.download = `foto-${idx+1}.jpg`; 
                                        a.click(); 
                                      }} 
                                      className="h-8 w-8 flex items-center justify-center bg-background/90 hover:bg-background text-foreground rounded-lg shadow-lg border border-border/40 transition-all hover:scale-105"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        window.open(img.preview, '_blank');
                                      }} 
                                      className="h-8 w-8 flex items-center justify-center bg-background/90 hover:bg-background text-foreground rounded-lg shadow-lg border border-border/40 transition-all hover:scale-105"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        navigator.clipboard.writeText(img.preview);
                                        success("Link da imagem copiado!");
                                      }} 
                                      className="h-8 w-8 flex items-center justify-center bg-background/90 hover:bg-background text-foreground rounded-lg shadow-lg border border-border/40 transition-all hover:scale-105"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                              
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
