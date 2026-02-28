'use client';
import { useState, useEffect, useCallback } from 'react';
import { Upload, Image as ImageIcon, Search, FolderOpen, Check, X, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface MediaItem {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  url: string;
  thumbnail_url?: string;
  alt_text?: string;
  folder: string;
  width?: number;
  height?: number;
  created_at: string;
}

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  multiple?: boolean;
  onSelectMultiple?: (urls: string[]) => void;
}

export default function MediaPicker({ open, onClose, onSelect, multiple, onSelectMultiple }: MediaPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (folder) params.set('folder', folder);
      if (search) params.set('search', search);
      params.set('limit', '50');
      const res = await fetch(`/api/media?${params}`);
      const data = await res.json();
      setMedia(data.media ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [folder, search]);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/media?meta=true');
      const data = await res.json();
      setFolders(data.folders ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (open) {
      fetchMedia();
      fetchFolders();
      setSelected([]);
    }
  }, [open, fetchMedia, fetchFolders]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder || 'general');
        await fetch('/api/media', { method: 'POST', body: fd });
      }
      fetchMedia();
    } catch { /* ignore */ }
    setUploading(false);
    e.target.value = '';
  };

  const toggleSelect = (url: string) => {
    if (multiple) {
      setSelected(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
    } else {
      onSelect(url);
      onClose();
    }
  };

  const confirmMultiple = () => {
    if (onSelectMultiple) onSelectMultiple(selected);
    onClose();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <Modal open={open} onClose={onClose} title="Media Library" size="xl">
      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="triumph-input pl-8 text-xs" placeholder="Search media…" value={search}
              onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchMedia()} />
          </div>
          <select className="triumph-input text-xs w-auto" value={folder} onChange={e => setFolder(e.target.value)}>
            <option value="">All Folders</option>
            {folders.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors">
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {uploading ? 'Uploading…' : 'Upload'}
          </label>
        </div>

        {/* Grid */}
        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-slate-200 dark:border-[var(--dark-border)] p-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-amber-500" />
            </div>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <ImageIcon size={32} className="text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400">No media files found. Upload some images!</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {media.map(m => {
                const isSelected = selected.includes(m.url);
                const isImage = m.mime_type.startsWith('image/');
                return (
                  <button key={m.id} onClick={() => toggleSelect(m.url)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:shadow-md
                      ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}>
                    {isImage ? (
                      <img src={m.thumbnail_url || m.url} alt={m.alt_text || m.original_name}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 dark:bg-[var(--dark-surface)] flex items-center justify-center">
                        <FolderOpen size={20} className="text-slate-400" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                      <p className="text-[0.55rem] text-white truncate">{m.original_name}</p>
                      <p className="text-[0.5rem] text-white/70">{formatSize(m.file_size)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {multiple && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[var(--dark-border)]">
            <span className="text-xs text-slate-500">{selected.length} selected</span>
            <div className="flex gap-2">
              <button onClick={() => setSelected([])} className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[var(--dark-border)] text-slate-600 dark:text-[var(--dark-text-2)] hover:bg-slate-50 dark:hover:bg-[var(--dark-surface)] transition-colors">Clear</button>
              <button onClick={confirmMultiple} disabled={!selected.length}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 transition-colors">Use Selected</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
