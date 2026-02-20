import { db } from '../../db'
import { transactions } from '../../db/schema'

export default defineEventHandler(async () => {
  await db.delete(transactions)
  return { success: true }
})
