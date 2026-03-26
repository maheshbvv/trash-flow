import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    await prisma.$transaction([
      prisma.operation.deleteMany({
        where: { user: { email: session.user.email } }
      }),
      prisma.schedule.deleteMany({
        where: { user: { email: session.user.email } }
      }),
      prisma.auditLog.deleteMany({
        where: { email: session.user.email }
      })
    ])

    return NextResponse.json({ 
      success: true, 
      message: "All data cleared. Your account and subscription remain active." 
    })
  } catch (error) {
    console.error("Error deleting data:", error)
    return NextResponse.json({ error: "Failed to delete data" }, { status: 500 })
  }
}
