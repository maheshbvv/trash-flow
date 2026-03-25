import { prisma } from './prisma'

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EMAIL_COUNT = 'EMAIL_COUNT',
  EMAIL_TRASH = 'EMAIL_TRASH',
  SCHEDULE_CREATE = 'SCHEDULE_CREATE',
  SCHEDULE_UPDATE = 'SCHEDULE_UPDATE',
  SCHEDULE_DELETE = 'SCHEDULE_DELETE',
  SCHEDULE_EXECUTE = 'SCHEDULE_EXECUTE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_REQUEST = 'INVALID_REQUEST',
}

export async function auditLog(params: {
  userId?: string
  email?: string
  action: AuditAction
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        email: params.email,
        action: params.action,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export async function getAuditLogs(userId?: string, limit = 100) {
  return prisma.auditLog.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
