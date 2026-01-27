import { promises as fs } from 'fs'
import { join } from 'path'
import type { Transaction } from '~/types'

const sampleTransactions: Transaction[] = [
  {
    id: 4,
    username: 'Morgan White',
    timestamp: '2026-01-25 11:45:00',
    action: 'Fatura Oluşturuldu',
    description: '#INV-1001 numaralı fatura oluşturuldu - Müşteri: Ahmet Kaya'
  },
  {
    id: 5,
    username: 'Casey Gray',
    timestamp: '2026-01-25 10:30:00',
    action: 'Ürün Silindi',
    description: 'Ürün silindi: Samsung Galaxy S21'
  },
  {
    id: 6,
    username: 'Jamie Johnson',
    timestamp: '2026-01-25 09:15:00',
    action: 'Fiyat Güncellendi',
    description: 'Ürün fiyatı güncellendi: MacBook Pro - Yeni fiyat: $2,499'
  },
  {
    id: 7,
    username: 'Riley Davis',
    timestamp: '2026-01-24 16:45:00',
    action: 'Fatura Ödendi',
    description: '#INV-0995 numaralı fatura ödendi - Tutar: $1,250'
  },
  {
    id: 8,
    username: 'Kelly Wilson',
    timestamp: '2026-01-24 15:30:00',
    action: 'Müşteri Bilgileri Güncellendi',
    description: 'Müşteri bilgileri güncellendi: Ayşe Demir'
  },
  {
    id: 9,
    username: 'Drew Moore',
    timestamp: '2026-01-24 14:00:00',
    action: 'Ürün Eklendi',
    description: 'Yeni ürün eklendi: Sony WH-1000XM5 Kulaklık'
  },
  {
    id: 10,
    username: 'Jordan Taylor',
    timestamp: '2026-01-24 13:20:00',
    action: 'Stok Güncellendi',
    description: 'Stok güncellendi: iPad Air - Yeni miktar: 25'
  },
  {
    id: 11,
    username: 'Morgan Anderson',
    timestamp: '2026-01-24 12:10:00',
    action: 'Müşteri Silindi',
    description: 'Müşteri silindi: Kemal Özdemir'
  },
  {
    id: 12,
    username: 'Alex Smith',
    timestamp: '2026-01-24 11:00:00',
    action: 'Fatura Oluşturuldu',
    description: '#INV-1000 numaralı fatura oluşturuldu - Müşteri: Zeynep Arslan'
  },
  {
    id: 13,
    username: 'Jordan Brown',
    timestamp: '2026-01-24 10:30:00',
    action: 'Fiyat Güncellendi',
    description: 'Ürün fiyatı güncellendi: AirPods Pro - Yeni fiyat: $249'
  },
  {
    id: 14,
    username: 'Taylor Green',
    timestamp: '2026-01-24 09:45:00',
    action: 'Ürün Eklendi',
    description: 'Yeni ürün eklendi: Canon EOS R6 Kamera'
  },
  {
    id: 15,
    username: 'Morgan White',
    timestamp: '2026-01-23 16:30:00',
    action: 'Stok Güncellendi',
    description: 'Stok güncellendi: Samsung Galaxy Tab S8 - Yeni miktar: 15'
  },
  {
    id: 16,
    username: 'Casey Gray',
    timestamp: '2026-01-23 15:15:00',
    action: 'Fatura Ödendi',
    description: '#INV-0994 numaralı fatura ödendi - Tutar: $850'
  },
  {
    id: 17,
    username: 'Jamie Johnson',
    timestamp: '2026-01-23 14:00:00',
    action: 'Müşteri Eklendi',
    description: 'Yeni müşteri eklendi: Emre Yıldız'
  },
  {
    id: 18,
    username: 'Riley Davis',
    timestamp: '2026-01-23 13:30:00',
    action: 'Müşteri Bilgileri Güncellendi',
    description: 'Müşteri bilgileri güncellendi: Selin Aydın'
  },
  {
    id: 19,
    username: 'Kelly Wilson',
    timestamp: '2026-01-23 12:15:00',
    action: 'Fatura Oluşturuldu',
    description: '#INV-0999 numaralı fatura oluşturuldu - Müşteri: Can Öztürk'
  },
  {
    id: 20,
    username: 'Drew Moore',
    timestamp: '2026-01-23 11:00:00',
    action: 'Fiyat Güncellendi',
    description: 'Ürün fiyatı güncellendi: Nintendo Switch - Yeni fiyat: $299'
  }
]

export default defineEventHandler(async (event) => {
  const filePath = join(process.cwd(), 'server/data/transactions.json')

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const transactions: Transaction[] = JSON.parse(fileContent)

    // إذا كان الملف فارغ، إرجاع البيانات النموذجية
    if (transactions.length === 0) {
      return sampleTransactions
    }

    return transactions
  } catch (error) {
    // إذا لم يوجد الملف، إرجاع البيانات النموذجية
    console.log('Using sample transactions')
    return sampleTransactions
  }
})
