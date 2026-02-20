import { db } from '../../db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.email || !body.password || !body.name) {
    throw createError({ statusCode: 400, statusMessage: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' })
  }

  const existing = await db.select().from(users).where(eq(users.email, body.email)).get()
  if (existing) {
    throw createError({ statusCode: 400, statusMessage: 'البريد الإلكتروني مستخدم بالفعل' })
  }

  const result = await db.insert(users).values({
    email: body.email,
    password: body.password,
    name: body.name,
    username: body.username || null,
    role: body.role || 'staff'
  }).returning()

  const { password, ...userWithoutPassword } = result[0]
  return { success: true, user: userWithoutPassword }
})
