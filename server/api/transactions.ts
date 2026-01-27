import { db } from '~/server/db'
import { transactions } from '~/server/db/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const allTransactions = await db.select().from(transactions).orderBy(desc(transactions.id))
  return allTransactions
})
