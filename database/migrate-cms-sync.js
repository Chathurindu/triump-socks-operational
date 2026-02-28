/**
 * Migration: Seed sample CMS products + sync existing content
 * This ensures all website data comes from CMS tables.
 * Run: node database/migrate-cms-sync.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost', database: 'triumph',
  user: 'postgres', password: '123', port: 5432,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Ensure product categories exist ────────────────
    const categories = ['Sports Socks', 'Casual Socks', 'Formal Socks', 'Kids Socks', 'Eco Collection'];

    for (const cat of categories) {
      const exists = await client.query(`SELECT id FROM product_categories WHERE name = $1`, [cat]);
      if (exists.rows.length === 0) {
        const slug = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        await client.query(`INSERT INTO product_categories (name, slug) VALUES ($1, $2)`, [cat, slug]);
      }
    }
    console.log('✅ Product categories ensured');

    // ── 2. Deactivate any old non-CMS products ────────────
    // (Mark existing products as inactive so only CMS-managed ones show)
    await client.query(`UPDATE products SET is_active = false WHERE slug IS NULL OR slug = ''`);
    console.log('✅ Old products deactivated');

    // ── 3. Insert sample CMS products ─────────────────────
    const products = [
      {
        name: 'Classic Cotton Crew',
        sku: 'TS-CC-001',
        category: 'Casual Socks',
        description: 'Everyday comfort with our signature cotton blend crew socks. Reinforced heel and toe for durability. Available in a variety of colors for versatile styling.',
        short_description: 'Premium cotton crew socks for everyday comfort.',
        unit_price: 350,
        cost_price: 180,
        min_stock: 100,
        is_featured: true,
        tags: ['cotton', 'crew', 'everyday', 'bestseller'],
        specifications: { material: '80% Cotton, 15% Polyester, 5% Spandex', weight: '45g', size_range: 'S / M / L / XL', care: 'Machine wash cold' },
        variants: [{ name: 'Small', sku: 'TS-CC-001-S', price: 350 }, { name: 'Medium', sku: 'TS-CC-001-M', price: 350 }, { name: 'Large', sku: 'TS-CC-001-L', price: 380 }],
        sort_order: 1,
        meta_title: 'Classic Cotton Crew Socks — Triumph Socks',
        meta_description: 'Premium cotton crew socks with reinforced heel and toe. Perfect for everyday wear.',
      },
      {
        name: 'Pro Sports Ankle',
        sku: 'TS-SA-002',
        category: 'Sports Socks',
        description: 'Engineered for peak performance with advanced moisture-wicking technology. Arch support and cushioned sole keep you comfortable during intense workouts.',
        short_description: 'High-performance ankle socks for athletes.',
        unit_price: 450,
        cost_price: 230,
        min_stock: 80,
        is_featured: true,
        tags: ['sports', 'ankle', 'moisture-wicking', 'performance'],
        specifications: { material: '60% Polyester, 30% Nylon, 10% Spandex', weight: '35g', size_range: 'M / L / XL', care: 'Machine wash warm' },
        variants: [{ name: 'Medium', sku: 'TS-SA-002-M', price: 450 }, { name: 'Large', sku: 'TS-SA-002-L', price: 450 }],
        sort_order: 2,
        meta_title: 'Pro Sports Ankle Socks — Triumph Socks',
        meta_description: 'High-performance ankle socks with moisture-wicking and arch support for athletes.',
      },
      {
        name: 'Executive Dress Socks',
        sku: 'TS-ED-003',
        category: 'Formal Socks',
        description: 'When style meets comfort. Fine-knit dress socks with subtle ribbing pattern. Perfect for the boardroom, weddings, and formal events.',
        short_description: 'Fine-knit socks for formal occasions.',
        unit_price: 550,
        cost_price: 280,
        min_stock: 60,
        is_featured: true,
        tags: ['formal', 'dress', 'fine-knit', 'premium'],
        specifications: { material: '70% Mercerized Cotton, 25% Nylon, 5% Spandex', weight: '40g', size_range: 'M / L', care: 'Hand wash recommended' },
        variants: [{ name: 'Black', sku: 'TS-ED-003-BLK', price: 550 }, { name: 'Navy', sku: 'TS-ED-003-NVY', price: 550 }, { name: 'Charcoal', sku: 'TS-ED-003-CHR', price: 550 }],
        sort_order: 3,
        meta_title: 'Executive Dress Socks — Triumph Socks',
        meta_description: 'Fine-knit mercerized cotton dress socks for formal occasions.',
      },
      {
        name: 'Bamboo Comfort',
        sku: 'TS-BC-004',
        category: 'Eco Collection',
        description: 'Ultra-soft bamboo fiber socks that are naturally antibacterial and eco-friendly. Breathable fabric keeps your feet cool all day. Our commitment to sustainability.',
        short_description: 'Eco-friendly bamboo fiber socks, naturally antibacterial.',
        unit_price: 480,
        cost_price: 260,
        min_stock: 70,
        is_featured: true,
        tags: ['bamboo', 'eco-friendly', 'antibacterial', 'sustainable'],
        specifications: { material: '70% Bamboo Fiber, 25% Cotton, 5% Spandex', weight: '42g', size_range: 'S / M / L', care: 'Machine wash cold, line dry' },
        variants: [{ name: 'Natural', sku: 'TS-BC-004-NAT', price: 480 }, { name: 'Sage Green', sku: 'TS-BC-004-SGR', price: 480 }],
        sort_order: 4,
        meta_title: 'Bamboo Comfort Socks — Triumph Socks',
        meta_description: 'Eco-friendly bamboo fiber socks. Naturally antibacterial, breathable, and sustainable.',
      },
      {
        name: 'Fun Kids Rainbow',
        sku: 'TS-KR-005',
        category: 'Kids Socks',
        description: 'Colorful and playful designs that kids love! Non-slip grip sole for safety. Soft cotton blend keeps little feet warm and comfortable all day long.',
        short_description: 'Colorful, fun socks with non-slip grip for kids.',
        unit_price: 250,
        cost_price: 120,
        min_stock: 150,
        is_featured: false,
        tags: ['kids', 'rainbow', 'non-slip', 'fun'],
        specifications: { material: '75% Cotton, 20% Polyester, 5% Spandex', weight: '25g', size_range: 'XS / S / M (Kids)', care: 'Machine wash cold' },
        variants: [{ name: 'XS (2–4)', sku: 'TS-KR-005-XS', price: 220 }, { name: 'S (5–7)', sku: 'TS-KR-005-S', price: 250 }, { name: 'M (8–10)', sku: 'TS-KR-005-M', price: 250 }],
        sort_order: 5,
        meta_title: 'Fun Kids Rainbow Socks — Triumph Socks',
        meta_description: 'Colorful rainbow socks for kids with non-slip grip soles. Comfortable cotton blend.',
      },
      {
        name: 'Thermal Wool Blend',
        sku: 'TS-TW-006',
        category: 'Casual Socks',
        description: 'Stay warm in style with our thick thermal wool blend socks. Perfect for cold weather and outdoor activities. Extra cushioning for added comfort.',
        short_description: 'Thick thermal socks for cold weather.',
        unit_price: 620,
        cost_price: 350,
        min_stock: 50,
        is_featured: false,
        tags: ['wool', 'thermal', 'winter', 'outdoor'],
        specifications: { material: '50% Merino Wool, 30% Acrylic, 15% Nylon, 5% Spandex', weight: '65g', size_range: 'M / L / XL', care: 'Hand wash, lay flat to dry' },
        variants: [{ name: 'Medium', sku: 'TS-TW-006-M', price: 620 }, { name: 'Large', sku: 'TS-TW-006-L', price: 650 }],
        sort_order: 6,
        meta_title: 'Thermal Wool Blend Socks — Triumph Socks',
        meta_description: 'Premium Merino wool thermal socks for cold weather. Extra cushioning and warmth.',
      },
      {
        name: 'Compression Sport Pro',
        sku: 'TS-CP-007',
        category: 'Sports Socks',
        description: 'Medical-grade compression socks for athletes and professionals. Graduated compression improves blood circulation and reduces fatigue during long hours.',
        short_description: 'Medical-grade compression socks for performance and recovery.',
        unit_price: 780,
        cost_price: 420,
        min_stock: 40,
        is_featured: true,
        tags: ['compression', 'medical', 'recovery', 'pro'],
        specifications: { material: '65% Nylon, 30% Spandex, 5% Lycra', weight: '55g', size_range: 'S / M / L / XL', compression: '15–20 mmHg', care: 'Machine wash cold' },
        variants: [{ name: 'Small', sku: 'TS-CP-007-S', price: 780 }, { name: 'Medium', sku: 'TS-CP-007-M', price: 780 }, { name: 'Large', sku: 'TS-CP-007-L', price: 820 }],
        sort_order: 7,
        meta_title: 'Compression Sport Pro Socks — Triumph Socks',
        meta_description: 'Medical-grade graduated compression socks for athletes. Improve circulation and reduce fatigue.',
      },
      {
        name: 'Organic Cotton Basic',
        sku: 'TS-OC-008',
        category: 'Eco Collection',
        description: 'Basic essentials made with 100% certified organic cotton. Gentle on sensitive skin, gentle on the planet. Undyed natural color options available.',
        short_description: '100% organic cotton basics. Gentle on skin and planet.',
        unit_price: 380,
        cost_price: 200,
        min_stock: 100,
        is_featured: false,
        tags: ['organic', 'cotton', 'basic', 'sensitive-skin'],
        specifications: { material: '100% Certified Organic Cotton', weight: '40g', size_range: 'S / M / L', certification: 'GOTS Certified', care: 'Machine wash cold' },
        variants: [{ name: 'Natural White', sku: 'TS-OC-008-NW', price: 380 }, { name: 'Undyed Beige', sku: 'TS-OC-008-UB', price: 380 }],
        sort_order: 8,
        meta_title: 'Organic Cotton Basic Socks — Triumph Socks',
        meta_description: 'GOTS certified organic cotton socks. Ideal for sensitive skin. Eco-friendly basics.',
      },
      {
        name: 'Business Argyle',
        sku: 'TS-BA-009',
        category: 'Formal Socks',
        description: 'Classic argyle pattern dress socks that add a touch of personality to your business attire. Premium combed cotton with reinforced stitching.',
        short_description: 'Classic argyle pattern for the modern professional.',
        unit_price: 500,
        cost_price: 260,
        min_stock: 60,
        is_featured: false,
        tags: ['argyle', 'business', 'pattern', 'combed-cotton'],
        specifications: { material: '75% Combed Cotton, 20% Nylon, 5% Spandex', weight: '42g', size_range: 'M / L', care: 'Machine wash cold' },
        variants: [{ name: 'Navy/Red', sku: 'TS-BA-009-NR', price: 500 }, { name: 'Gray/Blue', sku: 'TS-BA-009-GB', price: 500 }],
        sort_order: 9,
        meta_title: 'Business Argyle Socks — Triumph Socks',
        meta_description: 'Classic argyle pattern dress socks in premium combed cotton.',
      },
      {
        name: 'Kids Animal Friends',
        sku: 'TS-KA-010',
        category: 'Kids Socks',
        description: 'Adorable animal face designs — cats, dogs, pandas, and bunnies! Kids will love wearing these fun socks to school. Soft fabric and non-slip soles.',
        short_description: 'Adorable animal designs kids love!',
        unit_price: 280,
        cost_price: 130,
        min_stock: 120,
        is_featured: false,
        tags: ['kids', 'animals', 'fun', 'non-slip'],
        specifications: { material: '80% Cotton, 15% Polyester, 5% Spandex', weight: '22g', size_range: 'XS / S / M (Kids)', care: 'Machine wash cold' },
        variants: [{ name: 'Cat', sku: 'TS-KA-010-CAT', price: 280 }, { name: 'Dog', sku: 'TS-KA-010-DOG', price: 280 }, { name: 'Panda', sku: 'TS-KA-010-PND', price: 280 }],
        sort_order: 10,
        meta_title: 'Kids Animal Friends Socks — Triumph Socks',
        meta_description: 'Adorable animal face socks for kids. Soft cotton with non-slip grip soles.',
      },
      {
        name: 'Trail Runner Elite',
        sku: 'TS-TR-011',
        category: 'Sports Socks',
        description: 'Built for the trail. Extra cushioning at impact zones, reinforced arch support, and ventilation channels for breathability on long runs.',
        short_description: 'Trail running socks with extra cushioning.',
        unit_price: 520,
        cost_price: 280,
        min_stock: 50,
        is_featured: false,
        tags: ['trail', 'running', 'cushioned', 'ventilated'],
        specifications: { material: '55% Polyester, 25% Nylon, 15% Merino Wool, 5% Spandex', weight: '50g', size_range: 'M / L / XL', care: 'Machine wash cold' },
        variants: [{ name: 'Medium', sku: 'TS-TR-011-M', price: 520 }, { name: 'Large', sku: 'TS-TR-011-L', price: 520 }],
        sort_order: 11,
        meta_title: 'Trail Runner Elite Socks — Triumph Socks',
        meta_description: 'Trail running socks with cushioned impact zones and ventilation channels.',
      },
      {
        name: 'Diabetic Comfort Plus',
        sku: 'TS-DC-012',
        category: 'Casual Socks',
        description: 'Specially designed diabetic-friendly socks with non-binding top, seamless toe, and extra cushioning. Promotes healthy circulation without constriction.',
        short_description: 'Diabetic-friendly socks with non-binding comfort.',
        unit_price: 580,
        cost_price: 310,
        min_stock: 40,
        is_featured: false,
        tags: ['diabetic', 'medical', 'non-binding', 'comfort'],
        specifications: { material: '75% Cotton, 20% Nylon, 5% Spandex', weight: '48g', size_range: 'M / L / XL', features: 'Non-binding top, seamless toe', care: 'Machine wash warm' },
        variants: [{ name: 'White', sku: 'TS-DC-012-WHT', price: 580 }, { name: 'Black', sku: 'TS-DC-012-BLK', price: 580 }],
        sort_order: 12,
        meta_title: 'Diabetic Comfort Plus Socks — Triumph Socks',
        meta_description: 'Diabetic-friendly non-binding socks with seamless toe for healthy circulation.',
      },
    ];

    for (const p of products) {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const catRow = await client.query(`SELECT id FROM product_categories WHERE name = $1`, [p.category]);
      const catId = catRow.rows[0]?.id || null;

      // Check if product with this SKU already exists
      const existing = await client.query(`SELECT id FROM products WHERE sku = $1`, [p.sku]);
      if (existing.rows.length > 0) {
        // Update existing
        await client.query(`
          UPDATE products SET
            name = $1, category_id = $2, description = $3, short_description = $4,
            unit_price = $5, cost_price = $6, min_stock = $7, is_featured = $8,
            tags = $9, specifications = $10, variants = $11, sort_order = $12,
            meta_title = $13, meta_description = $14, slug = $15, is_active = true,
            updated_at = NOW()
          WHERE sku = $16
        `, [p.name, catId, p.description, p.short_description,
            p.unit_price, p.cost_price, p.min_stock, p.is_featured,
            p.tags, JSON.stringify(p.specifications), JSON.stringify(p.variants),
            p.sort_order, p.meta_title, p.meta_description, slug, p.sku]);
      } else {
        await client.query(`
          INSERT INTO products (name, sku, category_id, description, short_description,
            unit_price, cost_price, min_stock, is_featured, is_active,
            tags, specifications, variants, sort_order,
            meta_title, meta_description, slug, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,$11,$12,$13,$14,$15,$16,NOW())
        `, [p.name, p.sku, catId, p.description, p.short_description,
            p.unit_price, p.cost_price, p.min_stock, p.is_featured,
            p.tags, JSON.stringify(p.specifications), JSON.stringify(p.variants),
            p.sort_order, p.meta_title, p.meta_description, slug]);
      }
    }
    console.log(`✅ ${products.length} sample CMS products seeded`);

    // ── 4. Update CMS sections — hero CTA fields ──────────
    await client.query(`UPDATE cms_sections SET cta_text = 'Explore Products', cta_link = '/products' WHERE page = 'home' AND section_key = 'hero'`);
    await client.query(`UPDATE cms_sections SET content = 'Premium Sock Manufacturer — Sri Lanka' WHERE page = 'home' AND section_key = 'hero'`);

    // ── 5. Ensure About page has mission/vision sections ──
    await client.query(`
      INSERT INTO cms_sections (page, section_key, title, subtitle, content, sort_order) VALUES
        ('about', 'mission', 'Our Mission', NULL, 'To manufacture and deliver premium quality socks that provide exceptional comfort, durability, and value. We strive to be the preferred partner for retailers, wholesalers, and brands seeking reliable supply with consistent quality.', 1),
        ('about', 'vision', 'Our Vision', NULL, 'To become the leading sock manufacturer and exporter in South Asia by 2030 — recognized for innovation, sustainability, and partnerships that create mutual growth for our clients and communities.', 2)
      ON CONFLICT (page, section_key) DO UPDATE SET
        title = EXCLUDED.title, content = EXCLUDED.content
    `);
    console.log('✅ About mission/vision sections ensured');

    // ── 6. Ensure contact services are in CMS ─────────────
    await client.query(`
      INSERT INTO cms_sections (page, section_key, title, content, sort_order) VALUES
        ('contact', 'services', 'We Offer', NULL, 2)
      ON CONFLICT (page, section_key) DO NOTHING
    `);

    // Seed contact services as items
    const contactServSection = await client.query(`SELECT id FROM cms_sections WHERE page = 'contact' AND section_key = 'services'`);
    if (contactServSection.rows.length > 0) {
      const csId = contactServSection.rows[0].id;
      const contactServices = [
        'Bulk manufacturing (500+ pairs MOQ)',
        'Custom branding & private label',
        'Export to 20+ countries',
        'Flexible payment terms',
        'Sample development service',
      ];
      for (let i = 0; i < contactServices.length; i++) {
        const exists = await client.query(`SELECT 1 FROM cms_items WHERE section_id = $1 AND title = $2`, [csId, contactServices[i]]);
        if (exists.rows.length === 0) {
          await client.query(`INSERT INTO cms_items (section_id, title, sort_order) VALUES ($1, $2, $3)`, [csId, contactServices[i], i + 1]);
        }
      }
    }
    console.log('✅ Contact services ensured');

    // ── 7. CTA sections for CMS control ───────────────────
    await client.query(`
      INSERT INTO cms_sections (page, section_key, title, subtitle, cta_text, cta_link, sort_order) VALUES
        ('home', 'cta', 'Ready to Place a Bulk Order?', 'Contact us today to discuss your requirements. We offer competitive pricing, custom packaging, and private label options.', 'Contact Us Now', '/contact', 10),
        ('about', 'cta', 'Partner With Us', 'Join hundreds of satisfied customers who trust Triumph Socks for their supply needs.', 'Get In Touch', '/contact', 10),
        ('products', 'hero', 'Our Products', 'Browse our full range of premium socks. Custom sizes, colors, and branding available on request.', NULL, NULL, 0),
        ('products', 'cta', 'Need a Custom Order?', 'We manufacture custom socks with your logo, colors, and packaging. MOQ as low as 500 pairs.', 'Get Started', '/contact', 10),
        ('contact', 'cta', 'Prefer to Visit?', 'You are welcome to visit our factory in Veyangoda, Sri Lanka. Schedule a factory tour today.', 'Get Directions', '#', 10)
      ON CONFLICT (page, section_key) DO UPDATE SET
        title = EXCLUDED.title, subtitle = EXCLUDED.subtitle,
        cta_text = EXCLUDED.cta_text, cta_link = EXCLUDED.cta_link
    `);
    console.log('✅ CTA sections ensured');

    await client.query('COMMIT');
    console.log('\n✅ CMS sync migration completed successfully');
    console.log('   - 5 product categories');
    console.log('   - 12 sample products (5 featured)');
    console.log('   - All CMS sections updated with CTA fields');
    console.log('   - About mission/vision sections');
    console.log('   - Contact services section');
    console.log('   - CTA sections for all pages');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
