import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const LEMON_API_KEY = process.env.LEMON_API_KEY

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if subscription is still active via LemonSqueezy API
    if (user.lemonsqueezyId && user.subscriptionType !== 'free') {
      try {
        const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${user.lemonsqueezyId}`, {
          headers: {
            'Authorization': `Bearer ${LEMON_API_KEY}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const status = data.data?.attributes?.status
          
          // Update user status if subscription is cancelled/chexpayment_failed
          if (status === 'cancelled' || status === 'past_due') {
            await prisma.user.update({
              where: { email: session.user.email },
              data: { 
                isPaid: false,
                subscriptionType: 'free'
              }
            })
          }
        }
      } catch (error) {
        console.error("Error checking subscription:", error)
      }
    }

    const limits = {
      free: { maxDeletions: 500, name: 'Free Trial' },
      yearly: { maxDeletions: -1, name: 'Yearly' },
      lifetime: { maxDeletions: -1, name: 'Lifetime' }
    }

    const currentPlan = limits[user.subscriptionType as keyof typeof limits] || limits.free

    return NextResponse.json({
      subscriptionType: user.subscriptionType,
      isPaid: user.isPaid,
      isTester: user.isTester,
      deletionsUsed: user.deletionsUsed,
      maxDeletions: currentPlan.maxDeletions,
      planName: currentPlan.name,
      lemonsqueezyId: user.lemonsqueezyId
    })
  } catch (error) {
    console.error("Error fetching subscription:", error)
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { productId } = body

    // Product IDs from LemonSqueezy
    const products: Record<string, { type: string; name: string }> = {
      '921198': { type: 'free', name: 'Free Trial' },
      '921195': { type: 'yearly', name: 'Yearly' },
      '921200': { type: 'lifetime', name: 'Lifetime' }
    }

    const product = products[productId]
    if (!product) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 })
    }

    // For free trial, just update the user
    if (productId === '921198') {
      await prisma.user.update({
        where: { email: session.user.email },
        data: {
          isPaid: false,
          subscriptionType: 'free'
        }
      })
      return NextResponse.json({ success: true, message: "Free trial activated" })
    }

    // Use direct buy links from LemonSqueezy
    const buyLinks: Record<string, string> = {
      '921195': 'https://trashflow.lemonsqueezy.com/checkout/buy/921195',
      '921200': 'https://trashflow.lemonsqueezy.com/checkout/buy/921200'
    }
    
    const checkoutUrl = buyLinks[productId]

    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    console.error("Error creating checkout:", error)
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 })
  }
}

// Webhook handler for LemonSqueezy
export async function PUT(req: NextRequest) {
  try {
    const signature = req.headers.get('x-signature')
    const body = await req.text()
    
    // Verify webhook signature
    if (process.env.LEMON_WEBHOOK_SECRET) {
      const crypto = require('crypto')
      const hmac = crypto.createHmac('sha256', process.env.LEMON_WEBHOOK_SECRET)
      const digest = hmac.update(body).digest('hex')
      
      if (signature !== digest) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
    
    const data = JSON.parse(body)
    const event_name = data.meta?.event_name || data.meta?.event_name
    
    if (!event_name) {
      return NextResponse.json({ received: true })
    }

    if (event_name === 'subscription_created' || event_name === 'subscription_updated') {
      const userEmail = data.attributes?.custom_data?.user_email
      const subscriptionId = data.id
      const status = data.attributes?.status

      if (userEmail) {
        let subscriptionType = 'free'
        const variantId = data.attributes?.variant_id?.toString()
        
        if (variantId === '921195') subscriptionType = 'yearly'
        else if (variantId === '921200') subscriptionType = 'lifetime'

        const isPaid = status === 'active' || status === 'trialing'

        await prisma.user.update({
          where: { email: userEmail },
          data: {
            subscriptionType,
            isPaid,
            lemonsqueezyId: subscriptionId.toString()
          }
        })
      }
    }

    if (event_name === 'subscription_cancelled' || event_name === 'subscription_expired') {
      const userEmail = data.attributes?.custom_data?.user_email
      
      if (userEmail) {
        await prisma.user.update({
          where: { email: userEmail },
          data: {
            isPaid: false,
            subscriptionType: 'free'
          }
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 })
  }
}
