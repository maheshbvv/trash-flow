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

    const limits: Record<string, { maxDeletions: number, name: string }> = {
      free: { maxDeletions: 500, name: 'Free Trial' },
      yearly: { maxDeletions: -1, name: 'Yearly' },
      lifetime: { maxDeletions: -1, name: 'Lifetime' }
    }

    const currentPlan = limits[user.subscriptionType] || limits.free

    const isTester = user.isTester === true
    const effectiveMaxDeletions = isTester ? -1 : currentPlan.maxDeletions
    const effectivePlanName = isTester ? 'Tester' : currentPlan.name
    
    // Check if subscription is expired
    const now = new Date()
    const isExpired = user.subscriptionType !== 'free' && 
                      user.subscriptionType !== 'lifetime' && 
                      user.subscriptionExpiryDate && 
                      new Date(user.subscriptionExpiryDate) < now

    return NextResponse.json({
      subscriptionType: user.subscriptionType,
      isPaid: user.isPaid,
      isTester: isTester,
      isExpired: isExpired,
      deletionsUsed: user.deletionsUsed,
      maxDeletions: effectiveMaxDeletions,
      planName: effectivePlanName,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionExpiryDate: user.subscriptionExpiryDate,
      lemonsqueezyId: user.lemonsqueezyId,
      amountPaid: user.amountPaid
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
    const { productId, verifySubscription } = body

    // If verifySubscription is true, check and update subscription status
    if (verifySubscription) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const orderId = user.lemonsqueezyId
      if (!orderId) {
        return NextResponse.json({ 
          subscription: {
            isPaid: user.isPaid,
            subscriptionType: user.subscriptionType,
            subscriptionExpiryDate: user.subscriptionExpiryDate
          },
          message: "No payment order found"
        })
      }

      // If already processed as 'yearly' or 'lifetime', just return current status
      if ((user.subscriptionType === 'yearly' || user.subscriptionType === 'lifetime') && user.isPaid) {
        return NextResponse.json({ 
          subscription: {
            isPaid: user.isPaid,
            subscriptionType: user.subscriptionType,
            subscriptionExpiryDate: user.subscriptionExpiryDate
          },
          message: "Subscription already active"
        })
      }

      // If orderId starts with cf_ but subscription is still free, something went wrong - verify again
      if (orderId.startsWith('cf_') && user.subscriptionType === 'free') {
        console.log("Order marked as cf_ but subscription is still free, re-verifying...")
      }

      const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID
      const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY
      
      console.log("Verifying order:", orderId, "for user:", session.user.email)

      if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
        return NextResponse.json({ error: "Cashfree not configured" }, { status: 500 })
      }

      // Try to get order by ID first
      let orderData: any = null
      
      try {
        const cashfreeResponse = await fetch(
          `https://api.cashfree.com/pg/orders/${orderId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'x-client-id': CASHFREE_APP_ID,
              'x-client-secret': CASHFREE_SECRET_KEY,
              'x-api-version': '2025-01-01'
            },
          }
        )

        console.log("Cashfree response status:", cashfreeResponse.status)

        if (!cashfreeResponse.ok) {
          const errorText = await cashfreeResponse.text()
          console.error("Cashfree verification failed:", cashfreeResponse.status, errorText)
          
          // Try searching by customer email as fallback
          console.log("Trying search by customer email...")
          const searchResponse = await fetch(
            `https://api.cashfree.com/pg/orders?customer_id=${encodeURIComponent(session.user.email.replace(/[^a-zA-Z0-9_-]/g, '_'))}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-client-id': CASHFREE_APP_ID,
                'x-client-secret': CASHFREE_SECRET_KEY,
                'x-api-version': '2025-01-01'
              },
            }
          )
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            console.log("Search response:", JSON.stringify(searchData))
            
            // Find the most recent PAID order
            const orders = searchData.items || []
            const paidOrder = orders.find((o: any) => o.order_status === 'PAID')
            
            if (paidOrder) {
              orderData = { order: paidOrder }
              console.log("Found paid order:", paidOrder.order_id)
            } else {
              return NextResponse.json({ message: "No paid orders found for your email" }, { status: 200 })
            }
          } else {
            return NextResponse.json({ error: "Failed to verify payment", details: errorText }, { status: 500 })
          }
        } else {
          orderData = await cashfreeResponse.json()
        }
      } catch (err) {
        console.error("Error fetching order:", err)
        return NextResponse.json({ error: "Error verifying payment" }, { status: 500 })
      }

      // Get order status
      const orderStatus = orderData?.order?.status || orderData?.order_status || ''
      console.log("Order status extracted:", orderStatus)

      if (orderStatus === "PAID") {
        // Try different response structures for amount
        const orderAmount = orderData?.order?.order_amount ?? orderData?.order_amount ?? orderData?.order?.order_amount ?? 0
        console.log("Order amount:", orderAmount, "type:", typeof orderAmount)
        
        let subscriptionType = 'free'
        let subscriptionExpiryDate: Date | null = null

        if (orderAmount === 1499) {
          subscriptionType = 'yearly'
          subscriptionExpiryDate = new Date()
          subscriptionExpiryDate.setFullYear(subscriptionExpiryDate.getFullYear() + 1)
        } else if (orderAmount === 4499) {
          subscriptionType = 'lifetime'
          subscriptionExpiryDate = new Date()
          subscriptionExpiryDate.setFullYear(subscriptionExpiryDate.getFullYear() + 100)
        }

        // Get the actual order ID from the response
        const actualOrderId = orderData?.order?.order_id || orderData?.order_id || orderId
        
        await prisma.user.update({
          where: { email: session.user.email },
          data: {
            isPaid: true,
            subscriptionType,
            subscriptionStartDate: new Date(),
            subscriptionExpiryDate,
            lemonsqueezyId: `cf_${actualOrderId}`,
            amountPaid: orderAmount
          }
        })

        return NextResponse.json({ 
          success: true,
          subscription: {
            isPaid: true,
            subscriptionType,
            subscriptionExpiryDate
          },
          message: `Subscription activated: ${subscriptionType}`
        })
      }

      return NextResponse.json({ 
        subscription: {
          isPaid: user.isPaid,
          subscriptionType: user.subscriptionType,
          subscriptionExpiryDate: user.subscriptionExpiryDate
        },
        message: `Payment status: ${orderStatus}`
      })
    }

    // Original checkout flow
    const products: Record<string, { type: string; name: string }> = {
      '921198': { type: 'free', name: 'Free Trial' },
      '921195': { type: 'yearly', name: 'Yearly' },
      '921200': { type: 'lifetime', name: 'Lifetime' }
    }

    const product = products[productId]
    if (!product) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 })
    }

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

    const buyLinks: Record<string, string> = {
      '921195': 'https://trashflow.lemonsqueezy.com/checkout/buy/921195',
      '921200': 'https://trashflow.lemonsqueezy.com/checkout/buy/921200'
    }
    
    const checkoutUrl = buyLinks[productId]

    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    console.error("Error in subscription POST:", error)
    return NextResponse.json({ error: "Request failed" }, { status: 500 })
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
