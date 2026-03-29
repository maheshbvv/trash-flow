import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY
const CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET

const PLANS = [
  { id: "yearly", name: "Yearly", amountRupees: 1499 },
  { id: "lifetime", name: "Lifetime", amountRupees: 4499 },
]

// Handle all webhook events
export async function POST(req: NextRequest) {
  try {
    // Quick check for test events first - before any heavy processing
    const contentType = req.headers.get("content-type") || ""
    
    // Handle test/ping events immediately without verification
    if (contentType.includes("application/json")) {
      const body = await req.text()
      
      // Try to parse and check for test events
      try {
        const data = JSON.parse(body)
        const eventType = data.event || data.type || data.event_type
        
        // Handle test events quickly
        if (eventType === "ping" || eventType === "webhook_test" || eventType === "test") {
          console.log("Webhook test event received")
          return NextResponse.json({ received: true, status: "ok" })
        }
      } catch (e) {
        // If can't parse, continue with normal processing
      }
      
      // Re-create request body for further processing
      const { NextRequest: NextReq } = require("next/server")
    }
    
    const body = await req.text()
    const timestamp = req.headers.get("x-webhook-timestamp")
    const signature = req.headers.get("x-webhook-signature")

    // Verify webhook signature (skip for test events)
    const webhookSecret = CASHFREE_WEBHOOK_SECRET ?? CASHFREE_SECRET_KEY
    if (webhookSecret && signature && timestamp) {
      try {
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(timestamp + body)
          .digest("base64")

        if (signature !== expectedSignature) {
          console.error("Invalid webhook signature")
        }
      } catch (e) {
        console.error("Signature verification error:", e)
      }
    }

    const data = JSON.parse(body)
    console.log("Webhook received:", data.event || data.type || "unknown")

    // Handle test/ping
    const eventType = data.event || data.type || data.event_type
    if (eventType === "ping" || eventType === "webhook_test" || eventType === "test") {
      return NextResponse.json({ received: true, status: "ok" })
    }

    const orderId = data.order?.order_id || data.order_id
    const customerEmail = data.order?.customer_details?.customer_email || data.customer_email

    const findUser = async () => {
      let user = await prisma.user.findFirst({
        where: { lemonsqueezyId: orderId },
      })
      if (!user && customerEmail) {
        user = await prisma.user.findUnique({
          where: { email: customerEmail },
        })
      }
      return user
    }

    // Payment successful
    if (data.order?.status === "PAID" || eventType === "payment_succeeded") {
      const orderAmount = data.order?.order_amount || data.order_amount
      const matchedPlan = PLANS.find(p => p.amountRupees === orderAmount)
      const user = await findUser()

      if (user && matchedPlan) {
        const expiry = new Date()
        if (matchedPlan.id === "yearly") {
          expiry.setFullYear(expiry.getFullYear() + 1)
        } else {
          expiry.setFullYear(expiry.getFullYear() + 100) // lifetime
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            isPaid: true,
            subscriptionType: matchedPlan.id,
            subscriptionStartDate: new Date(),
            subscriptionExpiryDate: expiry,
            lemonsqueezyId: `cf_${orderId}`,
            amountPaid: orderAmount,
          },
        })
        console.log(`Payment confirmed: ${user.email} - ${matchedPlan.name}`)
      }
    }

    // Refund
    else if (eventType === "refund_processed" || data.order?.status === "REFUNDED") {
      const user = await findUser()
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isPaid: false, subscriptionType: 'free' },
        })
        console.log(`Refund processed: ${user.email}`)
      }
    }

    // Subscription cancelled
    else if (eventType === "subscription_cancelled" || eventType === "subscription_canceled") {
      const user = await findUser()
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isPaid: false, subscriptionType: 'free' },
        })
        console.log(`Subscription cancelled: ${user.email}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ received: true })
  }
}

// Handle HEAD for webhook testing
export async function HEAD() {
  console.log("HEAD request received for webhook test")
  return new Response(null, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Allow': 'GET, POST, HEAD, OPTIONS'
    }
  })
}

// Handle GET for health check
export async function GET() {
  console.log("GET request received for webhook test")
  return Response.json({ 
    status: "ok",
    message: "Cashfree webhook endpoint"
  })
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-webhook-signature, x-webhook-timestamp',
    }
  })
}
