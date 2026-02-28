import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

/* ── Failed login attempt tracking (account lockout) ── */
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_FAILED = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Rate limit by email (brute-force protection)
        const rl = checkRateLimit(email, 'auth');
        if (rl.limited) return null;

        // Account lockout check
        const attempts = failedAttempts.get(email);
        if (attempts && attempts.count >= MAX_FAILED) {
          if (Date.now() - attempts.lastAttempt < LOCKOUT_MS) return null;
          failedAttempts.delete(email); // Lockout expired
        }

        try {
          const res = await db.query(
            `SELECT u.*, r.name AS role_name, r.permissions
             FROM users u
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE LOWER(u.email) = $1 AND u.is_active = TRUE`,
            [email]
          );

          const user = res.rows[0];
          if (!user) {
            trackFailedAttempt(email);
            return null;
          }

          const valid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!valid) {
            trackFailedAttempt(email);
            return null;
          }

          // Clear failed attempts on successful login
          failedAttempts.delete(email);

          await db.query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

          return {
            id:          user.id,
            email:       user.email,
            name:        user.full_name,
            role:        user.role_name,
            permissions: user.permissions,
            avatar:      user.avatar_url,
          };
        } catch (err) {
          console.error('Auth DB error:', err instanceof Error ? err.message : err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role        = (user as any).role;
        token.permissions = (user as any).permissions;
        token.avatar      = (user as any).avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id          = token.sub;
        (session.user as any).role        = token.role;
        (session.user as any).permissions = token.permissions;
        (session.user as any).avatar      = token.avatar;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);

/* ── Helper: track failed login attempts ── */
function trackFailedAttempt(email: string) {
  const entry = failedAttempts.get(email);
  if (entry) {
    entry.count++;
    entry.lastAttempt = Date.now();
  } else {
    failedAttempts.set(email, { count: 1, lastAttempt: Date.now() });
  }
}
