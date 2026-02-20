import { db } from '../../db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'معرف المستخدم مطلوب' })
  }

  const existing = await db.select().from(users).where(eq(users.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'المستخدم غير موجود' })
  }

  await db.delete(users).where(eq(users.id, id))
  return { success: true }
})
