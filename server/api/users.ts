import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  if (method === 'GET') {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      username: users.username,
      bio: users.bio,
      role: users.role
    }).from(users)

    return allUsers
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const user = await db.select().from(users).where(eq(users.email, body.email)).get()

    if (user && user.password === body.password) {
      const { password, ...userWithoutPassword } = user
      return { success: true, user: userWithoutPassword }
    }

    throw createError({
      statusCode: 401,
      statusMessage: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
    })
  }

  if (method === 'PUT') {
    const body = await readBody(event)

    const existingUser = await db.select().from(users).where(eq(users.id, body.id)).get()
    if (!existingUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    if (body.email !== existingUser.email) {
      const emailExists = await db.select().from(users).where(eq(users.email, body.email)).get()
      if (emailExists) {
        throw createError({
          statusCode: 400,
          statusMessage: 'البريد الإلكتروني مستخدم بالفعل'
        })
      }
    }

    await db.update(users).set({
      name: body.name || existingUser.name,
      email: body.email || existingUser.email,
      username: body.username || existingUser.username,
      bio: body.bio,
      role: body.role || existingUser.role,
      password: body.password || existingUser.password
    }).where(eq(users.id, body.id))

    const updatedUser = await db.select().from(users).where(eq(users.id, body.id)).get()
    const { password, ...userWithoutPassword } = updatedUser!

    return { success: true, user: userWithoutPassword }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed'
  })
})
