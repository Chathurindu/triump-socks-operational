'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Globe, Layout, FileText, Image, Briefcase, Plus, Pencil, Trash2,
  Eye, EyeOff, GripVertical, ChevronRight, Save, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

/* ─── Types ───────────────────────────────────────── */
type Tab = 'pages' | 'services' | 'gallery';
type Section = any;
type Item = any;
type Service = any;
type GalleryItem = any;

const PAGES = ['home', 'about', 'contact', 'products'];
const PAGE_ICONS: Record<string, string> = { home: '🏠', about: '📖', contact: '📞', products: '🧦' };

/* ─── Helper: empty forms ─────────────────────────── */
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
const EMPTY_GALLERY_FORM = {
  title: '', alt_text: '', image_url: '', category: 'general',
  sort_order: 0, is_active: true,
};

export default function CMSPage() {
  const [tab, setTab]           = useState<Tab>('pages');
  const [sections, setSections] = useState<Section[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [gallery, setGallery]   = useState<GalleryItem[]>([]);
  const [galleryCats, setGalleryCats] = useState<string[]>([]);
  const [meta, setMeta]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  /* ── Page tab expand ── */
  const [expandedPage, setExpandedPage]       = useState<string>('home');
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  /* ── Modals ── */
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editSection, setEditSection]           = useState<Section | null>(null);
  const [sectionForm, setSectionForm]           = useState(EMPTY_SECTION_FORM);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItem, setEditItem]           = useState<Item | null>(null);
  const [itemForm, setItemForm]           = useState(EMPTY_ITEM_FORM);

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editService, setEditService]           = useState<Service | null>(null);
  const [serviceForm, setServiceForm]           = useState(EMPTY_SERVICE_FORM);

  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [editGalleryItem, setEditGalleryItem]   = useState<GalleryItem | null>(null);
  const [galleryForm, setGalleryForm]           = useState(EMPTY_GALLERY_FORM);

  const [saving, setSaving]         = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ entity: string; id: string; title: string } | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const toast = useToast();

  /* ═══════════════════════ Load data ═══════════════════════ */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [sectRes, svcRes, galRes, metaRes] = await Promise.all([
      fetch('/api/cms?type=sections').then(r => r.json()),
      fetch('/api/cms?type=services').then(r => r.json()),
      fetch('/api/cms?type=gallery').then(r => r.json()),
      fetch('/api/cms?type=meta').then(r => r.json()),
    ]);
    setSections(sectRes.sections ?? []);
    setServices(svcRes.services ?? []);
    setGallery(galRes.gallery ?? []);
    setGalleryCats(galRes.categories ?? []);
    setMeta(metaRes);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ═══════════════════════ Handlers ═══════════════════════ */
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
      const res = await fetch('/api/cms', {
        method: editSection ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editSection ? 'Section Updated' : 'Section Created', `${sectionForm.title || sectionForm.section_key} saved.`);
      setSectionModalOpen(false);
      fetchAll();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

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
      const res = await fetch('/api/cms', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editItem ? 'Item Updated' : 'Item Created', `${itemForm.title || 'Item'} saved.`);
      setItemModalOpen(false);
      fetchAll();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

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
      const res = await fetch('/api/cms', {
        method: editService ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editService ? 'Service Updated' : 'Service Created', `${serviceForm.title} saved.`);
      setServiceModalOpen(false);
      fetchAll();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const openAddGallery = () => {
    setEditGalleryItem(null);
    setGalleryForm(EMPTY_GALLERY_FORM);
    setGalleryModalOpen(true);
  };
  const openEditGallery = (g: GalleryItem) => {
    setEditGalleryItem(g);
    setGalleryForm({
      title: g.title || '', alt_text: g.alt_text || '', image_url: g.image_url || '',
      category: g.category || 'general', sort_order: g.sort_order ?? 0, is_active: g.is_active !== false,
    });
    setGalleryModalOpen(true);
  };

  const handleSaveGallery = async () => {
    if (!galleryForm.image_url.trim()) { toast.warning('Validation', 'Image URL is required.'); return; }
    setSaving(true);
    try {
      const payload = { entity: 'gallery', ...galleryForm, ...(editGalleryItem ? { id: editGalleryItem.id } : {}) };
      const res = await fetch('/api/cms', {
        method: editGalleryItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(editGalleryItem ? 'Gallery Updated' : 'Gallery Added', `${galleryForm.title || 'Image'} saved.`);
      setGalleryModalOpen(false);
      fetchAll();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cms?entity=${deleteTarget.entity}&id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Deleted', `${deleteTarget.title || 'Item'} removed.`);
      setDeleteTarget(null);
      fetchAll();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setDeleting(false); }
  };

  /* ═══════════════════════ Derived ═══════════════════════ */
  const sectionsByPage = PAGES.reduce((acc, p) => {
    acc[p] = sections.filter((s: Section) => s.page === p);
    return acc;
  }, {} as Record<string, Section[]>);

  const kpis = meta ? [
    { label: 'Pages',    value: meta.pages?.length ?? 0, icon: Layout, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Sections', value: meta.counts?.sections ?? 0, icon: Layers, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Services', value: meta.counts?.services ?? 0, icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Gallery',  value: meta.counts?.gallery ?? 0, icon: Image, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ] : [];

  const tabs = [
    { key: 'pages' as Tab, label: 'Page Sections', icon: FileText },
    { key: 'services' as Tab, label: 'Services', icon: Briefcase },
    { key: 'gallery' as Tab, label: 'Gallery', icon: Image },
  ];

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

  return (
    <div className="space-y-4">
      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map((k, i) => { const Icon = k.icon; return (
            <div key={k.label} className={`triumph-card p-4 flex items-center gap-3 anim-fade-up anim-d${Math.min(i+1,6)}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.bg}`}><Icon size={18} className={k.color} /></div>
              <div><p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{k.value}</p><p className="text-[0.65rem] text-slate-500 dark:text-[var(--dark-text-3)] mt-0.5">{k.label}</p></div>
            </div>
          ); })}
        </div>
      )}

      {/* Tabs */}
      <div className="triumph-card">
        <div className="flex items-center gap-1 px-4 py-2.5 border-b border-slate-100 dark:border-[var(--dark-border)]">
          {tabs.map(t => { const Icon = t.icon; return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t.key ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)]'}`}>
              <Icon size={13} />{t.label}
            </button>
          ); })}
        </div>

        {/* ═══════ PAGES TAB ═══════ */}
        {tab === 'pages' && (
          <div className="divide-y divide-slate-100 dark:divide-[var(--dark-border)]">
            {PAGES.map(page => (
              <div key={page}>
                {/* Page header */}
                <button onClick={() => setExpandedPage(expandedPage === page ? '' : page)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">
                  <span className="text-lg">{PAGE_ICONS[page]}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-[var(--dark-text)] capitalize">{page}</span>
                  <span className="text-xs text-slate-400 dark:text-[var(--dark-text-3)]">{sectionsByPage[page]?.length ?? 0} sections</span>
                  <ChevronRight size={14} className={`ml-auto text-slate-400 transition-transform ${expandedPage === page ? 'rotate-90' : ''}`} />
                </button>

                {/* Sections list */}
                {expandedPage === page && (
                  <div className="px-4 pb-4">
                    {(sectionsByPage[page] || []).length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-[var(--dark-text-3)] py-4 text-center">No sections yet</p>
                    ) : (
                      <div className="space-y-2">
                        {sectionsByPage[page].map((section: Section) => (
                          <div key={section.id} className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] overflow-hidden">
                            {/* Section header */}
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

                            {/* Section items */}
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

        {/* ═══════ GALLERY TAB ═══════ */}
        {tab === 'gallery' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)]">{gallery.length} images</p>
              <Button size="sm" icon={<Plus size={13} />} onClick={openAddGallery}>Add Image</Button>
            </div>
            {gallery.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <span className="text-4xl">🖼️</span>
                <p className="text-sm text-slate-400 dark:text-[var(--dark-text-3)]">No gallery images yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {gallery.map((g: GalleryItem) => (
                  <div key={g.id} className="rounded-xl border border-slate-200 dark:border-[var(--dark-border)] overflow-hidden group hover:shadow-sm transition-all">
                    <div className="aspect-video bg-slate-100 dark:bg-[var(--dark-surface)] relative">
                      {g.image_url ? (
                        <img src={g.image_url} alt={g.alt_text || g.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Image size={24} className="text-slate-300" /></div>
                      )}
                      {!g.is_active && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><EyeOff size={16} className="text-white" /></div>}
                      <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditGallery(g)} className="w-6 h-6 flex items-center justify-center rounded-md bg-white/90 dark:bg-[var(--dark-card)] text-slate-600 hover:text-amber-600 transition-colors shadow-sm"><Pencil size={10} /></button>
                        <button onClick={() => setDeleteTarget({ entity: 'gallery', id: g.id, title: g.title || 'Image' })} className="w-6 h-6 flex items-center justify-center rounded-md bg-white/90 dark:bg-[var(--dark-card)] text-slate-600 hover:text-red-600 transition-colors shadow-sm"><Trash2 size={10} /></button>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-slate-700 dark:text-[var(--dark-text)] truncate">{g.title || '(untitled)'}</p>
                      <p className="text-[0.6rem] text-slate-400 dark:text-[var(--dark-text-3)]">{g.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════ Section Modal ═══════════ */}
      <Modal open={sectionModalOpen} onClose={() => setSectionModalOpen(false)} title={editSection ? 'Edit Section' : 'New Section'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="triumph-label">Page</label>
            <select className="triumph-input" value={sectionForm.page} onChange={e => setSectionForm(p => ({ ...p, page: e.target.value }))} disabled={!!editSection}>
              {PAGES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div><label className="triumph-label">Section Key *</label><input className="triumph-input font-mono text-xs" value={sectionForm.section_key} onChange={e => setSectionForm(p => ({ ...p, section_key: e.target.value }))} placeholder="hero_banner" disabled={!!editSection} /></div>
          <div><label className="triumph-label">Title</label><input className="triumph-input" value={sectionForm.title} onChange={e => setSectionForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div><label className="triumph-label">Subtitle</label><input className="triumph-input" value={sectionForm.subtitle} onChange={e => setSectionForm(p => ({ ...p, subtitle: e.target.value }))} /></div>
          <div className="sm:col-span-2"><label className="triumph-label">Content</label><textarea className="triumph-input resize-none" rows={3} value={sectionForm.content} onChange={e => setSectionForm(p => ({ ...p, content: e.target.value }))} /></div>
          <div><label className="triumph-label">CTA Text</label><input className="triumph-input" value={sectionForm.cta_text} onChange={e => setSectionForm(p => ({ ...p, cta_text: e.target.value }))} /></div>
          <div><label className="triumph-label">CTA Link</label><input className="triumph-input" value={sectionForm.cta_link} onChange={e => setSectionForm(p => ({ ...p, cta_link: e.target.value }))} /></div>
          <div><label className="triumph-label">Image URL</label><input className="triumph-input" value={sectionForm.image_url} onChange={e => setSectionForm(p => ({ ...p, image_url: e.target.value }))} /></div>
          <div><label className="triumph-label">Icon (emoji)</label><input className="triumph-input" value={sectionForm.icon} onChange={e => setSectionForm(p => ({ ...p, icon: e.target.value }))} /></div>
          <div><label className="triumph-label">Sort Order</label><input type="number" className="triumph-input" value={sectionForm.sort_order} onChange={e => setSectionForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} /></div>
          <div className="flex items-center gap-2 pt-6">
            <button type="button" onClick={() => setSectionForm(p => ({ ...p, is_active: !p.is_active }))} className={`relative w-9 h-5 rounded-full transition-colors ${sectionForm.is_active ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${sectionForm.is_active ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{sectionForm.is_active ? 'Visible' : 'Hidden'}</span>
          </div>
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
          <div><label className="triumph-label">Image URL</label><input className="triumph-input" value={itemForm.image_url} onChange={e => setItemForm(p => ({ ...p, image_url: e.target.value }))} /></div>
          <div><label className="triumph-label">Link</label><input className="triumph-input" value={itemForm.link} onChange={e => setItemForm(p => ({ ...p, link: e.target.value }))} /></div>
          <div><label className="triumph-label">Value</label><input className="triumph-input" value={itemForm.value} onChange={e => setItemForm(p => ({ ...p, value: e.target.value }))} placeholder="e.g. 200+" /></div>
          <div><label className="triumph-label">Sort Order</label><input type="number" className="triumph-input" value={itemForm.sort_order} onChange={e => setItemForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} /></div>
          <div className="flex items-center gap-2 pt-6">
            <button type="button" onClick={() => setItemForm(p => ({ ...p, is_active: !p.is_active }))} className={`relative w-9 h-5 rounded-full transition-colors ${itemForm.is_active ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${itemForm.is_active ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{itemForm.is_active ? 'Visible' : 'Hidden'}</span>
          </div>
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
          <div><label className="triumph-label">Image URL</label><input className="triumph-input" value={serviceForm.image_url} onChange={e => setServiceForm(p => ({ ...p, image_url: e.target.value }))} /></div>
          <div><label className="triumph-label">Features (comma-separated)</label><input className="triumph-input" value={serviceForm.features} onChange={e => setServiceForm(p => ({ ...p, features: e.target.value }))} placeholder="Cotton, Nylon, Polyester" /></div>
          <div><label className="triumph-label">Sort Order</label><input type="number" className="triumph-input" value={serviceForm.sort_order} onChange={e => setServiceForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} /></div>
          <div className="flex items-center gap-2 pt-6">
            <button type="button" onClick={() => setServiceForm(p => ({ ...p, is_active: !p.is_active }))} className={`relative w-9 h-5 rounded-full transition-colors ${serviceForm.is_active ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${serviceForm.is_active ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{serviceForm.is_active ? 'Visible' : 'Hidden'}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setServiceModalOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSaveService} loading={saving} icon={<Save size={12} />}>{editService ? 'Save' : 'Create'}</Button>
        </div>
      </Modal>

      {/* ═══════════ Gallery Modal ═══════════ */}
      <Modal open={galleryModalOpen} onClose={() => setGalleryModalOpen(false)} title={editGalleryItem ? 'Edit Image' : 'Add Image'}>
        <div className="space-y-4">
          <div><label className="triumph-label">Image URL *</label><input className="triumph-input" value={galleryForm.image_url} onChange={e => setGalleryForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://…" /></div>
          {galleryForm.image_url && (
            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-[var(--dark-border)]">
              <img src={galleryForm.image_url} alt="Preview" className="w-full h-32 object-cover" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="triumph-label">Title</label><input className="triumph-input" value={galleryForm.title} onChange={e => setGalleryForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><label className="triumph-label">Category</label><input className="triumph-input" value={galleryForm.category} onChange={e => setGalleryForm(p => ({ ...p, category: e.target.value }))} placeholder="general" /></div>
            <div><label className="triumph-label">Alt Text</label><input className="triumph-input" value={galleryForm.alt_text} onChange={e => setGalleryForm(p => ({ ...p, alt_text: e.target.value }))} /></div>
            <div><label className="triumph-label">Sort Order</label><input type="number" className="triumph-input" value={galleryForm.sort_order} onChange={e => setGalleryForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} /></div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setGalleryForm(p => ({ ...p, is_active: !p.is_active }))} className={`relative w-9 h-5 rounded-full transition-colors ${galleryForm.is_active ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${galleryForm.is_active ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-xs text-slate-600 dark:text-[var(--dark-text-2)]">{galleryForm.is_active ? 'Visible' : 'Hidden'}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-[var(--dark-border)]">
          <Button variant="secondary" size="sm" onClick={() => setGalleryModalOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSaveGallery} loading={saving} icon={<Save size={12} />}>{editGalleryItem ? 'Save' : 'Add'}</Button>
        </div>
      </Modal>

      {/* ═══════════ Delete Confirm ═══════════ */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        variant="danger" title="Delete Item?" message={`Remove "${deleteTarget?.title ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete" loading={deleting} />
    </div>
  );
}
