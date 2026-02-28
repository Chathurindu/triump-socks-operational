import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';
import { logActivity } from '@/app/api/activity-logs/route';

const SORT_MAP: Record<string, string> = {
  name: 'p.name', sku: 'p.sku', unit_price: 'p.unit_price', category_name: 'pc.name',
  is_active: 'p.is_active', is_featured: 'p.is_featured', sort_order: 'p.sort_order',
  created_at: 'p.created_at', updated_at: 'p.updated_at',
};

/* helper: save revision */
async function saveRevision(entityId: string, data: any, changeNote: string, changedBy?: string, changedByName?: string) {
  const countRes = await db.query(
    `SELECT COALESCE(MAX(revision_num), 0) + 1 AS next FROM cms_revisions WHERE entity_type='products' AND entity_id=$1`, [entityId]
  );
  await db.query(
    `INSERT INTO cms_revisions (entity_type, entity_id, revision_num, data, change_note, changed_by, changed_by_name)
     VALUES ('products', $1, $2, $3, $4, $5, $6)`,
    [entityId, countRes.rows[0].next, JSON.stringify(data), changeNote, changedBy || null, changedByName || null]
  );
}

/* ═══════════════════════ GET ═══════════════════════ */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  /* Meta: categories for dropdowns */
  if (searchParams.get('meta') === '1') {
    const [cats, tags] = await Promise.all([
      db.query(`SELECT * FROM product_categories ORDER BY name`),
      db.query(`SELECT DISTINCT unnest(tags) AS tag FROM products WHERE tags IS NOT NULL ORDER BY tag`),
    ]);
    return NextResponse.json({ categories: cats.rows, tags: tags.rows.map((t: any) => t.tag) });
  }

  /* Single product with revision history */
  const id = searchParams.get('id');
  if (id) {
    const res = await db.query(
      `SELECT p.*, pc.name AS category_name, pc.slug AS category_slug
       FROM products p LEFT JOIN product_categories pc ON pc.id = p.category_id WHERE p.id=$1`, [id]
    );
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const revisions = await db.query(
      `SELECT id, revision_num, change_note, changed_by_name, created_at
       FROM cms_revisions WHERE entity_type='products' AND entity_id=$1 ORDER BY revision_num DESC LIMIT 20`, [id]
    );
    return NextResponse.json({ product: res.rows[0], revisions: revisions.rows });
  }

  /* Paginated list */
  const search    = searchParams.get('search') ?? '';
  const status    = searchParams.get('status') ?? '';
  const catId     = searchParams.get('category') ?? '';
  const featured  = searchParams.get('featured') ?? '';
  const page      = parseInt(searchParams.get('page') ?? '1');
  const limit     = parseInt(searchParams.get('limit') ?? '15');
  const offset    = (page - 1) * limit;
  const sortKey   = searchParams.get('sortKey') ?? 'created_at';
  const sortDir   = searchParams.get('sortDir') === 'asc' ? 'ASC' : 'DESC';
  const orderCol  = SORT_MAP[sortKey] ?? 'p.created_at';

  try {
    const filters: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (search) { filters.push(`(p.name ILIKE $${idx} OR p.sku ILIKE $${idx} OR p.description ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    if (status === 'active')   { filters.push(`p.is_active = true`); }
    if (status === 'inactive') { filters.push(`p.is_active = false`); }
    if (catId) { filters.push(`p.category_id = $${idx++}`); params.push(parseInt(catId)); }
    if (featured === 'true') { filters.push(`p.is_featured = true`); }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [res, countRes, summaryRes] = await Promise.all([
      db.query(
        `SELECT p.*, pc.name AS category_name
         FROM products p LEFT JOIN product_categories pc ON pc.id = p.category_id
         ${where} ORDER BY ${orderCol} ${sortDir} LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*)::int AS c FROM products p LEFT JOIN product_categories pc ON pc.id = p.category_id ${where}`, params),
      db.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_active=true)::int AS active,
          COUNT(*) FILTER (WHERE is_active=false)::int AS inactive,
          COUNT(*) FILTER (WHERE is_featured=true)::int AS featured,
          COUNT(DISTINCT category_id)::int AS categories,
          COALESCE(AVG(unit_price),0)::numeric(12,2) AS avg_price
        FROM products
      `),
    ]);

    return NextResponse.json({
      data: res.rows,
      total: countRes.rows[0].c,
      summary: summaryRes.rows[0],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════ POST ═══════════════════════ */
export async function POST(req: NextRequest) {
  const guard = await requireRole('manager');
  if (guard) return guard;

  try {
    const b = await req.json();
    if (!b.name || !b.sku) return NextResponse.json({ error: 'name and sku required' }, { status: 400 });

    const slug = b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const res = await db.query(
      `INSERT INTO products (sku, name, slug, category_id, description, short_description, image_url, gallery_images,
        unit_price, cost_price, is_active, is_featured, min_stock, meta_title, meta_description, tags, specifications, variants, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [
        b.sku, b.name, slug, b.category_id || null,
        b.description || null, b.short_description || null,
        b.image_url || null, b.gallery_images || [],
        parseFloat(b.unit_price) || 0, parseFloat(b.cost_price) || 0,
        b.is_active !== false, b.is_featured === true,
        parseInt(b.min_stock) || 100,
        b.meta_title || null, b.meta_description || null,
        b.tags || [], b.specifications ? JSON.stringify(b.specifications) : '{}',
        b.variants ? JSON.stringify(b.variants) : '[]',
        parseInt(b.sort_order) || 0,
      ]
    );

    const product = res.rows[0];
    const session = await getSession();

    await saveRevision(product.id, product, 'Initial creation', (session?.user as any)?.id, session?.user?.name ?? undefined);

    await logActivity({
      userId: (session?.user as any)?.id,
      userName: session?.user?.name ?? undefined,
      userEmail: session?.user?.email ?? undefined,
      action: 'create', module: 'products', entityType: 'products', entityId: product.id,
      description: `Created product: ${b.name} (${b.sku})`,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err: any) {
    if (err.code === '23505') return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════ PATCH ═══════════════════════ */
export async function PATCH(req: NextRequest) {
  const guard = await requireRole('manager');
  if (guard) return guard;

  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    /* Quick toggle: active / featured */
    if (b.action === 'toggle_active') {
      const res = await db.query(`UPDATE products SET is_active = NOT is_active, updated_at=NOW() WHERE id=$1 RETURNING id, name, is_active`, [b.id]);
      if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ product: res.rows[0] });
    }
    if (b.action === 'toggle_featured') {
      const res = await db.query(`UPDATE products SET is_featured = NOT is_featured, updated_at=NOW() WHERE id=$1 RETURNING id, name, is_featured`, [b.id]);
      if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ product: res.rows[0] });
    }

    const slug = b.slug || b.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null;

    const res = await db.query(
      `UPDATE products SET
        name=$1, slug=$2, sku=$3, category_id=$4, description=$5, short_description=$6,
        image_url=$7, gallery_images=$8, unit_price=$9, cost_price=$10,
        is_active=$11, is_featured=$12, min_stock=$13,
        meta_title=$14, meta_description=$15, tags=$16,
        specifications=$17, variants=$18, sort_order=$19, updated_at=NOW()
       WHERE id=$20 RETURNING *`,
      [
        b.name, slug, b.sku, b.category_id || null,
        b.description || null, b.short_description || null,
        b.image_url || null, b.gallery_images || [],
        parseFloat(b.unit_price) || 0, parseFloat(b.cost_price) || 0,
        b.is_active !== false, b.is_featured === true,
        parseInt(b.min_stock) || 100,
        b.meta_title || null, b.meta_description || null,
        b.tags || [], b.specifications ? JSON.stringify(b.specifications) : '{}',
        b.variants ? JSON.stringify(b.variants) : '[]',
        parseInt(b.sort_order) || 0, b.id,
      ]
    );

    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const session = await getSession();
    await saveRevision(b.id, res.rows[0], b.change_note || 'Updated', (session?.user as any)?.id, session?.user?.name ?? undefined);

    await logActivity({
      userId: (session?.user as any)?.id,
      userName: session?.user?.name ?? undefined,
      userEmail: session?.user?.email ?? undefined,
      action: 'update', module: 'products', entityType: 'products', entityId: b.id,
      description: `Updated product: ${b.name} (${b.sku})`,
    });

    return NextResponse.json({ product: res.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════ DELETE ═══════════════════════ */
export async function DELETE(req: NextRequest) {
  const guard = await requireRole('admin');
  if (guard) return guard;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const row = await db.query(`SELECT name, sku FROM products WHERE id=$1`, [id]);
    const res = await db.query(`DELETE FROM products WHERE id=$1 RETURNING id`, [id]);
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const session = await getSession();
    await logActivity({
      userId: (session?.user as any)?.id,
      userName: session?.user?.name ?? undefined,
      userEmail: session?.user?.email ?? undefined,
      action: 'delete', module: 'products', entityType: 'products', entityId: id,
      description: `Deleted product: ${row.rows[0]?.name ?? id}`,
    });

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
