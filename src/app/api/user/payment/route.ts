import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// ─── Config ───────────────────────────────────────────────────────────────────

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY
const CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET

const API_DOMAIN = "api.cashfree.com"

// ─── Plans ────────────────────────────────────────────────────────────────────

interface CashfreePlan {
  id: string
  name: string
  /** Amount in paise (e.g. 149900 = ₹1499) */
  amountPaise: number
  /** Amount in rupees — what Cashfree actually sends back (e.g. 1499.00) */
  amountRupees: number
  description: string
}

const PLANS: CashfreePlan[] = [
  {
    id: "yearly",
    name: "Yearly",
    amountPaise: 149900,
    amountRupees: 1499.0,
    description: "Unlimited deletions",
  },
  {
    id: "lifetime",
    name: "Lifetime",
    amountPaise: 449900,
    amountRupees: 4499.0,
    description: "One-time payment",
  },
]

// ─── GET — health check ───────────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({ status: "ok", message: "Webhook endpoint active" })
}

// ─── HEAD — for webhook testing ────────────────────────────────────────────────
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

// ─── PATCH — verify and update payment ────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  
  if (!token?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    }

    // Get user by order ID
    const user = await prisma.user.findFirst({
      where: { lemonsqueezyId: orderId },
    })

    if (!user) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Verify payment with Cashfree API
    const cashfreeResponse = await fetch(
      `https://${API_DOMAIN}/pg/orders/${orderId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-client-id': CASHFREE_APP_ID!,
          'x-client-secret': CASHFREE_SECRET_KEY!,
          'x-api-version': '2025-01-01'
        },
      }
    )

    if (!cashfreeResponse.ok) {
      console.error("Cashfree verification failed:", cashfreeResponse.status)
      return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
    }

    const orderData = await cashfreeResponse.json()
    const orderStatus = orderData.order?.status

    console.log("Order status:", orderStatus, "for order:", orderId)

    // If already PAID and user not updated, update now
    if (orderStatus === "PAID") {
      const orderAmount = orderData.order?.order_amount
      
      const matchedPlan = PLANS.find(p => p.amountRupees === orderAmount)

      if (matchedPlan && user.subscriptionType !== 'yearly' && user.subscriptionType !== 'lifetime') {
        let subscriptionExpiryDate: Date | null = null

        if (matchedPlan.id === "yearly") {
          subscriptionExpiryDate = new Date()
          subscriptionExpiryDate.setFullYear(subscriptionExpiryDate.getFullYear() + 1)
        } else if (matchedPlan.id === "lifetime") {
          subscriptionExpiryDate = new Date()
          subscriptionExpiryDate.setFullYear(subscriptionExpiryDate.getFullYear() + 100)
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            isPaid: true,
            subscriptionType: matchedPlan.id,
            subscriptionStartDate: new Date(),
            subscriptionExpiryDate,
            lemonsqueezyId: `cf_${orderId}`
          },
        })

        console.log(`Payment verified and activated for user ${user.email}: ${matchedPlan.id}`)
        
        return NextResponse.json({ 
          success: true, 
          subscriptionType: matchedPlan.id,
          message: "Payment verified and subscription activated" 
        })
      }

      return NextResponse.json({ 
        success: true, 
        alreadyUpdated: true,
        subscriptionType: user.subscriptionType 
      })
    }

    return NextResponse.json({ 
      success: false, 
      status: orderStatus,
      message: "Payment not completed" 
    })

  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}

// ─── POST — create payment order ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Clone the request BEFORE passing to getToken.
  //    next-auth's getToken() can consume the body stream internally;
  //    cloning ensures we still have a fresh body to read afterwards.
  const clonedReq = req.clone()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // 2. Validate Cashfree credentials early so we fail fast.
  if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
    console.error("Cashfree credentials not configured", {
      appIdSet: !!CASHFREE_APP_ID,
      secretKeySet: !!CASHFREE_SECRET_KEY,

    })
    return NextResponse.json(
      { error: "Payment system not configured" },
      { status: 500 }
    )
  }

  try {
    // 3. Read body from the clone — never from the original req.
    const bodyText = await clonedReq.text()
    const body = JSON.parse(bodyText)
    const { planId } = body

    const plan = PLANS.find((p) => p.id === planId)
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const orderId = `TRASHFLOW_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`
    const orderNote = `TrashFlow ${plan.name} - ${token.email}`
    const customerId = token.email!.replace(/[^a-zA-Z0-9_-]/g, "_")

    console.log("Creating Cashfree order:", {
      orderId,
      plan: plan.name,
      amountRupees: plan.amountPaise / 100,
      customerId,

      apiDomain: API_DOMAIN,
    })

    // 4. Call Cashfree API.
    const cashfreeResponse = await fetch(`https://${API_DOMAIN}/pg/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "x-api-version": "2025-01-01",
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: plan.amountPaise / 100, // Cashfree expects rupees
        order_currency: "INR",
        order_note: orderNote,
        customer_details: {
          customer_id: customerId,
          customer_name: token.name ?? token.email!.split("@")[0],
          customer_email: token.email,
          customer_phone: "9999999999",
        },
        order_meta: {
          return_url: `https://trashflow.pendura.in/dashboard?order_id=${orderId}&order_status={payment_status}`,
        },
      }),
    })

    // 5. Read the Cashfree response ONCE as text, then parse — never call
    //    both .text() and .json() on the same Response object.
    const responseText = await cashfreeResponse.text()
    console.log("Cashfree response:", cashfreeResponse.status, responseText)

    if (!cashfreeResponse.ok) {
      console.error(
        "Cashfree API error:",
        cashfreeResponse.status,
        responseText
      )
      return NextResponse.json(
        {
          error: "Failed to create payment order",
          details: responseText,
          debug: {
            status: cashfreeResponse.status,
            appIdSet: !!CASHFREE_APP_ID,
            apiDomain: API_DOMAIN,
          },
        },
        { status: 500 }
      )
    }

    const orderData = JSON.parse(responseText)
    const paymentSessionId: string | undefined = orderData?.payment_session_id

    if (!paymentSessionId) {
      return NextResponse.json(
        { error: "No payment session returned", details: orderData },
        { status: 500 }
      )
    }

    // Store the order ID so the webhook can look up this user later.
    await prisma.user.update({
      where: { email: token.email! },
      data: { lemonsqueezyId: orderId },
    })

    return NextResponse.json({ paymentSessionId, orderId })
  } catch (error: any) {
    console.error("Payment error:", error)
    return NextResponse.json(
      {
        error: "Payment processing failed",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    )
  }
}

// ─── PUT — Cashfree webhook ───────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const body = await req.text()
    const timestamp = req.headers.get("x-webhook-timestamp")
    const signature = req.headers.get("x-webhook-signature")

    // Verify HMAC-SHA256 signature sent by Cashfree.
    const webhookSecret = CASHFREE_WEBHOOK_SECRET ?? CASHFREE_SECRET_KEY
    if (webhookSecret && signature && timestamp) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(timestamp + body)
        .digest("base64")

      if (signature !== expectedSignature) {
        console.error("Invalid Cashfree webhook signature")
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        )
      }
    }

    const data = JSON.parse(body)
    console.log("Cashfree webhook received:", JSON.stringify(data))

    // Handle ping/test event
    if (data.event === "ping" || data.event === "webhook_test") {
      console.log("Webhook test received")
      return NextResponse.json({ received: true, message: "Webhook test successful" })
    }

    const orderId = data.order?.order_id || data.order_id
    const customerEmail = data.order?.customer_details?.customer_email || data.customer_email
    
    // Helper to find user by order ID or email
    const findUser = async () => {
      let user = await prisma.user.findFirst({
        where: { lemonsqueezyId: orderId },
      })
      
      if (!user && customerEmail) {
        // Try finding by email
        user = await prisma.user.findUnique({
          where: { email: customerEmail },
        })
      }
      
      return user
    }

    // Handle PAID event
    if (data.order?.status === "PAID" || data.event === "payment_succeeded") {
      const orderAmountRupees: number = data.order?.order_amount || data.order_amount

      const matchedPlan = PLANS.find(
        (p) => p.amountRupees === orderAmountRupees
      )

      const user = await findUser()

      if (user && matchedPlan) {
        let subscriptionExpiryDate: Date | null = null

        if (matchedPlan.id === "yearly") {
          subscriptionExpiryDate = new Date()
          subscriptionExpiryDate.setFullYear(
            subscriptionExpiryDate.getFullYear() + 1
          )
        } else if (matchedPlan.id === "lifetime") {
          subscriptionExpiryDate = new Date()
          subscriptionExpiryDate.setFullYear(
            subscriptionExpiryDate.getFullYear() + 100
          )
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            isPaid: true,
            subscriptionType: matchedPlan.id,
            subscriptionStartDate: new Date(),
            subscriptionExpiryDate,
            lemonsqueezyId: `cf_${orderId}`,
          },
        })

        console.log(
          `Payment confirmed for ${user.email}: ${matchedPlan.id}, expires: ${subscriptionExpiryDate}`
        )
      } else {
        console.warn("Webhook PAID event — user or plan not found:", {
          orderId,
          orderAmountRupees,
          userFound: !!user,
          planFound: !!matchedPlan,
        })
      }
    }
    
    // Handle REFUND event
    else if (data.event === "refund_processed" || data.order?.status === "REFUNDED") {
      const user = await findUser()
      
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isPaid: false,
            subscriptionType: 'free',
          },
        })
        
        console.log(`Refund processed for ${user.email}`)
      }
    }
    
    // Handle CANCELLED event
    else if (data.event === "subscription_cancelled" || data.order?.status === "CANCELLED") {
      const user = await findUser()
      
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isPaid: false,
            subscriptionType: 'free',
          },
        })
        
        console.log(`Subscription cancelled for ${user.email}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 })
  }
}