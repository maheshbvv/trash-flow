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

  // Check subscription limits
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const isPaid = user.subscriptionType === 'yearly' || user.subscriptionType === 'lifetime'
  const maxBatch = isPaid ? 500 : 500
  const totalLimit = 500

  // For free users, check total deletions used
  if (!isPaid && user.deletionsUsed >= totalLimit) {
    return NextResponse.json({ 
      error: "Free trial limit reached",
      message: "You've used all 500 free deletions. Upgrade to continue.",
      upgradeRequired: true
    }, { status: 403 })
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
      const subjectKeywords = ['promotion', 'sale', 'discount', 'offer', 'deal', 'free', 'shop', 'order']
      const senderKeywords = ['newsletter', 'marketing', 'promo', 'offers']
      
      const subjectQueries = subjectKeywords.map(k => `subject:${k}`)
      const senderQueries = senderKeywords.map(k => `from:${k}`)
      
      parts.push(`(${subjectQueries.join(' OR ')} OR ${senderQueries.join(' OR ')} OR category:promotions)`)
      
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
    const maxEmails = maxBatch

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
      // Increment deletions used for free users
      if (!isPaid) {
        await prisma.user.update({
          where: { email: session.user.email },
          data: { deletionsUsed: { increment: totalTrashed } }
        })
      }
      
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

    const response = { 
      success: true, 
      trashed: totalTrashed,
      remaining: rateLimitResult.remaining,
      message: totalTrashed >= maxEmails 
        ? `Trashed ${totalTrashed} emails (max limit reached)` 
        : `Successfully trashed ${totalTrashed} emails`
    }
    
    console.log("Trash response:", JSON.stringify(response))
    return NextResponse.json(response)
  } catch (error) {
    console.error("Error trashing emails:", error)
    return NextResponse.json({ error: "Failed to trash emails", message: String(error) }, { status: 500 })
  }
}
