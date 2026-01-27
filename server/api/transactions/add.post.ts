import { db } from '../../db'
import { transactions } from '../../db/schema'
import type { Transaction } from '~/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  try {
    const timestamp = new Date().toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(',', '')

    const result = await db.insert(transactions).values({
      username: body.username || 'مستخدم النظام',
      timestamp,
      action: body.action,
      description: body.description
    }).returning()

    return { success: true, transaction: result[0] }
  } catch (error) {
    console.error('Error adding transaction:', error)
    return { success: false, error: 'Failed to add transaction' }
  }
})
