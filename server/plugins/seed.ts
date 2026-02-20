import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

const seedUsers = [
  {
    email: 'admin@store.com',
    password: 'admin123',
    name: 'مدير النظام',
    username: 'admin',
    role: 'admin'
  },
  {
    email: 'supervisor@store.com',
    password: 'super123',
    name: 'المشرف',
    username: 'supervisor',
    role: 'supervisor'
  },
  {
    email: 'staff@store.com',
    password: 'staff123',
    name: 'الموظف',
    username: 'staff',
    role: 'staff'
  }
]

export default defineNitroPlugin(async () => {
  for (const u of seedUsers) {
    const existing = await db.select().from(users).where(eq(users.email, u.email)).get()
    if (!existing) {
      await db.insert(users).values(u)
      console.log(`✅ تم إنشاء حساب: ${u.name} (${u.role})`)
    }
  }
})
