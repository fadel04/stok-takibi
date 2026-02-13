import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  username: text('username'),
  bio: text('bio')
})

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: real('price').notNull(),
  stock: integer('stock').notNull(),
  category: text('category'),
  size: text('size'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP')
})

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  action: text('action').notNull(),
  description: text('description').notNull(),
  timestamp: text('timestamp').notNull()
})

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'),
  totalAmount: real('total_amount').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  items: text('items').notNull()
})

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  expenseDate: text('expense_date').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP')
})
