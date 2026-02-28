import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';
import { logActivity } from '@/app/api/activity-logs/route';

/* ═══════════════════════ GET ═══════════════════════ */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  try {
    /* ── CMS Sections with items ── */
    if (type === 'sections') {
      const pageFilter = searchParams.get('page_name');
      const where = pageFilter ? `WHERE s.page = $1` : '';
      const params = pageFilter ? [pageFilter] : [];

      const sections = await db.query(
        `SELECT s.*,
           COALESCE(
             (SELECT json_agg(
               json_build_object('id',i.id,'title',i.title,'subtitle',i.subtitle,'description',i.description,
                 'icon',i.icon,'image_url',i.image_url,'link',i.link,'value',i.value,'extra',i.extra,
                 'sort_order',i.sort_order,'is_active',i.is_active)
               ORDER BY i.sort_order
             ) FROM cms_items i WHERE i.section_id=s.id),
             '[]'
           ) AS items
         FROM cms_sections s ${where} ORDER BY s.page, s.sort_order`, params
      );
      return NextResponse.json({ sections: sections.rows });
    }

    /* ── Services ── */
    if (type === 'services') {
      const res = await db.query(`SELECT * FROM cms_services ORDER BY sort_order`);
      return NextResponse.json({ services: res.rows });
    }

    /* ── Gallery ── */
    if (type === 'gallery') {
      const category = searchParams.get('category');
      const where = category ? `WHERE category=$1` : '';
      const params = category ? [category] : [];
      const res = await db.query(`SELECT * FROM cms_gallery ${where} ORDER BY sort_order`, params);
      const cats = await db.query(`SELECT DISTINCT category FROM cms_gallery ORDER BY category`);
      return NextResponse.json({ gallery: res.rows, categories: cats.rows.map((c: any) => c.category) });
    }

    /* ── CMS Pages with SEO ── */
    if (type === 'pages') {
      const res = await db.query(`SELECT * FROM cms_pages ORDER BY sort_order`);
      return NextResponse.json({ pages: res.rows });
    }

    /* ── CMS Settings ── */
    if (type === 'settings') {
      const category = searchParams.get('category');
      const where = category ? `WHERE category=$1` : '';
      const params = category ? [category] : [];
      const res = await db.query(`SELECT * FROM cms_settings ${where} ORDER BY sort_order`, params);
      return NextResponse.json({ settings: res.rows });
    }

    /* ── Revisions for entity ── */
    if (type === 'revisions') {
      const entityType = searchParams.get('entity_type');
      const entityId = searchParams.get('entity_id');
      if (!entityType || !entityId) return NextResponse.json({ error: 'entity_type and entity_id required' }, { status: 400 });
      const res = await db.query(
        `SELECT * FROM cms_revisions WHERE entity_type=$1 AND entity_id=$2 ORDER BY revision_num DESC LIMIT 50`,
        [entityType, entityId]
      );
      return NextResponse.json({ revisions: res.rows });
    }

    /* ── All summary (meta) ── */
    if (type === 'meta') {
      const [pages, sectionCount, itemCount, serviceCount, galleryCount, productCount, mediaCount, settingsCount] = await Promise.all([
        db.query(`SELECT id, slug, title, status FROM cms_pages ORDER BY sort_order`),
        db.query(`SELECT COUNT(*)::int AS c FROM cms_sections`),
        db.query(`SELECT COUNT(*)::int AS c FROM cms_items`),
        db.query(`SELECT COUNT(*)::int AS c FROM cms_services`),
        db.query(`SELECT COUNT(*)::int AS c FROM cms_gallery`),
        db.query(`SELECT COUNT(*)::int AS c FROM products`),
        db.query(`SELECT COUNT(*)::int AS c FROM cms_media`),
        db.query(`SELECT COUNT(*)::int AS c FROM cms_settings`),
      ]);
      return NextResponse.json({
        pages: pages.rows,
        counts: {
          sections: sectionCount.rows[0].c,
          items: itemCount.rows[0].c,
          services: serviceCount.rows[0].c,
          gallery: galleryCount.rows[0].c,
          products: productCount.rows[0].c,
          media: mediaCount.rows[0].c,
          settings: settingsCount.rows[0].c,
        },
      });
    }

    return NextResponse.json({ error: 'Specify type: sections, services, gallery, pages, settings, revisions, or meta' }, { status: 400 });
  } catch (err: any) {
    console.error('CMS GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════ POST ═══════════════════════ */
export async function POST(req: NextRequest) {
  const guard = await requireRole('admin');
  if (guard) return guard;

  try {
    const b = await req.json();
    const session = await getSession();
    const userId = (session?.user as any)?.id;
    const userName = session?.user?.name ?? undefined;
    const userEmail = session?.user?.email ?? undefined;

    /* ── Create section ── */
    if (b.entity === 'section') {
      const res = await db.query(
        `INSERT INTO cms_sections (page, section_key, title, subtitle, content, cta_text, cta_link, image_url, icon, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [b.page, b.section_key, b.title||null, b.subtitle||null, b.content||null, b.cta_text||null, b.cta_link||null, b.image_url||null, b.icon||null, b.sort_order||0, b.is_active!==false]
      );
      await logActivity({ userId, userName, userEmail, action: 'create', module: 'cms', entityType: 'cms_sections', entityId: String(res.rows[0].id), description: `Created CMS section: ${b.title} (${b.page})` });
      return NextResponse.json({ section: res.rows[0] }, { status: 201 });
    }

    /* ── Create item ── */
    if (b.entity === 'item') {
      const res = await db.query(
        `INSERT INTO cms_items (section_id, title, subtitle, description, icon, image_url, link, value, extra, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [b.section_id, b.title||null, b.subtitle||null, b.description||null, b.icon||null, b.image_url||null, b.link||null, b.value||null, b.extra ? JSON.stringify(b.extra) : null, b.sort_order||0, b.is_active!==false]
      );
      await logActivity({ userId, userName, userEmail, action: 'create', module: 'cms', entityType: 'cms_items', entityId: res.rows[0].id, description: `Created CMS item: ${b.title}` });
      return NextResponse.json({ item: res.rows[0] }, { status: 201 });
    }

    /* ── Create service ── */
    if (b.entity === 'service') {
      const res = await db.query(
        `INSERT INTO cms_services (title, description, icon, image_url, features, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [b.title, b.description||null, b.icon||null, b.image_url||null, b.features ? JSON.stringify(b.features) : null, b.sort_order||0, b.is_active!==false]
      );
      await logActivity({ userId, userName, userEmail, action: 'create', module: 'cms', entityType: 'cms_services', entityId: res.rows[0].id, description: `Created CMS service: ${b.title}` });
      return NextResponse.json({ service: res.rows[0] }, { status: 201 });
    }

    /* ── Create gallery item ── */
    if (b.entity === 'gallery') {
      const res = await db.query(
        `INSERT INTO cms_gallery (title, alt_text, image_url, category, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [b.title||null, b.alt_text||null, b.image_url, b.category||'general', b.sort_order||0, b.is_active!==false]
      );
      await logActivity({ userId, userName, userEmail, action: 'create', module: 'cms', entityType: 'cms_gallery', entityId: res.rows[0].id, description: `Created gallery image: ${b.title}` });
      return NextResponse.json({ gallery: res.rows[0] }, { status: 201 });
    }

    /* ── Create page ── */
    if (b.entity === 'page') {
      const res = await db.query(
        `INSERT INTO cms_pages (slug, title, meta_title, meta_description, og_image, status, template, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [b.slug, b.title, b.meta_title||null, b.meta_description||null, b.og_image||null, b.status||'draft', b.template||'default', b.sort_order||0, b.is_active!==false]
      );
      await logActivity({ userId, userName, userEmail, action: 'create', module: 'cms', entityType: 'cms_pages', entityId: String(res.rows[0].id), description: `Created page: ${b.title}` });
      return NextResponse.json({ page: res.rows[0] }, { status: 201 });
    }

    return NextResponse.json({ error: 'Specify entity: section, item, service, gallery, or page' }, { status: 400 });
  } catch (err: any) {
    if (err.code === '23505') return NextResponse.json({ error: 'Duplicate entry' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════ PATCH ═══════════════════════ */
export async function PATCH(req: NextRequest) {
  const guard = await requireRole('admin');
  if (guard) return guard;

  try {
    const b = await req.json();
    const session = await getSession();
    const userId = (session?.user as any)?.id;
    const userName = session?.user?.name ?? undefined;
    const userEmail = session?.user?.email ?? undefined;

    /* ── Update section ── */
    if (b.entity === 'section') {
      const res = await db.query(
        `UPDATE cms_sections SET title=$1, subtitle=$2, content=$3, cta_text=$4, cta_link=$5,
         image_url=$6, icon=$7, sort_order=$8, is_active=$9, updated_at=NOW()
         WHERE id=$10 RETURNING *`,
        [b.title||null, b.subtitle||null, b.content||null, b.cta_text||null, b.cta_link||null, b.image_url||null, b.icon||null, b.sort_order||0, b.is_active!==false, b.id]
      );
      if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await logActivity({ userId, userName, userEmail, action: 'update', module: 'cms', entityType: 'cms_sections', entityId: String(b.id), description: `Updated CMS section: ${b.title}` });
      return NextResponse.json({ section: res.rows[0] });
    }

    /* ── Update item ── */
    if (b.entity === 'item') {
      const res = await db.query(
        `UPDATE cms_items SET title=$1, subtitle=$2, description=$3, icon=$4, image_url=$5,
         link=$6, value=$7, extra=$8, sort_order=$9, is_active=$10, updated_at=NOW()
         WHERE id=$11 RETURNING *`,
        [b.title||null, b.subtitle||null, b.description||null, b.icon||null, b.image_url||null, b.link||null, b.value||null, b.extra ? JSON.stringify(b.extra) : null, b.sort_order||0, b.is_active!==false, b.id]
      );
      if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await logActivity({ userId, userName, userEmail, action: 'update', module: 'cms', entityType: 'cms_items', entityId: b.id, description: `Updated CMS item: ${b.title}` });
      return NextResponse.json({ item: res.rows[0] });
    }

    /* ── Update service ── */
    if (b.entity === 'service') {
      const res = await db.query(
        `UPDATE cms_services SET title=$1, description=$2, icon=$3, image_url=$4,
         features=$5, sort_order=$6, is_active=$7, updated_at=NOW()
         WHERE id=$8 RETURNING *`,
        [b.title, b.description||null, b.icon||null, b.image_url||null, b.features ? JSON.stringify(b.features) : null, b.sort_order||0, b.is_active!==false, b.id]
      );
      if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await logActivity({ userId, userName, userEmail, action: 'update', module: 'cms', entityType: 'cms_services', entityId: b.id, description: `Updated CMS service: ${b.title}` });
      return NextResponse.json({ service: res.rows[0] });
    }

    /* ── Update gallery item ── */
    if (b.entity === 'gallery') {
      const res = await db.query(
        `UPDATE cms_gallery SET title=$1, alt_text=$2, image_url=$3, category=$4,
         sort_order=$5, is_active=$6, updated_at=NOW()
         WHERE id=$7 RETURNING *`,
        [b.title||null, b.alt_text||null, b.image_url, b.category||'general', b.sort_order||0, b.is_active!==false, b.id]
      );
      if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await logActivity({ userId, userName, userEmail, action: 'update', module: 'cms', entityType: 'cms_gallery', entityId: b.id, description: `Updated gallery: ${b.title}` });
      return NextResponse.json({ gallery: res.rows[0] });
    }

    /* ── Update page ── */
    if (b.entity === 'page') {
      const res = await db.query(
        `UPDATE cms_pages SET title=$1, meta_title=$2, meta_description=$3, og_image=$4,
         status=$5, template=$6, custom_css=$7, sort_order=$8, is_active=$9, updated_at=NOW()
         WHERE id=$10 RETURNING *`,
        [b.title, b.meta_title||null, b.meta_description||null, b.og_image||null, b.status||'published', b.template||'default', b.custom_css||null, b.sort_order||0, b.is_active!==false, b.id]
      );
      if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await logActivity({ userId, userName, userEmail, action: 'update', module: 'cms', entityType: 'cms_pages', entityId: String(b.id), description: `Updated page: ${b.title}` });
      return NextResponse.json({ page: res.rows[0] });
    }

    /* ── Update settings (batch) ── */
    if (b.entity === 'settings') {
      for (const s of b.settings || []) {
        await db.query(`UPDATE cms_settings SET value=$1, updated_at=NOW() WHERE key=$2`, [s.value ?? '', s.key]);
      }
      await logActivity({ userId, userName, userEmail, action: 'update', module: 'cms', entityType: 'cms_settings', description: `Updated ${(b.settings || []).length} CMS settings` });
      return NextResponse.json({ updated: true });
    }

    return NextResponse.json({ error: 'Specify entity' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════ DELETE ═══════════════════════ */
export async function DELETE(req: NextRequest) {
  const guard = await requireRole('admin');
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get('entity');
  const id = searchParams.get('id');
  if (!entity || !id) return NextResponse.json({ error: 'entity and id required' }, { status: 400 });

  const tableMap: Record<string, string> = {
    section: 'cms_sections', item: 'cms_items', service: 'cms_services',
    gallery: 'cms_gallery', page: 'cms_pages',
  };
  const table = tableMap[entity];
  if (!table) return NextResponse.json({ error: 'Invalid entity' }, { status: 400 });

  try {
    const session = await getSession();
    const res = await db.query(`DELETE FROM ${table} WHERE id=$1 RETURNING *`, [id]);
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await logActivity({
      userId: (session?.user as any)?.id,
      userName: session?.user?.name ?? undefined,
      userEmail: session?.user?.email ?? undefined,
      action: 'delete', module: 'cms', entityType: table, entityId: String(id),
      description: `Deleted CMS ${entity}: ${res.rows[0].title || id}`,
    });

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
