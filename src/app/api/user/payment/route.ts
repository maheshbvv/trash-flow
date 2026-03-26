import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY
const CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET
const CASHFREE_ENV = 'prod'

interface CashfreePlan {
  id: string
  name: string
  amount: number
  description: string
}

const plans: CashfreePlan[] = [
  { id: 'yearly', name: 'Yearly', amount: 149900, description: 'Unlimited deletions' },
  { id: 'lifetime', name: 'Lifetime', amount: 300000, description: 'One-time payment' }
]

// Handle webhook test (GET request)
export async function GET() {
  return NextResponse.json({ status: "ok", message: "Webhook endpoint active" })
}

export async function POST(req: NextRequest) {
  // ✅ Read body ONCE as text, parse manually - fixes "body already read" error
  const bodyText = await req.text()
  const body = JSON.parse(bodyText)
  const { planId } = body

  // ✅ Get token from JWT - avoids getServerSession internal fetch issue in Next.js 16
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  
  if (!token?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {

    const plan = plans.find(p => p.id === planId)
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      console.error("Cashfree credentials not configured", { 
        appIdSet: !!CASHFREE_APP_ID, 
        secretKeySet: !!CASHFREE_SECRET_KEY,
        env: CASHFREE_ENV 
      })
      return NextResponse.json({ error: "Payment system not configured" }, { status: 500 })
    }

    const orderId = `TRASHFLOW_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const orderNote = `TrashFlow ${plan.name} - ${token.email}`
    const customerId = token.email.replace(/[^a-zA-Z0-9_-]/g, '_')

    const apiDomain = CASHFREE_ENV === 'prod' ? 'api.cashfree.com' : 'sandbox.cashfree.com'

    console.log("Creating order:", { 
      orderId, 
      plan: plan.name, 
      amount: plan.amount / 100, 
      customerId, 
      appId: CASHFREE_APP_ID ? 'SET' : 'NOT_SET',
      env: CASHFREE_ENV,
      apiDomain 
    })
    
    // Create payment order via Cashfree API
    const cashfreeResponse = await fetch(
      `https://${apiDomain}/pg/orders`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-client-id': CASHFREE_APP_ID!,
          'x-client-secret': CASHFREE_SECRET_KEY!,
          'x-api-version': '2025-01-01'
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: plan.amount / 100,
          order_currency: 'INR',
          order_note: orderNote,
          customer_details: {
            customer_id: customerId,
            customer_name: token.name || token.email.split('@')[0],
            customer_email: token.email,
            customer_phone: '9999999999'
          },
          order_meta: {
            return_url: `https://trashflow.pendura.in/dashboard?subscription=success&order_id=${orderId}`
          }
        })
      }
    )

    const responseText = await cashfreeResponse.text()
    console.log("Cashfree response:", cashfreeResponse.status, responseText)

    if (!cashfreeResponse.ok) {
      console.error("Cashfree API error:", cashfreeResponse.status, responseText)
      return NextResponse.json({ 
        error: "Failed to create payment order", 
        details: responseText,
        debug: { 
          status: cashfreeResponse.status, 
          appIdSet: !!CASHFREE_APP_ID,
          apiDomain
        }
      }, { status: 500 })
    }

    const orderData = await cashfreeResponse.json()
    const paymentSessionId = orderData?.payment_session_id

    if (!paymentSessionId) {
      return NextResponse.json({ error: "No payment session returned", details: orderData }, { status: 500 })
    }

    // Store order ID temporarily for webhook verification
    await prisma.user.update({
      where: { email: token.email },
      data: { lemonsqueezyId: orderId }
    })

    return NextResponse.json({ 
      paymentSessionId,
      orderId
    })
  } catch (error: any) {
    console.error("Payment error:", error, error?.message)
    return NextResponse.json({ error: "Payment processing failed", details: error?.message || String(error) }, { status: 500 })
  }
}

// Webhook handler for Cashfree
export async function PUT(req: NextRequest) {
  try {
    const body = await req.text()
    const timestamp = req.headers.get('x-webhook-timestamp')
    const signature = req.headers.get('x-webhook-signature')
    
    // Verify webhook signature using dedicated webhook secret
    const webhookSecret = CASHFREE_WEBHOOK_SECRET || CASHFREE_SECRET_KEY
    if (webhookSecret && signature && timestamp) {
      const crypto = require('crypto')
      const signatureString = timestamp + body
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signatureString)
        .digest('base64')
      
      if (signature !== expectedSignature) {
        console.error('Invalid Cashfree webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const data = JSON.parse(body)
    console.log("Cashfree webhook received:", JSON.stringify(data))
    
    // Handle payment notification
    if (data.order && data.order.status === 'PAID') {
      const orderId = data.order.order_id
      const orderAmount = data.order.order_amount

      // Find user by order ID (stored in lemonsqueezyId field)
      const user = await prisma.user.findFirst({
        where: { lemonsqueezyId: orderId }
      })

        if (user) {
        // Determine plan type based on amount (in paise)
        let subscriptionType = 'free'
        if (orderAmount === 1499) subscriptionType = 'yearly'
        else if (orderAmount === 3000) subscriptionType = 'lifetime'

        await prisma.user.update({
          where: { id: user.id },
          data: {
            isPaid: true,
            subscriptionType,
            lemonsqueezyId: `cf_${orderId}` // Mark as processed
          }
        })

        console.log(`Payment confirmed for user ${user.email}: ${subscriptionType}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 })
  }
}