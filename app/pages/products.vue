<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import type { Product } from '~/types'

const toast = useToast()
const { logTransaction } = useTransactionLogger()
const table = useTemplateRef('table')

const schema = z.object({
  name: z.string().min(2, 'En az 2 karakter'),
  description: z.string().min(5, 'En az 5 karakter'),
  price: z.number().min(0, 'Fiyat 0 den küçük olamaz'),
  stock: z.number().min(0, 'Stok 0 den küçük olamaz'),
  category: z.enum(['kış', 'yaz'], { message: 'Kategori seçiniz' }),
  size: z.string().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: '',
  description: '',
  price: 0,
  stock: 0,
  category: undefined,
  size: ''
})

const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isStockOutModalOpen = ref(false)
const selectedProduct = ref<Product | null>(null)
const stockOutQuantity = ref(1)
const isLoading = ref(false)
const searchQuery = ref('')
const selectedSeason = ref<'all' | 'kış' | 'yaz'>('all')

const seasonTabs = [{
  label: 'Tümü',
  value: 'all'
}, {
  label: 'Kış',
  value: 'kış'
}, {
  label: 'Yaz',
  value: 'yaz'
}]

const { data: products, refresh } = await useFetch<Product[]>('/api/products', {
  lazy: true
})

const filteredProducts = computed(() => {
  if (!products.value) return []

  return products.value.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      || product.description.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesSeason = selectedSeason.value === 'all'
      || product.category?.toLowerCase() === selectedSeason.value

    return matchesSearch && matchesSeason
  })
})

const columns: TableColumn<Product>[] = [
  {
    accessorKey: 'name',
    header: 'Ürün Adı',
    cell: ({ row }) => row.original.name
  },
  {
    accessorKey: 'description',
    header: 'Açıklama',
    cell: ({ row }) => row.original.description
  },
  {
    accessorKey: 'size',
    header: 'Beden Ölçü',
    cell: ({ row }) => row.original.size || '-'
  },
  {
    accessorKey: 'price',
    header: 'Fiyat',
    cell: ({ row }) => `₺${row.original.price.toFixed(2)}`
  },
  {
    accessorKey: 'stock',
    header: 'Stok',
    cell: ({ row }) => {
      const stock = row.original.stock
      const color = stock > 20 ? 'success' : stock > 10 ? 'warning' : 'error'
      return h('span', { class: `text-${color}-500 font-semibold text-lg` }, `${stock}`)
    }
  },
  {
    id: 'stockOut',
    header: 'Stok Çıkışı',
    cell: ({ row }) => {
      const stock = row.original.stock
      const UButton = resolveComponent('UButton')
      return h(UButton, {
        label: 'Çıkış',
        size: 'xs',
        color: 'error',
        variant: 'soft',
        disabled: stock <= 0,
        onClick: () => openStockOutModal(row.original)
      })
    }
  },
  {
    id: 'actions',
    header: 'İşlemler',
    cell: ({ row }) => {
      const UButton = resolveComponent('UButton')
      return h('div', { class: 'flex gap-2' }, [
        h(UButton, {
          icon: 'i-lucide-edit',
          color: 'blue',
          variant: 'ghost',
          onClick: () => openEditModal(row.original)
        }),
        h(UButton, {
          icon: 'i-lucide-trash',
          color: 'error',
          variant: 'ghost',
          onClick: () => deleteProduct(row.original.id)
        })
      ])
    }
  }
]

function openEditModal(product: Product) {
  selectedProduct.value = product
  state.name = product.name
  state.description = product.description
  state.price = product.price
  state.stock = product.stock
  state.category = product.category as 'kış' | 'yaz' | undefined
  state.size = product.size || ''
  isEditModalOpen.value = true
}

function openAddModal() {
  resetForm()
  isAddModalOpen.value = true
}

function closeEditModal() {
  resetForm()
  isEditModalOpen.value = false
}

function closeAddModal() {
  resetForm()
  isAddModalOpen.value = false
}

function openStockOutModal(product: Product) {
  selectedProduct.value = product
  stockOutQuantity.value = 1
  isStockOutModalOpen.value = true
}

async function submitStockOut() {
  if (!selectedProduct.value || stockOutQuantity.value <= 0) return

  const product = selectedProduct.value
  const quantity = stockOutQuantity.value

  if (quantity > product.stock) {
    toast.add({
      title: 'Hata',
      description: 'Çıkış miktarı mevcut stoktan fazla olamaz',
      icon: 'i-lucide-x',
      color: 'error'
    })
    return
  }

  isLoading.value = true
  try {
    const newStock = product.stock - quantity

    await $fetch('/api/products', {
      method: 'PUT',
      body: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: newStock,
        createdAt: product.createdAt
      }
    })

    await refresh()

    await logTransaction(
      'Stok Çıkışı',
      `${product.name}: ${product.stock} → ${newStock} (-${quantity})`
    )

    toast.add({
      title: 'Stok Çıkışı Başarılı',
      description: `${product.name}: ${quantity} adet çıkış yapıldı`,
      icon: 'i-lucide-package-minus',
      color: 'success'
    })

    isStockOutModalOpen.value = false
    selectedProduct.value = null
    stockOutQuantity.value = 1
  } catch (error: unknown) {
    toast.add({
      title: 'Hata',
      description: error instanceof Error ? error.message : 'Stok çıkışı yapılamadı',
      icon: 'i-lucide-x',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

async function _updateStock(id: number, change: number) {
  const product = products.value?.find(p => p.id === id)
  if (!product) return

  const newStock = Math.max(0, product.stock + change)

  try {
    await $fetch('/api/products', {
      method: 'PUT',
      body: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: newStock,
        createdAt: product.createdAt
      }
    })

    await refresh()

    const changeText = change > 0 ? `+${change}` : change.toString()
    await logTransaction(
      'Stok Güncellendi',
      `${product.name}: ${product.stock} → ${newStock} (${changeText})`
    )

    toast.add({
      title: 'Stok G\u00fcncellendi',
      description: `${product.name}: ${product.stock} \u2192 ${newStock} (${changeText})`,
      icon: 'i-lucide-package',
      color: 'info'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Hata',
      description: error instanceof Error ? error.message : 'Stok g\u00fcncellenemedi',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
}

async function onSubmitAdd(event: FormSubmitEvent<Schema>) {
  isLoading.value = true
  try {
    await logTransaction(
      'Ürün Eklendi',
      `Yeni ürün eklendi: ${event.data.name}`
    )

    await $fetch('/api/products', {
      method: 'POST',
      body: event.data
    })

    toast.add({
      title: 'Başarılı',
      description: 'Ürün eklendi',
      icon: 'i-lucide-check',
      color: 'success'
    })

    isAddModalOpen.value = false
    resetForm()
    await refresh()
  } catch (error: unknown) {
    toast.add({
      title: 'Hata',
      description: error instanceof Error ? error.message : 'Ürün eklenemedi',
      icon: 'i-lucide-x',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

async function onSubmitEdit(event: FormSubmitEvent<Schema>) {
  if (!selectedProduct.value) return

  isLoading.value = true
  try {
    await $fetch(`/api/products`, {
      method: 'PUT',
      body: {
        id: selectedProduct.value.id,
        ...event.data,
        createdAt: selectedProduct.value.createdAt
      }
    })

    await logTransaction(
      'Ürün Güncellendi',
      `Ürün güncellendi: ${event.data.name}`
    )

    toast.add({
      title: 'Başarılı',
      description: 'Ürün güncellendi',
      icon: 'i-lucide-check',
      color: 'success'
    })

    isEditModalOpen.value = false
    resetForm()
    await refresh()
  } catch (error: unknown) {
    toast.add({
      title: 'Hata',
      description: error instanceof Error ? error.message : 'Ürün güncellenemedi',
      icon: 'i-lucide-x',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

async function deleteProduct(id: number) {
  const confirmed = await new Promise<boolean>((resolve) => {
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

  const product = products.value?.find(p => p.id === id)

  try {
    await $fetch(`/api/products?id=${id}`, {
      method: 'DELETE'
    })

    if (product) {
      await logTransaction(
        'Ürün Silindi',
        `Ürün silindi: ${product.name}`
      )
    }

    toast.add({
      title: 'Başarılı',
      description: 'Ürün silindi',
      icon: 'i-lucide-check',
      color: 'success'
    })

    await refresh()
  } catch (error: unknown) {
    toast.add({
      title: 'Hata',
      description: error instanceof Error ? error.message : 'Ürün silinemedi',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
}

function resetForm() {
  state.name = ''
  state.description = ''
  state.price = 0
  state.stock = 0
  state.category = undefined
  state.size = ''
  selectedProduct.value = null
}
</script>

<template>
  <UDashboardPanel id="products">
    <template #header>
      <UDashboardNavbar title="Ürünler">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="Ürün Ekle"
            icon="i-lucide-plus"
            @click="openAddModal"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex items-center gap-3">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Ürün ara..."
              class="w-full max-w-xs"
            />

            <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <UButton
                v-for="tab in seasonTabs"
                :key="tab.value"
                :label="tab.label"
                :color="selectedSeason === tab.value ? 'primary' : 'neutral'"
                :variant="selectedSeason === tab.value ? 'solid' : 'ghost'"
                size="sm"
                @click="selectedSeason = tab.value as any"
              />
            </div>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="products" class="space-y-4">
        <UTable
          ref="table"
          :data="filteredProducts"
          :columns="columns"
          :loading="!products"
        />

        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <p>Toplam ürün: {{ filteredProducts.length }}</p>
          <p>Toplam değer: ₺{{ (filteredProducts.reduce((sum, p) => sum + (p.price * p.stock), 0)).toFixed(2) }}</p>
        </div>
      </div>
      <div v-else class="text-center py-12">
        <UIcon name="i-lucide-loader" class="size-8 animate-spin mx-auto" />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Ürün Ekle Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeAddModal">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Yeni Ürün Ekle
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Yeni bir ürün eklemek için formu doldurun
                </p>
              </div>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="closeAddModal"
              />
            </div>

            <UForm
              :schema="schema"
              :state="state"
              class="space-y-4"
              @submit="onSubmitAdd"
            >
              <UFormField label="Ürün Adı" name="name">
                <UInput v-model="state.name" placeholder="Ürün adını girin" />
              </UFormField>

              <UFormField label="Açıklama" name="description">
                <UTextarea v-model="state.description" placeholder="Ürün açıklamasını girin" :rows="3" />
              </UFormField>

              <UFormField label="Beden Ölçü" name="size">
                <UInput v-model="state.size" placeholder="Örn: S, M, L, XL veya 38, 40, 42" />
              </UFormField>

              <UFormField label="Kategori" name="category">
                <div class="flex gap-2">
                  <UButton
                    v-for="cat in [{ label: 'Kış', value: 'kış' }, { label: 'Yaz', value: 'yaz' }] as const"
                    :key="cat.value"
                    :label="cat.label"
                    :color="state.category === cat.value ? 'primary' : 'neutral'"
                    :variant="state.category === cat.value ? 'solid' : 'outline'"
                    block
                    @click="state.category = cat.value"
                  />
                </div>
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Fiyat (₺)" name="price">
                  <UInput
                    v-model.number="state.price"
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </UFormField>

                <UFormField label="Stok (Adet)" name="stock">
                  <UInput
                    v-model.number="state.stock"
                    type="number"
                    placeholder="0"
                    min="0"
                  />
                </UFormField>
              </div>

              <div class="flex justify-end gap-2 pt-4">
                <UButton
                  label="İptal"
                  color="neutral"
                  variant="ghost"
                  @click="closeAddModal"
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

  <!-- Stok Çıkış Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isStockOutModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="isStockOutModalOpen = false">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Stok Çıkışı
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {{ selectedProduct?.name }}
                </p>
              </div>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="isStockOutModalOpen = false"
              />
            </div>

            <div class="space-y-4">
              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Mevcut Stok:</span>
                  <span class="text-lg font-semibold text-gray-900 dark:text-white">{{ selectedProduct?.stock }} adet</span>
                </div>
              </div>

              <UFormField label="Çıkış Miktarı" name="quantity">
                <UInput
                  v-model.number="stockOutQuantity"
                  type="number"
                  placeholder="Adet"
                  min="1"
                  :max="selectedProduct?.stock"
                  size="xl"
                  class="text-lg w-full"
                />
              </UFormField>

              <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-blue-600 dark:text-blue-400">Kalan Stok:</span>
                  <span class="text-lg font-semibold text-blue-700 dark:text-blue-300">
                    {{ Math.max(0, (selectedProduct?.stock || 0) - stockOutQuantity) }} adet
                  </span>
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-4">
                <UButton
                  label="İptal"
                  color="neutral"
                  variant="ghost"
                  @click="isStockOutModalOpen = false"
                />
                <UButton
                  label="Çıkış Yap"
                  icon="i-lucide-package-minus"
                  color="error"
                  :loading="isLoading"
                  @click="submitStockOut"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Ürün Düzenle Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isEditModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeEditModal">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Ürün Düzenle
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Ürün bilgilerini güncelleyin
                </p>
              </div>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="closeEditModal"
              />
            </div>

            <UForm
              :schema="schema"
              :state="state"
              class="space-y-4"
              @submit="onSubmitEdit"
            >
              <UFormField label="Ürün Adı" name="name">
                <UInput v-model="state.name" placeholder="Ürün adını girin" />
              </UFormField>

              <UFormField label="Açıklama" name="description">
                <UTextarea v-model="state.description" placeholder="Ürün açıklamasını girin" :rows="3" />
              </UFormField>

              <UFormField label="Beden Ölçü" name="size">
                <UInput v-model="state.size" placeholder="Örn: S, M, L, XL veya 38, 40, 42" />
              </UFormField>

              <UFormField label="Kategori" name="category">
                <div class="flex gap-2">
                  <UButton
                    v-for="cat in [{ label: 'Kış', value: 'kış' }, { label: 'Yaz', value: 'yaz' }] as const"
                    :key="cat.value"
                    :label="cat.label"
                    :color="state.category === cat.value ? 'primary' : 'neutral'"
                    :variant="state.category === cat.value ? 'solid' : 'outline'"
                    block
                    @click="state.category = cat.value"
                  />
                </div>
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Fiyat (₺)" name="price">
                  <UInput
                    v-model.number="state.price"
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </UFormField>

                <UFormField label="Stok (Adet)" name="stock">
                  <UInput
                    v-model.number="state.stock"
                    type="number"
                    placeholder="0"
                    min="0"
                  />
                </UFormField>
              </div>

              <div class="flex justify-end gap-2 pt-4">
                <UButton
                  label="İptal"
                  color="neutral"
                  variant="ghost"
                  @click="closeEditModal"
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
