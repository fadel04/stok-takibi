import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

interface LoginUser {
  id: number
  email: string
  password: string
  name: string
  username?: string | null
  bio?: string | null
  avatarSrc?: string | null
  avatarAlt?: string | null
}

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  if (method === 'GET') {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      username: users.username,
      bio: users.bio,
      avatarSrc: users.avatarSrc,
      avatarAlt: users.avatarAlt
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
      statusMessage: 'E-posta veya şifre yanlış'
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
          statusMessage: 'E-posta zaten kullanılıyor'
        })
      }
    }

    await db.update(users).set({
      name: body.name || existingUser.name,
      email: body.email || existingUser.email,
      username: body.username || existingUser.username,
      bio: body.bio,
      avatarSrc: body.avatar?.src || existingUser.avatarSrc,
      avatarAlt: body.avatar?.alt || existingUser.avatarAlt,
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
