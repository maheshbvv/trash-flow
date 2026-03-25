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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
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
        from,
        after: dateFrom ? formatDateForGmail(new Date(dateFrom)) : undefined,
        before: dateTo ? formatDateForGmail(new Date(dateTo)) : undefined,
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

      const messages = response.data.messages || []
      
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

      pageToken = response.data.nextPageToken || undefined
      
      if (totalTrashed >= maxEmails) break
      
    } while (pageToken)

    return NextResponse.json({ 
      success: true, 
      trashed: totalTrashed,
      message: totalTrashed >= maxEmails 
        ? `Trashed ${totalTrashed} emails (max limit reached)` 
        : `Successfully trashed ${totalTrashed} emails`
    })
  } catch (error) {
    console.error("Error trashing emails:", error)
    return NextResponse.json({ error: "Failed to trash emails" }, { status: 500 })
  }
}
