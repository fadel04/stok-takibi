import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  category: string
  createdAt: string
}

function getProductsPath() {
  return resolve(process.cwd(), 'server/data/products.json')
}

function readProducts(): Product[] {
  try {
    const data = readFileSync(getProductsPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function writeProducts(products: Product[]) {
  writeFileSync(getProductsPath(), JSON.stringify(products, null, 2))
}

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  if (method === 'GET') {
    const products = readProducts()
    return products
  }

  if (method === 'POST') {
    const body = await readBody<Omit<Product, 'id' | 'createdAt'>>(event)
    const products = readProducts()

    const newProduct: Product = {
      id: Math.max(...products.map(p => p.id), 0) + 1,
      ...body,
      createdAt: new Date().toISOString().split('T')[0]
    }

    products.push(newProduct)
    writeProducts(products)

    return { success: true, product: newProduct }
  }

  if (method === 'PUT') {
    const body = await readBody<Product>(event)
    const products = readProducts()
    const index = products.findIndex(p => p.id === body.id)

    if (index === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Ürün bulunamadı'
      })
    }

    products[index] = body
    writeProducts(products)

    return { success: true, product: body }
  }

  if (method === 'DELETE') {
    const id = getQuery(event).id as string
    const products = readProducts()
    const filteredProducts = products.filter(p => p.id !== parseInt(id))

    if (filteredProducts.length === products.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Ürün bulunamadı'
      })
    }

    writeProducts(filteredProducts)

    return { success: true, message: 'Ürün silindi' }
  }
})
