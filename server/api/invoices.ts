import { db } from '../db'
import { invoices } from '../db/schema'
import { eq } from 'drizzle-orm'

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: number
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  totalAmount: number
  status: string
  createdAt: string | null
  items: string
}

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  if (method === 'GET') {
    const allInvoices = await db.select().from(invoices)
    const status = getQuery(event).status as string | undefined

    if (status) {
      return allInvoices.filter(inv => inv.status === status)
    }

    return allInvoices.map(inv => ({
      ...inv,
      items: JSON.parse(inv.items),
      totalAmount: parseFloat(inv.totalAmount as any)
    }))
  }

  if (method === 'POST') {
    const body = await readBody(event)

    const result = await db.insert(invoices).values({
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      totalAmount: body.totalAmount,
      status: body.status || 'pending',
      items: JSON.stringify(body.items)
    }).returning()

    return { success: true, invoice: result[0] }
  }

  if (method === 'PUT') {
    const body = await readBody(event)

    const existing = await db.select().from(invoices).where(eq(invoices.id, body.id)).get()
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'الفاتورة غير موجودة'
      })
    }

    await db.update(invoices).set({
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      totalAmount: body.totalAmount,
      status: body.status,
      items: JSON.stringify(body.items)
    }).where(eq(invoices.id, body.id))

    const updated = await db.select().from(invoices).where(eq(invoices.id, body.id)).get()
    return { success: true, invoice: updated }
  }

  if (method === 'DELETE') {
    const id = getQuery(event).id as string

    const existing = await db.select().from(invoices).where(eq(invoices.id, parseInt(id))).get()
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'الفاتورة غير موجودة'
      })
    }

    await db.delete(invoices).where(eq(invoices.id, parseInt(id)))
    return { success: true, message: 'تم حذف الفاتورة' }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed'
  })
})
