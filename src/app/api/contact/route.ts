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
      from: 'TrashFlow Contact <contact@trashflow.pendura.in>',
      to: 'reach@pendura.in',
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <tr>
                    <td style="padding: 40px 32px;">
                      <div style="text-align: center; margin-bottom: 24px;">
                        <table cellpadding="0" cellspacing="0" style="display: inline-block;">
                          <tr>
                            <td style="width: 48px; height: 48px; background: var(--primary); color: var(--on-primary); border-radius: 12px; text-align: center; vertical-align: middle; font-size: 24px;">
                              <span style="line-height: 48px;">🗑️</span>
                            </td>
                            <td style="padding-left: 12px; text-align: left; vertical-align: middle;">
                              <div style="font-size: 20px; font-weight: 800; color: var(--primary); letter-spacing: -0.02em;">TrashFlow</div>
                              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280;">Precision Trashing</div>
                            </td>
                          </tr>
                        </table>
                        <h1 style="margin: 24px 0 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">New Contact Form Submission</h1>
                      </div>
                      
                      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                        <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280; font-weight: 600;">NAME</p>
                        <p style="margin: 0 0 16px; font-size: 16px; color: #374151;">${name}</p>
                        
                        <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280; font-weight: 600;">EMAIL</p>
                        <p style="margin: 0 0 16px; font-size: 16px; color: #374151;"><a href="mailto:${email}" style="color: var(--primary); text-decoration: none;">${email}</a></p>
                        
                        <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280; font-weight: 600;">MESSAGE</p>
                        <p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.6;">${message}</p>
                      </div>
                      
                      <p style="margin: 0; font-size: 14px; color: #9ca3af;">
                        Submitted on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })

    await resend.emails.send({
      from: 'TrashFlow <contact@trashflow.pendura.in>',
      to: email,
      subject: "Thanks for reaching out!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <tr>
                    <td style="padding: 40px 32px;">
                      <div style="text-align: center; margin-bottom: 24px;">
                        <table cellpadding="0" cellspacing="0" style="display: inline-block;">
                          <tr>
                            <td style="width: 48px; height: 48px; background: var(--primary); color: var(--on-primary); border-radius: 12px; text-align: center; vertical-align: middle; font-size: 24px;">
                              <span style="line-height: 48px;">🗑️</span>
                            </td>
                            <td style="padding-left: 12px; text-align: left; vertical-align: middle;">
                              <div style="font-size: 20px; font-weight: 800; color: var(--primary); letter-spacing: -0.02em;">TrashFlow</div>
                              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280;">Precision Trashing</div>
                            </td>
                          </tr>
                        </table>
                        <h1 style="margin: 24px 0 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">Thanks for reaching out!</h1>
                      </div>
                      
                      <p style="margin: 0 0 16px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                        Hi ${name},
                      </p>
                      
                      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
                        We've received your message and will get back to you within 24-48 hours on business days.
                      </p>
                      
                      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280; font-weight: 600;">YOUR MESSAGE</p>
                        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5;">${message}</p>
                      </div>
                      
                      <p style="margin: 0; font-size: 14px; color: #9ca3af;">
                        Best regards,<br/>
                        <span style="color: var(--primary); font-weight: 600;">The TrashFlow Team</span>
                      </p>
                    </td>
                  </tr>
                </table>
                
                <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">
                  © 2026 TrashFlow. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
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
