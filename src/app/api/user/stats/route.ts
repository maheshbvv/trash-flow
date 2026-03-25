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
        recentOperations: []
      })
    }

    const deleteOperations = user.operations.filter(op => op.type === 'delete')
    const searchOperations = user.operations.filter(op => op.type === 'search')
    
    const totalDeleted = deleteOperations.reduce((sum, op) => sum + op.emailCount, 0)

    return NextResponse.json({
      totalDeleted,
      totalOperations: user.operations.length,
      searchCount: searchOperations.length,
      deleteCount: deleteOperations.length,
      recentOperations: user.operations.slice(0, 10),
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
