'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Globe, Layout, FileText, Image, Briefcase, Plus, Pencil, Trash2,
  Eye, EyeOff, GripVertical, ChevronRight, Save, Layers, Search,
  Settings, Package, Upload, Star, StarOff, Tag, History,
  ExternalLink, Copy, BarChart3, Loader2, X, ImagePlus,
  FolderOpen, Monitor, Smartphone, ArrowUpDown, RefreshCw,
  ChevronDown, AlertCircle, CheckCircle2, Clock, Palette,
  Share2, Shield, Type, Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import MediaPicker from '@/components/cms/MediaPicker';
import { formatCurrency, formatDate, timeAgo } from '@/lib/utils';

/* ─── Types ───────────────────────────────────────── */
type Tab = 'dashboard' | 'pages' | 'sections' | 'products' | 'services' | 'media' | 'settings';
type Section = any;
type Item = any;
type Service = any;
type GalleryItem = any;
type CmsPage = any;
type CmsSetting = any;
type CmsProduct = any;
type MediaItem = any;

const SECTION_PAGES = ['home', 'about', 'contact', 'products'];
const PAGE_ICONS: Record<string, string> = { home: '🏠', about: '📖', contact: '📞', products: '🧦' };

/* ─── Empty forms ─────────────────────────── */
const EMPTY_SECTION_FORM = {
  page: 'home', section_key: '', title: '', subtitle: '', content: '',
  cta_text: '', cta_link: '', image_url: '', icon: '', sort_order: 0, is_active: true,
};
const EMPTY_ITEM_FORM = {
  section_id: '', title: '', subtitle: '', description: '', icon: '', image_url: '',
  link: '', value: '', sort_order: 0, is_active: true,
};
const EMPTY_SERVICE_FORM = {
  title: '', description: '', icon: '', image_url: '', features: '',
  sort_order: 0, is_active: true,
};
const EMPTY_PRODUCT_FORM = {
  sku: '', name: '', category_id: '', description: '', short_description: '',
  image_url: '', gallery_images: [] as string[], unit_price: 0, cost_price: 0,
  is_active: true, is_featured: false, min_stock: 0, tags: '',
  meta_title: '', meta_description: '', specifications: [{ key: '', value: '' }],
  variants: [{ name: '', sku: '', price: 0 }], sort_order: 0,
};
const EMPTY_PAGE_FORM = {
  slug: '', title: '', meta_title: '', meta_description: '', og_image: '',
  status: 'published', template: 'default', sort_order: 0, is_active: true,
};

/* ─── Settings categories config ───────── */
const SETTINGS_CATEGORIES = [
  { key: 'branding', label: 'Branding', icon: Palette, desc: 'Logo, colors & company identity' },
  { key: 'seo', label: 'SEO', icon: Search, desc: 'Default meta tags & analytics' },
  { key: 'social', label: 'Social Media', icon: Share2, desc: 'Social media profile links' },
  { key: 'footer', label: 'Footer', icon: Layout, desc: 'Footer text & contact info' },
  { key: 'general', label: 'General', icon: Settings, desc: 'Maintenance mode & announcements' },
];

export default function CMSPage() {
  const [tab, setTab] = useState<Tab>('dashboard');

  /* ── Dashboard data ── */
  const [meta, setMeta] = useState<any>(null);

  /* ── Sections ── */
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedPage, setExpandedPage] = useState('home');
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  /* ── Services ── */
  const [services, setServices] = useState<Service[]>([]);

  /* ── Products ── */
  const [products, setProducts] = useState<CmsProduct[]>([]);
  const [productMeta, setProductMeta] = useState<any>({});
  const [productTotal, setProductTotal] = useState(0);
  const [productPage, setProductPage] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [productSummary, setProductSummary] = useState<any>(null);

  /* ── Pages ── */
  const [cmsPages, setCmsPages] = useState<CmsPage[]>([]);

  /* ── Settings ── */
  const [settings, setSettings] = useState<CmsSetting[]>([]);
  const [settingsCategory, setSettingsCategory] = useState('branding');
  const [settingsEdits, setSettingsEdits] = useState<Record<string, string>>({});

  /* ── Media ── */
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaFolder, setMediaFolder] = useState('');
  const [mediaFolders, setMediaFolders] = useState<string[]>([]);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaSummary, setMediaSummary] = useState<any>(null);

  /* ── Modals ── */
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [sectionForm, setSectionForm] = useState(EMPTY_SECTION_FORM);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE_FORM);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<CmsProduct | null>(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);

  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [editPage, setEditPage] = useState<CmsPage | null>(null);
  const [pageForm, setPageForm] = useState(EMPTY_PAGE_FORM);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [revisionEntity, setRevisionEntity] = useState({ type: '', id: '', name: '' });

  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<string>('');
  const [mediaPickerMultiple, setMediaPickerMultiple] = useState(false);

  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ entity: string; id: string; title: string; api?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  /* ═══════════════════════ Data fetchers ═══════════════════════ */
  const fetchMeta = useCallback(async () => {
    const res = await fetch('/api/cms?type=meta').then(r => r.json());
    setMeta(res);
  }, []);

  const fetchSections = useCallback(async () => {
    const res = await fetch('/api/cms?type=sections').then(r => r.json());
    setSections(res.sections ?? []);
  }, []);

  const fetchServices = useCallback(async () => {
    const res = await fetch('/api/cms?type=services').then(r => r.json());
    setServices(res.services ?? []);
  }, []);

  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams({ page: String(productPage), limit: '12', search: productSearch });
    if (productFilter === 'active') params.set('status', 'active');
    else if (productFilter === 'inactive') params.set('status', 'inactive');
    else if (productFilter === 'featured') params.set('featured', 'true');
    const res = await fetch(`/api/cms/products?${params}`).then(r => r.json());
    setProducts(res.data ?? []);
    setProductTotal(res.total ?? 0);
    setProductSummary(res.summary ?? null);
  }, [productPage, productSearch, productFilter]);

  const fetchProductMeta = useCallback(async () => {
    const res = await fetch('/api/cms/products?meta=1').then(r => r.json());
    setProductMeta(res);
  }, []);

  const fetchPages = useCallback(async () => {
    const res = await fetch('/api/cms?type=pages').then(r => r.json());
    setCmsPages(res.pages ?? []);
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch(`/api/cms?type=settings&category=${settingsCategory}`).then(r => r.json());
    setSettings(res.settings ?? []);
    setSettingsEdits({});
  }, [settingsCategory]);

  const fetchMedia = useCallback(async () => {
    const params = new URLSearchParams({ limit: '60' });
    if (mediaFolder) params.set('folder', mediaFolder);
    if (mediaSearch) params.set('search', mediaSearch);
    const [media, metaRes] = await Promise.all([
      fetch(`/api/media?${params}`).then(r => r.json()),
      fetch('/api/media?meta=true').then(r => r.json()),
    ]);
    setMediaItems(media.media ?? []);
    setMediaFolders(metaRes.folders ?? []);
    setMediaSummary(metaRes.summary ?? null);
  }, [mediaFolder, mediaSearch]);

  /* ── Initial load ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchMeta(), fetchSections(), fetchServices(), fetchPages()]);
      setLoading(false);
    })();
  }, [fetchMeta, fetchSections, fetchServices, fetchPages]);

  /* ── Tab-triggered loads ── */
  useEffect(() => { if (tab === 'products') { fetchProducts(); fetchProductMeta(); } }, [tab, fetchProducts, fetchProductMeta]);
  useEffect(() => { if (tab === 'settings') fetchSettings(); }, [tab, fetchSettings]);
  useEffect(() => { if (tab === 'media') fetchMedia(); }, [tab, fetchMedia]);

  /* ═══════════════════════ Section handlers ═══════════════════════ */
  const openAddSection = (page: string) => {
    setEditSection(null);
    setSectionForm({ ...EMPTY_SECTION_FORM, page });
    setSectionModalOpen(true);
  };
  const openEditSection = (s: Section) => {
    setEditSection(s);
    setSectionForm({
      page: s.page, section_key: s.section_key, title: s.title || '', subtitle: s.subtitle || '',
      content: s.content || '', cta_text: s.cta_text || '', cta_link: s.cta_link || '',
      image_url: s.image_url || '', icon: s.icon || '', sort_order: s.sort_order ?? 0, is_active: s.is_active !== false,
    });
    setSectionModalOpen(true);
  };
  const handleSaveSection = async () => {
    if (!sectionForm.section_key.trim()) { toast.warning('Validation', 'Section key is required.'); return; }
    setSaving(true);
    try {
      const payload = { entity: 'section', ...sectionForm, ...(editSection ? { id: editSection.id } : {}) };
      const res = await fetch('/api/cms', { method: editSection ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editSection ? 'Section Updated' : 'Section Created', `${sectionForm.title || sectionForm.section_key} saved.`);
      setSectionModalOpen(false);
      fetchSections();
      fetchMeta();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  /* ── Item handlers ── */
  const openAddItem = (sectionId: number) => {
    setEditItem(null);
    setItemForm({ ...EMPTY_ITEM_FORM, section_id: String(sectionId) });
    setItemModalOpen(true);
  };
  const openEditItem = (item: Item) => {
    setEditItem(item);
    setItemForm({
      section_id: String(item.section_id), title: item.title || '', subtitle: item.subtitle || '',
      description: item.description || '', icon: item.icon || '', image_url: item.image_url || '',
      link: item.link || '', value: item.value || '', sort_order: item.sort_order ?? 0, is_active: item.is_active !== false,
    });
    setItemModalOpen(true);
  };
  const handleSaveItem = async () => {
    setSaving(true);
    try {
      const payload = { entity: 'item', ...itemForm, ...(editItem ? { id: editItem.id } : {}) };
      const res = await fetch('/api/cms', { method: editItem ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editItem ? 'Item Updated' : 'Item Created', `${itemForm.title || 'Item'} saved.`);
      setItemModalOpen(false);
      fetchSections();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  /* ── Service handlers ── */
  const openAddService = () => {
    setEditService(null);
    setServiceForm(EMPTY_SERVICE_FORM);
    setServiceModalOpen(true);
  };
  const openEditService = (svc: Service) => {
    setEditService(svc);
    setServiceForm({
      title: svc.title || '', description: svc.description || '', icon: svc.icon || '',
      image_url: svc.image_url || '',
      features: Array.isArray(svc.features) ? svc.features.join(', ') : '',
      sort_order: svc.sort_order ?? 0, is_active: svc.is_active !== false,
    });
    setServiceModalOpen(true);
  };
  const handleSaveService = async () => {
    if (!serviceForm.title.trim()) { toast.warning('Validation', 'Title is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        entity: 'service', ...serviceForm,
        features: serviceForm.features ? serviceForm.features.split(',').map(s => s.trim()).filter(Boolean) : [],
        ...(editService ? { id: editService.id } : {}),
      };
      const res = await fetch('/api/cms', { method: editService ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editService ? 'Service Updated' : 'Service Created', `${serviceForm.title} saved.`);
      setServiceModalOpen(false);
      fetchServices();
      fetchMeta();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  /* ── Product handlers ── */
  const openAddProduct = () => {
    setEditProduct(null);
    setProductForm({ ...EMPTY_PRODUCT_FORM });
    setProductModalOpen(true);
  };
  const openEditProduct = async (p: CmsProduct) => {
    setEditProduct(p);
    // Pre-fill from card data immediately and open modal
    setProductForm({
      sku: p.sku || '', name: p.name || '', category_id: String(p.category_id || ''),
      description: p.description || '', short_description: p.short_description || '',
      image_url: p.image_url || '', gallery_images: p.gallery_images || [],
      unit_price: p.unit_price || 0, cost_price: p.cost_price || 0,
      is_active: p.is_active !== false, is_featured: p.is_featured === true,
      min_stock: p.min_stock || 0, tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      meta_title: p.meta_title || '', meta_description: p.meta_description || '',
      specifications: p.specifications && Object.keys(p.specifications).length > 0
        ? Object.entries(p.specifications).map(([key, value]) => ({ key, value: String(value) }))
        : [{ key: '', value: '' }],
      variants: p.variants?.length > 0 ? p.variants : [{ name: '', sku: '', price: 0 }],
      sort_order: p.sort_order || 0,
    });
    setProductModalOpen(true);
    // Then fetch full product data in background
    try {
      const res = await fetch(`/api/cms/products?id=${p.id}`).then(r => r.json());
      const full = res.product;
      if (full) {
        setProductForm({
          sku: full.sku || '', name: full.name || '', category_id: String(full.category_id || ''),
          description: full.description || '', short_description: full.short_description || '',
          image_url: full.image_url || '', gallery_images: full.gallery_images || [],
          unit_price: full.unit_price || 0, cost_price: full.cost_price || 0,
          is_active: full.is_active !== false, is_featured: full.is_featured === true,
          min_stock: full.min_stock || 0, tags: Array.isArray(full.tags) ? full.tags.join(', ') : '',
          meta_title: full.meta_title || '', meta_description: full.meta_description || '',
          specifications: full.specifications && Object.keys(full.specifications).length > 0
            ? Object.entries(full.specifications).map(([key, value]) => ({ key, value: String(value) }))
            : [{ key: '', value: '' }],
          variants: full.variants?.length > 0 ? full.variants : [{ name: '', sku: '', price: 0 }],
          sort_order: full.sort_order || 0,
        });
      }
    } catch (e) {
      console.error('Failed to fetch full product details:', e);
    }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim() || !productForm.sku.trim()) {
      toast.warning('Validation', 'Name and SKU are required.');
      return;
    }
    setSaving(true);
    try {
      const specs: Record<string, string> = {};
      productForm.specifications.forEach(s => { if (s.key.trim()) specs[s.key.trim()] = s.value; });
      const variants = productForm.variants.filter(v => v.name.trim());
      const tags = productForm.tags ? productForm.tags.split(',').map(s => s.trim()).filter(Boolean) : [];

      const payload = {
        ...productForm,
        category_id: productForm.category_id ? Number(productForm.category_id) : null,
        specifications: Object.keys(specs).length > 0 ? specs : null,
        variants: variants.length > 0 ? variants : null,
        tags,
        ...(editProduct ? { id: editProduct.id } : {}),
      };

      const res = await fetch('/api/cms/products', {
        method: editProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editProduct ? 'Product Updated' : 'Product Created', `${productForm.name} saved.`);
      setProductModalOpen(false);
      fetchProducts();
      fetchMeta();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const toggleProductFeatured = async (p: CmsProduct) => {
    try {
      await fetch('/api/cms/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, action: 'toggle_featured' }),
      });
      fetchProducts();
    } catch { /* ignore */ }
  };

  const toggleProductActive = async (p: CmsProduct) => {
    try {
      await fetch('/api/cms/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, action: 'toggle_active' }),
      });
      fetchProducts();
    } catch { /* ignore */ }
  };

  /* ── Page SEO handlers ── */
  const openEditPage = (p: CmsPage) => {
    setEditPage(p);
    setPageForm({
      slug: p.slug || '', title: p.title || '', meta_title: p.meta_title || '',
      meta_description: p.meta_description || '', og_image: p.og_image || '',
      status: p.status || 'published', template: p.template || 'default',
      sort_order: p.sort_order ?? 0, is_active: p.is_active !== false,
    });
    setPageModalOpen(true);
  };
  const handleSavePage = async () => {
    if (!pageForm.title.trim()) { toast.warning('Validation', 'Title is required.'); return; }
    setSaving(true);
    try {
      const payload = { entity: 'page', ...pageForm, ...(editPage ? { id: editPage.id } : {}) };
      const res = await fetch('/api/cms', {
        method: editPage ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Page Saved', `${pageForm.title} updated.`);
      setPageModalOpen(false);
      fetchPages();
      fetchMeta();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  /* ── Settings handlers ── */
  const handleSettingChange = (key: string, value: string) => {
    setSettingsEdits(prev => ({ ...prev, [key]: value }));
  };
  const handleSaveSettings = async () => {
    const changes = Object.entries(settingsEdits).map(([key, value]) => ({ key, value }));
    if (changes.length === 0) { toast.warning('No Changes', 'Nothing to save.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/cms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'settings', settings: changes }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Settings Saved', `${changes.length} setting(s) updated.`);
      fetchSettings();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  /* ── Media handlers ── */
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingMedia(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', mediaFolder || 'general');
        const res = await fetch('/api/media', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
      }
      toast.success('Uploaded', `${files.length} file(s) uploaded.`);
      fetchMedia();
      fetchMeta();
    } catch (err: any) { toast.error('Error', err.message); }
    setUploadingMedia(false);
    e.target.value = '';
  };

  const handleDeleteMedia = async (m: MediaItem) => {
    try {
      await fetch(`/api/media?id=${m.id}`, { method: 'DELETE' });
      toast.success('Deleted', `${m.original_name} removed.`);
      fetchMedia();
    } catch { /* ignore */ }
  };

  /* ── Revision history ── */
  const openRevisions = async (entityType: string, entityId: string, entityName: string) => {
    setRevisionEntity({ type: entityType, id: entityId, name: entityName });
    setRevisions([]);
    setHistoryModalOpen(true);
    const res = await fetch(`/api/cms?type=revisions&entity_type=${entityType}&entity_id=${entityId}`).then(r => r.json());
    setRevisions(res.revisions ?? []);
  };

  /* ── Delete handler ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const api = deleteTarget.api || '/api/cms';
      const res = await fetch(`${api}?entity=${deleteTarget.entity}&id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', `${deleteTarget.title || 'Item'} removed.`);
      setDeleteTarget(null);
      fetchSections(); fetchServices(); fetchProducts(); fetchPages(); fetchMeta();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  /* ── Media picker callback ── */
  const handleMediaSelect = (url: string) => {
    if (mediaPickerTarget === 'product_image') {
      setProductForm(p => ({ ...p, image_url: url }));
    } else if (mediaPickerTarget === 'section_image') {
      setSectionForm(p => ({ ...p, image_url: url }));
    } else if (mediaPickerTarget === 'service_image') {
      setServiceForm(p => ({ ...p, image_url: url }));
    } else if (mediaPickerTarget === 'page_og_image') {
      setPageForm(p => ({ ...p, og_image: url }));
    } else if (mediaPickerTarget === 'item_image') {
      setItemForm(p => ({ ...p, image_url: url }));
    }
  };
  const handleMediaSelectMultiple = (urls: string[]) => {
    if (mediaPickerTarget === 'product_gallery') {
      setProductForm(p => ({ ...p, gallery_images: [...p.gallery_images, ...urls] }));
    }
  };
  const openMediaPicker = (target: string, multiple = false) => {
    setMediaPickerTarget(target);
    setMediaPickerMultiple(multiple);
    setMediaPickerOpen(true);
  };

  /* ═══════════════════════ Derived ═══════════════════════ */
  const sectionsByPage = SECTION_PAGES.reduce((acc, p) => {
    acc[p] = sections.filter((s: Section) => s.page === p);
    return acc;
  }, {} as Record<string, Section[]>);

  const kpis = meta ? [
    { label: 'Pages', value: meta.pages?.length ?? 0, icon: Layout, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Sections', value: meta.counts?.sections ?? 0, icon: Layers, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Products', value: meta.counts?.products ?? 0, icon: Package, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Services', value: meta.counts?.services ?? 0, icon: Briefcase, color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' },
    { label: 'Gallery', value: meta.counts?.gallery ?? 0, icon: Image, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' },
    { label: 'Media', value: meta.counts?.media ?? 0, icon: FolderOpen, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ] : [];

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'pages', label: 'Pages & SEO', icon: Globe },
    { key: 'sections', label: 'Sections', icon: Layers },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'services', label: 'Services', icon: Briefcase },
    { key: 'media', label: 'Media', icon: Image },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredSettings = settings;
  const hasSettingsChanges = Object.keys(settingsEdits).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full" />
          <span className="text-xs text-slate-400 dark:text-[var(--dark-text-3)]">Loading CMS…</span>
        </div>
      </div>
    );
  }

  /* ─── Helper: Toggle switch ───── */
  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }) => (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onChange} className={`relative w-9 h-5 rounded-full transition-colors ${value ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${value ? 'translate-x-4' : ''}`} />
      </button>
      <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{label}</span>
    </div>
  );

  /* ─── Helper: Image preview with pick ───── */
  const ImageField = ({ label, value, target, onChange }: { label: string; value: string; target: string; onChange: (v: string) => void }) => (
    <div>
      <label className="triumph-label">{label}</label>
      <div className="flex gap-2">
        <input className="triumph-input flex-1 text-xs" value={value} onChange={e => onChange(e.target.value)} placeholder="/uploads/…" />
        <button type="button" onClick={() => openMediaPicker(target)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[var(--dark-border)] text-slate-600 dark:text-[var(--dark-text-2)] hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors flex items-center gap-1">
          <ImagePlus size={12} /> Browse
        </button>
      </div>
      {value && <img src={value} alt="Preview" className="mt-1.5 w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-[var(--dark-border)]" />}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Globe size={20} className="text-amber-500" /> Enterprise CMS
          </h1>
          <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">Manage website content, products, SEO & media</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="triumph-card">
        <div className="flex items-center gap-1 px-4 py-2.5 border-b border-slate-100 dark:border-[var(--dark-border)] overflow-x-auto">
          {tabs.map(t => { const Icon = t.icon; return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${tab === t.key ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>
              <Icon size={13} />{t.label}
            </button>
          ); })}
        </div>

        {/* ═══════ DASHBOARD ═══════ */}
        {tab === 'dashboard' && (
          <div className="p-4 space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {kpis.map((k, i) => { const Icon = k.icon; return (
                <div key={k.label} className={`rounded-xl border border-slate-200 dark:border-[var(--dark-border)] p-3 flex items-center gap-3 anim-fade-up anim-d${Math.min(i+1,6)}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}><Icon size={16} className={k.color} /></div>
                  <div><p className="text-base font-bold text-slate-800 dark:text-white leading-none">{k.value}</p><p className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p></div>
                </div>
              ); })}
            </div>

            {/* Quick overview: Pages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] p-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Globe size={14} className="text-blue-500" /> Website Pages
                </h3>
                <div className="space-y-2">
                  {(cmsPages || []).map((p: CmsPage) => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[var(--dark-surface)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-[var(--dark-text)]">{p.title}</p>
                        <p className="text-[0.6rem] text-slate-400 font-mono">/{p.slug}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[0.6rem] font-medium ${
                        p.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : p.status === 'draft' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>{p.status}</span>
                      <button onClick={() => openEditPage(p)} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-amber-600 transition-colors">
                        <Pencil size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick stats */}
              <div className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] p-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <BarChart3 size={14} className="text-purple-500" /> Content Overview
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[var(--dark-border)]">
                    <span className="text-slate-500 dark:text-[var(--dark-text-3)]">Total Content Sections</span>
                    <span className="font-semibold text-slate-800 dark:text-white">{meta?.counts?.sections ?? 0}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[var(--dark-border)]">
                    <span className="text-slate-500 dark:text-[var(--dark-text-3)]">Section Items</span>
                    <span className="font-semibold text-slate-800 dark:text-white">{meta?.counts?.items ?? 0}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[var(--dark-border)]">
                    <span className="text-slate-500 dark:text-[var(--dark-text-3)]">Active Products</span>
                    <span className="font-semibold text-slate-800 dark:text-white">{meta?.counts?.products ?? 0}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[var(--dark-border)]">
                    <span className="text-slate-500 dark:text-[var(--dark-text-3)]">Services Listed</span>
                    <span className="font-semibold text-slate-800 dark:text-white">{meta?.counts?.services ?? 0}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[var(--dark-border)]">
                    <span className="text-slate-500 dark:text-[var(--dark-text-3)]">Gallery Images</span>
                    <span className="font-semibold text-slate-800 dark:text-white">{meta?.counts?.gallery ?? 0}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 dark:text-[var(--dark-text-3)]">Media Files</span>
                    <span className="font-semibold text-slate-800 dark:text-white">{meta?.counts?.media ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ PAGES & SEO ═══════ */}
        {tab === 'pages' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{cmsPages.length} pages</p>
              <Button size="sm" icon={<Plus size={13} />} onClick={() => { setEditPage(null); setPageForm({ ...EMPTY_PAGE_FORM }); setPageModalOpen(true); }}>Add Page</Button>
            </div>
            <div className="space-y-3">
              {cmsPages.map((p: CmsPage) => (
                <div key={p.id} className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] p-4 hover:shadow-sm transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                      <Globe size={18} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-[var(--dark-text)]">{p.title}</h3>
                        <span className={`px-1.5 py-0.5 rounded text-[0.6rem] font-medium ${
                          p.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>{p.status}</span>
                        {!p.is_active && <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Inactive</span>}
                      </div>
                      <p className="text-[0.65rem] text-slate-400 font-mono mb-1">/{p.slug}</p>

                      {/* SEO Preview */}
                      <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-[var(--dark-surface)] border border-slate-100 dark:border-[var(--dark-border)]">
                        <p className="text-[0.6rem] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Search size={9} /> SEO Preview</p>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">{p.meta_title || p.title || '—'}</p>
                        <p className="text-[0.6rem] text-green-600 dark:text-green-400">triumph-socks.com/{p.slug}</p>
                        <p className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] line-clamp-2 mt-0.5">{p.meta_description || 'No meta description set'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEditPage(p)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"><Pencil size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ SECTIONS TAB ═══════ */}
        {tab === 'sections' && (
          <div className="divide-y divide-slate-100 dark:divide-[var(--dark-border)]">
            {SECTION_PAGES.map(page => (
              <div key={page}>
                <button onClick={() => setExpandedPage(expandedPage === page ? '' : page)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
                  <span className="text-lg">{PAGE_ICONS[page]}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-[var(--dark-text)] capitalize">{page}</span>
                  <span className="text-xs text-slate-400 dark:text-[var(--dark-text-3)]">{sectionsByPage[page]?.length ?? 0} sections</span>
                  <ChevronRight size={14} className={`ml-auto text-slate-400 transition-transform ${expandedPage === page ? 'rotate-90' : ''}`} />
                </button>

                {expandedPage === page && (
                  <div className="px-4 pb-4">
                    {(sectionsByPage[page] || []).length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-[var(--dark-text-3)] py-4 text-center">No sections yet</p>
                    ) : (
                      <div className="space-y-2">
                        {sectionsByPage[page].map((section: Section) => (
                          <div key={section.id} className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-[var(--dark-surface)]">
                              <GripVertical size={12} className="text-slate-300 dark:text-[var(--dark-text-3)]" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 dark:text-[var(--dark-text)]">{section.title || section.section_key}</p>
                                <p className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)] font-mono">{section.section_key}</p>
                              </div>
                              {!section.is_active && <EyeOff size={11} className="text-slate-400" />}
                              <span className="text-[0.6rem] text-slate-400 bg-slate-100 dark:bg-[var(--dark-bg)] px-1.5 py-0.5 rounded">{(section.items || []).length} items</span>
                              <button onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                <ChevronRight size={12} className={`transition-transform ${expandedSection === section.id ? 'rotate-90' : ''}`} />
                              </button>
                              <button onClick={() => openEditSection(section)} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"><Pencil size={11} /></button>
                              <button onClick={() => setDeleteTarget({ entity: 'section', id: section.id, title: section.title || section.section_key })} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={11} /></button>
                            </div>

                            {expandedSection === section.id && (
                              <div className="px-3 py-2 space-y-1">
                                {(section.items || []).map((item: Item) => (
                                  <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors group">
                                    {item.icon && <span className="text-sm">{item.icon}</span>}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-700 dark:text-[var(--dark-text)] truncate">{item.title || '(untitled)'}</p>
                                      {item.value && <p className="text-[0.6rem] text-amber-600 dark:text-amber-400 font-semibold">{item.value}</p>}
                                      {item.description && <p className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)] truncate">{item.description}</p>}
                                    </div>
                                    {!item.is_active && <EyeOff size={10} className="text-slate-400" />}
                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => openEditItem(item)} className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-amber-600 transition-colors"><Pencil size={10} /></button>
                                      <button onClick={() => setDeleteTarget({ entity: 'item', id: item.id, title: item.title || 'Item' })} className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={10} /></button>
                                    </div>
                                  </div>
                                ))}
                                <button onClick={() => openAddItem(section.id)}
                                  className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-[var(--dark-border)] text-xs text-slate-400 hover:text-amber-600 hover:border-amber-300 transition-colors">
                                  <Plus size={12} /> Add Item
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => openAddSection(page)}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-200 dark:border-[var(--dark-border)] text-xs text-slate-400 hover:text-amber-600 hover:border-amber-300 transition-colors">
                      <Plus size={13} /> Add Section to {page}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══════ PRODUCTS TAB ═══════ */}
        {tab === 'products' && (
          <div className="p-4 space-y-4">
            {/* Product summary KPIs */}
            {productSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Total', value: productSummary.total, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Active', value: productSummary.active, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
                  { label: 'Inactive', value: productSummary.inactive, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                  { label: 'Featured', value: productSummary.featured, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                  { label: 'Categories', value: productSummary.categories, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg ${s.bg} p-2.5 text-center`}>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)]">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="triumph-input pl-8 text-xs" placeholder="Search products…" value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setProductPage(1); }} />
              </div>
              <div className="flex rounded-lg border border-slate-200 dark:border-[var(--dark-border)] overflow-hidden">
                {['all', 'active', 'inactive', 'featured'].map(f => (
                  <button key={f} onClick={() => { setProductFilter(f); setProductPage(1); }}
                    className={`px-2.5 py-1.5 text-[0.65rem] font-medium capitalize transition-colors ${productFilter === f ? 'bg-amber-500 text-white' : 'text-slate-600 dark:text-[var(--dark-text-2)] hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)]'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <Button size="sm" icon={<Plus size={13} />} onClick={openAddProduct}>Add Product</Button>
            </div>

            {/* Products grid */}
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Package size={40} className="text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-400 dark:text-[var(--dark-text-3)]">No products found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {products.map((p: CmsProduct) => (
                  <div key={p.id} className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] overflow-hidden hover:shadow-sm transition-all group cursor-pointer" onClick={() => openEditProduct(p)}>
                    {/* Product image */}
                    <div className="aspect-[3/2] bg-slate-100 dark:bg-[var(--dark-surface)] relative">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package size={32} className="text-slate-300 dark:text-slate-600" /></div>
                      )}
                      {!p.is_active && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><EyeOff size={18} className="text-white" /></div>}
                      {p.is_featured && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[0.55rem] font-medium flex items-center gap-0.5">
                          <Star size={9} /> Featured
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); toggleProductFeatured(p); }}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-white/90 dark:bg-[var(--dark-card)] shadow-sm transition-colors">
                          {p.is_featured ? <StarOff size={11} className="text-amber-600" /> : <Star size={11} className="text-slate-500" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleProductActive(p); }}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-white/90 dark:bg-[var(--dark-card)] shadow-sm transition-colors">
                          {p.is_active ? <EyeOff size={11} className="text-slate-500" /> : <Eye size={11} className="text-green-500" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openRevisions('product', p.id, p.name); }}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-white/90 dark:bg-[var(--dark-card)] shadow-sm transition-colors">
                          <History size={11} className="text-blue-500" />
                        </button>
                      </div>
                    </div>

                    {/* Product info */}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-[var(--dark-text)] truncate">{p.name}</p>
                          <p className="text-[0.6rem] text-slate-400 font-mono">{p.sku}</p>
                        </div>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">{formatCurrency(p.unit_price)}</span>
                      </div>
                      {p.category_name && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[var(--dark-surface)] text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] mb-1.5">{p.category_name}</span>
                      )}
                      {p.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {p.tags.slice(0, 3).map((t: string) => (
                            <span key={t} className="px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[0.55rem]">{t}</span>
                          ))}
                          {p.tags.length > 3 && <span className="text-[0.55rem] text-slate-400">+{p.tags.length - 3}</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-[var(--dark-border)]">
                        <button onClick={(e) => { e.stopPropagation(); openEditProduct(p); }} className="flex-1 px-2 py-1 rounded text-[0.65rem] font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center justify-center gap-1"><Pencil size={10} /> Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ entity: 'product', id: p.id, title: p.name, api: '/api/cms/products' }); }} className="flex-1 px-2 py-1 rounded text-[0.65rem] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-1"><Trash2 size={10} /> Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {productTotal > 12 && (
              <div className="flex justify-center items-center gap-2 pt-2">
                <Button size="xs" variant="secondary" onClick={() => setProductPage(Math.max(1, productPage - 1))} disabled={productPage === 1}>← Prev</Button>
                <span className="text-xs text-slate-500">Page {productPage} of {Math.ceil(productTotal / 12)}</span>
                <Button size="xs" variant="secondary" onClick={() => setProductPage(productPage + 1)} disabled={productPage >= Math.ceil(productTotal / 12)}>Next →</Button>
              </div>
            )}
          </div>
        )}

        {/* ═══════ SERVICES TAB ═══════ */}
        {tab === 'services' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{services.length} services</p>
              <Button size="sm" icon={<Plus size={13} />} onClick={openAddService}>Add Service</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((svc: Service) => (
                <div key={svc.id} className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] p-3 hover:shadow-sm transition-all group">
                  <div className="flex items-start gap-3">
                    {svc.icon && <span className="text-2xl mt-0.5">{svc.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-800 dark:text-[var(--dark-text)]">{svc.title}</p>
                        {!svc.is_active && <EyeOff size={11} className="text-slate-400" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5 line-clamp-2">{svc.description || '—'}</p>
                      {svc.features?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {svc.features.slice(0, 3).map((f: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[0.6rem]">{f}</span>
                          ))}
                          {svc.features.length > 3 && <span className="text-[0.6rem] text-slate-400">+{svc.features.length - 3}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditService(svc)} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"><Pencil size={11} /></button>
                      <button onClick={() => setDeleteTarget({ entity: 'service', id: svc.id, title: svc.title })} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ MEDIA LIBRARY TAB ═══════ */}
        {tab === 'media' && (
          <div className="p-4 space-y-4">
            {/* Media toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="triumph-input pl-8 text-xs" placeholder="Search media…" value={mediaSearch}
                  onChange={e => setMediaSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchMedia()} />
              </div>
              <select className="triumph-input text-xs w-auto" value={mediaFolder} onChange={e => setMediaFolder(e.target.value)}>
                <option value="">All Folders</option>
                {mediaFolders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              {mediaSummary && (
                <span className="text-[0.6rem] text-slate-400 px-2">
                  {mediaSummary.total_files} files · {mediaSummary.total_size_mb}MB
                </span>
              )}
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleMediaUpload} />
                {uploadingMedia ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {uploadingMedia ? 'Uploading…' : 'Upload Files'}
              </label>
            </div>

            {/* Media grid */}
            {mediaItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[var(--dark-surface)] flex items-center justify-center">
                  <Image size={28} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm text-slate-400 dark:text-[var(--dark-text-3)]">No media files. Upload some images!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {mediaItems.map((m: MediaItem) => (
                  <div key={m.id} className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] overflow-hidden group hover:shadow-sm transition-all">
                    <div className="aspect-square bg-slate-100 dark:bg-[var(--dark-surface)] relative">
                      {m.mime_type?.startsWith('image/') ? (
                        <img src={m.thumbnail_url || m.url} alt={m.alt_text || m.original_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><FileText size={24} className="text-slate-300" /></div>
                      )}
                      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { navigator.clipboard.writeText(m.url); toast.success('Copied', 'URL copied!'); }}
                          className="w-5 h-5 flex items-center justify-center rounded bg-white/90 dark:bg-[var(--dark-card)] shadow-sm"><Copy size={9} className="text-slate-600" /></button>
                        <button onClick={() => handleDeleteMedia(m)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-white/90 dark:bg-[var(--dark-card)] shadow-sm"><Trash2 size={9} className="text-red-500" /></button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                        <p className="text-[0.55rem] text-white truncate">{m.original_name}</p>
                        <div className="flex items-center gap-1 text-[0.5rem] text-white/70">
                          <span>{m.file_size < 1024*1024 ? `${(m.file_size/1024).toFixed(0)}KB` : `${(m.file_size/(1024*1024)).toFixed(1)}MB`}</span>
                          {m.width && <span>· {m.width}×{m.height}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] flex items-center gap-1"><FolderOpen size={9} />{m.folder}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════ SETTINGS TAB ═══════ */}
        {tab === 'settings' && (
          <div className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Category sidebar */}
              <div className="lg:w-56 flex-shrink-0">
                <div className="lg:sticky lg:top-4 space-y-1">
                  {SETTINGS_CATEGORIES.map(cat => { const Icon = cat.icon; return (
                    <button key={cat.key} onClick={() => setSettingsCategory(cat.key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        settingsCategory === cat.key
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'text-slate-600 dark:text-[var(--dark-text-2)] hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)]'
                      }`}>
                      <Icon size={14} />
                      <div><p className="text-xs font-medium">{cat.label}</p><p className="text-[0.55rem] text-slate-400 dark:text-[var(--dark-text-3)]">{cat.desc}</p></div>
                    </button>
                  ); })}
                </div>
              </div>

              {/* Settings form */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white capitalize">{settingsCategory} Settings</h3>
                  {hasSettingsChanges && (
                    <Button size="sm" icon={<Save size={12} />} onClick={handleSaveSettings} loading={saving}>Save Changes</Button>
                  )}
                </div>

                {filteredSettings.map((s: CmsSetting) => {
                  const currentValue = settingsEdits[s.key] ?? s.value ?? '';
                  return (
                    <div key={s.id} className="rounded-lg border border-slate-200 dark:border-[var(--dark-border)] p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-slate-700 dark:text-[var(--dark-text)]">{s.label || s.key}</label>
                          {s.description && <p className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)] mt-0.5">{s.description}</p>}
                          <div className="mt-1.5">
                            {s.type === 'boolean' ? (
                              <Toggle
                                value={currentValue === 'true'}
                                onChange={() => handleSettingChange(s.key, currentValue === 'true' ? 'false' : 'true')}
                                label={currentValue === 'true' ? 'Enabled' : 'Disabled'}
                              />
                            ) : s.type === 'image' ? (
                              <div className="flex items-center gap-2">
                                <input className="triumph-input text-xs flex-1" value={currentValue} onChange={e => handleSettingChange(s.key, e.target.value)} placeholder="/uploads/…" />
                                <button type="button" onClick={() => { setMediaPickerTarget(`setting_${s.key}`); setMediaPickerMultiple(false); setMediaPickerOpen(true); }}
                                  className="px-2 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-[var(--dark-border)] text-slate-600 dark:text-[var(--dark-text-2)] hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors flex items-center gap-1">
                                  <ImagePlus size={11} /> Browse
                                </button>
                                {currentValue && <img src={currentValue} alt="" className="w-8 h-8 rounded object-cover border border-slate-200 dark:border-[var(--dark-border)]" />}
                              </div>
                            ) : s.type === 'json' ? (
                              <textarea className="triumph-input text-xs font-mono resize-none" rows={3} value={currentValue} onChange={e => handleSettingChange(s.key, e.target.value)} />
                            ) : (
                              <input className="triumph-input text-xs" value={currentValue} onChange={e => handleSettingChange(s.key, e.target.value)} />
                            )}
                          </div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[0.55rem] bg-slate-100 dark:bg-[var(--dark-surface)] text-slate-400 dark:text-[var(--dark-text-3)] font-mono">{s.key}</span>
                      </div>
                    </div>
                  );
                })}

                {filteredSettings.length === 0 && (
                  <div className="text-center py-12">
                    <Settings size={32} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No settings in this category.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ Section Modal ═══════════ */}
      <Modal open={sectionModalOpen} onClose={() => setSectionModalOpen(false)} title={editSection ? 'Edit Section' : 'New Section'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Page</label>
            <select className="triumph-input" value={sectionForm.page} onChange={e => setSectionForm(p => ({ ...p, page: e.target.value }))} disabled={!!editSection}>
              {SECTION_PAGES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div><label className="triumph-label">Section Key *</label><input className="triumph-input font-mono text-xs" value={sectionForm.section_key} onChange={e => setSectionForm(p => ({ ...p, section_key: e.target.value }))} placeholder="hero_banner" disabled={!!editSection} /></div>
          <div><label className="triumph-label">Title</label><input className="triumph-input" value={sectionForm.title} onChange={e => setSectionForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div><label className="triumph-label">Subtitle</label><input className="triumph-input" value={sectionForm.subtitle} onChange={e => setSectionForm(p => ({ ...p, subtitle: e.target.value }))} /></div>
          <div className="sm:col-span-2"><label className="triumph-label">Content</label><textarea className="triumph-input resize-none" rows={3} value={sectionForm.content} onChange={e => setSectionForm(p => ({ ...p, content: e.target.value }))} /></div>
          <div><label className="triumph-label">CTA Text</label><input className="triumph-input" value={sectionForm.cta_text} onChange={e => setSectionForm(p => ({ ...p, cta_text: e.target.value }))} /></div>
          <div><label className="triumph-label">CTA Link</label><input className="triumph-input" value={sectionForm.cta_link} onChange={e => setSectionForm(p => ({ ...p, cta_link: e.target.value }))} /></div>
          <ImageField label="Image" value={sectionForm.image_url} target="section_image" onChange={v => setSectionForm(p => ({ ...p, image_url: v }))} />
          <div><label className="triumph-label">Icon (emoji)</label><input className="triumph-input" value={sectionForm.icon} onChange={e => setSectionForm(p => ({ ...p, icon: e.target.value }))} /></div>
          <div><label className="triumph-label">Sort Order</label><input type="number" className="triumph-input" value={sectionForm.sort_order} onChange={e => setSectionForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} /></div>
          <div className="pt-6"><Toggle value={sectionForm.is_active} onChange={() => setSectionForm(p => ({ ...p, is_active: !p.is_active }))} label={sectionForm.is_active ? 'Visible' : 'Hidden'} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setSectionModalOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSaveSection} loading={saving} icon={<Save size={12} />}>{editSection ? 'Save' : 'Create'}</Button>
        </div>
      </Modal>

      {/* ═══════════ Item Modal ═══════════ */}
      <Modal open={itemModalOpen} onClose={() => setItemModalOpen(false)} title={editItem ? 'Edit Item' : 'New Item'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="triumph-label">Title</label><input className="triumph-input" value={itemForm.title} onChange={e => setItemForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div><label className="triumph-label">Subtitle</label><input className="triumph-input" value={itemForm.subtitle} onChange={e => setItemForm(p => ({ ...p, subtitle: e.target.value }))} /></div>
          <div className="sm:col-span-2"><label className="triumph-label">Description</label><textarea className="triumph-input resize-none" rows={2} value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} /></div>
          <div><label className="triumph-label">Icon (emoji)</label><input className="triumph-input" value={itemForm.icon} onChange={e => setItemForm(p => ({ ...p, icon: e.target.value }))} /></div>
          <ImageField label="Image" value={itemForm.image_url} target="item_image" onChange={v => setItemForm(p => ({ ...p, image_url: v }))} />
          <div><label className="triumph-label">Link</label><input className="triumph-input" value={itemForm.link} onChange={e => setItemForm(p => ({ ...p, link: e.target.value }))} /></div>
          <div><label className="triumph-label">Value</label><input className="triumph-input" value={itemForm.value} onChange={e => setItemForm(p => ({ ...p, value: e.target.value }))} placeholder="e.g. 200+" /></div>
          <div><label className="triumph-label">Sort Order</label><input type="number" className="triumph-input" value={itemForm.sort_order} onChange={e => setItemForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} /></div>
          <div className="pt-6"><Toggle value={itemForm.is_active} onChange={() => setItemForm(p => ({ ...p, is_active: !p.is_active }))} label={itemForm.is_active ? 'Visible' : 'Hidden'} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setItemModalOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSaveItem} loading={saving} icon={<Save size={12} />}>{editItem ? 'Save' : 'Create'}</Button>
        </div>
      </Modal>

      {/* ═══════════ Service Modal ═══════════ */}
      <Modal open={serviceModalOpen} onClose={() => setServiceModalOpen(false)} title={editService ? 'Edit Service' : 'New Service'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="triumph-label">Title *</label><input className="triumph-input" value={serviceForm.title} onChange={e => setServiceForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div><label className="triumph-label">Icon (emoji)</label><input className="triumph-input" value={serviceForm.icon} onChange={e => setServiceForm(p => ({ ...p, icon: e.target.value }))} /></div>
          <div className="sm:col-span-2"><label className="triumph-label">Description</label><textarea className="triumph-input resize-none" rows={3} value={serviceForm.description} onChange={e => setServiceForm(p => ({ ...p, description: e.target.value }))} /></div>
          <ImageField label="Image" value={serviceForm.image_url} target="service_image" onChange={v => setServiceForm(p => ({ ...p, image_url: v }))} />
          <div><label className="triumph-label">Features (comma-separated)</label><input className="triumph-input" value={serviceForm.features} onChange={e => setServiceForm(p => ({ ...p, features: e.target.value }))} placeholder="Cotton, Nylon, Polyester" /></div>
          <div><label className="triumph-label">Sort Order</label><input type="number" className="triumph-input" value={serviceForm.sort_order} onChange={e => setServiceForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} /></div>
          <div className="pt-6"><Toggle value={serviceForm.is_active} onChange={() => setServiceForm(p => ({ ...p, is_active: !p.is_active }))} label={serviceForm.is_active ? 'Visible' : 'Hidden'} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setServiceModalOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSaveService} loading={saving} icon={<Save size={12} />}>{editService ? 'Save' : 'Create'}</Button>
        </div>
      </Modal>

      {/* ═══════════ Product Form Panel (full-page overlay under header) ═══════════ */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setProductModalOpen(false)}
            style={{ animation: 'triumph-fade-in 0.2s ease both' }} />
          {/* Panel */}
          <div
            className="absolute left-0 right-0 bg-white dark:bg-[var(--dark-card)] shadow-2xl overflow-hidden flex flex-col"
            style={{
              top: 'var(--header-height, 56px)',
              bottom: 0,
              marginLeft: 'var(--sidebar-width, 0px)',
              animation: 'cms-panel-slide-down 0.3s cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            {/* Panel header — sticky */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-[var(--dark-border)] bg-white dark:bg-[var(--dark-card)] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Package size={16} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-[var(--dark-text)]">
                    {editProduct ? 'Edit Product' : 'New Product'}
                  </h2>
                  <p className="text-[0.6rem] text-slate-400">{editProduct ? `Editing: ${editProduct.name}` : 'Fill in the product details below'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editProduct && (
                  <Button variant="ghost" size="sm" icon={<History size={12} />} onClick={() => openRevisions('product', editProduct.id, editProduct.name)}>History</Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setProductModalOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveProduct} loading={saving} icon={<Save size={12} />}>
                  {editProduct ? 'Save Product' : 'Create Product'}
                </Button>
              </div>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Basic info */}
              <div className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] p-4">
                <p className="text-xs font-semibold text-slate-700 dark:text-[var(--dark-text)] mb-3 flex items-center gap-1.5"><Package size={12} /> Basic Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label className="triumph-label">Product Name *</label><input className="triumph-input" value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><label className="triumph-label">SKU *</label><input className="triumph-input font-mono text-xs" value={productForm.sku} onChange={e => setProductForm(p => ({ ...p, sku: e.target.value }))} /></div>
                  <div>
                    <label className="triumph-label">Category</label>
                    <select className="triumph-input" value={productForm.category_id} onChange={e => setProductForm(p => ({ ...p, category_id: e.target.value }))}>
                      <option value="">— Select —</option>
                      {(productMeta.categories || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-3"><label className="triumph-label">Short Description</label><input className="triumph-input" value={productForm.short_description} onChange={e => setProductForm(p => ({ ...p, short_description: e.target.value }))} placeholder="Brief product summary…" /></div>
                  <div className="sm:col-span-3"><label className="triumph-label">Full Description</label><textarea className="triumph-input resize-none" rows={3} value={productForm.description} onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} /></div>
                </div>
              </div>

              {/* Pricing */}
              <div className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] p-4">
                <p className="text-xs font-semibold text-slate-700 dark:text-[var(--dark-text)] mb-3 flex items-center gap-1.5"><Hash size={12} /> Pricing & Stock</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><label className="triumph-label">Unit Price (Rs)</label><input type="number" className="triumph-input" value={productForm.unit_price} onChange={e => setProductForm(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><label className="triumph-label">Cost Price (Rs)</label><input type="number" className="triumph-input" value={productForm.cost_price} onChange={e => setProductForm(p => ({ ...p, cost_price: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><label className="triumph-label">Min Stock</label><input type="number" className="triumph-input" value={productForm.min_stock} onChange={e => setProductForm(p => ({ ...p, min_stock: parseInt(e.target.value) || 0 }))} /></div>
                  <div><label className="triumph-label">Sort Order</label><input type="number" className="triumph-input" value={productForm.sort_order} onChange={e => setProductForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Images */}
                <div className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] p-4">
                  <p className="text-xs font-semibold text-slate-700 dark:text-[var(--dark-text)] mb-3 flex items-center gap-1.5"><Image size={12} /> Images</p>
                  <div className="space-y-3">
                    <ImageField label="Main Product Image" value={productForm.image_url} target="product_image" onChange={v => setProductForm(p => ({ ...p, image_url: v }))} />
                    <div>
                      <label className="triumph-label">Gallery Images</label>
                      <button type="button" onClick={() => openMediaPicker('product_gallery', true)}
                        className="w-full px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-[var(--dark-border)] text-xs text-slate-500 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-1.5">
                        <ImagePlus size={13} /> Add Gallery Images
                      </button>
                      {productForm.gallery_images.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {productForm.gallery_images.map((img, i) => (
                            <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-[var(--dark-border)] group">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                              <button onClick={() => setProductForm(p => ({ ...p, gallery_images: p.gallery_images.filter((_, idx) => idx !== i) }))}
                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={14} className="text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags & Status */}
                <div className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] p-4">
                  <p className="text-xs font-semibold text-slate-700 dark:text-[var(--dark-text)] mb-3 flex items-center gap-1.5"><Tag size={12} /> Tags & Status</p>
                  <div className="space-y-3">
                    <div><label className="triumph-label">Tags (comma-separated)</label><input className="triumph-input" value={productForm.tags} onChange={e => setProductForm(p => ({ ...p, tags: e.target.value }))} placeholder="premium, cotton, sport" /></div>
                    <div className="flex items-center gap-6 pt-2">
                      <Toggle value={productForm.is_active} onChange={() => setProductForm(p => ({ ...p, is_active: !p.is_active }))} label={productForm.is_active ? 'Active' : 'Inactive'} />
                      <Toggle value={productForm.is_featured} onChange={() => setProductForm(p => ({ ...p, is_featured: !p.is_featured }))} label={productForm.is_featured ? 'Featured' : 'Not Featured'} />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEO */}
              <div className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] p-4">
                <p className="text-xs font-semibold text-slate-700 dark:text-[var(--dark-text)] mb-3 flex items-center gap-1.5"><Search size={12} /> SEO</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="triumph-label">Meta Title</label><input className="triumph-input" value={productForm.meta_title} onChange={e => setProductForm(p => ({ ...p, meta_title: e.target.value }))} placeholder="Product | Triumph Socks" /></div>
                  <div className="sm:col-span-2"><label className="triumph-label">Meta Description</label><textarea className="triumph-input resize-none" rows={2} value={productForm.meta_description} onChange={e => setProductForm(p => ({ ...p, meta_description: e.target.value }))} placeholder="Product meta description for search…" /></div>
                </div>
                {/* SEO Preview */}
                <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-[var(--dark-surface)] border border-slate-100 dark:border-[var(--dark-border)]">
                  <p className="text-[0.6rem] text-slate-400 uppercase tracking-wider mb-1">Search Preview</p>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">{productForm.meta_title || productForm.name || 'Product Title'}</p>
                  <p className="text-[0.6rem] text-green-600 dark:text-green-400">triumph-socks.com/products/{productForm.name ? productForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') : 'product-slug'}</p>
                  <p className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] line-clamp-2 mt-0.5">{productForm.meta_description || productForm.short_description || 'No description set'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Specifications */}
                <div className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] p-4">
                  <p className="text-xs font-semibold text-slate-700 dark:text-[var(--dark-text)] mb-3 flex items-center gap-1.5"><FileText size={12} /> Specifications</p>
                  <div className="space-y-1.5">
                    {productForm.specifications.map((spec, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input className="triumph-input flex-1 text-xs" placeholder="Key (e.g. Material)" value={spec.key}
                          onChange={e => { const s = [...productForm.specifications]; s[i] = { ...s[i], key: e.target.value }; setProductForm(p => ({ ...p, specifications: s })); }} />
                        <input className="triumph-input flex-1 text-xs" placeholder="Value (e.g. 100% Cotton)" value={spec.value}
                          onChange={e => { const s = [...productForm.specifications]; s[i] = { ...s[i], value: e.target.value }; setProductForm(p => ({ ...p, specifications: s })); }} />
                        <button onClick={() => setProductForm(p => ({ ...p, specifications: p.specifications.filter((_, idx) => idx !== i) }))}
                          className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"><X size={13} /></button>
                      </div>
                    ))}
                    <button onClick={() => setProductForm(p => ({ ...p, specifications: [...p.specifications, { key: '', value: '' }] }))}
                      className="w-full py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-[var(--dark-border)] text-xs text-slate-400 hover:text-amber-600 hover:border-amber-300 transition-colors flex items-center justify-center gap-1">
                      <Plus size={12} /> Add Specification
                    </button>
                  </div>
                </div>

                {/* Variants */}
                <div className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] p-4">
                  <p className="text-xs font-semibold text-slate-700 dark:text-[var(--dark-text)] mb-3 flex items-center gap-1.5"><Layers size={12} /> Variants</p>
                  <div className="space-y-1.5">
                    {productForm.variants.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input className="triumph-input flex-1 text-xs" placeholder="Variant Name" value={v.name}
                          onChange={e => { const vs = [...productForm.variants]; vs[i] = { ...vs[i], name: e.target.value }; setProductForm(p => ({ ...p, variants: vs })); }} />
                        <input className="triumph-input w-28 text-xs font-mono" placeholder="SKU" value={v.sku}
                          onChange={e => { const vs = [...productForm.variants]; vs[i] = { ...vs[i], sku: e.target.value }; setProductForm(p => ({ ...p, variants: vs })); }} />
                        <input type="number" className="triumph-input w-24 text-xs" placeholder="Price" value={v.price || ''}
                          onChange={e => { const vs = [...productForm.variants]; vs[i] = { ...vs[i], price: parseFloat(e.target.value) || 0 }; setProductForm(p => ({ ...p, variants: vs })); }} />
                        <button onClick={() => setProductForm(p => ({ ...p, variants: p.variants.filter((_, idx) => idx !== i) }))}
                          className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"><X size={13} /></button>
                      </div>
                    ))}
                    <button onClick={() => setProductForm(p => ({ ...p, variants: [...p.variants, { name: '', sku: '', price: 0 }] }))}
                      className="w-full py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-[var(--dark-border)] text-xs text-slate-400 hover:text-amber-600 hover:border-amber-300 transition-colors flex items-center justify-center gap-1">
                      <Plus size={12} /> Add Variant
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom save bar (mobile convenience) */}
              <div className="flex justify-end gap-2 pt-4 pb-2 border-t border-slate-200 dark:border-[var(--dark-border)] lg:hidden">
                <Button variant="secondary" size="sm" onClick={() => setProductModalOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveProduct} loading={saving} icon={<Save size={12} />}>
                  {editProduct ? 'Save Product' : 'Create Product'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Page SEO Modal ═══════════ */}
      <Modal open={pageModalOpen} onClose={() => setPageModalOpen(false)} title={editPage ? 'Edit Page SEO' : 'New Page'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="triumph-label">Slug *</label><input className="triumph-input font-mono text-xs" value={pageForm.slug} onChange={e => setPageForm(p => ({ ...p, slug: e.target.value }))} placeholder="about-us" disabled={!!editPage} /></div>
            <div><label className="triumph-label">Title *</label><input className="triumph-input" value={pageForm.title} onChange={e => setPageForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><label className="triumph-label">Meta Title</label><input className="triumph-input" value={pageForm.meta_title} onChange={e => setPageForm(p => ({ ...p, meta_title: e.target.value }))} placeholder="Page Title | Triumph Socks" /></div>
            <div>
              <label className="triumph-label">Status</label>
              <select className="triumph-input" value={pageForm.status} onChange={e => setPageForm(p => ({ ...p, status: e.target.value }))}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            <div className="sm:col-span-2"><label className="triumph-label">Meta Description</label><textarea className="triumph-input resize-none" rows={2} value={pageForm.meta_description} onChange={e => setPageForm(p => ({ ...p, meta_description: e.target.value }))} placeholder="Page description for search engines…" /></div>
            <ImageField label="OG Image" value={pageForm.og_image} target="page_og_image" onChange={v => setPageForm(p => ({ ...p, og_image: v }))} />
            <div className="flex flex-col gap-3">
              <div><label className="triumph-label">Sort Order</label><input type="number" className="triumph-input" value={pageForm.sort_order} onChange={e => setPageForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} /></div>
              <Toggle value={pageForm.is_active} onChange={() => setPageForm(p => ({ ...p, is_active: !p.is_active }))} label={pageForm.is_active ? 'Active' : 'Inactive'} />
            </div>
          </div>

          {/* SEO Preview */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[var(--dark-surface)] border border-slate-100 dark:border-[var(--dark-border)]">
            <p className="text-[0.6rem] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Search size={9} /> Search Engine Preview</p>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">{pageForm.meta_title || pageForm.title || 'Page Title'}</p>
            <p className="text-[0.6rem] text-green-600 dark:text-green-400">triumph-socks.com/{pageForm.slug || 'page-slug'}</p>
            <p className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] line-clamp-2 mt-0.5">{pageForm.meta_description || 'No meta description set'}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setPageModalOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSavePage} loading={saving} icon={<Save size={12} />}>{editPage ? 'Save' : 'Create'}</Button>
        </div>
      </Modal>

      {/* ═══════════ Revision History Modal ═══════════ */}
      <Modal open={historyModalOpen} onClose={() => setHistoryModalOpen(false)} title={`Revision History — ${revisionEntity.name}`} size="lg">
        {revisions.length === 0 ? (
          <div className="text-center py-8">
            <History size={24} className="text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No revision history yet.</p>
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
            {revisions.map((r, i) => (
              <div key={r.id} className="rounded-lg border border-slate-200 dark:border-[var(--dark-border)] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[0.6rem] font-bold flex items-center justify-center">
                    #{r.revision_num}
                  </span>
                  <span className="text-xs font-medium text-slate-700 dark:text-[var(--dark-text)]">{r.changed_by_name || 'System'}</span>
                  <span className="text-[0.6rem] text-slate-400 ml-auto">{timeAgo(r.created_at)}</span>
                </div>
                {r.change_note && <p className="text-[0.6rem] text-slate-500 dark:text-[var(--dark-text-3)] ml-8">{r.change_note}</p>}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ═══════════ Media Picker ═══════════ */}
      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => {
          // Handle settings image targets
          if (mediaPickerTarget.startsWith('setting_')) {
            const key = mediaPickerTarget.replace('setting_', '');
            handleSettingChange(key, url);
          } else {
            handleMediaSelect(url);
          }
        }}
        multiple={mediaPickerMultiple}
        onSelectMultiple={handleMediaSelectMultiple}
      />

      {/* ═══════════ Delete Confirm ═══════════ */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Item?" message={`Remove "${deleteTarget?.title ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}
