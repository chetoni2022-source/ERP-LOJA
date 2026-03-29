import React, { useState, useEffect } from 'react';
import { Button, Input, Label } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import {
  Loader2, Plus, Store, Link as LinkIcon, ExternalLink, Trash2, Edit2,
  Palette, X, Check, CheckCircle2, Tags, Package, Sliders
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PRESET_THEMES = [
  { id: 'luxury', label: 'Ouro',  bg: '#0a0a0a', accent: '#c9a96e', text: '#f5f0eb' },
  { id: 'rose',   label: 'Rosé',  bg: '#fff8f5', accent: '#cb8474', text: '#2a1a14' },
  { id: 'midnight',label: 'Safira',bg: '#050a12', accent: '#7eb8f7', text: '#e8eef5' },
  { id: 'pearl',  label: 'Pérola',bg: '#fafaf7', accent: '#8a7560', text: '#1a1a1a' },
];

interface CustomColors { bg: string; accent: string; text: string; }

export default function CatalogBuilderPage() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingCatalog, setEditingCatalog] = useState<any | null>(null);
  const [catalogName, setCatalogName] = useState('');
  const [catalogDesc, setCatalogDesc] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('luxury');
  const [useCustomColors, setUseCustomColors] = useState(false);
  const [customColors, setCustomColors] = useState<CustomColors>({ bg: '#0a0a0a', accent: '#c9a96e', text: '#f5f0eb' });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [pickerTab, setPickerTab] = useState<'products' | 'categories'>('products');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, [user]);

  async function fetchData() {
    try {
      const [{ data: catData }, { data: prodData }, { data: catsData }] = await Promise.all([
        supabase.from('catalogs').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
      ]);
      setCatalogs(catData || []);
      setProducts(prodData || []);
      setCategories(catsData || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const openCreate = () => {
    setMode('create');
    setEditingCatalog(null);
    setCatalogName(''); setCatalogDesc('');
    setSelectedTheme('luxury');
    setUseCustomColors(false);
    setCustomColors({ bg: '#0a0a0a', accent: '#c9a96e', text: '#f5f0eb' });
    setSelectedProducts([]); setSelectedCategories([]);
  };

  const openEdit = async (cat: any) => {
    setMode('edit');
    setEditingCatalog(cat);
    setCatalogName(cat.name); setCatalogDesc(cat.description || '');
    const isCustom = cat.theme === 'custom';
    setUseCustomColors(isCustom);
    setSelectedTheme(isCustom ? 'luxury' : (cat.theme || 'luxury'));
    if (isCustom && cat.custom_colors) setCustomColors(cat.custom_colors);

    const { data: items } = await supabase.from('catalog_items').select('product_id').eq('catalog_id', cat.id);
    setSelectedProducts(items?.map(i => i.product_id) || []);
    const { data: catLinks } = await supabase.from('catalog_categories').select('category_id').eq('catalog_id', cat.id);
    setSelectedCategories(catLinks?.map(i => i.category_id) || []);
  };

  const toggleProduct = (id: string) =>
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  const toggleCategory = (id: string) =>
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || (selectedProducts.length === 0 && selectedCategories.length === 0)) {
      toastError('Adicione ao menos um produto ou categoria ao catálogo.');
      return;
    }
    setSaving(true);
    try {
      const theme = useCustomColors ? 'custom' : selectedTheme;
      const payload: any = { name: catalogName, description: catalogDesc, theme, user_id: user.id };
      if (useCustomColors) payload.custom_colors = customColors;
      else payload.custom_colors = null;

      let catalogId: string;
      if (mode === 'edit' && editingCatalog) {
        catalogId = editingCatalog.id;
        await supabase.from('catalogs').update(payload).eq('id', catalogId);
        await supabase.from('catalog_items').delete().eq('catalog_id', catalogId);
        await supabase.from('catalog_categories').delete().eq('catalog_id', catalogId);
      } else {
        const { data: newCat, error: catErr } = await supabase.from('catalogs').insert([payload]).select().single();
        if (catErr) throw catErr;
        catalogId = newCat.id;
      }

      if (selectedProducts.length > 0)
        await supabase.from('catalog_items').insert(selectedProducts.map(pid => ({ catalog_id: catalogId, product_id: pid })));
      if (selectedCategories.length > 0)
        await supabase.from('catalog_categories').insert(selectedCategories.map(cid => ({ catalog_id: catalogId, category_id: cid })));

      success(mode === 'edit' ? 'Catálogo atualizado!' : 'Catálogo criado!');
      setMode('list');
      fetchData();
    } catch (err: any) {
      toastError('Erro ao salvar: ' + err.message);
    } finally { setSaving(false); }
  }

  async function handleDelete(cat: any) {
    if (!confirm(`Excluir "${cat.name}"? O link público vai parar de funcionar.`)) return;
    await supabase.from('catalog_items').delete().eq('catalog_id', cat.id);
    await supabase.from('catalog_categories').delete().eq('catalog_id', cat.id);
    await supabase.from('catalogs').delete().eq('id', cat.id);
    success('Catálogo excluído.');
    fetchData();
  }

  async function copyLink(cat: any) {
    await navigator.clipboard.writeText(`${window.location.origin}/c/${cat.id}`);
    success('Link copiado! 🔗');
  }

  // ── Color helpers ────────────────────────────────────────────────────────────
  const getActiveThemeColors = () => {
    if (useCustomColors) return customColors;
    return PRESET_THEMES.find(t => t.id === selectedTheme) || PRESET_THEMES[0];
  };
  const previewTheme = getActiveThemeColors();

  // ── Form ────────────────────────────────────────────────────────────────────
  if (mode !== 'list') {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-300 pb-20 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{mode === 'edit' ? 'Editar Catálogo' : 'Novo Catálogo'}</h1>
            <p className="text-sm text-muted-foreground">Configure nome, tema e as peças desta vitrine pública.</p>
          </div>
          <Button onClick={() => setMode('list')} className="bg-muted border border-border text-foreground hover:bg-muted/80">
            <X className="h-4 w-4 mr-1.5" /> Cancelar
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Basic Info */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Informações</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da Coleção *</Label>
                <Input required value={catalogName} onChange={e => setCatalogName(e.target.value)} placeholder="Coleção Verão 2026" className="h-11 bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição Pública</Label>
                <Input value={catalogDesc} onChange={e => setCatalogDesc(e.target.value)} placeholder="Curadoria de peças exclusivas..." className="h-11 bg-background" />
              </div>
            </div>
          </div>

          {/* Theme Builder */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Palette className="h-4 w-4" /> Tema Visual</h3>
              <button
                type="button"
                onClick={() => setUseCustomColors(!useCustomColors)}
                className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${useCustomColors ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground hover:text-foreground'}`}
              >
                <Sliders className="h-3.5 w-3.5" />
                {useCustomColors ? 'Usando Cores Personalizadas' : 'Personalizar Cores'}
              </button>
            </div>

            {!useCustomColors ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESET_THEMES.map(t => (
                  <button key={t.id} type="button" onClick={() => setSelectedTheme(t.id)}
                    className="relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all overflow-hidden"
                    style={{ borderColor: selectedTheme === t.id ? t.accent : 'transparent', background: t.bg }}>
                    <div className="h-10 w-full rounded-lg" style={{ background: t.accent, opacity: 0.85 }} />
                    <span className="text-xs font-bold" style={{ color: t.text }}>{t.label}</span>
                    {selectedTheme === t.id && (
                      <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full flex items-center justify-center" style={{ background: t.accent }}>
                        <Check className="h-3 w-3" style={{ color: t.bg }} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: 'bg', label: 'Fundo', description: 'Cor do fundo da vitrine' },
                    { key: 'accent', label: 'Destaque', description: 'Botões e elementos de destaque' },
                    { key: 'text', label: 'Texto', description: 'Cor do texto principal' },
                  ].map(({ key, label, description }) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(customColors as any)[key]}
                          onChange={e => setCustomColors(prev => ({ ...prev, [key]: e.target.value }))}
                          className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
                        />
                        <Input
                          value={(customColors as any)[key]}
                          onChange={e => {
                            const v = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setCustomColors(prev => ({ ...prev, [key]: v }));
                          }}
                          className="h-11 font-mono text-sm bg-background flex-1"
                          placeholder="#000000"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{description}</p>
                    </div>
                  ))}
                </div>

                {/* Live preview */}
                <div className="rounded-xl overflow-hidden border border-border">
                  <div className="h-1 w-full" style={{ background: customColors.accent }} />
                  <div className="p-4 flex items-center gap-4" style={{ background: customColors.bg }}>
                    <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: customColors.accent, color: customColors.bg }}>L</div>
                    <span className="font-bold text-sm" style={{ color: customColors.text }}>Laris Acessórios</span>
                    <div className="ml-auto h-8 px-4 rounded flex items-center text-xs font-bold" style={{ background: customColors.accent, color: customColors.bg }}>Tenho Interesse</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Product / Category Picker */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Conteúdo do Catálogo</h3>
              <div className="flex bg-muted p-1 rounded-lg border border-border gap-1">
                <button type="button" onClick={() => setPickerTab('products')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${pickerTab === 'products' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Package className="h-3.5 w-3.5" /> Produtos ({selectedProducts.length})
                </button>
                <button type="button" onClick={() => setPickerTab('categories')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${pickerTab === 'categories' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Tags className="h-3.5 w-3.5" /> Categorias ({selectedCategories.length})
                </button>
              </div>
            </div>

            {pickerTab === 'products' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 border border-border rounded-xl p-4 bg-muted/20 max-h-[360px] overflow-y-auto">
                {products.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-sm text-muted-foreground">Nenhum produto cadastrado.</div>
                ) : products.map(p => (
                  <div key={p.id} onClick={() => toggleProduct(p.id)}
                    className="cursor-pointer border rounded-xl overflow-hidden flex flex-col relative transition-all"
                    style={{ borderColor: selectedProducts.includes(p.id) ? 'hsl(var(--primary))' : 'hsl(var(--border))', boxShadow: selectedProducts.includes(p.id) ? '0 0 0 2px hsl(var(--primary)/0.35)' : 'none' }}>
                    <div className="aspect-square bg-muted overflow-hidden border-b border-border">
                      {p.image_url ? <img src={p.image_url} alt={p.name} className="object-cover h-full w-full" /> : <Store className="h-6 w-6 text-muted-foreground/30 m-auto" />}
                    </div>
                    <div className="p-2 bg-card">
                      <span className="text-[11px] font-semibold line-clamp-2">{p.name}</span>
                      <span className="text-[10px] text-primary font-bold block mt-0.5">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.sale_price || p.price)}
                      </span>
                    </div>
                    {selectedProducts.includes(p.id) && (
                      <div className="absolute top-1.5 right-1.5 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {pickerTab === 'categories' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-border rounded-xl p-4 bg-muted/20 max-h-[360px] overflow-y-auto">
                {categories.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    Nenhuma categoria criada ainda. Vá em <strong>Categorias</strong> para criar.
                  </div>
                ) : categories.map(cat => (
                  <div key={cat.id} onClick={() => toggleCategory(cat.id)}
                    className="cursor-pointer border rounded-xl p-4 flex items-center gap-3 transition-all relative"
                    style={{ borderColor: selectedCategories.includes(cat.id) ? 'hsl(var(--primary))' : 'hsl(var(--border))', boxShadow: selectedCategories.includes(cat.id) ? '0 0 0 2px hsl(var(--primary)/0.35)' : 'none', background: 'hsl(var(--card))' }}>
                    <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                      <Tags className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">{cat.name}</p>
                      <p className="text-[10px] text-muted-foreground">{cat.description || 'Coleção'}</p>
                    </div>
                    {selectedCategories.includes(cat.id) && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Ao adicionar uma <strong>categoria</strong>, todos os produtos daquela coleção aparecerão na vitrine automaticamente.
            </p>
          </div>

          {/* Save */}
          <div className="flex gap-3">
            <Button type="button" onClick={() => setMode('list')} className="h-12 px-6 bg-muted border border-border text-foreground hover:bg-muted/80 font-bold">Cancelar</Button>
            <Button type="submit" disabled={saving || (selectedProducts.length === 0 && selectedCategories.length === 0)} className="flex-1 h-12 font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-md">
              {saving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
              {saving ? 'Salvando...' : mode === 'edit' ? 'Salvar Alterações' : 'Criar Vitrine'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-0.5">Catálogos Vitrine</h1>
          <p className="text-sm text-muted-foreground">Crie vitrines personalizadas para enviar pelo WhatsApp.</p>
        </div>
        <Button onClick={openCreate} className="bg-primary text-primary-foreground font-bold shadow-md px-5 h-10">
          <Plus className="mr-2 h-4 w-4" /> Novo Catálogo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary/50" /></div>
        ) : catalogs.length === 0 ? (
          <div className="col-span-full p-16 text-center flex flex-col items-center bg-card border border-border border-dashed rounded-xl">
            <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4"><LinkIcon className="h-8 w-8 text-muted-foreground/60" /></div>
            <h3 className="text-lg font-medium">Nenhuma coleção ainda</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">Crie um catálogo e compartilhe com seus clientes via WhatsApp.</p>
            <Button onClick={openCreate} className="mt-6 bg-primary text-primary-foreground font-bold"><Plus className="h-4 w-4 mr-2" /> Criar Primeiro Catálogo</Button>
          </div>
        ) : catalogs.map(cat => {
          const preset = PRESET_THEMES.find(t => t.id === (cat.theme || 'luxury')) || PRESET_THEMES[0];
          const colors = cat.theme === 'custom' && cat.custom_colors ? cat.custom_colors : preset;
          const label = cat.theme === 'custom' ? 'Custom' : (preset.label);
          return (
            <div key={cat.id} className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group">
              <div className="h-2 w-full" style={{ background: colors.accent }} />
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">{cat.name}</h3>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0" style={{ background: `${colors.accent}25`, color: colors.accent }}>{label}</span>
                </div>
                {cat.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{cat.description}</p>}
                <p className="text-[11px] text-muted-foreground mb-5">Criado em {new Date(cat.created_at).toLocaleDateString('pt-BR')}</p>
                <div className="mt-auto pt-4 border-t border-border/50 flex items-center gap-2">
                  <Button onClick={() => copyLink(cat)} className="flex-1 h-9 bg-transparent border border-border text-foreground hover:bg-muted font-semibold shadow-none text-xs">
                    <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> Copiar Link
                  </Button>
                  <Link to={`/c/${cat.id}`} target="_blank" className="h-9 w-9 flex items-center justify-center border border-border rounded-md hover:bg-muted hover:text-primary transition-colors bg-background shrink-0"><ExternalLink size={15} /></Link>
                  <button onClick={() => openEdit(cat)} className="h-9 w-9 flex items-center justify-center border border-border rounded-md hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-500 transition-colors bg-background shrink-0"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(cat)} className="h-9 w-9 flex items-center justify-center border border-border rounded-md hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-colors bg-background shrink-0"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
