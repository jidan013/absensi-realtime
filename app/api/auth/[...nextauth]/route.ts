// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

type UserWithRole = {
  id: string
  name: string
  email: string
  role: "ADMIN" | "USER"
}

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string }
          })

          if (!user) return null

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )

          if (!isValid) return null

          return user as UserWithRole
        } catch (error) {
          console.error("AUTH ERROR:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user && typeof user === 'object' && 'role' in user) {
        token.role = (user as UserWithRole).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role as "ADMIN" | "USER"
      }
      return session
    }
  }
})

export { handler as GET, handler as POST }
