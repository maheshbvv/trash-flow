import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        operations: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ 
        totalDeleted: 0, 
        totalOperations: 0,
        searchCount: 0,
        deleteCount: 0,
        recentOperations: [],
        volumeData: [],
        peakDay: null,
      })
    }

    const deleteOperations = user.operations.filter(op => op.type === 'delete')
    const searchOperations = user.operations.filter(op => op.type === 'search')
    
    const totalDeleted = deleteOperations.reduce((sum, op) => sum + op.emailCount, 0)

    // Calculate volume by day for last 7 days
    const volumeByDay: Record<string, number> = {}
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayCounts: Record<string, number> = { Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 }

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split('T')[0]
      volumeByDay[key] = 0
    }

    // Aggregate delete operations by day
    deleteOperations.forEach(op => {
      const date = new Date(op.createdAt).toISOString().split('T')[0]
      if (volumeByDay.hasOwnProperty(date)) {
        volumeByDay[date] += op.emailCount
      }
      const dayName = dayNames[new Date(op.createdAt).getDay()]
      dayCounts[dayName] += op.emailCount
    })

    // Convert to array for chart
    const volumeData = Object.entries(volumeByDay).map(([date, count]) => {
      const d = new Date(date)
      return {
        date,
        day: dayNames[d.getDay()],
        count,
      }
    })

    // Find peak day
    let peakDay = null
    let maxCount = 0
    Object.entries(dayCounts).forEach(([day, count]) => {
      if (count > maxCount) {
        maxCount = count
        peakDay = day
      }
    })

    return NextResponse.json({
      totalDeleted,
      totalOperations: user.operations.length,
      searchCount: searchOperations.length,
      deleteCount: deleteOperations.length,
      recentOperations: user.operations.slice(0, 10),
      volumeData,
      peakDay,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
