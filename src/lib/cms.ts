/**
 * CMS data helpers — used by public-facing pages to pull content from CMS tables.
 * Every section of the website reads from the CMS so the admin can control it.
 */
import { db } from '@/lib/db';

/* ── Types ─────────────────────────────────────────────── */
export interface CmsSection {
  id: number;
  page: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CmsItem {
  id: string;
  section_id: number;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  link: string | null;
  value: string | null;
  extra: Record<string, any>;
  sort_order: number;
  is_active: boolean;
}

export interface CmsService {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  features: string[];
  sort_order: number;
  is_active: boolean;
}

export interface CmsPage {
  id: number;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  status: string;
  is_active: boolean;
}

export interface CmsSetting {
  key: string;
  value: string | null;
  type: string;
  category: string;
}

/* ── Fetchers ──────────────────────────────────────────── */

/** Get a page's SEO meta by slug */
export async function getPageMeta(slug: string): Promise<CmsPage | null> {
  try {
    const { rows } = await db.query(
      `SELECT * FROM cms_pages WHERE slug = $1 AND is_active = true LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  } catch { return null; }
}

/** Get a specific section for a page */
export async function getSection(page: string, sectionKey: string): Promise<CmsSection | null> {
  try {
    const { rows } = await db.query(
      `SELECT * FROM cms_sections WHERE page = $1 AND section_key = $2 AND is_active = true LIMIT 1`,
      [page, sectionKey]
    );
    return rows[0] || null;
  } catch { return null; }
}

/** Get all active sections for a page */
export async function getPageSections(page: string): Promise<CmsSection[]> {
  try {
    const { rows } = await db.query(
      `SELECT * FROM cms_sections WHERE page = $1 AND is_active = true ORDER BY sort_order`,
      [page]
    );
    return rows;
  } catch { return []; }
}

/** Get all items for a section by section_id */
export async function getSectionItems(sectionId: number): Promise<CmsItem[]> {
  try {
    const { rows } = await db.query(
      `SELECT * FROM cms_items WHERE section_id = $1 AND is_active = true ORDER BY sort_order`,
      [sectionId]
    );
    return rows;
  } catch { return []; }
}

/** Convenience: get a section + its items in one call */
export async function getSectionWithItems(page: string, sectionKey: string) {
  const section = await getSection(page, sectionKey);
  if (!section) return { section: null, items: [] };
  const items = await getSectionItems(section.id);
  return { section, items };
}

/** Get all active services */
export async function getServices(): Promise<CmsService[]> {
  try {
    const { rows } = await db.query(
      `SELECT * FROM cms_services WHERE is_active = true ORDER BY sort_order`
    );
    return rows.map((r: any) => ({
      ...r,
      features: typeof r.features === 'string' ? JSON.parse(r.features) : (r.features || []),
    }));
  } catch { return []; }
}

/** Get all gallery images, optionally filtered by category */
export async function getGallery(category?: string) {
  try {
    let q = `SELECT * FROM cms_gallery WHERE is_active = true`;
    const params: string[] = [];
    if (category) { q += ` AND category = $1`; params.push(category); }
    q += ` ORDER BY sort_order`;
    const { rows } = await db.query(q, params);
    return rows;
  } catch { return []; }
}

/** Get a single CMS setting by key */
export async function getSetting(key: string): Promise<string | null> {
  try {
    const { rows } = await db.query(`SELECT value FROM cms_settings WHERE key = $1 LIMIT 1`, [key]);
    return rows[0]?.value ?? null;
  } catch { return null; }
}

/** Get multiple CMS settings by keys (returns a Record) */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    const { rows } = await db.query(
      `SELECT key, value FROM cms_settings WHERE key = ANY($1)`,
      [keys]
    );
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value || '';
    return map;
  } catch { return {}; }
}

/** Get ALL settings (for footer, etc.) */
export async function getAllSettings(): Promise<Record<string, string>> {
  try {
    const { rows } = await db.query(`SELECT key, value FROM cms_settings`);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value || '';
    return map;
  } catch { return {}; }
}

/** Get active products for website (with optional filters) */
export async function getWebsiteProducts(options?: { featured?: boolean; category?: string; limit?: number }) {
  try {
    let q = `SELECT p.*, pc.name AS category_name FROM products p LEFT JOIN product_categories pc ON pc.id = p.category_id WHERE p.is_active = true`;
    const params: any[] = [];
    let idx = 1;
    if (options?.featured) { q += ` AND p.is_featured = true`; }
    if (options?.category) { q += ` AND pc.name = $${idx++}`; params.push(options.category); }
    q += ` ORDER BY p.is_featured DESC NULLS LAST, p.sort_order ASC NULLS LAST, p.name`;
    if (options?.limit) { q += ` LIMIT $${idx++}`; params.push(options.limit); }
    const { rows } = await db.query(q, params);
    return rows;
  } catch { return []; }
}

/** Get product categories */
export async function getProductCategories() {
  try {
    const { rows } = await db.query(`SELECT * FROM product_categories ORDER BY name`);
    return rows;
  } catch { return []; }
}
