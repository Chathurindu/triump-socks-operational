/**
 * Migration: Activity logs, website CMS content, user groups, enhanced users
 * Run: node database/migrate-admin-features.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'triumph',
  user: 'postgres',
  password: '123',
  port: 5432,
});

const SQL = `
-- ============================================================
-- ACTIVITY LOGS — tracks every user action in detail
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name   VARCHAR(150),
  user_email  VARCHAR(255),
  action      VARCHAR(50) NOT NULL,        -- create | update | delete | login | logout | view | export | password_reset | status_change
  module      VARCHAR(80) NOT NULL,        -- users | employees | production | inventory | sales | finance | settings | auth | cms | etc.
  entity_type VARCHAR(80),                 -- table/entity name: users, employees, products, etc.
  entity_id   VARCHAR(100),                -- the id of the affected record
  description TEXT,                        -- human-readable description
  details     JSONB DEFAULT '{}',          -- full detail: old values, new values, metadata
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user     ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action   ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_module   ON activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_activity_created  ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_entity   ON activity_logs(entity_type, entity_id);

-- ============================================================
-- USER GROUPS — for grouping users with shared access
-- ============================================================
CREATE TABLE IF NOT EXISTS user_groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',          -- module-level access: { dashboard: true, hr: true, finance: false, ... }
  color       VARCHAR(20) DEFAULT '#6b7280',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_group_members (
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id  INT  REFERENCES user_groups(id) ON DELETE CASCADE,
  added_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

-- ============================================================
-- WEBSITE CMS CONTENT — dynamic content management
-- ============================================================

-- Hero / banner sections
CREATE TABLE IF NOT EXISTS cms_sections (
  id           SERIAL PRIMARY KEY,
  page         VARCHAR(50) NOT NULL,       -- home | about | contact | products
  section_key  VARCHAR(80) NOT NULL,       -- hero | stats | features | team | milestones | values | contact_info
  title        TEXT,
  subtitle     TEXT,
  content      TEXT,                       -- rich text / markdown
  cta_text     VARCHAR(100),               -- call-to-action button text
  cta_link     VARCHAR(255),               -- call-to-action link
  image_url    TEXT,
  icon         VARCHAR(50),                -- emoji or icon name
  sort_order   INT DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page, section_key)
);

-- Repeatable content items (features, team members, milestones, stats, etc.)
CREATE TABLE IF NOT EXISTS cms_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id   INT REFERENCES cms_sections(id) ON DELETE CASCADE,
  title        VARCHAR(200),
  subtitle     VARCHAR(200),
  description  TEXT,
  icon         VARCHAR(50),                -- emoji or lucide icon name
  image_url    TEXT,
  link         VARCHAR(255),
  value        VARCHAR(100),               -- for stats: "15+", "500+"
  extra        JSONB DEFAULT '{}',         -- flexible metadata
  sort_order   INT DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_items_section ON cms_items(section_id);

-- Website services
CREATE TABLE IF NOT EXISTS cms_services (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  icon         VARCHAR(50),
  image_url    TEXT,
  features     JSONB DEFAULT '[]',         -- list of feature bullet points
  sort_order   INT DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Website gallery / images
CREATE TABLE IF NOT EXISTS cms_gallery (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(200),
  alt_text     VARCHAR(200),
  image_url    TEXT NOT NULL,
  category     VARCHAR(50),                -- factory | products | team | events
  sort_order   INT DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALTER USERS — add profile_picture, group support
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- ============================================================
-- SEED DEFAULT USER GROUPS
-- ============================================================
INSERT INTO user_groups (name, description, permissions, color) VALUES
  ('Administrators', 'Full system access', '{"all": true}', '#dc2626'),
  ('Managers', 'Operations & HR management', '{"dashboard":true,"inventory":true,"production":true,"hr":true,"finance":true,"analytics":true,"purchases":true,"sales":true}', '#2563eb'),
  ('Finance Team', 'Financial operations', '{"dashboard":true,"finance":true,"analytics":true,"sales":true,"purchases":true}', '#16a34a'),
  ('HR Team', 'Human resource management', '{"dashboard":true,"hr":true}', '#9333ea'),
  ('Production Team', 'Production & inventory', '{"dashboard":true,"production":true,"inventory":true,"machines":true}', '#ea580c'),
  ('Viewers', 'Read-only dashboard access', '{"dashboard":true,"analytics":true}', '#6b7280')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED CMS SECTIONS for homepage
-- ============================================================
INSERT INTO cms_sections (page, section_key, title, subtitle) VALUES
  ('home', 'hero', 'Step Into Comfort & Style', 'Triumph Socks crafts world-class socks for retail, wholesale, and custom orders. Proudly made in Sri Lanka and trusted by leading retailers.'),
  ('home', 'stats', 'Company Statistics', NULL),
  ('home', 'features', 'Why Choose Triumph?', 'Everything you need from a reliable sock manufacturer — quality, speed, and service.'),
  ('home', 'products_featured', 'Featured Products', 'Our best-selling socks loved by customers worldwide.'),
  ('about', 'hero', 'About Triumph Socks', 'A passion for quality craftsmanship, a commitment to our people, and a vision to be the most trusted sock manufacturer in South Asia.'),
  ('about', 'values', 'Our Values', NULL),
  ('about', 'team', 'Our Leadership', NULL),
  ('about', 'milestones', 'Our Journey', NULL),
  ('contact', 'hero', 'Contact Us', 'Ready to place an order or have questions? We''d love to hear from you.'),
  ('contact', 'info', 'Contact Information', NULL)
ON CONFLICT (page, section_key) DO NOTHING;

-- Seed home stats items
INSERT INTO cms_items (section_id, title, value, sort_order) VALUES
  ((SELECT id FROM cms_sections WHERE page='home' AND section_key='stats'), 'Years of Experience', '15+', 1),
  ((SELECT id FROM cms_sections WHERE page='home' AND section_key='stats'), 'Product Variants', '50+', 2),
  ((SELECT id FROM cms_sections WHERE page='home' AND section_key='stats'), 'Happy Clients', '500+', 3),
  ((SELECT id FROM cms_sections WHERE page='home' AND section_key='stats'), 'Pairs Sold', '1M+', 4);

-- Seed home features items
INSERT INTO cms_items (section_id, title, description, icon, sort_order) VALUES
  ((SELECT id FROM cms_sections WHERE page='home' AND section_key='features'), 'Premium Materials', 'We source only the finest cotton, wool, and synthetic blends for superior comfort.', '🧵', 1),
  ((SELECT id FROM cms_sections WHERE page='home' AND section_key='features'), 'Modern Factory', 'State-of-the-art manufacturing equipment ensures consistent quality at scale.', '🏭', 2),
  ((SELECT id FROM cms_sections WHERE page='home' AND section_key='features'), 'Bulk Orders', 'Flexible MOQ for wholesale and retail clients. Fast turnaround times guaranteed.', '📦', 3),
  ((SELECT id FROM cms_sections WHERE page='home' AND section_key='features'), 'Custom Branding', 'Private label and custom design services for your brand identity.', '🎨', 4),
  ((SELECT id FROM cms_sections WHERE page='home' AND section_key='features'), 'Export Ready', 'We export to 20+ countries with full compliance documentation.', '🌍', 5),
  ((SELECT id FROM cms_sections WHERE page='home' AND section_key='features'), 'Sustainable', 'Committed to eco-friendly production processes and responsible sourcing.', '♻️', 6);

-- Seed about team
INSERT INTO cms_items (section_id, title, subtitle, extra, sort_order) VALUES
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='team'), 'Saman Perera', 'Founder & CEO', '{"since":"2005"}', 1),
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='team'), 'Dilani Silva', 'Head of Production', '{"since":"2008"}', 2),
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='team'), 'Ruwan Fernando', 'Sales Director', '{"since":"2010"}', 3),
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='team'), 'Nadeesha Jayawardena', 'Quality Manager', '{"since":"2012"}', 4);

-- Seed about values
INSERT INTO cms_items (section_id, title, description, icon, sort_order) VALUES
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='values'), 'Quality First', 'Every pair goes through rigorous quality checks before leaving our factory.', '🏆', 1),
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='values'), 'Integrity', 'We build long-term partnerships based on trust, transparency, and fair pricing.', '🤝', 2),
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='values'), 'Innovation', 'Continuously investing in new technologies and sustainable manufacturing.', '💡', 3),
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='values'), 'Sustainability', 'Committed to reducing environmental impact across our entire supply chain.', '🌱', 4);

-- Seed about milestones
INSERT INTO cms_items (section_id, title, description, sort_order) VALUES
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='milestones'), '2005', 'Founded in Veyangoda, Sri Lanka with 10 machines and 20 employees.', 1),
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='milestones'), '2008', 'Expanded factory to 5,000 sq ft. Reached 100 employees.', 2),
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='milestones'), '2012', 'Launched export division. First international shipment to UK.', 3),
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='milestones'), '2016', 'Opened new production facility. Capacity: 200,000 pairs/month.', 4),
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='milestones'), '2020', 'Launched eco-friendly product line using recycled materials.', 5),
  ((SELECT id FROM cms_sections WHERE page='about' AND section_key='milestones'), '2024', 'Serving 500+ clients across 20+ countries with 300+ staff.', 6);

-- Seed contact info
INSERT INTO cms_items (section_id, title, description, icon, sort_order) VALUES
  ((SELECT id FROM cms_sections WHERE page='contact' AND section_key='info'), 'Address', '289, Maligathanna, Veyangoda, Sri Lanka', '📍', 1),
  ((SELECT id FROM cms_sections WHERE page='contact' AND section_key='info'), 'Phone', '+94 77 000 0000', '📞', 2),
  ((SELECT id FROM cms_sections WHERE page='contact' AND section_key='info'), 'Email', 'info@triumphsocks.com', '✉️', 3),
  ((SELECT id FROM cms_sections WHERE page='contact' AND section_key='info'), 'Working Hours', 'Sat–Thu: 9:00 AM – 6:00 PM', '🕐', 4);

-- Seed services
INSERT INTO cms_services (title, description, icon, features, sort_order) VALUES
  ('Custom Sock Manufacturing', 'Full private-label sock manufacturing from design to delivery.', '🧦', '["Custom designs & patterns","Logo knitting & branding","Any quantity from 100+","Quality assured"]', 1),
  ('Wholesale Supply', 'Bulk orders for retailers and distributors at competitive prices.', '📦', '["Competitive wholesale pricing","Fast turnaround","Consistent quality","Flexible MOQ"]', 2),
  ('Export Services', 'International shipping with full compliance documentation.', '🌍', '["20+ countries served","Export documentation","Customs compliance","DDP/FOB terms"]', 3),
  ('Quality Testing', 'Rigorous quality control testing for every batch.', '🔬', '["Tensile strength testing","Color fastness","Shrinkage testing","Comfort testing"]', 4);
`;

async function migrate() {
  try {
    await pool.query(SQL);
    console.log('✅ Admin features migration completed successfully');
    console.log('   - activity_logs table created');
    console.log('   - user_groups + user_group_members tables created');
    console.log('   - cms_sections + cms_items + cms_services + cms_gallery tables created');
    console.log('   - users table extended with phone, department, designation, employee_id');
    console.log('   - Default user groups seeded');
    console.log('   - CMS content seeded from existing website data');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
