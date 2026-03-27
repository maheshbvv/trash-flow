import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getGmailClient, buildSearchQuery, formatDateForGmail } from "@/lib/gmail"

const MARKETING_KEYWORDS = [
  'promotion', 'sale', 'discount', 'offer', 'deal', 'free', 'shop', 'order'
]

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const schedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
      },
      include: { user: true }
    })

    if (schedules.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No active schedules" })
    }

    let processed = 0
    let trashed = 0
    const errors: string[] = []
    const startTime = Date.now()
    const MAX_RUNTIME = 25000 // 25 seconds max

    for (const schedule of schedules) {
      // Check timeout
      if (Date.now() - startTime > MAX_RUNTIME) {
        errors.push("Runtime limit reached, stopping execution")
        break
      }
      try {
        const shouldRun = checkScheduleFrequency(schedule.frequency, schedule.lastRunAt, now)
        if (!shouldRun) continue

        if (!schedule.user) {
          errors.push(`User not found for schedule ${schedule.id}`)
          continue
        }

        let accessToken = schedule.user.accessToken
        const tokenExpiry = schedule.user.tokenExpiry

        if (!accessToken || (tokenExpiry && new Date(tokenExpiry) < new Date(Date.now() - 5 * 60 * 1000))) {
          if (schedule.user.refreshToken) {
            const tokens = await refreshGoogleToken(schedule.user.refreshToken, schedule.user.email)
            if (!tokens) {
              errors.push(`Failed to refresh token for ${schedule.user.email}`)
              continue
            }
            accessToken = tokens.accessToken
          } else {
            errors.push(`No valid token for ${schedule.user.email}`)
            continue
          }
        }

        const gmail = getGmailClient(accessToken!)
        
        let query: string
        if (schedule.isMarketing) {
          const subjectKeywords = MARKETING_KEYWORDS
          const senderKeywords = ['newsletter', 'marketing', 'promo', 'offers']
          const subjectQueries = subjectKeywords.map(k => `subject:${k}`)
          const senderQueries = senderKeywords.map(k => `from:${k}`)
          query = `(${subjectQueries.join(' OR ')} OR ${senderQueries.join(' OR ')} OR category:promotions)`
          
          if (schedule.dateFrom) {
            query += ` after:${formatDateForGmail(new Date(schedule.dateFrom))}`
          }
          if (schedule.dateTo) {
            query += ` before:${formatDateForGmail(new Date(schedule.dateTo))}`
          }
        } else {
          query = buildSearchQuery({
            from: schedule.fromEmail || undefined,
            after: schedule.dateFrom ? formatDateForGmail(new Date(schedule.dateFrom)) : undefined,
            before: schedule.dateTo ? formatDateForGmail(new Date(schedule.dateTo)) : undefined,
          })
        }

        if (!query.trim()) continue

        const maxEmails = 500
        let totalTrashed = 0
        let pageToken: string | undefined

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

        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: now }
        })

        await prisma.operation.create({
          data: {
            userId: schedule.userId,
            type: 'delete',
            filters: JSON.stringify({ 
              scheduleName: schedule.name,
              fromEmail: schedule.fromEmail,
              isMarketing: schedule.isMarketing,
              dateFrom: schedule.dateFrom,
              dateTo: schedule.dateTo
            }),
            emailCount: totalTrashed,
          }
        })

        processed++
        trashed += totalTrashed
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error)
        errors.push(`Schedule ${schedule.name}: ${String(error)}`)
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed,
      trashed,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error("Cron error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function checkScheduleFrequency(frequency: string, lastRunAt: Date | null, now: Date): boolean {
  if (!lastRunAt) return true

  const diffMs = now.getTime() - lastRunAt.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  switch (frequency) {
    case 'hourly':
      return diffHours >= 1
    case 'daily':
      return diffDays >= 1
    case 'weekly':
      return diffDays >= 7
    case 'monthly':
      return diffDays >= 30
    default:
      return false
  }
}

async function refreshGoogleToken(refreshToken: string, email: string) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      console.error('Failed to refresh token for', email)
      return null
    }

    const tokens = await response.json()
    const accessToken = tokens.access_token
    const expiresIn = tokens.expires_in
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000)

    await prisma.user.update({
      where: { email },
      data: {
        accessToken,
        tokenExpiry,
      }
    })

    return { accessToken }
  } catch (error) {
    console.error('Token refresh error:', error)
    return null
  }
}
