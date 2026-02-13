import type { AvatarProps } from '@nuxt/ui'

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'

export interface User {
  id: number
  name: string
  email: string
  avatar?: AvatarProps
  status: UserStatus
  location: string
}

export interface LoginUser {
  id: number
  email: string
  password: string
  name: string
  username?: string
  bio?: string
  avatar?: AvatarProps
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  category: string
  size?: string
  createdAt: string
}

export interface InvoiceItem {
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

export interface Member {
  name: string
  username: string
  role: 'member' | 'owner'
  avatar: AvatarProps
}

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

export interface Sale {
  id: string
  date: string
  status: SaleStatus
  email: string
  amount: number
}

export interface Notification {
  id: number
  unread?: boolean
  sender: User
  body: string
  date: string
}

export interface Transaction {
  id: number
  username: string
  timestamp: string
  action: string
  description: string
}

export interface Expense {
  id: number
  title: string
  category: string
  amount: number
  expenseDate: string
  notes?: string | null
  createdAt?: string | null
}

export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}
