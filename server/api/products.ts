import { db } from '../db'
import { products } from '../db/schema'
import { eq } from 'drizzle-orm'

interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  category: string | null
  size?: string | null
  barcode?: string | null
  createdAt: string | null
}

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  if (method === 'GET') {
    const allProducts = await db.select().from(products)
    return allProducts.map(p => ({
      ...p,
      price: parseFloat(p.price as any),
      createdAt: p.createdAt || new Date().toISOString().split('T')[0]
    }))
  }

  if (method === 'POST') {
    const body = await readBody<Omit<Product, 'id' | 'createdAt'>>(event)

    const result = await db.insert(products).values({
      name: body.name,
      description: body.description,
      price: body.price,
      stock: body.stock,
      category: body.category,
      size: body.size,
      barcode: body.barcode,
      createdAt: new Date().toISOString().split('T')[0]
    }).returning()

    return { success: true, product: result[0] }
  }

  if (method === 'PUT') {
    const body = await readBody<Product>(event)

    const existing = await db.select().from(products).where(eq(products.id, body.id)).get()
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'المنتج غير موجود'
      })
    }

    await db.update(products).set({
      name: body.name,
      description: body.description,
      price: body.price,
      stock: body.stock,
      category: body.category,
      size: body.size,
      barcode: body.barcode
    }).where(eq(products.id, body.id))

    const updated = await db.select().from(products).where(eq(products.id, body.id)).get()
    return { success: true, product: updated }
  }

  if (method === 'DELETE') {
    const id = getQuery(event).id as string

    const existing = await db.select().from(products).where(eq(products.id, parseInt(id))).get()
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'المنتج غير موجود'
      })
    }

    await db.delete(products).where(eq(products.id, parseInt(id)))
    return { success: true, message: 'تم حذف المنتج' }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed'
  })
})
