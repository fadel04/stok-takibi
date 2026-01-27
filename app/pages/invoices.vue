<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import type { Invoice, User } from '~/types'

const toast = useToast()
const { logTransaction } = useTransactionLogger()
const table = useTemplateRef('table')

const schema = z.object({
  id: z.string().min(2, 'En az 2 karakter'),
  customerName: z.number(),
  amount: z.number().min(0, 'Tutar 0 dan küçük olamaz'),
  issueDate: z.string(),
  dueDate: z.string(),
  status: z.enum(['paid', 'pending', 'overdue']),
  notes: z.string().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  id: '',
  customerName: undefined,
  amount: 0,
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date().toISOString().split('T')[0],
  status: 'pending',
  notes: ''
})

const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isViewModalOpen = ref(false)
const selectedInvoice = ref<Invoice | null>(null)
const isLoading = ref(false)
const searchQuery = ref('')
const selectedStatus = ref<'all' | 'paid' | 'pending' | 'overdue'>('all')

const { data: invoices, refresh } = await useFetch<Invoice[]>('/api/invoices', {
  lazy: true
})

const { data: customers } = await useFetch<User[]>('/api/customers')

const customerOptions = computed(() => {
  if (!customers.value) {
    return []
  }
  return customers.value.map(customer => ({
    label: customer.name,
    value: customer.id
  }))
})

const filteredInvoices = computed(() => {
  if (!invoices.value) return []

  return invoices.value.filter(invoice => {
    const matchesSearch =
      invoice.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesStatus = selectedStatus.value === 'all' || invoice.status === selectedStatus.value

    return matchesSearch && matchesStatus
  })
})

const stats = computed(() => {
  if (!invoices.value) return { total: 0, paid: 0, pending: 0, overdue: 0 }

  return {
    total: invoices.value.reduce((sum, inv) => sum + inv.amount, 0),
    paid: invoices.value.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0),
    pending: invoices.value.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0),
    overdue: invoices.value.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0)
  }
})

const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'pending':
      return 'warning'
    case 'overdue':
      return 'error'
    default:
      return 'neutral'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
      return 'Ödendi'
    case 'pending':
      return 'Beklemede'
    case 'overdue':
      return 'Vadesini Geçmiş'
    default:
      return status
  }
}

const columns: TableColumn<Invoice>[] = [
  {
    accessorKey: 'id',
    header: 'Fatura No',
    cell: ({ row }) => row.original.id
  },
  {
    accessorKey: 'customerName',
    header: 'Müşteri',
    cell: ({ row }) => row.original.customerName
  },
  {
    accessorKey: 'amount',
    header: 'Tutar',
    cell: ({ row }) => `₺${row.original.amount.toFixed(2)}`
  },
  {
    accessorKey: 'issueDate',
    header: 'Düzenlenme',
    cell: ({ row }) => new Date(row.original.issueDate).toLocaleDateString('tr-TR')
  },
  {
    accessorKey: 'dueDate',
    header: 'Vade',
    cell: ({ row }) => new Date(row.original.dueDate).toLocaleDateString('tr-TR')
  },
  {
    accessorKey: 'status',
    header: 'Durum',
    cell: ({ row }) => {
      const UBadge = resolveComponent('UBadge')
      return h(UBadge, {
        color: getStatusColor(row.original.status),
        variant: 'subtle'
      }, () => getStatusLabel(row.original.status))
    }
  },
  {
    id: 'actions',
    header: 'İşlemler',
    cell: ({ row }) => {
      const UButton = resolveComponent('UButton')
      return h('div', { class: 'flex gap-2' }, [
        h(UButton, {
          icon: 'i-lucide-eye',
          color: 'info',
          variant: 'ghost',
          size: 'sm',
          onClick: () => openViewModal(row.original)
        }),
        h(UButton, {
          icon: 'i-lucide-edit',
          color: 'blue',
          variant: 'ghost',
          size: 'sm',
          onClick: () => openEditModal(row.original)
        }),
        h(UButton, {
          icon: 'i-lucide-download',
          color: 'success',
          variant: 'ghost',
          size: 'sm',
          onClick: () => downloadInvoice(row.original)
        }),
        h(UButton, {
          icon: 'i-lucide-trash',
          color: 'error',
          variant: 'ghost',
          size: 'sm',
          onClick: () => deleteInvoice(row.original.id)
        })
      ])
    }
  }
]

function openViewModal(invoice: Invoice) {
  selectedInvoice.value = invoice
  isViewModalOpen.value = true
}

function openEditModal(invoice: Invoice) {
  selectedInvoice.value = invoice
  state.id = invoice.id
  state.customerName = customers.value?.find(c => c.name === invoice.customerName)?.id
  state.amount = invoice.amount
  state.issueDate = new Date(invoice.issueDate).toISOString().split('T')[0]
  state.dueDate = new Date(invoice.dueDate).toISOString().split('T')[0]
  state.status = invoice.status
  state.notes = invoice.notes || ''
  isEditModalOpen.value = true
}

async function onSubmitAdd(event: FormSubmitEvent<Schema>) {
  isLoading.value = true
  try {
    await logTransaction(
      'Fatura Eklendi',
      `Yeni fatura eklendi: ${event.data.id} - Müşteri: ${event.data.customerName}`
    )

    await $fetch('/api/invoices', {
      method: 'POST',
      body: {
        ...event.data,
        customerName: customers.value?.find(c => c.id === event.data.customerName)?.name,
        items: [],
        paidDate: null
      }
    })

    toast.add({
      title: 'Başarılı',
      description: 'Fatura eklendi',
      icon: 'i-lucide-check',
      color: 'success'
    })

    isAddModalOpen.value = false
    resetForm()
    await refresh()
  }
  catch (error: unknown) {
    toast.add({
      title: 'Hata',
      description: error instanceof Error ? error.message : 'Fatura eklenemedi',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
  finally {
    isLoading.value = false
  }
}

async function onSubmitEdit(event: FormSubmitEvent<Schema>) {
  if (!selectedInvoice.value) return

  isLoading.value = true
  try {
    await $fetch('/api/invoices', {
      method: 'PUT',
      body: {
        ...selectedInvoice.value,
        ...event.data,
        customerName: customers.value?.find(c => c.id === event.data.customerName)?.name
      }
    })

    await logTransaction(
      'Fatura Güncellendi',
      `Fatura güncellendi: ${event.data.id} - Müşteri: ${event.data.customerName}`
    )

    toast.add({
      title: 'Başarılı',
      description: 'Fatura güncellendi',
      icon: 'i-lucide-check',
      color: 'success'
    })

    isEditModalOpen.value = false
    resetForm()
    await refresh()
  }
  catch (error: unknown) {
    toast.add({
      title: 'Hata',
      description: error instanceof Error ? error.message : 'Fatura güncellenemedi',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
  finally {
    isLoading.value = false
  }
}

async function downloadInvoice(invoice: Invoice) {
  const content = generateInvoicePDF(invoice)
  const element = document.createElement('a')
  element.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
  element.download = `${invoice.id}.txt`
  element.click()

  await logTransaction(
    'Fatura İndirildi',
    `Fatura indirildi: ${invoice.id} - Müşteri: ${invoice.customerName}`
  )

  toast.add({
    title: 'Başarılı',
    description: 'Fatura indirildi',
    icon: 'i-lucide-check',
    color: 'success'
  })
}

function generateInvoicePDF(invoice: Invoice) {
  let content = `
================ F A T U R A ================

Fatura No: ${invoice.id}
Tarih: ${new Date(invoice.issueDate).toLocaleDateString('tr-TR')}
Vade: ${new Date(invoice.dueDate).toLocaleDateString('tr-TR')}

--------------------------------------------
Müşteri Bilgileri
--------------------------------------------
${invoice.customerName}

--------------------------------------------
Fatura Kalemleri
--------------------------------------------
`

  invoice.items?.forEach(item => {
    content += `\n${item.description}
  Miktar: ${item.quantity} x ₺${item.unitPrice.toFixed(2)} = ₺${item.total.toFixed(2)}\n`
  })

  content += `
--------------------------------------------
Toplam Tutar: ₺${invoice.amount.toFixed(2)}
Durum: ${getStatusLabel(invoice.status)}
Notlar: ${invoice.notes || '-'}
--------------------------------------------
`

  return content
}

async function deleteInvoice(id: string) {
  const confirmed = await new Promise<boolean>(resolve => {
    toast.add({
      title: 'Silmek istediğinizden emin misiniz?',
      description: 'Bu işlem geri alınamaz',
      actions: [
        {
          label: 'Evet, Sil',
          color: 'error',
          onClick: () => resolve(true)
        },
        {
          label: 'İptal',
          color: 'neutral',
          onClick: () => resolve(false)
        }
      ]
    })
  })

  if (!confirmed) return

  const invoice = invoices.value?.find(inv => inv.id === id)

  try {
    await $fetch(`/api/invoices?id=${id}`, {
      method: 'DELETE'
    })

    if (invoice) {
      await logTransaction(
        'Fatura Silindi',
        `Fatura silindi: ${invoice.id} - Müşteri: ${invoice.customerName} - Tutar: ₺${invoice.amount.toFixed(2)}`
      )
    }

    toast.add({
      title: 'Başarılı',
      description: 'Fatura silindi',
      icon: 'i-lucide-check',
      color: 'success'
    })

    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Hata',
      description: error.message || 'Fatura silinemedi',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
}

function resetForm() {
  state.id = ''
  state.customerName = undefined
  state.amount = 0
  state.issueDate = new Date().toISOString().split('T')[0]
  state.dueDate = new Date().toISOString().split('T')[0]
  state.status = 'pending'
  state.notes = ''
  selectedInvoice.value = null
}

</script>

<template>
  <UDashboardPanel id="invoices">
    <template #header>
      <UDashboardNavbar title="Faturalar">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="Fatura Ekle"
            icon="i-lucide-plus"
            @click="isAddModalOpen = true"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Fatura ara..."
            class="w-full max-w-xs"
          />
          <USelect
            v-model="selectedStatus"
            :items="[
              { label: 'Tüm Durumlar', value: 'all' },
              { label: 'Ödendi', value: 'paid' },
              { label: 'Beklemede', value: 'pending' },
              { label: 'Vadesini Geçmiş', value: 'overdue' }
            ]"
            color="neutral"
            variant="ghost"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="invoices" class="space-y-6">
        <!-- İstatistik Kartları -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold text-gray-700 dark:text-gray-300">Toplam Tutar</span>
                <UIcon name="i-lucide-credit-card" class="size-5 text-primary" />
              </div>
            </template>
            <p class="text-3xl font-bold text-primary">₺{{ stats.total.toFixed(2) }}</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold text-green-700 dark:text-green-300">Ödenmiş</span>
                <UIcon name="i-lucide-check-circle" class="size-5 text-green-500" />
              </div>
            </template>
            <p class="text-3xl font-bold text-green-500">₺{{ stats.paid.toFixed(2) }}</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold text-yellow-700 dark:text-yellow-300">Beklemede</span>
                <UIcon name="i-lucide-clock" class="size-5 text-yellow-500" />
              </div>
            </template>
            <p class="text-3xl font-bold text-yellow-500">₺{{ stats.pending.toFixed(2) }}</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold text-red-700 dark:text-red-300">Vadesini Geçmiş</span>
                <UIcon name="i-lucide-alert-circle" class="size-5 text-red-500" />
              </div>
            </template>
            <p class="text-3xl font-bold text-red-500">₺{{ stats.overdue.toFixed(2) }}</p>
          </UCard>
        </div>

        <!-- Faturalar Tablosu -->
        <UTable
          ref="table"
          :data="filteredInvoices"
          :columns="columns"
          :loading="!invoices"
        />

        <div class="text-sm text-gray-600 dark:text-gray-400">
          Toplam {{ filteredInvoices.length }} fatura gösteriliyor
        </div>
      </div>
      <div v-else class="text-center py-12">
        <UIcon name="i-lucide-loader" class="size-8 animate-spin mx-auto" />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Fatura Ekle Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="isAddModalOpen = false">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Yeni Fatura Ekle
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Yeni bir fatura eklemek için formu doldurun
                </p>
              </div>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="isAddModalOpen = false"
              />
            </div>

            <UForm
              :schema="schema"
              :state="state"
              class="space-y-4"
              @submit="onSubmitAdd"
            >
              <UFormField label="Fatura No" name="id">
                <UInput v-model="state.id" placeholder="Fatura numarasını girin" />
              </UFormField>

              <UFormField label="Müşteri Adı" name="customerName">
                <USelectMenu
                  v-model="state.customerName"
                  :options="customerOptions"
                  placeholder="Müşteri seçin"
                  searchable
                />
              </UFormField>

              <UFormField label="Tutar (₺)" name="amount">
                <UInput v-model.number="state.amount" type="number" placeholder="0.00" min="0" step="0.01" />
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Düzenlenme Tarihi" name="issueDate">
                  <UInput v-model="state.issueDate" type="date" />
                </UFormField>

                <UFormField label="Vade Tarihi" name="dueDate">
                  <UInput v-model="state.dueDate" type="date" />
                </UFormField>
              </div>

              <UFormField label="Durum" name="status">
                <USelect
                  v-model="state.status"
                  :items="[
                    { label: 'Ödendi', value: 'paid' },
                    { label: 'Beklemede', value: 'pending' },
                    { label: 'Vadesini Geçmiş', value: 'overdue' }
                  ]"
                />
              </UFormField>

              <UFormField label="Notlar" name="notes">
                <UTextarea v-model="state.notes" placeholder="Notlar (opsiyonel)" :rows="3" />
              </UFormField>

              <div class="flex justify-end gap-2 pt-4">
                <UButton
                  label="İptal"
                  color="neutral"
                  variant="ghost"
                  @click="isAddModalOpen = false"
                />
                <UButton
                  label="Ekle"
                  type="submit"
                  :loading="isLoading"
                />
              </div>
            </UForm>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Fatura Düzenle Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isEditModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="isEditModalOpen = false">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Fatura Düzenle
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Fatura bilgilerini güncelleyin
                </p>
              </div>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="isEditModalOpen = false"
              />
            </div>

            <UForm
              :schema="schema"
              :state="state"
              class="space-y-4"
              @submit="onSubmitEdit"
            >
              <UFormField label="Fatura No" name="id">
                <UInput v-model="state.id" placeholder="Fatura numarasını girin" disabled />
              </UFormField>

              <UFormField label="Müşteri Adı" name="customerName">
                <USelectMenu
                  v-model="state.customerName"
                  :options="customerOptions"
                  placeholder="Müşteri seçin"
                  searchable
                />
              </UFormField>

              <UFormField label="Tutar (₺)" name="amount">
                <UInput v-model.number="state.amount" type="number" placeholder="0.00" min="0" step="0.01" />
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Düzenlenme Tarihi" name="issueDate">
                  <UInput v-model="state.issueDate" type="date" />
                </UFormField>

                <UFormField label="Vade Tarihi" name="dueDate">
                  <UInput v-model="state.dueDate" type="date" />
                </UFormField>
              </div>

              <UFormField label="Durum" name="status">
                <USelect
                  v-model="state.status"
                  :items="[
                    { label: 'Ödendi', value: 'paid' },
                    { label: 'Beklemede', value: 'pending' },
                    { label: 'Vadesini Geçmiş', value: 'overdue' }
                  ]"
                />
              </UFormField>

              <UFormField label="Notlar" name="notes">
                <UTextarea v-model="state.notes" placeholder="Notlar (opsiyonel)" :rows="3" />
              </UFormField>

              <div class="flex justify-end gap-2 pt-4">
                <UButton
                  label="İptal"
                  color="neutral"
                  variant="ghost"
                  @click="isEditModalOpen = false"
                />
                <UButton
                  label="Güncelle"
                  type="submit"
                  :loading="isLoading"
                />
              </div>
            </UForm>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Fatura Detayları Modal -->
  <UModal v-model:open="isViewModalOpen" title="Fatura Detayları" size="lg">
    <div v-if="selectedInvoice" class="space-y-4">
      <!-- Başlık -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Fatura No</p>
          <p class="text-lg font-semibold">{{ selectedInvoice.id }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Durum</p>
          <UBadge :color="getStatusColor(selectedInvoice.status)" variant="subtle">
            {{ getStatusLabel(selectedInvoice.status) }}
          </UBadge>
        </div>
      </div>

      <USeparator />

      <!-- Müşteri Bilgileri -->
      <div>
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Müşteri Bilgileri</p>
        <p>{{ selectedInvoice.customerName }}</p>
      </div>

      <USeparator />

      <!-- Tarihler -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Düzenlenme Tarihi</p>
          <p class="font-semibold">{{ new Date(selectedInvoice.issueDate).toLocaleDateString('tr-TR') }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Vade Tarihi</p>
          <p class="font-semibold">{{ new Date(selectedInvoice.dueDate).toLocaleDateString('tr-TR') }}</p>
        </div>
      </div>

      <div v-if="selectedInvoice.paidDate">
        <p class="text-sm text-gray-500 dark:text-gray-400">Ödeme Tarihi</p>
        <p class="font-semibold">{{ new Date(selectedInvoice.paidDate).toLocaleDateString('tr-TR') }}</p>
      </div>

      <USeparator />

      <!-- Kalemler -->
      <div v-if="selectedInvoice.items && selectedInvoice.items.length > 0">
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Fatura Kalemleri</p>
        <div class="space-y-2">
          <div v-for="(item, index) in selectedInvoice.items" :key="index" class="flex justify-between items-start p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div>
              <p class="font-medium">{{ item.description }}</p>
              <p class="text-sm text-gray-500">{{ item.quantity }} x ₺{{ item.unitPrice.toFixed(2) }}</p>
            </div>
            <p class="font-semibold">₺{{ item.total.toFixed(2) }}</p>
          </div>
        </div>
        <USeparator />
      </div>

      <!-- Toplam -->
      <div class="bg-primary/10 p-4 rounded-lg">
        <div class="flex justify-between items-center">
          <p class="text-lg font-semibold">Toplam Tutar:</p>
          <p class="text-2xl font-bold text-primary">₺{{ selectedInvoice.amount.toFixed(2) }}</p>
        </div>
      </div>

      <!-- Notlar -->
      <div v-if="selectedInvoice.notes">
        <p class="text-sm text-gray-500 dark:text-gray-400">Notlar</p>
        <p class="text-sm">{{ selectedInvoice.notes }}</p>
      </div>

      <!-- Butonlar -->
      <div class="flex gap-2 pt-4">
        <UButton
          icon="i-lucide-download"
          label="İndir"
          color="success"
          variant="soft"
          @click="downloadInvoice(selectedInvoice)"
        />
        <UButton
          label="Kapat"
          color="neutral"
          variant="ghost"
          @click="isViewModalOpen = false"
        />
      </div>
    </div>
  </UModal>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}
</style>
