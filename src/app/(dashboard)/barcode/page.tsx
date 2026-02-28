'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Barcode, QrCode, Tag, Printer, Download, RefreshCw,
  Package, Boxes, Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import DataTable, { Column } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';

/* ── constants ── */
const BARCODE_TYPES = [
  { value: 'code128', label: 'Code 128' },
  { value: 'qrcode', label: 'QR Code' },
  { value: 'ean13', label: 'EAN-13' },
];

type Section = 'generator' | 'products' | 'inventory';

export default function BarcodePage() {
  const toast = useToast();
  const [section, setSection] = useState<Section>('generator');

  /* ── Quick Generator ── */
  const [genText, setGenText] = useState('');
  const [genType, setGenType] = useState('code128');
  const [genUrl, setGenUrl] = useState('');

  /* ── Product Labels ── */
  const [products, setProducts] = useState<any[]>([]);
  const [prodLoading, setProdLoading] = useState(false);

  /* ── Inventory Labels ── */
  const [invItems, setInvItems] = useState<any[]>([]);
  const [invLoading, setInvLoading] = useState(false);

  /* ── Batch labels ── */
  const [labels, setLabels] = useState<{ text: string; label: string; image: string }[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  /* ── fetch products ── */
  const fetchProducts = useCallback(async () => {
    setProdLoading(true);
    try {
      const res = await fetch('/api/barcode?action=product-labels');
      const json = await res.json();
      setProducts(json.products ?? []);
    } catch { /* ignore */ }
    setProdLoading(false);
  }, []);

  /* ── fetch inventory ── */
  const fetchInventory = useCallback(async () => {
    setInvLoading(true);
    try {
      const res = await fetch('/api/barcode?action=inventory-labels');
      const json = await res.json();
      setInvItems(json.items ?? []);
    } catch { /* ignore */ }
    setInvLoading(false);
  }, []);

  useEffect(() => {
    if (section === 'products' && products.length === 0) fetchProducts();
    if (section === 'inventory' && invItems.length === 0) fetchInventory();
  }, [section, products.length, invItems.length, fetchProducts, fetchInventory]);

  /* ── generate single ── */
  const handleGenerate = () => {
    if (!genText.trim()) { toast.warning('Required', 'Enter text to encode.'); return; }
    setGenUrl(`/api/barcode?action=generate&text=${encodeURIComponent(genText)}&type=${genType}`);
  };

  const handleDownloadSingle = () => {
    if (!genUrl) return;
    const a = document.createElement('a');
    a.href = genUrl;
    a.download = `barcode_${genText}.png`;
    a.click();
  };

  /* ── single label for a product/item ── */
  const generateSingleLabel = (sku: string, name: string, type: string) => {
    const url = `/api/barcode?action=generate&text=${encodeURIComponent(sku)}&type=${type}`;
    setLabels([{ text: sku, label: name, image: url }]);
    toast.success('Generated', `${type === 'qrcode' ? 'QR' : 'Barcode'} for ${name}`);
  };

  /* ── batch generate ── */
  const handleBatch = async (items: { text: string; label: string }[], type: string = 'code128') => {
    setBatchLoading(true);
    try {
      const itemsParam = encodeURIComponent(JSON.stringify(items));
      const res = await fetch(`/api/barcode?action=batch&items=${itemsParam}&type=${type}`);
      if (!res.ok) throw new Error('Batch generate failed');
      const json = await res.json();
      setLabels(json.labels ?? []);
      toast.success('Batch Complete', `${json.labels?.length ?? 0} labels generated.`);
    } catch (err: any) {
      toast.error('Error', err.message);
    }
    setBatchLoading(false);
  };

  const handleBatchProducts = () => {
    const items = products.filter(p => p.sku).map(p => ({ text: p.sku, label: p.name }));
    if (items.length === 0) { toast.warning('No SKUs', 'No products with SKUs found.'); return; }
    handleBatch(items);
  };

  const handleBatchInventory = () => {
    const items = invItems.filter(i => i.sku).map(i => ({ text: i.sku, label: i.name }));
    if (items.length === 0) { toast.warning('No SKUs', 'No inventory items with SKUs found.'); return; }
    handleBatch(items);
  };

  /* ── print ── */
  const handlePrint = () => { window.print(); };

  /* ── product columns ── */
  const prodColumns: Column[] = [
    {
      key: 'name', label: 'Name', width: '200px',
      render: (r) => <span className="text-sm font-medium text-slate-700 dark:text-[var(--dark-text)]">{r.name}</span>,
    },
    {
      key: 'sku', label: 'SKU', width: '120px',
      render: (r) => <span className="font-mono text-xs text-slate-500 dark:text-[var(--dark-text-2)]">{r.sku ?? '—'}</span>,
    },
    {
      key: 'selling_price', label: 'Price', align: 'right', width: '100px',
      render: (r) => <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-[var(--dark-text)]">₹{Number(r.selling_price ?? 0).toFixed(2)}</span>,
    },
    {
      key: 'actions', label: 'Actions', align: 'center', width: '180px',
      render: (r) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button size="xs" variant="outline" icon={<Barcode size={13} />} onClick={() => generateSingleLabel(r.sku || r.name, r.name, 'code128')}>
            Barcode
          </Button>
          <Button size="xs" variant="outline" icon={<QrCode size={13} />} onClick={() => generateSingleLabel(r.sku || r.name, r.name, 'qrcode')}>
            QR
          </Button>
        </div>
      ),
    },
  ];

  /* ── inventory columns ── */
  const invColumns: Column[] = [
    {
      key: 'name', label: 'Name', width: '200px',
      render: (r) => <span className="text-sm font-medium text-slate-700 dark:text-[var(--dark-text)]">{r.name}</span>,
    },
    {
      key: 'sku', label: 'SKU', width: '120px',
      render: (r) => <span className="font-mono text-xs text-slate-500 dark:text-[var(--dark-text-2)]">{r.sku ?? '—'}</span>,
    },
    {
      key: 'unit', label: 'Unit', width: '80px',
      render: (r) => <Badge label={r.unit || '—'} color="gray" />,
    },
    {
      key: 'unit_price', label: 'Price', align: 'right', width: '100px',
      render: (r) => <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-[var(--dark-text)]">₹{Number(r.unit_price ?? 0).toFixed(2)}</span>,
    },
    {
      key: 'actions', label: 'Actions', align: 'center', width: '180px',
      render: (r) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button size="xs" variant="outline" icon={<Barcode size={13} />} onClick={() => generateSingleLabel(r.sku || r.name, r.name, 'code128')}>
            Barcode
          </Button>
          <Button size="xs" variant="outline" icon={<QrCode size={13} />} onClick={() => generateSingleLabel(r.sku || r.name, r.name, 'qrcode')}>
            QR
          </Button>
        </div>
      ),
    },
  ];

  /* ── section tabs ── */
  const sections: { key: Section; label: string; icon: React.ElementType }[] = [
    { key: 'generator', label: 'Quick Generator', icon: Barcode },
    { key: 'products', label: 'Product Labels', icon: Package },
    { key: 'inventory', label: 'Inventory Labels', icon: Boxes },
  ];

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-labels, .print-labels * { visibility: visible !important; }
          .print-labels { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-[var(--dark-text)]">Barcode / QR Labels</h1>
          <p className="text-xs text-slate-500 dark:text-[var(--dark-text-3)] mt-1">Generate and print barcode &amp; QR code labels</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-[var(--dark-surface)] w-fit no-print">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
              section === s.key
                ? 'bg-white dark:bg-[var(--dark-card)] text-slate-800 dark:text-[var(--dark-text)] shadow-sm'
                : 'text-slate-500 dark:text-[var(--dark-text-3)] hover:text-slate-700 dark:hover:text-[var(--dark-text-2)]'
            }`}
          >
            <s.icon size={14} />
            {s.label}
          </button>
        ))}
      </div>

      {/* ──────────── Quick Generator ──────────── */}
      {section === 'generator' && (
        <div className="space-y-5 anim-fade-up no-print">
          <Card title="Generate Barcode / QR Code">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="triumph-label">Text to Encode</label>
                  <input
                    type="text"
                    value={genText}
                    onChange={e => setGenText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleGenerate(); }}
                    placeholder="Enter SKU, URL, or any text…"
                    className="triumph-input w-full"
                  />
                </div>
                <div>
                  <label className="triumph-label">Barcode Type</label>
                  <select
                    value={genType}
                    onChange={e => setGenType(e.target.value)}
                    className="triumph-input w-full"
                  >
                    {BARCODE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button icon={<Barcode size={15} />} onClick={handleGenerate}>
                  Generate
                </Button>
                {genUrl && (
                  <Button variant="outline" icon={<Download size={15} />} onClick={handleDownloadSingle}>
                    Download
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Preview */}
          {genUrl && (
            <Card title="Preview">
              <div className="flex items-center justify-center p-6 bg-white dark:bg-[var(--dark-surface)] rounded-lg border border-gray-100 dark:border-gray-700">
                <img
                  src={genUrl}
                  alt="Barcode"
                  className="max-w-full max-h-48"
                  onError={() => toast.error('Error', 'Failed to generate barcode. Check your input.')}
                />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ──────────── Product Labels ──────────── */}
      {section === 'products' && (
        <div className="space-y-5 anim-fade-up">
          <Card
            noPad
            title="Products"
            action={
              <div className="flex gap-2 no-print">
                <Button
                  size="sm"
                  variant="outline"
                  icon={<RefreshCw size={14} />}
                  onClick={fetchProducts}
                  loading={prodLoading}
                >
                  Refresh
                </Button>
                <Button
                  size="sm"
                  icon={<Tag size={14} />}
                  onClick={handleBatchProducts}
                  loading={batchLoading}
                >
                  Generate All
                </Button>
              </div>
            }
          >
            <DataTable
              columns={prodColumns}
              data={products}
              total={products.length}
              page={1}
              pageSize={products.length || 10}
              loading={prodLoading}
              onPageChange={() => {}}
              emptyIcon="📦"
              emptyText="No products found."
            />
          </Card>
        </div>
      )}

      {/* ──────────── Inventory Labels ──────────── */}
      {section === 'inventory' && (
        <div className="space-y-5 anim-fade-up">
          <Card
            noPad
            title="Inventory Items"
            action={
              <div className="flex gap-2 no-print">
                <Button
                  size="sm"
                  variant="outline"
                  icon={<RefreshCw size={14} />}
                  onClick={fetchInventory}
                  loading={invLoading}
                >
                  Refresh
                </Button>
                <Button
                  size="sm"
                  icon={<Tag size={14} />}
                  onClick={handleBatchInventory}
                  loading={batchLoading}
                >
                  Generate All
                </Button>
              </div>
            }
          >
            <DataTable
              columns={invColumns}
              data={invItems}
              total={invItems.length}
              page={1}
              pageSize={invItems.length || 10}
              loading={invLoading}
              onPageChange={() => {}}
              emptyIcon="📋"
              emptyText="No inventory items found."
            />
          </Card>
        </div>
      )}

      {/* ──────────── Label Preview Grid ──────────── */}
      {labels.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between no-print">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-[var(--dark-text)]">
              Generated Labels ({labels.length})
            </h2>
            <Button size="sm" variant="outline" icon={<Printer size={14} />} onClick={handlePrint}>
              Print Labels
            </Button>
          </div>

          <div ref={printRef} className="print-labels grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {labels.map(l => (
              <div
                key={l.text}
                className="triumph-card flex flex-col items-center gap-2 p-3 rounded-xl"
              >
                <img
                  src={l.image}
                  alt={l.text}
                  className="max-w-full max-h-24"
                />
                <p className="text-xs font-semibold text-slate-700 dark:text-[var(--dark-text)] text-center truncate w-full">
                  {l.label}
                </p>
                <p className="font-mono text-[0.65rem] text-slate-400 dark:text-[var(--dark-text-3)]">
                  {l.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
