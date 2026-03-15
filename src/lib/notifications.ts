import { prisma } from './prisma'

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: string,
  taskId?: string
) {
  return prisma.notification.create({
    data: { userId, title, body, type, taskId },
  })
}

export async function createNotificationsForRoles(
  roles: string[],
  title: string,
  body: string,
  type: string,
  taskId?: string
) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles } },
    select: { id: true },
  })
  if (users.length === 0) return
  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, title, body, type, taskId })),
  })
}
