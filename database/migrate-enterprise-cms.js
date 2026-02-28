/**
 * Migration: Enterprise CMS upgrade
 * - Media library table
 * - CMS pages with SEO & meta
 * - Content versioning / revision history
 * - Enhanced products: multiple images, SEO, tags, variants, featured
 * - CMS settings (branding, social links, etc.)
 * Run: node database/migrate-enterprise-cms.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost', database: 'triumph',
  user: 'postgres', password: '123', port: 5432,
});

const SQL = `
-- ============================================================
-- MEDIA LIBRARY — central image/file management
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_media (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename     VARCHAR(500) NOT NULL,
  original_name VARCHAR(500),
  mime_type    VARCHAR(100),
  file_size    INT,                        -- bytes
  width        INT,
  height       INT,
  url          TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text     VARCHAR(300),
  caption      TEXT,
  folder       VARCHAR(200) DEFAULT 'general',   -- products | team | gallery | banners | general
  tags         TEXT[] DEFAULT '{}',
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_folder ON cms_media(folder);
CREATE INDEX IF NOT EXISTS idx_media_created ON cms_media(created_at DESC);

-- ============================================================
-- CMS PAGES — page-level SEO & status management
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_pages (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(100) UNIQUE NOT NULL,    -- home, about, contact, products
  title         VARCHAR(200) NOT NULL,
  meta_title    VARCHAR(200),
  meta_description TEXT,
  og_image      TEXT,
  status        VARCHAR(20) DEFAULT 'published', -- draft | published | scheduled
  published_at  TIMESTAMPTZ,
  template      VARCHAR(50) DEFAULT 'default',
  custom_css    TEXT,
  custom_js     TEXT,
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default pages
INSERT INTO cms_pages (slug, title, meta_title, meta_description, status, sort_order) VALUES
  ('home', 'Home', 'Triumph Socks — Premium Sock Manufacturer in Sri Lanka', 'Step into comfort & style. Triumph Socks crafts world-class socks for retail, wholesale, and custom orders.', 'published', 1),
  ('about', 'About Us', 'About Triumph Socks — Our Story & Values', 'A passion for quality craftsmanship, a commitment to our people, and a vision to be the most trusted sock manufacturer.', 'published', 2),
  ('products', 'Products', 'Our Products — Premium Socks Collection', 'Browse our full range of premium socks. Custom sizes, colors, and branding available on request.', 'published', 3),
  ('contact', 'Contact', 'Contact Triumph Socks — Get a Quote', 'Ready to place an order or have questions? Contact Triumph Socks today.', 'published', 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- CONTENT REVISIONS — version history for any content
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_revisions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type  VARCHAR(50) NOT NULL,       -- cms_sections | cms_items | cms_services | products
  entity_id    VARCHAR(100) NOT NULL,
  revision_num INT NOT NULL,
  data         JSONB NOT NULL,             -- full snapshot of the entity at this version
  change_note  TEXT,
  changed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_by_name VARCHAR(150),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revisions_entity ON cms_revisions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_revisions_created ON cms_revisions(created_at DESC);

-- ============================================================
-- PRODUCT ENHANCEMENTS for website CMS
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(200);
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description VARCHAR(500);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';    -- array of image URLs
ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}';    -- { material: "Cotton", weight: "50g", ... }
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]';          -- [{ name: "S", sku: "...", price: 100 }, ...]
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Generate slugs for existing products that don't have one
UPDATE products SET slug = LOWER(REPLACE(REPLACE(REPLACE(name, ' ', '-'), '''', ''), '"', ''))
  WHERE slug IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;

-- ============================================================
-- CMS SETTINGS — branding, social links, global config
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_settings (
  id           SERIAL PRIMARY KEY,
  key          VARCHAR(100) UNIQUE NOT NULL,
  value        TEXT,
  type         VARCHAR(20) DEFAULT 'text',    -- text | json | image | boolean | number
  category     VARCHAR(50) DEFAULT 'general', -- general | branding | social | seo | footer
  label        VARCHAR(200),
  description  TEXT,
  sort_order   INT DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings
INSERT INTO cms_settings (key, value, type, category, label, sort_order) VALUES
  ('site_name', 'Triumph Socks', 'text', 'branding', 'Site Name', 1),
  ('site_tagline', 'Premium Sock Manufacturer', 'text', 'branding', 'Tagline', 2),
  ('site_logo', '', 'image', 'branding', 'Logo URL', 3),
  ('site_favicon', '', 'image', 'branding', 'Favicon URL', 4),
  ('primary_color', '#d97706', 'text', 'branding', 'Primary Brand Color', 5),
  ('footer_text', '© 2024 Triumph Socks. All rights reserved.', 'text', 'footer', 'Footer Copyright Text', 6),
  ('footer_address', '289, Maligathanna, Veyangoda, Sri Lanka', 'text', 'footer', 'Footer Address', 7),
  ('footer_phone', '+94 77 000 0000', 'text', 'footer', 'Footer Phone', 8),
  ('footer_email', 'info@triumphsocks.com', 'text', 'footer', 'Footer Email', 9),
  ('social_facebook', '', 'text', 'social', 'Facebook URL', 10),
  ('social_instagram', '', 'text', 'social', 'Instagram URL', 11),
  ('social_twitter', '', 'text', 'social', 'Twitter / X URL', 12),
  ('social_linkedin', '', 'text', 'social', 'LinkedIn URL', 13),
  ('social_youtube', '', 'text', 'social', 'YouTube URL', 14),
  ('social_tiktok', '', 'text', 'social', 'TikTok URL', 15),
  ('seo_default_title', 'Triumph Socks — Premium Sock Manufacturer in Sri Lanka', 'text', 'seo', 'Default Page Title', 16),
  ('seo_default_description', 'Premium quality socks manufactured in Sri Lanka. Retail, wholesale, and custom orders.', 'text', 'seo', 'Default Meta Description', 17),
  ('seo_og_image', '', 'image', 'seo', 'Default OG Image', 18),
  ('google_analytics_id', '', 'text', 'seo', 'Google Analytics ID', 19),
  ('maintenance_mode', 'false', 'boolean', 'general', 'Maintenance Mode', 20),
  ('announcement_bar', '', 'text', 'general', 'Announcement Bar Text', 21),
  ('announcement_bar_active', 'false', 'boolean', 'general', 'Show Announcement Bar', 22)
ON CONFLICT (key) DO NOTHING;

-- Add page_id to sections for proper linking
ALTER TABLE cms_sections ADD COLUMN IF NOT EXISTS page_id INT REFERENCES cms_pages(id) ON DELETE SET NULL;

-- Link existing sections to pages
UPDATE cms_sections SET page_id = (SELECT id FROM cms_pages WHERE slug = cms_sections.page) WHERE page_id IS NULL;
`;

async function migrate() {
  try {
    await pool.query(SQL);
    console.log('✅ Enterprise CMS migration completed');
    console.log('   - cms_media table created (media library)');
    console.log('   - cms_pages table created with SEO meta');
    console.log('   - cms_revisions table created (version history)');
    console.log('   - products table enhanced (slug, SEO, tags, gallery_images, variants, specs, featured)');
    console.log('   - cms_settings table created (branding, social, SEO, footer)');
    console.log('   - Seeded default pages, settings');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
