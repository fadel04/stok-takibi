import { db } from '../db'
import { categories } from '../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  if (method === 'GET') {
    return await db.select().from(categories).all()
  }

  if (method === 'POST') {
    const body = await readBody(event)
    if (!body.name?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'اسم الفئة مطلوب' })
    }
    try {
      const result = await db.insert(categories).values({ name: body.name.trim() }).returning()
      return { success: true, category: result[0] }
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'الفئة موجودة بالفعل' })
    }
  }

  if (method === 'DELETE') {
    const body = await readBody(event)
    if (!body.id) {
      throw createError({ statusCode: 400, statusMessage: 'معرف الفئة مطلوب' })
    }
    await db.delete(categories).where(eq(categories.id, body.id))
    return { success: true }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
