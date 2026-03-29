import { NextRequest, NextResponse } from "next/server"
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
      select: {
        dailyReport: true,
        criticalAlerts: true
      }
    })

    return NextResponse.json({
      dailyReport: user?.dailyReport ?? true,
      criticalAlerts: user?.criticalAlerts ?? true
    })
  } catch (error) {
    console.error("Error fetching preferences:", error)
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { dailyReport, criticalAlerts } = body

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        dailyReport: dailyReport !== undefined ? dailyReport : undefined,
        criticalAlerts: criticalAlerts !== undefined ? criticalAlerts : undefined
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating preferences:", error)
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 })
  }
}
