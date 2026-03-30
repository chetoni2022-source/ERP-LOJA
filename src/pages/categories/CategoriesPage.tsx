import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Button, Input } from '../../components/ui';
import { Tags, Plus, Trash2, Edit2, Loader2, ArrowLeft, Package, ChevronDown, ChevronUp, Check, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: string;
  name: string;
  created_at: string;
  product_count?: number;
}

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  category_id: string | null;
}

export default function CategoriesPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catName, setCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id).order('name', { ascending: true }),
        supabase.from('products').select('id, name, image_url, category_id').eq('user_id', user.id).order('name'),
      ]);

      const catsWithCount = (cats || []).map(cat => ({
        ...cat,
        product_count: (prods || []).filter(p => p.category_id === cat.id).length,
      }));

      setCategories(catsWithCount);
      setProducts(prods || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async () => {
    if (!catName.trim() || !user) return;
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from('categories').update({ name: catName }).eq('id', editingId);
      } else {
        await supabase.from('categories').insert([{ name: catName, user_id: user.id }]);
      }
      setModalOpen(false);
      setCatName('');
      setEditingId(null);
      fetchAll();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar categoria.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setCatName(cat.name);
    setEditingId(cat.id);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja apagar a categoria "${name}"? Os produtos vinculados perderão esse vínculo.`)) {
      await supabase.from('categories').delete().eq('id', id);
      fetchAll();
    }
  };

  const toggleProductCategory = async (product: Product, catId: string) => {
    const newCatId = product.category_id === catId ? null : catId;
    await supabase.from('products').update({ category_id: newCatId }).eq('id', product.id);
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, category_id: newCatId } : p));
    // Update count optimistically
    setCategories(prev => prev.map(cat => {
      if (cat.id === catId) {
        const delta = newCatId === catId ? 1 : -1;
        return { ...cat, product_count: (cat.product_count || 0) + delta };
      }
      return cat;
    }));
  };

  const openNew = () => {
    setCatName('');
    setEditingId(null);
    setModalOpen(true);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate(-1)} className="shrink-0 h-10 w-10 md:hidden bg-card border border-border text-foreground hover:bg-muted shadow-sm px-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
              <Tags className="text-primary hidden md:inline" /> Categorias
            </h1>
            <p className="text-sm text-muted-foreground">Gerencie coleções e vincule produtos a cada nicho.</p>
          </div>
        </div>
        <Button onClick={openNew} className="py-6 px-6 font-bold shadow-md bg-primary hover:bg-primary/90 rounded-xl w-full md:w-auto">
          <Plus className="mr-2 h-5 w-5" /> Nova Categoria
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin h-8 w-8 text-primary/50" />
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-16 text-center text-muted-foreground">
            <Tags className="h-12 w-12 opacity-20 mx-auto mb-3" />
            <span className="font-bold uppercase tracking-wide block">Nenhuma Categoria Criada</span>
            <p className="text-sm mt-1">Clique em "Nova Categoria" para começar.</p>
          </div>
        ) : (
          categories.map((cat) => {
            const isExpanded = expandedCat === cat.id;
            const catProducts = filteredProducts.filter(p => p.category_id === cat.id);
            const otherProducts = filteredProducts.filter(p => p.category_id !== cat.id);

            return (
              <div key={cat.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {/* Category Row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">{cat.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Package className="h-3 w-3" /> {cat.product_count || 0} produto{(cat.product_count || 0) !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60">· Criada em {formatDate(cat.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                      className="h-9 px-3 bg-muted/80 border border-border text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors text-xs font-bold gap-1"
                    >
                      <Package className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Gerenciar Produtos</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                    <Button onClick={() => handleEdit(cat)} className="h-9 w-9 px-0 bg-muted border border-border text-foreground hover:bg-teal-500/10 hover:border-teal-500/40 hover:text-teal-600 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDelete(cat.id, cat.name)} className="h-9 w-9 px-0 bg-muted border border-border text-foreground hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Product Manager */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Clique para vincular/desvincular produtos desta coleção
                      </p>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          placeholder="Filtrar peças..."
                          className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary text-foreground w-40"
                        />
                      </div>
                    </div>

                    {/* Already linked */}
                    {catProducts.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-2">Nesta coleção ({catProducts.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {catProducts.map(p => (
                            <button
                              key={p.id}
                              onClick={() => toggleProductCategory(p, cat.id)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-primary/60 bg-primary/10 text-foreground text-xs font-bold hover:bg-red-500/10 hover:border-red-400 hover:text-red-600 transition-colors group"
                            >
                              {p.image_url && <img src={p.image_url} alt="" className="w-5 h-5 rounded object-cover" />}
                              <Check className="h-3 w-3 text-primary group-hover:hidden shrink-0" />
                              <span className="max-w-[120px] truncate">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available to add */}
                    {otherProducts.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Disponíveis para adicionar</p>
                        <div className="flex flex-wrap gap-2">
                          {otherProducts.map(p => (
                            <button
                              key={p.id}
                              onClick={() => toggleProductCategory(p, cat.id)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground text-xs font-semibold hover:border-primary/50 hover:text-foreground hover:bg-primary/5 transition-colors"
                            >
                              {p.image_url && <img src={p.image_url} alt="" className="w-5 h-5 rounded object-cover opacity-70" />}
                              <Plus className="h-3 w-3 shrink-0" />
                              <span className="max-w-[120px] truncate">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {catProducts.length === 0 && otherProducts.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-4">Nenhum produto encontrado.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border z-10 p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold tracking-tight text-foreground">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Qual o nome do nicho ou coleção?</p>
            <Input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Ex: Anéis de Ouro, Brincos" 
              className="h-12 font-semibold text-base mb-5"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <div className="flex justify-end gap-3">
              <Button onClick={() => setModalOpen(false)} className="bg-muted text-foreground border border-border hover:bg-muted/80">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !catName.trim()} className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
