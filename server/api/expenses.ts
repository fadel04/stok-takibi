import { db } from '../db'
import { expenses } from '../db/schema'
import { desc, eq, sql } from 'drizzle-orm'

interface ExpensePayload {
  id?: number
  title: string
  category: string
  amount: number
  expenseDate: string
  notes?: string
}

export default defineEventHandler(async (event) => {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const method = event.node.req.method

  if (method === 'GET') {
    const allExpenses = await db.select().from(expenses).orderBy(desc(expenses.id))
    return allExpenses.map(expense => ({
      ...expense,
      amount: Number(expense.amount),
      expenseDate: expense.expenseDate || new Date().toISOString().split('T')[0]
    }))
  }

  if (method === 'POST') {
    const body = await readBody<ExpensePayload>(event)

    const result = await db.insert(expenses).values({
      title: body.title,
      category: body.category,
      amount: body.amount,
      expenseDate: body.expenseDate,
      notes: body.notes || null
    }).returning()

    return { success: true, expense: result[0] }
  }

  if (method === 'PUT') {
    const body = await readBody<ExpensePayload>(event)

    if (!body.id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'معرف المصروف مطلوب'
      })
    }

    const existing = await db.select().from(expenses).where(eq(expenses.id, body.id)).get()
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'المصروف غير موجود'
      })
    }

    await db.update(expenses).set({
      title: body.title,
      category: body.category,
      amount: body.amount,
      expenseDate: body.expenseDate,
      notes: body.notes || null
    }).where(eq(expenses.id, body.id))

    const updated = await db.select().from(expenses).where(eq(expenses.id, body.id)).get()
    return { success: true, expense: updated }
  }

  if (method === 'DELETE') {
    const id = getQuery(event).id as string

    const parsedId = parseInt(id)
    if (Number.isNaN(parsedId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'معرف المصروف غير صالح'
      })
    }

    const existing = await db.select().from(expenses).where(eq(expenses.id, parsedId)).get()
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'المصروف غير موجود'
      })
    }

    await db.delete(expenses).where(eq(expenses.id, parsedId))
    return { success: true, message: 'تم حذف المصروف' }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed'
  })
})
