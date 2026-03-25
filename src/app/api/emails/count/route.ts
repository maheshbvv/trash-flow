import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getGmailClient, buildSearchQuery, formatDateForGmail } from "@/lib/gmail"

const MARKETING_KEYWORDS = [
  'promotion', 'sale', 'discount', 'offer', 'limited time', 
  'free', 'buy now', 'shop', 'order', 'deal', 'save',
  'new arrival', 'special offer', 'flash sale', 'bonus',
  'unsubscribe', 'newsletter', 'update', 'invitation'
]

const MARKETING_SENDERS = [
  'newsletter', 'marketing', 'promo', 'offers', 'deals',
  'advertising', 'campaign', 'subscribe'
]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated", details: "No access token found" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { from, dateFrom, dateTo, isMarketing } = body

    const gmail = getGmailClient(session.accessToken as string)

    let query: string

    if (isMarketing) {
      const parts: string[] = []
      
      parts.push('category:promotions')
      
      const keywordQueries = MARKETING_KEYWORDS.map(k => `(subject:${k} OR subject:${k.toUpperCase()})`)
      parts.push(`(${keywordQueries.join(' OR ')})`)
      
      if (dateFrom) {
        parts.push(`after:${formatDateForGmail(new Date(dateFrom))}`)
      }
      if (dateTo) {
        parts.push(`before:${formatDateForGmail(new Date(dateTo))}`)
      }
      
      query = parts.join(' ')
    } else {
      query = buildSearchQuery({
        from: from?.trim() || undefined,
        after: dateFrom ? formatDateForGmail(new Date(dateFrom)) : undefined,
        before: dateTo ? formatDateForGmail(new Date(dateTo)) : undefined,
      })
    }

    if (!query.trim()) {
      return NextResponse.json({ count: 0, query: '' })
    }

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

      const responseData = response.data as any
      if (responseData.error) {
        console.error("Gmail API error:", responseData.error)
        return NextResponse.json({ 
          error: responseData.error.message || "Gmail API error",
          details: responseData.error
        }, { status: 500 })
      }

      const messages = responseData.messages || []
      totalCount += messages.length
      pageToken = responseData.nextPageToken || undefined

      if (totalCount >= 500) break
    } while (pageToken && attempts < maxAttempts)

    return NextResponse.json({ count: totalCount, query, attempts })
  } catch (error: any) {
    console.error("Error counting emails:", error)
    return NextResponse.json({ 
      error: "Failed to count emails",
      details: error.message || String(error)
    }, { status: 500 })
  }
}
