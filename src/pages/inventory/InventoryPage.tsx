import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { Plus, Search, Image as ImageIcon, Loader2, PackageSearch, X, Grid, List, Trash2, Edit, GripHorizontal, ArrowDownToLine, Copy, CheckCircle2, AlertTriangle, Package, ExternalLink, PlayCircle, Barcode, Scale, Ruler, Link2, Factory, Tag, Tags, Coins, Percent, Eye, Download, MoreVertical, FolderArchive, Layers, Monitor, ShoppingBag, Maximize2, Minimize2, Bold, Italic, Heading, BadgeDollarSign, Truck } from 'lucide-react';
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
  updated_at?: string | null;
  category_id?: string | null;
  ean?: string | null;
  weight_g?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  shopee_item_id?: string | null;
  shopee_price?: number | null;
  tiktok_price?: number | null;
  supplier_name?: string | null;
  supplier_link?: string | null;
  media_assets?: {
    shopee_video?: string;
    reels_video?: string;
    extra_videos?: string[];
  };
  variations?: { name: string, type: 'size'|'color'|'style', stock?: number | null, image_url?: string }[] | null;
}

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const calculateROI = (salePrice: number, costPrice: number, platformFee: number = 0, platformCommPct: number = 0) => {
  const totalCost = costPrice + (salePrice * (platformCommPct / 100)) + platformFee;
  if (totalCost <= 0) return 0;
  return ((salePrice - totalCost) / totalCost) * 100;
};
const MAX_FILE_SIZE_INVENTORY = 3 * 1024 * 1024; // 3MB

export default function InventoryPage() {
  const { user } = useAuthStore();
  const { clearCache } = useDashboardStore();
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_desc' | 'price_asc'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [categories, setCategories] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'logistics' | 'media' | 'variations'>('basic');
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
  const [isDescFullscreen, setIsDescFullscreen] = useState(false);

  // Video Optimizer States
  const [videoToOptimize, setVideoToOptimize] = useState<File | null>(null);
  const [isOptimizingVideo, setIsOptimizingVideo] = useState(false);
  const [optProgress, setOptProgress] = useState(0);
  const [optimizedVideoUrl, setOptimizedVideoUrl] = useState<string | null>(null);
  const [optimizedVideoSize, setOptimizedVideoSize] = useState<number | null>(null);

  // Marketplace prices
  const [shopeePrice, setShopeePrice] = useState('');
  const [tiktokPrice, setTiktokPrice] = useState('');

  // Variations State
  const [variations, setVariations] = useState<{name: string, type: 'size'|'color'|'style', stock?: number | null, image_url?: string}[]>([]);
  const [newVarName, setNewVarName] = useState('');
  const [newVarStock, setNewVarStock] = useState<string>('');
  const [newVarType, setNewVarType] = useState<'size'|'color'|'style'>('size');
  const [isSelectingImageForVar, setIsSelectingImageForVar] = useState<number | null>(null);

  // Store settings for tax simulation
  const [taxSettings, setTaxSettings] = useState({
    shopee_comm: 20,
    shopee_fee: 4,
    shopee_cap: 100,
    shopee_markup: 20,
    tiktok_comm: 6,
    tiktok_fee: 4,
    tiktok_cap: 100,
    tiktok_markup: 6
  });

  // Description History (Undo)
  const descriptionHistory = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);
  const historyTimeout = useRef<NodeJS.Timeout | null>(null);

  const saveToHistory = useCallback((val: string) => {
    // If current value is same as last history, don't save
    if (descriptionHistory.current[historyIndex.current] === val) return;
    
    // Remote forward history if we were in middle of stack
    const newHistory = descriptionHistory.current.slice(0, historyIndex.current + 1);
    newHistory.push(val);
    
    // Limit history to 50 items
    if (newHistory.length > 50) newHistory.shift();
    
    descriptionHistory.current = newHistory;
    historyIndex.current = newHistory.length - 1;
  }, []);

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    
    // Debounce saving to history while typing (save every 1 second of inactivity)
    if (historyTimeout.current) clearTimeout(historyTimeout.current);
    historyTimeout.current = setTimeout(() => {
      saveToHistory(val);
    }, 1000);
  };

  const undoDescription = useCallback(() => {
    if (historyIndex.current > 0) {
      historyIndex.current -= 1;
      const prevVal = descriptionHistory.current[historyIndex.current];
      setDescription(prevVal);
    }
  }, []);

  // Initialize history when modal opens with existing description
  useEffect(() => {
    if (isModalOpen && descriptionHistory.current.length === 0) {
      descriptionHistory.current = [description || ''];
      historyIndex.current = 0;
    } else if (!isModalOpen) {
      // Clear history when closing modal
      descriptionHistory.current = [];
      historyIndex.current = -1;
    }
  }, [isModalOpen]);

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
        shopee_markup: data.shopee_markup_pct ?? 20,
        tiktok_comm: data.tiktok_commission_pct ?? 15,
        tiktok_fee: data.tiktok_fixed_fee ?? 4,
        tiktok_cap: data.tiktok_commission_cap ?? 100,
        tiktok_markup: data.tiktok_markup_pct ?? 15
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
    .filter(p => {
      if (categoryFilter !== 'all') return p.category_id === categoryFilter;
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
    setShopeePrice('');
    setTiktokPrice('');
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
    setShopeePrice(p.shopee_price ? p.shopee_price.toString() : '');
    setTiktokPrice(p.tiktok_price ? p.tiktok_price.toString() : '');
    setVariations(p.variations || []);
    
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
    // Stock só é obrigatório se não houver variações (se houver, o estoque é por variação)
    if (variations.length === 0 && (!stock || parseInt(stock, 10) < 0)) {
      toastError('Informe a quantidade em estoque (ou adicione variações com estoque individual).');
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

      const payload: any = {
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
        shopee_price: shopeePrice ? parseFloat(shopeePrice) : null,
        tiktok_price: tiktokPrice ? parseFloat(tiktokPrice) : null,
        media_assets: {
          shopee_video: shopeeVideo || null,
          reels_video: reelsVideo || null,
          extra_videos: extraVideos.filter(v => v.trim() !== '')
        },
        variations: variations.length > 0 ? variations.map(v => {
           if (!v.image_url) return v;
           const imgIndex = images.findIndex(img => img.preview === v.image_url);
           if (imgIndex !== -1 && finalImageUrls[imgIndex]) {
              return { ...v, image_url: finalImageUrls[imgIndex] };
           }
           if (v.image_url.startsWith('http')) return v;
           return { ...v, image_url: null };
        }) : null,
        user_id: user.id
      };

      // Perform a single, robust save attempt
      if (editingProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
      }

      success(editingProduct ? 'Produto salvo!' : 'Produto cadastrado!');
      clearCache(); // Invalidate dashboard cache
      setIsModalOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error("Save error:", error);
      let msg = error.message || 'Verifique sua conexão e os dados inseridos.';
      
      // Handle missing column errors gracefully
      if (msg.toLowerCase().includes('column') || msg.toLowerCase().includes('schema cache')) {
        msg = "Erro de Sincronização: Colunas faltando no seu Supabase. Verifique o arquivo FIX_DATABASE_COLUMNS.sql na raiz do projeto e execute-o no SQL Editor do Supabase.";
      }
      
      toastError('Erro ao salvar produto: ' + msg);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setName('');
    setSku('');
    setDescription('');
    // History reset
    descriptionHistory.current = [''];
    historyIndex.current = 0;
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
    setShopeePrice('');
    setTiktokPrice('');
    setDraggedIdx(null);
    setVariations([]);
    setNewVarName('');
    setNewVarType('size');
  }

  function applyFormat(format: 'bold' | 'italic' | 'big', inputId: string = 'descTextarea') {
    const el = document.getElementById(inputId) as HTMLTextAreaElement;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = description.slice(start, end);
    
    // If no selection, we don't do anything or we could insert placeholders
    if (start === end) {
      let placeholder = '';
      let cursorOffset = 0;
      if (format === 'bold') { placeholder = '****'; cursorOffset = 2; }
      else if (format === 'italic') { placeholder = '**'; cursorOffset = 1; }
      else if (format === 'big') { placeholder = '++++'; cursorOffset = 2; }
      
      const newVal = description.slice(0, start) + placeholder + description.slice(end);
      setDescription(newVal);
      saveToHistory(newVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + cursorOffset, start + cursorOffset);
      }, 0);
      return;
    }
    
    let wrapped = '';
    if (format === 'bold') wrapped = `**${selected}**`;
    else if (format === 'italic') wrapped = `*${selected}*`;
    else if (format === 'big') wrapped = `++${selected}++`;
    
    const newVal = description.slice(0, start) + wrapped + description.slice(end);
    setDescription(newVal);
    saveToHistory(newVal);
    
    // Maintain focus and update selection
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + wrapped.length);
    }, 0);
  }

  const handleDescKeyDown = (e: React.KeyboardEvent, inputId: string) => {
    // CTRL + Z or CMD + Z for Undo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undoDescription();
    }
    // CTRL + B or CMD + B for Bold
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      applyFormat('bold', inputId);
    }
    // CTRL + I or CMD + I for Italic
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      applyFormat('italic', inputId);
    }
    // ALT + U for Big (Heading-like highlight)
    if (e.altKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      applyFormat('big', inputId);
    }
    // ESC to exit fullscreen
    if (e.key === 'Escape' && isDescFullscreen) {
      setIsDescFullscreen(false);
    }
  };

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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Todas as Categorias</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

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
                        <img src={displayImage} alt={product.name} className={cn("object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out", product.stock_quantity <= 0 && "opacity-40 grayscale")} />
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

                      {product.cost_price <= 0 && (
                        <div className="absolute bottom-2 right-2 bg-amber-500/90 text-white text-[9px] font-black px-2 py-1.5 rounded-md flex items-center gap-1.5 backdrop-blur-md border border-amber-400/30 shadow-sm animate-in fade-in duration-500" title="Custo não cadastrado">
                          <AlertTriangle size={10} className="animate-pulse" /> SEM CUSTO
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
                           <div className="flex items-center gap-1.5 mb-1">
                             <div className={cn("px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter border", 
                               (currentPrice - product.cost_price) > 0 ? "text-emerald-600 border-emerald-500/20 bg-emerald-500/5" : "text-red-600 border-red-500/20 bg-red-500/5")}>
                               {fmt(currentPrice - product.cost_price)}
                             </div>
                             {product.cost_price > 0 ? (
                               <div className={cn("px-1 py-0.5 rounded-[4px] text-[8px] font-black tracking-widest border",
                                 calculateROI(currentPrice, product.cost_price) > 30 ? "bg-emerald-500 text-white border-emerald-600" : "bg-orange-500 text-white border-orange-600")}>
                                 {calculateROI(currentPrice, product.cost_price).toFixed(0)}% ROI
                               </div>
                             ) : (
                               <div className="flex items-center gap-1 text-[8px] font-black text-amber-600 px-1.5 py-0.5 rounded-full bg-amber-500/5 border border-amber-500/20" title="Custo Ausente">
                                 <AlertTriangle size={10} className="animate-pulse" />
                               </div>
                             )}
                           </div>
                           <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
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
                             <img src={displayImage} alt={product.name} className={cn("object-cover w-full h-full", product.stock_quantity <= 0 && "opacity-40 grayscale")} />
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
                         {product.cost_price > 0 && (
                            <div className={cn("mt-1 px-1.5 py-0.5 rounded-[4px] text-[8px] font-black tracking-widest border",
                              calculateROI(currentPrice, product.cost_price) > 30 ? "bg-emerald-500 text-white border-emerald-600" : "bg-orange-500 text-white border-orange-600")}>
                              {calculateROI(currentPrice, product.cost_price).toFixed(0)}% ROI
                            </div>
                         )}
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
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => {setIsModalOpen(false); resetForm();}} />
          
          <div className="bg-card w-full max-w-5xl md:rounded-2xl shadow-2xl border-t md:border border-border flex flex-col z-10 h-[92dvh] md:h-auto md:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-6 md:zoom-in-95 duration-300">
            {/* ── HEADER ── */}
            <div className="px-5 py-4 border-b border-border bg-card flex justify-between items-center shrink-0">
              {/* Mobile drag handle */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-border rounded-full md:hidden" />
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Package size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black tracking-tight text-foreground truncate max-w-[220px] md:max-w-lg">
                    {editingProduct ? editingProduct.name : 'Nova Peça'}
                  </h3>
                  {editingProduct ? (
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      Editado: {new Date(editingProduct.updated_at || editingProduct.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  ) : (
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gestão de Ativos &amp; Lucratividade</p>
                  )}
                </div>
              </div>
              <button onClick={() => {setIsModalOpen(false); resetForm();}} className="h-9 w-9 flex items-center justify-center hover:bg-muted rounded-xl transition-all group shrink-0 ml-2">
                <X size={18} className="text-muted-foreground group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* ── BODY: Sidebar + Content ── */}
            <div className="flex flex-1 overflow-hidden">
              
              {/* ── Left Sidebar: Vertical Tabs (desktop only) ── */}
              <div className="hidden md:flex flex-col w-52 bg-muted/20 border-r border-border p-3 gap-1 shrink-0">
                {[
                  { id: 'basic',      icon: Tag,          label: 'Informações',  emoji: '📝', hint: name || 'Nome...' },
                  { id: 'pricing',    icon: BadgeDollarSign, label: 'Lucros',     emoji: '💸', hint: price ? `R$ ${price}` : 'Preço...' },
                  { id: 'logistics',  icon: Truck,         label: 'Frete',        emoji: '📦', hint: `${weight}g` },
                  { id: 'media',      icon: ImageIcon,     label: 'Mídia',        emoji: '🎥', hint: `${images.length} foto${images.length !== 1 ? 's': ''}` },
                  { id: 'variations', icon: Tags,          label: 'Opções',      emoji: '✨', hint: variations.length > 0 ? `${variations.length} variação` : 'Sem variações' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group",
                      activeTab === tab.id
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <tab.icon size={15} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-black uppercase tracking-widest leading-none">{tab.label}</div>
                      <div className={cn("text-[9px] font-medium truncate mt-0.5", activeTab === tab.id ? 'opacity-60' : 'opacity-50')}>{tab.hint}</div>
                    </div>
                  </button>
                ))}

                {/* Quick save shortcut */}
                <div className="mt-auto pt-3 border-t border-border/40">
                  <div className="text-[9px] text-muted-foreground/50 text-center font-bold uppercase tracking-widest">
                    {variations.length > 0 ? `${variations.length} variação ativa` : 'Sem variações'}
                  </div>
                </div>
              </div>

              {/* ── Right: Scrollable Content ── */}
              <div className="flex flex-col flex-1 overflow-hidden">

                {/* Mobile tabs (horizontal pills) */}
                <div className="md:hidden sticky top-0 z-[60] bg-background border-b border-border shadow-sm px-4 py-2.5">
                  <div className="flex flex-nowrap overflow-x-auto gap-1 bg-muted/30 p-1 rounded-xl no-scrollbar">
                    {['basic', 'pricing', 'logistics', 'media', 'variations'].map(tab => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab as any)}
                        className={cn(
                          "flex-1 text-[10px] uppercase font-black tracking-widest py-2 px-3 rounded-lg transition-all whitespace-nowrap min-w-[70px]",
                          activeTab === tab
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        )}
                      >
                        {tab === 'basic' && 'Info 📝'}
                        {tab === 'pricing' && 'Lucros 💸'}
                        {tab === 'logistics' && 'Frete 📦'}
                        {tab === 'media' && 'Mídia 🎥'}
                        {tab === 'variations' && 'Opções ✨'}
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
                </div>
                  <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm flex flex-col gap-3 group/desc relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-black text-[10px] uppercase text-foreground/80 tracking-widest block flex items-center gap-2">
                           Descrição da Peça
                        </Label>
                        <p className="text-[10px] text-muted-foreground font-medium">Destaque os diferenciais e materiais do produto.</p>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col border border-border/60 bg-background/50 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all shadow-inner">
                      <div className="flex items-center justify-between bg-muted/30 border-b border-border/40 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <button type="button" className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground active:scale-95" onClick={() => applyFormat('bold', 'descTextarea')} title="Negrito (Ctrl+B)">
                            <Bold size={14} />
                          </button>
                          <button type="button" className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground active:scale-95" onClick={() => applyFormat('italic', 'descTextarea')} title="Itálico (Ctrl+I)">
                            <Italic size={14} />
                          </button>
                          <button type="button" className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground active:scale-95" onClick={() => applyFormat('big', 'descTextarea')} title="Título (Alt+U)">
                            <Heading size={14} />
                          </button>
                        </div>
                        <button type="button" onClick={() => setIsDescFullscreen(true)} className="h-7 px-3 flex items-center gap-1.5 bg-background shadow-sm border border-border/60 text-muted-foreground hover:text-foreground rounded-md transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest" title="Modo Foco Profissional (Tela Cheia)">
                          <Maximize2 size={12} /> Expandir
                        </button>
                      </div>
                      <textarea
                        id="descTextarea"
                        value={description}
                        onChange={e => handleDescriptionChange(e.target.value)}
                        onKeyDown={(e) => handleDescKeyDown(e, 'descTextarea')}
                        placeholder="Ex: Peça produzida em aço inoxidável com banho de ouro 18k..."
                        className="w-full px-5 py-5 text-sm font-medium bg-transparent text-foreground outline-none resize-none min-h-[300px] leading-relaxed custom-scrollbar"
                      />
                    </div>
                  </div>
                </div>

                <div className={cn("space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== 'pricing' && "hidden")}>
                  
                  {/* ── COST STRUCTURE ── */}
                  <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-border/40 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                          <Scale size={20} />
                        </div>
                        <div>
                          <Label className="font-black text-sm uppercase text-foreground tracking-widest block flex items-center gap-2">
                            Estrutura de Custos
                            {totalCost <= 0 && (
                              <span className="flex items-center gap-1 text-[8px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                                <AlertTriangle size={8} /> Custo não definido
                              </span>
                            )}
                          </Label>
                          <p className="text-[10px] text-muted-foreground font-medium">Insumos, impostos e taxas</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setCosts([...costs, { label: '', value: '' }])} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all active:scale-95"
                      >
                        <Plus className="h-3 w-3" /> Adicionar
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
                                  type="number" step="0.01" value={c.value} 
                                  onChange={e => { const nc = [...costs]; nc[idx].value = e.target.value; setCosts(nc); }} 
                                  placeholder="0,00" 
                                  className="h-9 pl-6 text-xs font-black bg-muted/5 border-none shadow-none focus-visible:ring-0 focus-visible:bg-muted/10" 
                               />
                             </div>
                          </div>
                          {costs.length > 1 && (
                            <button type="button" onClick={() => setCosts(costs.filter((_, i) => i !== idx))} className="h-8 w-8 flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── ESTOQUE ── */}
                  <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm">
                    {variations.length > 0 ? (
                      <>
                        <Label className="font-bold text-[10px] uppercase text-foreground/70 tracking-widest block ml-1 mb-2">
                          Estoque Disponível <span className="text-muted-foreground">(Opcional — Gerenciado por Variação)</span>
                        </Label>
                        <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                          <Layers size={16} className="text-blue-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] font-black text-blue-600 dark:text-blue-400">Estoque controlado por variação</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Este produto tem {variations.length} variação{variations.length > 1 ? 'ões' : ''} ativa{variations.length > 1 ? 's' : ''}. 
                              Defina o estoque individual de cada cor/modelo na aba <strong>Opções ✨</strong>.
                              O campo abaixo é opcional (usado como estoque geral/reserva).
                            </p>
                          </div>
                        </div>
                        <div className="relative group/input mt-3">
                          <PackageSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-60" />
                          <Input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="Estoque geral (opcional)" className="h-12 pl-11 text-base font-black bg-background/50 border-border/60 focus-visible:ring-primary transition-all" />
                        </div>
                      </>
                    ) : (
                      <>
                        <Label className="font-bold text-[10px] uppercase text-foreground/70 tracking-widest block ml-1 mb-2">Estoque Disponível <span className="text-[#f53d2d]">*</span></Label>
                        <div className="relative group/input">
                          <PackageSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-60" />
                          <Input type="number" required value={stock} onChange={e => setStock(e.target.value)} placeholder="1" className="h-12 pl-11 text-base font-black bg-background/50 border-border/60 focus-visible:ring-primary transition-all" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── PREÇOS POR CANAL ── */}
                  <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Monitor size={20} />
                      </div>
                      <div>
                        <Label className="font-black text-sm uppercase text-foreground tracking-widest block">Preços por Canal de Venda</Label>
                        <p className="text-[10px] text-muted-foreground font-medium">Define o preço em cada plataforma e veja o lucro em tempo real</p>
                      </div>
                    </div>

                    {/* ── SITE (Site price = public price or promo) ── */}
                    {(() => {
                      const siteP = parseFloat(salePrice || price || '0');
                      const siteCost = costs.reduce((acc, c) => acc + (parseFloat(c.value) || 0), 0);
                      const siteProfit = siteP - siteCost;
                      const siteColor = siteProfit > 0 ? 'text-emerald-500' : siteProfit < 0 ? 'text-red-500' : 'text-muted-foreground';
                      return (
                        <div className="p-4 rounded-2xl bg-primary/5 border-2 border-primary/20">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Monitor size={14} className="text-primary" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-primary tracking-widest">Site / Catálogo</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className={`text-[10px] font-black tabular-nums ${siteProfit > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {calculateROI(siteP, siteCost).toFixed(1)}% ROI
                                </p>
                                <p className="text-[7px] text-muted-foreground uppercase font-bold">Rentabilidade</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-black tabular-nums ${siteColor}`}>
                                  {siteProfit >= 0 ? '+' : ''}R$ {siteProfit.toFixed(2).replace('.', ',')}
                                </p>
                                <p className="text-[8px] text-muted-foreground uppercase font-bold">Lucro Líquido</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="font-bold text-[10px] uppercase text-foreground/70 tracking-widest block ml-1">Preço Público <span className="text-[#f53d2d]">*</span></Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">R$</span>
                                <Input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="h-11 pl-9 text-base font-black bg-background border-border/60 focus-visible:ring-primary" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="font-bold text-[10px] uppercase text-primary/70 tracking-widest block ml-1">Preço Promoção</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-primary/50">R$</span>
                                <Input type="number" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="0.00" className="h-11 pl-9 text-base font-black border-primary/30 bg-primary/5 focus-visible:ring-primary text-primary" />
                              </div>
                            </div>
                          </div>

                          {salePrice && parseFloat(salePrice) > 0 && parseFloat(salePrice) < parseFloat(price || '0') && (
                            <p className="text-[9px] text-primary font-bold mt-2 ml-1">
                              Desconto de {Math.round(((parseFloat(price) - parseFloat(salePrice)) / parseFloat(price)) * 100)}% ativo ✓
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── SHOPEE ── */}
                    {(() => {
                      const baseP = parseFloat(salePrice || price || '0');
                      const totalCosts = costs.reduce((acc, c) => acc + (parseFloat(c.value) || 0), 0);
                      // If user typed a shopee price, use it. Otherwise use site price to show real fee impact.
                      const shopeeP = shopeePrice && parseFloat(shopeePrice) > 0
                        ? parseFloat(shopeePrice)
                        : baseP;
                      const comm = shopeeP * (taxSettings.shopee_comm / 100);
                      const shopeeProfit = shopeeP - totalCosts - comm - taxSettings.shopee_fee;
                      const shopeeColor = shopeeProfit > 0 ? 'text-emerald-500' : shopeeProfit < 0 ? 'text-red-500' : 'text-muted-foreground';
                      // Suggested price that yields the same net profit as the site
                      const autoSugg = (baseP + taxSettings.shopee_fee) / (1 - (taxSettings.shopee_comm / 100));
                      const suggestedDisplay = Math.max(autoSugg, baseP * (1 + taxSettings.shopee_markup / 100));
                      return (
                        <div className="p-4 rounded-2xl bg-[#f53d2d]/5 border-2 border-[#f53d2d]/20">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-[#f53d2d]/10 flex items-center justify-center">
                                <ShoppingBag size={14} className="text-[#f53d2d]" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-[#f53d2d] tracking-widest">Shopee</span>
                              <span className="text-[8px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">{taxSettings.shopee_comm}% + R${taxSettings.shopee_fee}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className={`text-[10px] font-black tabular-nums ${shopeeProfit > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {calculateROI(shopeeP, totalCosts, taxSettings.shopee_fee, taxSettings.shopee_comm).toFixed(1)}% ROI
                                </p>
                                <p className="text-[7px] text-muted-foreground uppercase font-bold">Rentabilidade</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-black tabular-nums ${shopeeColor}`}>
                                  {shopeeProfit >= 0 ? '+' : ''}R$ {shopeeProfit.toFixed(2).replace('.', ',')}
                                </p>
                                <p className="text-[8px] text-muted-foreground uppercase font-bold">Lucro Líquido</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Deduction breakdown */}
                          <div className="flex gap-2 text-[8px] font-bold text-muted-foreground mb-4">
                            <span className="bg-muted/50 px-1.5 py-0.5 rounded">Venda: R${shopeeP.toFixed(2)}</span>
                            <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">−Comissão: R${comm.toFixed(2)}</span>
                            <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">−Taxa: R${taxSettings.shopee_fee}</span>
                            <span className="bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded">−Custos: R${totalCosts.toFixed(2)}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between ml-1">
                              <Label className="font-bold text-[10px] uppercase text-[#f53d2d]/70 tracking-widest">Preço na Shopee</Label>
                              <button type="button" onClick={() => setShopeePrice(suggestedDisplay.toFixed(2))} className="text-[8px] font-black text-[#f53d2d]/60 hover:text-[#f53d2d] underline underline-offset-2">
                                Sugestão: R$ {suggestedDisplay.toFixed(2).replace('.', ',')}
                              </button>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#f53d2d]/50">R$</span>
                              <Input type="number" step="0.01" value={shopeePrice} onChange={e => setShopeePrice(e.target.value)} placeholder={baseP > 0 ? baseP.toFixed(2) : '0.00'} className="h-11 pl-9 text-base font-black border-[#f53d2d]/30 bg-[#f53d2d]/5 focus-visible:ring-[#f53d2d] text-[#f53d2d]" />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── TIKTOK ── */}
                    {(() => {
                      const baseP = parseFloat(salePrice || price || '0');
                      const totalCosts = costs.reduce((acc, c) => acc + (parseFloat(c.value) || 0), 0);
                      // If user typed a tiktok price, use it. Otherwise use site price to show real fee impact.
                      const tiktokP = tiktokPrice && parseFloat(tiktokPrice) > 0
                        ? parseFloat(tiktokPrice)
                        : baseP;
                      const comm = tiktokP * (taxSettings.tiktok_comm / 100);
                      const tiktokProfit = tiktokP - totalCosts - comm - taxSettings.tiktok_fee;
                      const tiktokColor = tiktokProfit > 0 ? 'text-emerald-500' : tiktokProfit < 0 ? 'text-red-500' : 'text-muted-foreground';
                      // Suggested price that yields the same net profit as the site
                      const autoSugg = (baseP + taxSettings.tiktok_fee) / (1 - (taxSettings.tiktok_comm / 100));
                      const suggestedTiktok = Math.max(autoSugg, baseP * (1 + taxSettings.tiktok_markup / 100));
                      return (
                        <div className="p-4 rounded-2xl bg-black/5 border-2 border-black/10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-black/10 flex items-center justify-center">
                                <svg className="h-3.5 w-3.5 text-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.67c0 2.106-1.707 3.813-3.813 3.813-2.106 0-3.813-1.707-3.813-3.813 0-2.106 1.707-3.813 3.813-3.813h1.341V8.423H10.01s-5.83.172-5.83 7.247c0 7.075 5.83 7.247 5.83 7.247s5.83.172 5.83-7.247V7.953a7.105 7.105 0 0 0 3.753 1.157v-2.424z"/></svg>
                              </div>
                              <span className="text-[10px] font-black uppercase text-foreground tracking-widest">TikTok Shop</span>
                              <span className="text-[8px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">{taxSettings.tiktok_comm}% + R${taxSettings.tiktok_fee}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className={`text-[10px] font-black tabular-nums ${tiktokProfit > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {calculateROI(tiktokP, totalCosts, taxSettings.tiktok_fee, taxSettings.tiktok_comm).toFixed(1)}% ROI
                                </p>
                                <p className="text-[7px] text-muted-foreground uppercase font-bold">Rentabilidade</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-black tabular-nums ${tiktokColor}`}>
                                  {tiktokProfit >= 0 ? '+' : ''}R$ {tiktokProfit.toFixed(2).replace('.', ',')}
                                </p>
                                <p className="text-[8px] text-muted-foreground uppercase font-bold">Lucro Líquido</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Deduction breakdown */}
                          <div className="flex gap-2 text-[8px] font-bold text-muted-foreground mb-4">
                            <span className="bg-muted/50 px-1.5 py-0.5 rounded">Venda: R${tiktokP.toFixed(2)}</span>
                            <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">−Comissão: R${comm.toFixed(2)}</span>
                            <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">−Taxa: R${taxSettings.tiktok_fee}</span>
                            <span className="bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded">−Custos: R${totalCosts.toFixed(2)}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between ml-1">
                              <Label className="font-bold text-[10px] uppercase text-foreground/70 tracking-widest">Preço no TikTok</Label>
                              <button type="button" onClick={() => setTiktokPrice(suggestedTiktok.toFixed(2))} className="text-[8px] font-black text-foreground/40 hover:text-foreground underline underline-offset-2">
                                Sugestão: R$ {suggestedTiktok.toFixed(2).replace('.', ',')}
                              </button>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-foreground/40">R$</span>
                              <Input type="number" step="0.01" value={tiktokPrice} onChange={e => setTiktokPrice(e.target.value)} placeholder={baseP > 0 ? baseP.toFixed(2) : '0.00'} className="h-11 pl-9 text-base font-black border-black/20 bg-black/5 focus-visible:ring-black dark:focus-visible:ring-white text-foreground" />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <p className="text-[9px] text-muted-foreground text-center italic bg-muted/30 py-2 rounded-lg border border-dashed border-border/60">
                      * Taxas configuradas em <strong>Ajustes &gt; Integrações</strong>. Lucro = Preço − Custos − Taxas da plataforma.
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

                <div className={cn("space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== 'variations' && "hidden")}>
                  <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                      <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-inner">
                        <Tags size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className="font-black text-sm uppercase text-foreground tracking-widest block">Modelos, Cores e Tamanhos</Label>
                          <span className="bg-primary text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg">v1.5.1-FINAL-FIX</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium">As variações do produto na vitrine</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end bg-background/50 p-4 border border-border/40 rounded-xl">
                       <div className="space-y-1.5 md:col-span-3">
                         <Label className="text-[9px] font-black tracking-widest uppercase text-muted-foreground ml-1">Tipo de Variação</Label>
                         <select 
                           value={newVarType} 
                           onChange={e => setNewVarType(e.target.value as any)}
                           className="h-10 w-full px-3 bg-background border border-border/60 text-foreground rounded-lg text-sm font-bold focus:ring-1 focus:ring-primary shadow-sm outline-none"
                         >
                           <option value="size">Tamanho / Aro</option>
                           <option value="color">Cor / Banho</option>
                           <option value="style">Modelo / Estilo</option>
                         </select>
                       </div>
                       <div className="space-y-1.5 md:col-span-3">
                         <Label className="text-[9px] font-black tracking-widest uppercase text-muted-foreground ml-1">Descrição</Label>
                         <Input 
                           value={newVarName} 
                           onChange={e => setNewVarName(e.target.value)} 
                           placeholder="Ex: Aro 17, Ouro 18k..." 
                           onKeyDown={e => {
                             if(e.key==='Enter') {
                               e.preventDefault();
                               if(newVarName.trim()) { 
                                 setVariations([...variations, {name: newVarName.trim(), type: newVarType, stock: parseInt(newVarStock) || 0}]); 
                                 setNewVarName(''); 
                                 setNewVarStock(''); 
                               }
                             }
                           }}
                           className="h-10 text-sm font-bold shadow-none border-border/60 text-foreground" 
                         />
                       </div>
                       <div className="space-y-1.5 md:col-span-1">
                         <Label className="text-[9px] font-black tracking-widest uppercase text-muted-foreground ml-1">Estoque</Label>
                         <Input 
                           type="number"
                           value={newVarStock} 
                           onChange={e => setNewVarStock(e.target.value)} 
                           placeholder="0" 
                           className="h-10 text-sm font-bold shadow-none border-border/60 text-foreground" 
                         />
                       </div>
                       <div className="md:col-span-1">
                         <Button 
                           type="button" 
                           onClick={() => {
                             if(newVarName.trim()) {
                               setVariations([...variations, {name: newVarName.trim(), type: newVarType, stock: parseInt(newVarStock) || 0}]);
                               setNewVarName('');
                               setNewVarStock('');
                             }
                           }}
                           className="w-full h-10 font-black text-[10px] uppercase tracking-widest bg-foreground text-background shadow-md hover:scale-[1.02] active:scale-95 transition-all"
                         >
                           + Inserir
                         </Button>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                      {variations.length === 0 ? (
                        <div className="col-span-full border border-dashed border-border/60 rounded-xl bg-muted/20 flex flex-col items-center justify-center text-muted-foreground opacity-50 py-10 min-h-[150px]">
                          <Tags size={32} className="mb-3 opacity-60" />
                          <span className="text-xs font-black uppercase tracking-widest text-center">Nenhuma variação adicionada</span>
                          <span className="text-[10px] font-medium text-center mt-1">Insira tamanhos, cores ou modelos acima</span>
                        </div>
                      ) : (
                        variations.map((v, i) => (
                          <div key={i} className="relative flex flex-col bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 animate-in zoom-in group">
                             {/* Variation Image Area */}
                             <div 
                               onClick={() => setIsSelectingImageForVar(i)}
                               className="w-full aspect-[4/3] bg-muted/30 flex flex-col items-center justify-center border-b border-border/40 cursor-pointer relative overflow-hidden group/img"
                             >
                               {v.image_url ? (
                                  <>
                                    <img src={getProxyUrl(v.image_url) || v.image_url} alt={v.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                       <span className="text-[9px] font-black text-white uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30">Trocar Foto</span>
                                    </div>
                                  </>
                               ) : (
                                  <div className="flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition-colors opacity-60 hover:opacity-100">
                                    <ImageIcon strokeWidth={1.5} className="h-6 w-6 mb-1.5"/>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-center px-2">Vincular Galeria</span>
                                  </div>
                               )}
                             </div>
                             
                             {/* Variation Info Area */}
                             <div className="p-3 bg-background flex flex-col gap-1 relative">
                                <span className={cn(
                                   "absolute -top-3.5 right-2 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white rounded-md shadow-md shadow-black/10 flex items-center shrink-0",
                                   v.type === 'size' ? "bg-blue-500" : v.type === 'color' ? "bg-amber-500" : "bg-violet-500"
                                )}>
                                   {v.type === 'size' ? 'Taman.' : v.type === 'color' ? 'Cor' : 'Estilo'}
                                </span>

                                <p className="text-[11px] font-black uppercase tracking-widest text-foreground truncate pr-6 mt-1" title={v.name}>{v.name}</p>
                                
                                <div className="mt-2 pt-2 border-t border-border/20">
                                  <div className="flex items-center justify-between mb-1 px-0.5">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Estoque Disponível</span>
                                    <Package size={10} className="text-primary/60" />
                                  </div>
                                  <div className="relative group/input">
                                    <input 
                                      type="number" 
                                      placeholder="Ex: 10"
                                      value={v.stock ?? ''}
                                      onChange={e => {
                                        const val = e.target.value === '' ? null : parseInt(e.target.value);
                                        const next = [...variations];
                                        next[i] = { ...next[i], stock: val };
                                        setVariations(next);
                                      }}
                                      className="w-full bg-background/50 border border-border/60 rounded-lg py-1.5 px-2.5 text-[10px] font-bold outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all group-hover/input:border-primary/30"
                                    />
                                  </div>
                                </div>
                                
                                <button type="button" onClick={() => setVariations(variations.filter((_, idx) => idx !== i))} className="absolute top-3 right-2 w-6 h-6 flex items-center justify-center bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors" title="Remover Variação">
                                  <Trash2 size={12} />
                                </button>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                    {/* SELECTOR MODAL PARA VARIACOES */}
                    {isSelectingImageForVar !== null && (
                      <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300" onClick={() => setIsSelectingImageForVar(null)}>
                        <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                          <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/10">
                            <div>
                               <h3 className="font-black text-sm uppercase tracking-widest">Selecione uma Foto da Galeria</h3>
                               <p className="text-[10px] text-muted-foreground mt-0.5">Vincule uma imagem e defina o estoque da variação "{variations[isSelectingImageForVar]?.name}"</p>
                            </div>
                            <button onClick={() => setIsSelectingImageForVar(null)} className="h-8 w-8 flex items-center justify-center bg-background border border-border rounded-full hover:bg-muted transition-colors"><X size={14} /></button>
                          </div>

                          <div className="p-4 bg-primary/5 border-b border-border/40 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center border border-border/60">
                                <Package className="text-primary" size={18} />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estoque Desta Variação</p>
                                <p className="text-xs font-bold">{variations[isSelectingImageForVar]?.name}</p>
                              </div>
                            </div>
                            <div className="w-40 relative">
                                <input 
                                  type="number" 
                                  placeholder="Qtd Disponível"
                                  value={variations[isSelectingImageForVar]?.stock ?? ''}
                                  onChange={e => {
                                    const val = e.target.value === '' ? null : parseInt(e.target.value);
                                    const next = [...variations];
                                    if (isSelectingImageForVar !== null) {
                                      next[isSelectingImageForVar] = { ...next[isSelectingImageForVar], stock: val };
                                      setVariations(next);
                                    }
                                  }}
                                  className="w-full bg-background border-2 border-primary/20 rounded-xl py-2.5 px-4 text-sm font-black outline-none focus:border-primary transition-all text-center"
                                />
                                <div className="absolute -top-2 -right-2 bg-primary text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg">Definir Qtd</div>
                            </div>
                          </div>
                          
                          <div className="p-4 overflow-y-auto max-h-[60vh] bg-background">
                            {images.length === 0 ? (
                               <div className="text-center py-12">
                                 <ImageIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                 <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Sua galeria está vazia</p>
                                 <p className="text-[10px] text-muted-foreground mt-1">Lembre-se de anexar e salvar todas as fotos do produto na área inferior antes de vincular.</p>
                               </div>
                            ) : (
                               <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                 {images.map((img, idx) => (
                                   <div 
                                     key={idx} 
                                     onClick={() => {
                                        const nextVars = [...variations];
                                        nextVars[isSelectingImageForVar] = { ...nextVars[isSelectingImageForVar], image_url: img.preview };
                                        setVariations(nextVars);
                                        setIsSelectingImageForVar(null);
                                     }}
                                     className="relative aspect-square border-2 border-transparent hover:border-primary rounded-xl overflow-hidden cursor-pointer group transition-all shadow-sm"
                                   >
                                      <img src={getProxyUrl(img.preview) || img.preview} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                         <CheckCircle2 strokeWidth={3} className="text-white h-8 w-8 drop-shadow-md" />
                                      </div>
                                   </div>
                                 ))}
                               </div>
                            )}
                          </div>

                          <div className="p-4 border-t border-border/50 bg-muted/10 flex justify-end gap-3">
                            <button onClick={() => {
                               const nextVars = [...variations];
                               nextVars[isSelectingImageForVar] = { ...nextVars[isSelectingImageForVar], image_url: undefined };
                               setVariations(nextVars);
                               setIsSelectingImageForVar(null);
                            }} className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-red-500 outline-none transition-colors">
                              Desvincular Imagem Atual
                            </button>
                            <button onClick={() => setIsSelectingImageForVar(null)} className="px-5 py-2 bg-foreground text-background text-[10px] uppercase font-black tracking-widest rounded-lg shadow hover:scale-[1.02] active:scale-95 transition-all">
                              Fechar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

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
              </div>{/* end right content */}

            </div>{/* end body flex */}

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
                {editingProduct ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>{/* end footer */}
          </div>{/* end modal card */}
        </div>
      )}

      {isDescFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-2xl animate-in fade-in duration-300 flex flex-col p-2 md:px-4 md:py-2">
           <div className="max-w-full mx-auto w-full flex flex-col h-full gap-2">
              <div className="flex items-center justify-between shrink-0 bg-card border border-border pl-4 pr-1 py-1 rounded-xl shadow-sm">
                 <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg">
                    <button type="button" onClick={() => applyFormat('bold', 'descTextareaFull')} className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-primary/10 hover:text-primary transition-all" title="Negrito (Ctrl+B)">
                       <Bold size={16} />
                    </button>
                    <button type="button" onClick={() => applyFormat('italic', 'descTextareaFull')} className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-primary/10 hover:text-primary transition-all" title="Itálico (Ctrl+I)">
                       <Italic size={16} />
                    </button>
                    <button type="button" onClick={() => applyFormat('big', 'descTextareaFull')} className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-primary/10 hover:text-primary transition-all" title="Título (Alt+U)">
                       <Heading size={16} />
                    </button>
                 </div>
                 
                 <button 
                  onClick={() => setIsDescFullscreen(false)}
                  className="h-9 px-4 flex items-center justify-center bg-primary text-primary-foreground rounded-lg font-black uppercase text-[10px] tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all"
                 >
                   CONCLUIR
                 </button>
              </div>

              <div className="flex-1 flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden relative">
                 <textarea
                  id="descTextareaFull"
                  autoFocus
                  value={description}
                  onChange={e => handleDescriptionChange(e.target.value)}
                  onKeyDown={(e) => handleDescKeyDown(e, 'descTextareaFull')}
                  className="flex-1 w-full p-4 md:p-6 text-sm md:text-base font-medium leading-relaxed bg-transparent outline-none resize-none text-foreground custom-scrollbar scroll-smooth"
                  placeholder="Escreva a descrição detalhada aqui..."
                 />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
