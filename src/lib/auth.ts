import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

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

        try {
          const res = await db.query(
            `SELECT u.*, r.name AS role_name, r.permissions
             FROM users u
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE u.email = $1 AND u.is_active = TRUE`,
            [credentials.email]
          );

          const user = res.rows[0];
          if (!user) return null;

          const valid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!valid) return null;

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
          console.error('Auth error:', err);
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
