import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, getSession } from '@/lib/auth-utils';
import { logActivity } from '@/app/api/activity-logs/route';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'media');
const THUMB_DIR  = path.join(process.cwd(), 'public', 'uploads', 'thumbnails');
const MAX_SIZE   = 10 * 1024 * 1024; // 10 MB
const ALLOWED    = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'];

/* ═══════════════════════ GET — list media ═══════════════════════ */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folder  = searchParams.get('folder') ?? '';
  const search  = searchParams.get('search') ?? '';
  const page    = parseInt(searchParams.get('page') ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '30');
  const offset  = (page - 1) * limit;

  try {
    /* Meta: distinct folders */
    if (searchParams.get('meta') === '1') {
      const folders = await db.query(`SELECT DISTINCT folder FROM cms_media ORDER BY folder`);
      const counts = await db.query(`
        SELECT COUNT(*)::int AS total,
          COALESCE(SUM(file_size),0)::bigint AS total_size,
          COUNT(DISTINCT folder)::int AS folder_count
        FROM cms_media
      `);
      return NextResponse.json({ folders: folders.rows.map((f: any) => f.folder), summary: counts.rows[0] });
    }

    const filters: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (folder) { filters.push(`folder = $${idx++}`); params.push(folder); }
    if (search) { filters.push(`(original_name ILIKE $${idx} OR alt_text ILIKE $${idx} OR caption ILIKE $${idx})`); params.push(`%${search}%`); idx++; }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [res, countRes] = await Promise.all([
      db.query(`SELECT * FROM cms_media ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*)::int AS c FROM cms_media ${where}`, params),
    ]);

    return NextResponse.json({ data: res.rows, total: countRes.rows[0].c });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════ POST — upload file ═══════════════════════ */
export async function POST(req: NextRequest) {
  const guard = await requireRole('staff');
  if (guard) return guard;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'general';
    const altText = (formData.get('alt_text') as string) || '';
    const caption = (formData.get('caption') as string) || '';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: `File type ${file.type} not allowed` }, { status: 400 });

    // Ensure dirs exist
    if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });
    if (!existsSync(THUMB_DIR)) await mkdir(THUMB_DIR, { recursive: true });

    const ext = path.extname(file.name) || '.jpg';
    const id = uuidv4();
    const filename = `${id}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Write original
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    // Generate thumbnail for images
    let thumbnailUrl = '';
    let width = 0;
    let height = 0;

    if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      try {
        const sharp = (await import('sharp')).default;
        const metadata = await sharp(buffer).metadata();
        width = metadata.width || 0;
        height = metadata.height || 0;

        const thumbName = `thumb_${filename}`;
        await sharp(buffer)
          .resize(300, 300, { fit: 'cover', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(path.join(THUMB_DIR, thumbName.replace(ext, '.jpg')));
        thumbnailUrl = `/uploads/thumbnails/${thumbName.replace(ext, '.jpg')}`;
      } catch (e) {
        // Thumbnail generation failed — non-critical
        console.warn('Thumbnail generation failed:', e);
      }
    }

    const url = `/uploads/media/${filename}`;

    const res = await db.query(
      `INSERT INTO cms_media (id, filename, original_name, mime_type, file_size, width, height, url, thumbnail_url, alt_text, caption, folder, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [id, filename, file.name, file.type, file.size, width, height, url, thumbnailUrl || null, altText || null, caption || null, folder, null]
    );

    const session = await getSession();
    await logActivity({
      userId: (session?.user as any)?.id,
      userName: session?.user?.name ?? undefined,
      userEmail: session?.user?.email ?? undefined,
      action: 'upload', module: 'media', entityType: 'cms_media', entityId: id,
      description: `Uploaded: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`,
    });

    return NextResponse.json({ media: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error('Media upload error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════════════ PATCH — update metadata ═══════════════════════ */
export async function PATCH(req: NextRequest) {
  const guard = await requireRole('staff');
  if (guard) return guard;

  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const res = await db.query(
      `UPDATE cms_media SET alt_text=$1, caption=$2, folder=$3, tags=$4
       WHERE id=$5 RETURNING *`,
      [b.alt_text || null, b.caption || null, b.folder || 'general', b.tags || [], b.id]
    );
    if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ media: res.rows[0] });
  } catch (err: any) {
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
    const row = await db.query(`SELECT * FROM cms_media WHERE id=$1`, [id]);
    if (row.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const m = row.rows[0];
    // Delete files from disk
    try {
      const filePath = path.join(process.cwd(), 'public', m.url);
      if (existsSync(filePath)) await unlink(filePath);
      if (m.thumbnail_url) {
        const thumbPath = path.join(process.cwd(), 'public', m.thumbnail_url);
        if (existsSync(thumbPath)) await unlink(thumbPath);
      }
    } catch { /* file deletion failure is non-critical */ }

    await db.query(`DELETE FROM cms_media WHERE id=$1`, [id]);

    const session = await getSession();
    await logActivity({
      userId: (session?.user as any)?.id,
      userName: session?.user?.name ?? undefined,
      userEmail: session?.user?.email ?? undefined,
      action: 'delete', module: 'media', entityType: 'cms_media', entityId: id,
      description: `Deleted media: ${m.original_name}`,
    });

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
