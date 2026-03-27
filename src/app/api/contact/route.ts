import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      )
    }

    const data = await resend.emails.send({
      from: 'TrashFlow Contact <onboarding@resend.dev>',
      to: 'maheshbvv@hotmail.com',
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
