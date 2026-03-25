import { google } from 'googleapis'

export function getGmailClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth: oauth2Client })
}

export function buildSearchQuery(options: {
  from?: string
  to?: string
  subject?: string
  after?: string
  before?: string
}) {
  const parts: string[] = []

  if (options.from) {
    parts.push(`from:${options.from}`)
  }
  if (options.to) {
    parts.push(`to:${options.to}`)
  }
  if (options.subject) {
    parts.push(`subject:${options.subject}`)
  }
  if (options.after) {
    parts.push(`after:${options.after}`)
  }
  if (options.before) {
    parts.push(`before:${options.before}`)
  }

  return parts.join(' ')
}

export function formatDateForGmail(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}
