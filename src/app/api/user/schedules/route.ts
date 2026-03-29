import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getGmailClient, buildSearchQuery, formatDateForGmail } from "@/lib/gmail"

const MARKETING_KEYWORDS = ['promotion', 'sale', 'discount', 'offer', 'deal', 'free', 'shop']

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        schedules: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ schedules: [] })
    }

    return NextResponse.json({ schedules: user.schedules })
  } catch (error) {
    console.error("Error fetching schedules:", error)
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, fromEmail, dateFrom, dateTo, isMarketing, frequency } = body

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user is allowed to create schedules
    const isTester = user.isTester === true
    const now = new Date()
    const isExpired = user.subscriptionType !== 'free' && 
                      user.subscriptionType !== 'lifetime' && 
                      user.subscriptionExpiryDate && 
                      new Date(user.subscriptionExpiryDate) < now
    
    const canCreateSchedule = isTester || (user.isPaid && !isExpired)
    
    if (!canCreateSchedule) {
      return NextResponse.json({ 
        error: "Scheduling requires a paid subscription. Upgrade to create automated cleanup schedules.",
        upgradeRequired: true
      }, { status: 403 })
    }

    const schedule = await prisma.schedule.create({
      data: {
        userId: user.id,
        name,
        fromEmail: fromEmail || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        isMarketing: isMarketing || false,
        frequency: frequency || 'weekly',
        isActive: true,
      }
    })

    return NextResponse.json({ success: true, schedule })
  } catch (error) {
    console.error("Error creating schedule:", error)
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "Schedule ID required" }, { status: 400 })
    }

    await prisma.schedule.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { scheduleId } = body

    if (!scheduleId) {
      return NextResponse.json({ error: "Schedule ID required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, userId: user.id },
      include: { user: true }
    })

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    let accessToken = user.accessToken
    const tokenExpiry = user.tokenExpiry

    if (!accessToken || (tokenExpiry && new Date(tokenExpiry) < new Date(Date.now() - 5 * 60 * 1000))) {
      if (user.refreshToken) {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: user.refreshToken,
            grant_type: 'refresh_token',
          }),
        })
        const tokens = await response.json()
        accessToken = tokens.access_token
        const tokenExpiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000)
        await prisma.user.update({
          where: { email: session.user.email },
          data: { accessToken, tokenExpiry },
        })
      } else {
        return NextResponse.json({ error: "No valid token" }, { status: 401 })
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: "No valid access token" }, { status: 401 })
    }

    const gmail = getGmailClient(accessToken)
    
    let query: string
    if (schedule.isMarketing) {
      const subjectKeywords = MARKETING_KEYWORDS
      const senderKeywords = ['newsletter', 'marketing', 'promo', 'offers']
      const subjectQueries = subjectKeywords.map(k => `subject:${k}`)
      const senderQueries = senderKeywords.map(k => `from:${k}`)
      query = `(${subjectQueries.join(' OR ')} OR ${senderQueries.join(' OR ')} OR category:promotions)`
      if (schedule.dateFrom) query += ` after:${formatDateForGmail(new Date(schedule.dateFrom))}`
      if (schedule.dateTo) query += ` before:${formatDateForGmail(new Date(schedule.dateTo))}`
    } else {
      query = buildSearchQuery({
        from: schedule.fromEmail || undefined,
        after: schedule.dateFrom ? formatDateForGmail(new Date(schedule.dateFrom)) : undefined,
        before: schedule.dateTo ? formatDateForGmail(new Date(schedule.dateTo)) : undefined,
      })
    }

    if (!query.trim()) {
      return NextResponse.json({ error: "No valid query" }, { status: 400 })
    }

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
          await gmail.users.messages.trash({ userId: 'me', id: message.id })
          totalTrashed++
        }
      }

      pageToken = response.data.nextPageToken as string | undefined
      if (totalTrashed >= maxEmails) break
    } while (pageToken)

    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { lastRunAt: new Date() }
    })

    await prisma.operation.create({
      data: {
        userId: user.id,
        type: 'delete',
        filters: JSON.stringify({ 
          scheduleName: schedule.name,
          fromEmail: schedule.fromEmail,
          isMarketing: schedule.isMarketing,
          source: 'manual-run'
        }),
        emailCount: totalTrashed,
      }
    })

    return NextResponse.json({ success: true, trashed: totalTrashed })
  } catch (error) {
    console.error("Error running schedule:", error)
    return NextResponse.json({ error: "Failed to run schedule" }, { status: 500 })
  }
}
