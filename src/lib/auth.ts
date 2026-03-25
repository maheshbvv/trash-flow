import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "./prisma"
import { JWT } from "next-auth/jwt"
import { auditLog, AuditAction } from "./audit"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify"
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (user.email) {
        await prisma.user.upsert({
          where: { email: user.email },
          update: { 
            name: user.name,
          },
          create: {
            email: user.email,
            name: user.name || null,
          }
        })

        await auditLog({
          email: user.email,
          action: AuditAction.LOGIN,
          details: { 
            name: user.name,
            provider: account?.provider,
          }
        })
      }
      return true
    },
    async jwt({ token, account, refreshToken, trigger }: { 
      token: JWT; 
      account: any;
      refreshToken?: string;
      trigger?: string;
    }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }

      const now = Date.now()
      const tokenExpiresAt = (token.expiresAt as number) * 1000
      
      if (tokenExpiresAt && now >= tokenExpiresAt - 5 * 60 * 1000) {
        if (token.refreshToken) {
          try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                refresh_token: token.refreshToken as string,
                grant_type: 'refresh_token',
              }),
            })

            if (response.ok) {
              const tokens = await response.json()
              token.accessToken = tokens.access_token
              token.expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in
            } else {
              console.error('Failed to refresh token')
            }
          } catch (error) {
            console.error('Token refresh error:', error)
          }
        }
      }

      return token
    },
    async session({ session, token }: { session: any; token: JWT }) {
      session.accessToken = token.accessToken
      return session
    }
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
