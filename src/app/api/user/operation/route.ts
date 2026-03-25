import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { type, filters, emailCount } = body

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const operation = await prisma.operation.create({
      data: {
        userId: user.id,
        type,
        filters,
        emailCount: emailCount || 0,
      }
    })

    return NextResponse.json({ success: true, operation })
  } catch (error) {
    console.error("Error creating operation:", error)
    return NextResponse.json({ error: "Failed to create operation" }, { status: 500 })
  }
}
