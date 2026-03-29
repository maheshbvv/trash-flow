import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getGmailClient, buildSearchQuery, formatDateForGmail } from "@/lib/gmail"
import { rateLimit } from "@/lib/rate-limit"
import { validateEmail, validateDateRange } from "@/lib/validation"
import { auditLog, AuditAction } from "@/lib/audit"

const MARKETING_KEYWORDS = [
  'promotion', 'sale', 'discount', 'offer', 'limited time', 
  'free', 'buy now', 'shop', 'deal', 'save',
  'new arrival', 'special offer', 'flash sale', 'bonus',
  'unsubscribe', 'newsletter', 'update', 'invitation'
]

export async function POST(req: NextRequest) {
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
  const rateLimitResult = rateLimit(clientIP)
  
  if (!rateLimitResult.success) {
    await auditLog({
      action: AuditAction.RATE_LIMIT_EXCEEDED,
      ipAddress: clientIP,
      details: { endpoint: '/api/emails/count', resetTime: rateLimitResult.resetTime }
    })
    return NextResponse.json(
      { error: "Too many requests", retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000) },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)) } }
    )
  }

  const session = await getServerSession(authOptions)
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = validateEmail(body)
    
    if (!validation.valid || !validation.data) {
      const errors = 'errors' in validation ? validation.errors : []
      await auditLog({
        email: session.user?.email ?? undefined,
        action: AuditAction.INVALID_REQUEST,
        ipAddress: clientIP,
        details: { endpoint: '/api/emails/count', errors }
      })
      return NextResponse.json({ error: "Invalid input", details: errors }, { status: 400 })
    }

    const sender = validation.data?.sender
    const before = validation.data?.before
    const after = validation.data?.after
    const { isMarketing } = body

    console.log("Request body:", JSON.stringify(body))
    console.log("Sender from validation:", sender)

    if (!validateDateRange(before, after)) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
    }

    const gmail = getGmailClient(session.accessToken as string)

    let query: string

    if (isMarketing) {
      const parts: string[] = []
      const subjectKeywords = ['promotion', 'sale', 'discount', 'offer', 'deal', 'free', 'shop']
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

    if (!query.trim()) {
      return NextResponse.json({ count: 0, query: '' })
    }

    console.log("Search query:", query)

    let totalCount = 0
    let pageToken: string | undefined
    let attempts = 0
    const maxAttempts = 5

    do {
      attempts++
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 500,
        pageToken,
      })

      const responseData = response.data as Record<string, unknown>
      console.log("Gmail API response:", JSON.stringify(responseData))
      
      if (responseData.error) {
        console.error("Gmail API error:", responseData.error)
        return NextResponse.json({ error: "Gmail API error", details: responseData.error }, { status: 500 })
      }

      const messages = (responseData.messages as Array<unknown>) || []
      console.log("Found messages:", messages.length)
      totalCount += messages.length
      pageToken = responseData.nextPageToken as string | undefined
      if (totalCount >= 500) break
    } while (pageToken && attempts < maxAttempts)

    await auditLog({
      userId: session.user?.email,
      email: session.user?.email,
      action: AuditAction.EMAIL_COUNT,
      ipAddress: clientIP,
      details: { count: totalCount, sender, before, after, isMarketing }
    })

    return NextResponse.json({ count: totalCount, query, remaining: rateLimitResult.remaining })
  } catch (error) {
    console.error("Error counting emails:", error)
    return NextResponse.json({ error: "Failed to count emails" }, { status: 500 })
  }
}
