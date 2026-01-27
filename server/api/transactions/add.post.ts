import { promises as fs } from 'fs'
import { join } from 'path'
import type { Transaction } from '~/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const filePath = join(process.cwd(), 'server/data/transactions.json')

  try {
    // قراءة المعاملات الحالية
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const transactions: Transaction[] = JSON.parse(fileContent)

    // إنشاء معاملة جديدة
    const newTransaction: Transaction = {
      id: transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1,
      username: body.username || 'مستخدم النظام',
      timestamp: new Date().toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(',', ''),
      action: body.action,
      description: body.description
    }

    // إضافة المعاملة الجديدة في البداية
    transactions.unshift(newTransaction)

    // حفظ المعاملات المحدثة
    await fs.writeFile(filePath, JSON.stringify(transactions, null, 2))

    return { success: true, transaction: newTransaction }
  } catch (error) {
    console.error('Error adding transaction:', error)
    return { success: false, error: 'Failed to add transaction' }
  }
})
