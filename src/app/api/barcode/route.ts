import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import bwipjs from 'bwip-js';

export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'generate';

    if (action === 'generate') {
      const text = searchParams.get('text');
      if (!text) {
        return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
      }

      const type = searchParams.get('type') || 'code128';
      const scale = parseInt(searchParams.get('scale') || '3', 10);
      const height = parseInt(searchParams.get('height') || '10', 10);
      const includetext = searchParams.get('includetext') !== 'false';

      const buffer = await bwipjs.toBuffer({
        bcid: type,
        text: text,
        scale: scale,
        height: height,
        includetext: includetext,
        textxalign: 'center',
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    if (action === 'product-labels') {
      const result = await db.query(
        'SELECT id, name, sku, selling_price FROM products WHERE is_active = TRUE ORDER BY name'
      );
      return NextResponse.json({ products: result.rows });
    }

    if (action === 'inventory-labels') {
      const result = await db.query(
        'SELECT id, name, sku, unit, unit_price FROM inventory_items WHERE is_active = TRUE ORDER BY name'
      );
      return NextResponse.json({ items: result.rows });
    }

    if (action === 'batch') {
      const itemsParam = searchParams.get('items');
      if (!itemsParam) {
        return NextResponse.json({ error: 'Items parameter is required' }, { status: 400 });
      }

      let items: { text: string; label?: string }[];
      try {
        items = JSON.parse(itemsParam);
      } catch {
        return NextResponse.json({ error: 'Invalid items JSON' }, { status: 400 });
      }

      const type = searchParams.get('type') || 'code128';
      const scale = parseInt(searchParams.get('scale') || '3', 10);
      const height = parseInt(searchParams.get('height') || '10', 10);
      const includetext = searchParams.get('includetext') !== 'false';

      const labels = await Promise.all(
        items.map(async (item) => {
          const buffer = await bwipjs.toBuffer({
            bcid: type,
            text: item.text,
            scale: scale,
            height: height,
            includetext: includetext,
            textxalign: 'center',
          });

          const base64 = Buffer.from(buffer).toString('base64');
          return {
            text: item.text,
            label: item.label || item.text,
            image: `data:image/png;base64,${base64}`,
          };
        })
      );

      return NextResponse.json({ labels });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Barcode API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
