import { readFile } from 'fs/promises'
import { join } from 'path'

interface LoginUser {
  id: number
  email: string
  password: string
  name: string
  username?: string
  bio?: string
  avatar?: {
    src: string
    alt: string
  }
}

const USERS_FILE = join(process.cwd(), 'server', 'data', 'users.json')

async function loadUsers(): Promise<LoginUser[]> {
  try {
    const data = await readFile(USERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // Fallback للإنتاج: مستخدم افتراضي
    return [{
      id: 1,
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Admin',
      username: 'admin'
    }]
  }
}

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  if (method === 'GET') {
    const users = await loadUsers()
    return users.map(({ password, ...user }) => user)
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const users = await loadUsers()
    const user = users.find(u => u.email === body.email && u.password === body.password)

    if (user) {
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
    const users = await loadUsers()
    const userIndex = users.findIndex(u => u.id === body.id)

    if (userIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    const emailExists = users.some(u => u.email === body.email && u.id !== body.id)
    if (emailExists) {
      throw createError({
        statusCode: 400,
        statusMessage: 'E-posta zaten kullanılıyor'
      })
    }

    users[userIndex] = {
      ...users[userIndex],
      name: body.name || users[userIndex].name,
      email: body.email || users[userIndex].email,
      username: body.username || users[userIndex].username,
      bio: body.bio,
      avatar: body.avatar || users[userIndex].avatar,
      password: body.password || users[userIndex].password
    }

    await saveUsers(users)

    const { password, ...userWithoutPassword } = users[userIndex]
    return { success: true, user: userWithoutPassword }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed'
  })
})
