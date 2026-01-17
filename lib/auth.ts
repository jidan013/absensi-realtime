import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";

type UserWithRole = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
  },

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const valid = await compare(credentials.password, user.password);
        if (!valid) return null;

        // 👇 return custom user
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        } satisfies UserWithRole;
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      // 👇 TYPE NARROWING YANG BENAR
      if (user && "role" in user) {
        const u = user as UserWithRole;
        token.id = u.id;
        token.role = u.role;
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "USER";
      }
      return session;
    },
  },
});

export default auth;