import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getGmailClient, buildSearchQuery, formatDateForGmail } from "@/lib/gmail"
import { rateLimit } from "@/lib/rate-limit"
import { validateEmail, validateDateRange } from "@/lib/validation"
import { auditLog, AuditAction } from "@/lib/audit"
import { prisma } from "@/lib/prisma"

const MARKETING_KEYWORDS = [
  'promotion', 'sale', 'discount', 'offer', 'limited time', 
  'free', 'buy now', 'shop', 'order', 'deal', 'save',
  'new arrival', 'special offer', 'flash sale', 'bonus',
  'unsubscribe', 'newsletter', 'update', 'invitation'
]

export async function POST(req: NextRequest) {
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
  const rateLimitResult = rateLimit(clientIP)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000) },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)) } }
    )
  }

  const session = await getServerSession(authOptions)
  
  if (!session?.accessToken || !session.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = validateEmail(body)
    
    if (!validation.valid || !validation.data) {
      const errors = 'errors' in validation ? validation.errors : []
      await auditLog({
        userId: session.user.email,
        email: session.user.email,
        action: AuditAction.INVALID_REQUEST,
        ipAddress: clientIP,
        details: { endpoint: '/api/emails/trash', errors }
      })
      return NextResponse.json({ error: "Invalid input", details: errors }, { status: 400 })
    }

    const sender = validation.data?.sender
    const before = validation.data?.before
    const after = validation.data?.after
    const { isMarketing } = body

    if (!validateDateRange(before, after)) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
    }

    const gmail = getGmailClient(session.accessToken as string)

    let query: string

    if (isMarketing) {
      const parts: string[] = []
      parts.push('category:promotions')
      const keywordQueries = MARKETING_KEYWORDS.map(k => `(subject:${k} OR subject:${k.toUpperCase()})`)
      parts.push(`(${keywordQueries.join(' OR ')})`)
      if (after) parts.push(`after:${formatDateForGmail(new Date(after))}`)
      if (before) parts.push(`before:${formatDateForGmail(new Date(before))}`)
      query = parts.join(' ')
    } else {
      query = buildSearchQuery({
        from: sender?.trim() || undefined,
        after: after ? formatDateForGmail(new Date(after)) : undefined,
        before: before ? formatDateForGmail(new Date(before)) : undefined,
      })
    }

    let totalTrashed = 0
    let pageToken: string | undefined
    const maxEmails = 500

    do {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 100,
        pageToken,
      })

      const messages = (response.data.messages as Array<{ id?: string }>) || []
      if (messages.length === 0) break

      const batchSize = Math.min(messages.length, maxEmails - totalTrashed)
      const toTrash = messages.slice(0, batchSize)

      for (const message of toTrash) {
        if (message.id) {
          await gmail.users.messages.trash({
            userId: 'me',
            id: message.id,
          })
          totalTrashed++
        }
      }

      pageToken = response.data.nextPageToken as string | undefined
      if (totalTrashed >= maxEmails) break
    } while (pageToken)

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    
    if (user) {
      await prisma.operation.create({
        data: {
          userId: user.id,
          type: 'delete',
          filters: JSON.stringify({ sender, before, after, isMarketing }),
          emailCount: totalTrashed,
        }
      })
    }

    await auditLog({
      userId: session.user.email,
      email: session.user.email,
      action: AuditAction.EMAIL_TRASH,
      ipAddress: clientIP,
      details: { trashed: totalTrashed, sender, before, after, isMarketing }
    })

    return NextResponse.json({ 
      success: true, 
      trashed: totalTrashed,
      remaining: rateLimitResult.remaining,
      message: totalTrashed >= maxEmails 
        ? `Trashed ${totalTrashed} emails (max limit reached)` 
        : `Successfully trashed ${totalTrashed} emails`
    })
  } catch (error) {
    console.error("Error trashing emails:", error)
    return NextResponse.json({ error: "Failed to trash emails" }, { status: 500 })
  }
}
