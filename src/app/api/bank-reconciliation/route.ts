import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-utils';

/* ------------------------------------------------------------------ */
/*  GET  /api/bank-reconciliation                                     */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  const authErr = await requireRole('viewer');
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);

  try {
    /* ---- meta: accounts list + summary stats ---- */
    if (searchParams.get('meta') === '1') {
      const [accounts, stats] = await Promise.all([
        db.query(`SELECT id, name FROM accounts ORDER BY name`),
        db.query(
          `SELECT COUNT(*)::int                         AS total_statements,
                  COUNT(*) FILTER (WHERE matched)::int  AS matched_count,
                  COUNT(*) FILTER (WHERE NOT matched)::int AS unmatched_count,
                  COALESCE(SUM(debit),0)::numeric       AS total_debits,
                  COALESCE(SUM(credit),0)::numeric      AS total_credits
           FROM bank_statements`
        ),
      ]);
      return NextResponse.json({
        accounts: accounts.rows,
        summary: stats.rows[0],
      });
    }

    const accountId = searchParams.get('account_id');
    const action    = searchParams.get('action');

    /* ---- unmatched: suggested matches ---- */
    if (action === 'unmatched' && accountId) {
      const [unmatched, candidates] = await Promise.all([
        db.query(
          `SELECT id, statement_date, description, reference, debit, credit, balance, import_batch, created_at
           FROM bank_statements
           WHERE account_id = $1 AND matched = FALSE
           ORDER BY statement_date DESC`,
          [accountId]
        ),
        db.query(
          `SELECT t.id, t.date, t.description, t.amount, t.type
           FROM transactions t
           LEFT JOIN bank_statements bs ON bs.transaction_id = t.id
           WHERE t.account_id = $1 AND bs.id IS NULL
           ORDER BY t.date DESC`,
          [accountId]
        ),
      ]);
      return NextResponse.json({
        unmatched_statements: unmatched.rows,
        suggested_transactions: candidates.rows,
      });
    }

    /* ---- list statements for an account ---- */
    if (accountId) {
      const matched  = searchParams.get('matched') ?? 'all';
      const from     = searchParams.get('from') ?? '';
      const to       = searchParams.get('to') ?? '';
      const page     = parseInt(searchParams.get('page') ?? '1');
      const limit    = parseInt(searchParams.get('limit') ?? '20');
      const offset   = (page - 1) * limit;

      const params: unknown[] = [accountId];
      let idx = 2;
      let filters = '';

      if (matched === 'true') {
        filters += ` AND bs.matched = TRUE`;
      } else if (matched === 'false') {
        filters += ` AND bs.matched = FALSE`;
      }

      if (from) {
        filters += ` AND bs.statement_date >= $${idx}`;
        params.push(from);
        idx++;
      }
      if (to) {
        filters += ` AND bs.statement_date <= $${idx}`;
        params.push(to);
        idx++;
      }

      const baseWhere = `FROM bank_statements bs
                          LEFT JOIN transactions t ON t.id = bs.transaction_id
                          WHERE bs.account_id = $1${filters}`;

      const [rows, countRes, summary] = await Promise.all([
        db.query(
          `SELECT bs.id, bs.statement_date, bs.description, bs.reference,
                  bs.debit, bs.credit, bs.balance, bs.matched,
                  bs.transaction_id, bs.import_batch, bs.created_at,
                  t.description AS txn_description, t.amount AS txn_amount, t.type AS txn_type
           ${baseWhere}
           ORDER BY bs.statement_date DESC, bs.created_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limit, offset]
        ),
        db.query(`SELECT COUNT(*)::int AS total ${baseWhere}`, params),
        db.query(
          `SELECT COUNT(*)::int                         AS total_statements,
                  COUNT(*) FILTER (WHERE bs.matched)::int  AS matched_count,
                  COUNT(*) FILTER (WHERE NOT bs.matched)::int AS unmatched_count,
                  COALESCE(SUM(bs.debit),0)::numeric    AS total_debits,
                  COALESCE(SUM(bs.credit),0)::numeric   AS total_credits
           ${baseWhere}`,
          params
        ),
      ]);

      const total = countRes.rows[0]?.total ?? 0;

      return NextResponse.json({
        statements: rows.rows,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        summary: summary.rows[0],
      });
    }

    return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
  } catch (err) {
    console.error('Bank reconciliation GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch bank reconciliation data' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST  /api/bank-reconciliation                                    */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { action } = body;

    /* ---- bulk import statements ---- */
    if (action === 'import') {
      const { account_id, statements } = body as {
        account_id: number;
        statements: {
          statement_date: string;
          description: string;
          reference?: string;
          debit?: number;
          credit?: number;
          balance?: number;
        }[];
      };

      if (!account_id || !Array.isArray(statements) || statements.length === 0) {
        return NextResponse.json({ error: 'account_id and a non-empty statements array are required' }, { status: 400 });
      }

      const importBatch = `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        let inserted = 0;
        for (const s of statements) {
          await client.query(
            `INSERT INTO bank_statements
               (id, account_id, statement_date, description, reference, debit, credit, balance, matched, import_batch)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, FALSE, $8)`,
            [
              account_id,
              s.statement_date,
              s.description,
              s.reference ?? null,
              s.debit ?? 0,
              s.credit ?? 0,
              s.balance ?? 0,
              importBatch,
            ]
          );
          inserted++;
        }

        await client.query('COMMIT');
        return NextResponse.json({ message: 'Statements imported', count: inserted, import_batch: importBatch });
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    }

    /* ---- match a statement to a transaction ---- */
    if (action === 'match') {
      const { statement_id, transaction_id } = body as {
        statement_id: string;
        transaction_id: string;
      };

      if (!statement_id || !transaction_id) {
        return NextResponse.json({ error: 'statement_id and transaction_id are required' }, { status: 400 });
      }

      const result = await db.query(
        `UPDATE bank_statements
            SET matched = TRUE, transaction_id = $1
          WHERE id = $2
          RETURNING id, matched, transaction_id`,
        [transaction_id, statement_id]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Statement matched', statement: result.rows[0] });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Bank reconciliation POST error:', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH  /api/bank-reconciliation                                   */
/* ------------------------------------------------------------------ */
export async function PATCH(req: NextRequest) {
  const authErr = await requireRole('staff');
  if (authErr) return authErr;

  try {
    const { statement_id } = (await req.json()) as { statement_id: string };

    if (!statement_id) {
      return NextResponse.json({ error: 'statement_id is required' }, { status: 400 });
    }

    const result = await db.query(
      `UPDATE bank_statements
          SET matched = FALSE, transaction_id = NULL
        WHERE id = $1
        RETURNING id, matched`,
      [statement_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Statement unmatched', statement: result.rows[0] });
  } catch (err) {
    console.error('Bank reconciliation PATCH error:', err);
    return NextResponse.json({ error: 'Failed to unmatch statement' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE  /api/bank-reconciliation                                  */
/* ------------------------------------------------------------------ */
export async function DELETE(req: NextRequest) {
  const authErr = await requireRole('manager');
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const id          = searchParams.get('id');
    const importBatch = searchParams.get('import_batch');

    if (id) {
      const result = await db.query(
        `DELETE FROM bank_statements WHERE id = $1 RETURNING id`,
        [id]
      );
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
      }
      return NextResponse.json({ message: 'Statement deleted', id });
    }

    if (importBatch) {
      const result = await db.query(
        `DELETE FROM bank_statements WHERE import_batch = $1`,
        [importBatch]
      );
      return NextResponse.json({
        message: 'Import batch deleted',
        import_batch: importBatch,
        count: result.rowCount,
      });
    }

    return NextResponse.json({ error: 'id or import_batch is required' }, { status: 400 });
  } catch (err) {
    console.error('Bank reconciliation DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
