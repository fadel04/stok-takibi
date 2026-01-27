import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: string
  customerId: number
  customerName: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'overdue'
  issueDate: string
  dueDate: string
  paidDate: string | null
  items: InvoiceItem[]
  notes: string
}

function getInvoicesPath() {
  return resolve(process.cwd(), 'server/data/invoices.json')
}

function readInvoices(): Invoice[] {
  try {
    const data = readFileSync(getInvoicesPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function writeInvoices(invoices: Invoice[]) {
  writeFileSync(getInvoicesPath(), JSON.stringify(invoices, null, 2))
}

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  if (method === 'GET') {
    const invoices = readInvoices()
    const status = getQuery(event).status as string | undefined

    if (status) {
      return invoices.filter(inv => inv.status === status)
    }

    return invoices
  }

  if (method === 'POST') {
    const body = await readBody<Omit<Invoice, 'id'>>(event)
    const invoices = readInvoices()

    const newId = Math.max(...invoices.map(inv => parseInt(inv.id.split('-')[2])), 0) + 1
    const newInvoice: Invoice = {
      id: `INV-${new Date().getFullYear()}-${String(newId).padStart(3, '0')}`,
      ...body
    }

    invoices.push(newInvoice)
    writeInvoices(invoices)

    return { success: true, invoice: newInvoice }
  }

  if (method === 'PUT') {
    const body = await readBody<Invoice>(event)
    const invoices = readInvoices()
    const index = invoices.findIndex(inv => inv.id === body.id)

    if (index === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Fatura bulunamadı'
      })
    }

    invoices[index] = body
    writeInvoices(invoices)

    return { success: true, invoice: body }
  }

  if (method === 'DELETE') {
    const id = getQuery(event).id as string
    const invoices = readInvoices()
    const filteredInvoices = invoices.filter(inv => inv.id !== id)

    if (filteredInvoices.length === invoices.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Fatura bulunamadı'
      })
    }

    writeInvoices(filteredInvoices)

    return { success: true, message: 'Fatura silindi' }
  }
})
