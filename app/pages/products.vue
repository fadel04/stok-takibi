<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import type { Product } from '~/types'

const toast = useToast()
const { logTransaction } = useTransactionLogger()
const table = useTemplateRef('table')

const schema = z.object({
  name: z.string().min(2, 'حرفان على الأقل'),
  description: z.string().optional(),
  price: z.number().min(0, 'لا يمكن أن يكون السعر أقل من 0'),
  stock: z.number().min(0, 'لا يمكن أن يكون المخزون أقل من 0'),
  category: z.string({ message: 'اختر الفئة' }),
  size: z.string().optional(),
  barcode: z.string().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema> & { category?: string }>({
  name: '',
  description: '',
  price: 0,
  stock: 0,
  category: undefined,
  size: '',
  barcode: ''
})

const barcodeInput = ref('')
const { threshold } = useLowStockThreshold()
const { isAdmin, isSupervisorPlus } = useRole()

// Categories
interface Category { id: number; name: string }
const { data: categoriesList, refresh: refreshCategories } = await useFetch<Category[]>('/api/categories', {
  lazy: true,
  default: () => []
})
const isCategoriesModalOpen = ref(false)
const newCategoryName = ref('')
const isCategoryLoading = ref(false)

const addCategory = async () => {
  if (!newCategoryName.value.trim()) return
  isCategoryLoading.value = true
  try {
    await $fetch('/api/categories', { method: 'POST', body: { name: newCategoryName.value.trim() } })
    newCategoryName.value = ''
    await refreshCategories()
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'حدث خطأ', color: 'error' })
  } finally {
    isCategoryLoading.value = false
  }
}

const deleteCategory = async (id: number) => {
  try {
    await $fetch('/api/categories', { method: 'DELETE', body: { id } })
    await refreshCategories()
  } catch {
    toast.add({ title: 'حدث خطأ أثناء الحذف', color: 'error' })
  }
}

const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isStockOutModalOpen = ref(false)
const selectedProduct = ref<Product | null>(null)
const stockOutQuantity = ref(1)
const isLoading = ref(false)
const searchQuery = ref('')
const selectedSeason = ref<string>('all')

const seasonTabs = computed(() => [
  { label: 'الكل', value: 'all' },
  ...(categoriesList.value?.map(c => ({ label: c.name, value: c.name })) ?? [])
])

const { data: products, refresh } = await useFetch<Product[]>('/api/products', {
  key: 'products',
  lazy: true
})

// Watch URL query param - handles both first load and navigation between products
const route = useRoute()
watch(() => route.query.q, (q) => {
  searchQuery.value = (q as string) || ''
}, { immediate: true })

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
    header: 'اسم المنتج',
    cell: ({ row }) => row.original.name
  },
  {
    accessorKey: 'description',
    header: 'الوصف',
    cell: ({ row }) => row.original.description
  },
  {
    accessorKey: 'barcode',
    header: 'الباركود',
    cell: ({ row }) => row.original.barcode || '-'
  },
  {
    accessorKey: 'size',
    header: 'المقاس',
    cell: ({ row }) => row.original.size || '-'
  },
  {
    accessorKey: 'price',
    header: 'السعر',
    cell: ({ row }) => `MRU ${row.original.price.toFixed(2)}`
  },
  {
    accessorKey: 'stock',
    header: 'المخزون',
    cell: ({ row }) => {
      const stock = row.original.stock
      const UIcon = resolveComponent('UIcon')

      if (stock === 0) {
        return h('div', { class: 'flex items-center gap-1' }, [
          h(UIcon, { name: 'i-lucide-package-x', class: 'size-4 text-red-500' }),
          h('span', { class: 'text-red-500 font-semibold text-lg' }, `${stock}`)
        ])
      }
      if (stock <= threshold.value) {
        return h('div', { class: 'flex items-center gap-1' }, [
          h(UIcon, { name: 'i-lucide-alert-triangle', class: 'size-4 text-yellow-500' }),
          h('span', { class: 'text-yellow-500 font-semibold text-lg' }, `${stock}`)
        ])
      }
      return h('span', { class: 'text-green-500 font-semibold text-lg' }, `${stock}`)
    }
  },
  {
    id: 'stockOut',
    header: 'إخراج مخزون',
    cell: ({ row }) => {
      const stock = row.original.stock
      const UButton = resolveComponent('UButton')
      return h(UButton, {
        label: 'إخراج',
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
    header: 'الإجراءات',
    cell: ({ row }) => {
      const UButton = resolveComponent('UButton')
      const buttons = []

      // Edit: supervisor and admin only
      if (isSupervisorPlus.value) {
        buttons.push(h(UButton, {
          icon: 'i-lucide-edit',
          color: 'blue',
          variant: 'ghost',
          onClick: () => openEditModal(row.original)
        }))
      }

      // Delete: admin only
      if (isAdmin.value) {
        buttons.push(h(UButton, {
          icon: 'i-lucide-trash',
          color: 'error',
          variant: 'ghost',
          onClick: () => deleteProduct(row.original.id)
        }))
      }

      return h('div', { class: 'flex gap-2' }, buttons)
    }
  }
]

function openEditModal(product: Product) {
  selectedProduct.value = product
  state.name = product.name
  state.description = product.description
  state.price = product.price
  state.stock = product.stock
  state.category = product.category
  state.size = product.size || ''
  state.barcode = product.barcode || ''
  isEditModalOpen.value = true
}

function handleScan(code: string) {
  const found = products.value?.find(p => p.barcode === code)
  barcodeInput.value = ''

  if (found) {
    openStockOutModal(found)
  } else {
    toast.add({
      title: 'لم يتم العثور على منتج',
      description: `لا يوجد منتج بالباركود: ${code}`,
      icon: 'i-lucide-scan-line',
      color: 'warning'
    })
  }
}

// Global scanner: works anywhere on the page without clicking the field
useBarcodeScanner(handleScan, (buf) => {
  barcodeInput.value = buf
})

// Manual input handler (for typing in the barcode field directly)
function onManualBarcode() {
  const code = barcodeInput.value.trim()
  if (code) handleScan(code)
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
      title: 'خطأ',
      description: 'لا يمكن أن تتجاوز كمية الإخراج المخزون الحالي',
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
        barcode: product.barcode,
        createdAt: product.createdAt
      }
    })

    await refresh()

    await logTransaction(
      'إخراج مخزون',
      `${product.name}: ${product.stock} → ${newStock} (-${quantity})`
    )

    toast.add({
      title: 'إخراج مخزون نجاح',
      description: `${product.name}: ${quantity} قطعة تم إخراجها`,
      icon: 'i-lucide-package-minus',
      color: 'success'
    })

    isStockOutModalOpen.value = false
    selectedProduct.value = null
    stockOutQuantity.value = 1
  } catch (error: unknown) {
    toast.add({
      title: 'خطأ',
      description: error instanceof Error ? error.message : 'تعذر تنفيذ إخراج المخزون',
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
        barcode: product.barcode,
        createdAt: product.createdAt
      }
    })

    await refresh()

    const changeText = change > 0 ? `+${change}` : change.toString()
    await logTransaction(
      'تم تحديث المخزون',
      `${product.name}: ${product.stock} → ${newStock} (${changeText})`
    )

    toast.add({
      title: 'تم تحديث المخزون',
      description: `${product.name}: ${product.stock} → ${newStock} (${changeText})`,
      icon: 'i-lucide-package',
      color: 'info'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'خطأ',
      description: error instanceof Error ? error.message : 'تعذر تحديث المخزون',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
}

async function onSubmitAdd(event: FormSubmitEvent<Schema>) {
  isLoading.value = true
  try {
    await logTransaction(
      'تمت إضافة منتج',
      `تمت إضافة منتج جديد: ${event.data.name}`
    )

    await $fetch('/api/products', {
      method: 'POST',
      body: event.data
    })

    toast.add({
      title: 'نجاح',
      description: 'تمت إضافة المنتج',
      icon: 'i-lucide-check',
      color: 'success'
    })

    isAddModalOpen.value = false
    resetForm()
    await refresh()
  } catch (error: unknown) {
    toast.add({
      title: 'خطأ',
      description: error instanceof Error ? error.message : 'تعذر إضافة المنتج',
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
      'تم تحديث المنتج',
      `تم تحديث المنتج: ${event.data.name}`
    )

    toast.add({
      title: 'نجاح',
      description: 'تم تحديث المنتج',
      icon: 'i-lucide-check',
      color: 'success'
    })

    isEditModalOpen.value = false
    resetForm()
    await refresh()
  } catch (error: unknown) {
    toast.add({
      title: 'خطأ',
      description: error instanceof Error ? error.message : 'تعذر تحديث المنتج',
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
      title: 'هل أنت متأكد من الحذف؟',
      description: 'لا يمكن التراجع عن هذا الإجراء',
      actions: [
        {
          label: 'نعم، احذف',
          color: 'error',
          onClick: () => resolve(true)
        },
        {
          label: 'إلغاء',
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
        'تم حذف المنتج',
        `تم حذف المنتج: ${product.name}`
      )
    }

    toast.add({
      title: 'نجاح',
      description: 'تم حذف المنتج',
      icon: 'i-lucide-check',
      color: 'success'
    })

    await refresh()
  } catch (error: unknown) {
    toast.add({
      title: 'خطأ',
      description: error instanceof Error ? error.message : 'تعذر حذف المنتج',
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
  state.barcode = ''
  selectedProduct.value = null
}
</script>

<template>
  <UDashboardPanel id="products">
    <template #header>
      <UDashboardNavbar title="المنتجات">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            v-if="isAdmin"
            icon="i-lucide-tags"
            color="neutral"
            variant="outline"
            @click="isCategoriesModalOpen = true"
          >
            إدارة الفئات
          </UButton>
          <UButton
            v-if="isSupervisorPlus"
            label="إضافة منتج"
            icon="i-lucide-plus"
            @click="openAddModal"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
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

          <UInput
            ref="barcodeInputRef"
            v-model="barcodeInput"
            icon="i-lucide-scan-line"
            placeholder="امسح الباركود هنا..."
            class="w-56"
            data-barcode-input
            @keydown.enter.prevent="onManualBarcode"
          />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">حد التنبيه:</span>
            <UInput
              v-model.number="threshold"
              type="number"
              min="1"
              class="w-20"
            />
          </div>
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="ابحث عن منتج..."
            class="w-64"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="products" class="space-y-4">
        <HomeLowStockAlert />
        <UTable
          ref="table"
          :data="filteredProducts"
          :columns="columns"
          :loading="!products"
        />

        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <p>إجمالي المنتجات: {{ filteredProducts.length }}</p>
          <p>إجمالي القيمة: MRU {{ (filteredProducts.reduce((sum, p) => sum + (p.price * p.stock), 0)).toFixed(2) }}</p>
        </div>
      </div>
      <div v-else class="text-center py-12">
        <UIcon name="i-lucide-loader" class="size-8 animate-spin mx-auto" />
      </div>
    </template>
  </UDashboardPanel>

  <!-- إضافة منتج Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeAddModal">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  إضافة منتج جديد
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  املأ النموذج لإضافة منتج جديد
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
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="اسم المنتج" name="name">
                  <UInput v-model="state.name" placeholder="أدخل اسم المنتج" />
                </UFormField>

                <UFormField label="المقاس" name="size">
                  <UInput v-model="state.size" placeholder="مثال: S, M, L, XL" />
                </UFormField>
              </div>

              <UFormField label="الباركود" name="barcode">
                <UInput v-model="state.barcode" icon="i-lucide-scan-line" placeholder="امسح الباركود أو أدخله يدوياً" />
              </UFormField>

              <UFormField label="الفئة" name="category">
                <div class="flex flex-wrap gap-2">
                  <UButton
                    v-for="cat in categoriesList"
                    :key="cat.id"
                    :label="cat.name"
                    :color="state.category === cat.name ? 'primary' : 'neutral'"
                    :variant="state.category === cat.name ? 'solid' : 'outline'"
                    @click="state.category = cat.name"
                  />
                </div>
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="السعر (MRU)" name="price">
                  <UInput
                    v-model.number="state.price"
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </UFormField>

                <UFormField label="المخزون (قطعة)" name="stock">
                  <UInput
                    v-model.number="state.stock"
                    type="number"
                    placeholder="0"
                    min="0"
                  />
                </UFormField>

                <UFormField label="الوصف" name="description">
                  <UTextarea v-model="state.description" placeholder="أدخل وصف المنتج" :rows="3" />
                </UFormField>
              </div>

              <div class="flex justify-end gap-2 pt-4">
                <UButton
                  label="إلغاء"
                  color="neutral"
                  variant="ghost"
                  @click="closeAddModal"
                />
                <UButton
                  label="إضافة"
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

  <!-- المخزون إخراج Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isStockOutModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="isStockOutModalOpen = false">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  إخراج مخزون
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
                  <span class="text-sm text-gray-600 dark:text-gray-400">المخزون الحالي:</span>
                  <span class="text-lg font-semibold text-gray-900 dark:text-white">{{ selectedProduct?.stock }} قطعة</span>
                </div>
              </div>

              <UFormField label="كمية الإخراج" name="quantity">
                <UInput
                  v-model.number="stockOutQuantity"
                  type="number"
                  placeholder="قطعة"
                  min="1"
                  :max="selectedProduct?.stock"
                  size="xl"
                  class="text-lg w-full"
                />
              </UFormField>

              <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-blue-600 dark:text-blue-400">المخزون المتبقي:</span>
                  <span class="text-lg font-semibold text-blue-700 dark:text-blue-300">
                    {{ Math.max(0, (selectedProduct?.stock || 0) - stockOutQuantity) }} قطعة
                  </span>
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-4">
                <UButton
                  label="إلغاء"
                  color="neutral"
                  variant="ghost"
                  @click="isStockOutModalOpen = false"
                />
                <UButton
                  label="تنفيذ الإخراج"
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

  <!-- تعديل المنتج Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isEditModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeEditModal">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  تعديل المنتج
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  حدّث بيانات المنتج
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
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="اسم المنتج" name="name">
                  <UInput v-model="state.name" placeholder="أدخل اسم المنتج" />
                </UFormField>

                <UFormField label="المقاس" name="size">
                  <UInput v-model="state.size" placeholder="مثال: S, M, L, XL" />
                </UFormField>
              </div>

              <UFormField label="الباركود" name="barcode">
                <UInput v-model="state.barcode" icon="i-lucide-scan-line" placeholder="امسح الباركود أو أدخله يدوياً" />
              </UFormField>

              <UFormField label="الوصف" name="description">
                <UTextarea v-model="state.description" placeholder="أدخل وصف المنتج" :rows="3" />
              </UFormField>

              <UFormField label="الفئة" name="category">
                <div class="flex flex-wrap gap-2">
                  <UButton
                    v-for="cat in categoriesList"
                    :key="cat.id"
                    :label="cat.name"
                    :color="state.category === cat.name ? 'primary' : 'neutral'"
                    :variant="state.category === cat.name ? 'solid' : 'outline'"
                    @click="state.category = cat.name"
                  />
                </div>
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="السعر (MRU)" name="price">
                  <UInput
                    v-model.number="state.price"
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </UFormField>

                <UFormField label="المخزون (قطعة)" name="stock">
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
                  label="إلغاء"
                  color="neutral"
                  variant="ghost"
                  @click="closeEditModal"
                />
                <UButton
                  label="تحديث"
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

  <!-- إدارة الفئات Modal -->
  <UModal v-model:open="isCategoriesModalOpen" title="إدارة الفئات">
    <template #body>
      <div class="space-y-4">
        <div class="flex gap-2">
          <UInput
            v-model="newCategoryName"
            placeholder="اسم الفئة الجديدة..."
            class="flex-1"
            @keydown.enter="addCategory"
          />
          <UButton
            icon="i-lucide-plus"
            :loading="isCategoryLoading"
            @click="addCategory"
          >
            إضافة
          </UButton>
        </div>
        <div class="space-y-2">
          <div
            v-for="cat in categoriesList"
            :key="cat.id"
            class="flex items-center justify-between px-3 py-2 rounded-lg border border-default"
          >
            <span class="font-medium text-sm">{{ cat.name }}</span>
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              color="error"
              variant="ghost"
              @click="deleteCategory(cat.id)"
            />
          </div>
          <p v-if="!categoriesList?.length" class="text-sm text-muted text-center py-4">
            لا توجد فئات
          </p>
        </div>
      </div>
    </template>
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
