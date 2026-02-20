<script setup lang="ts">
import type { Product } from '~/types'

interface CartItem {
  product: Product
  quantity: number
}

const toast = useToast()
const { currentUser } = useCurrentUser()
const { logTransaction } = useTransactionLogger()

const cart = ref<CartItem[]>([])
const manualBarcode = ref('')
const isCheckingOut = ref(false)
const lastScanned = ref<Product | null>(null)

const { data: products, refresh: refreshProducts } = await useFetch<Product[]>('/api/products', {
  key: 'products',
  lazy: true,
  default: () => []
})

const findByBarcode = (barcode: string): Product | null =>
  products.value?.find(p => p.barcode === barcode) ?? null

const addToCart = (product: Product) => {
  if (product.stock === 0) {
    toast.add({ title: `نفد المخزون: ${product.name}`, color: 'error' })
    return
  }
  const existing = cart.value.find(i => i.product.id === product.id)
  if (existing) {
    if (existing.quantity >= product.stock) {
      toast.add({ title: 'المخزون غير كافٍ', color: 'error' })
      return
    }
    existing.quantity++
  } else {
    cart.value.push({ product, quantity: 1 })
  }
  lastScanned.value = product
}

const handleScan = (code: string) => {
  const product = findByBarcode(code)
  if (product) {
    addToCart(product)
    toast.add({ title: `✓ ${product.name}`, color: 'success', duration: 1500 })
  } else {
    toast.add({ title: `لم يُعثر على منتج بالباركود: ${code}`, color: 'error' })
  }
}

useBarcodeScanner(handleScan)

const handleManualScan = () => {
  const code = manualBarcode.value.trim()
  if (!code) return
  handleScan(code)
  manualBarcode.value = ''
}

const removeFromCart = (id: number) => {
  cart.value = cart.value.filter(i => i.product.id !== id)
}

const increment = (item: CartItem) => {
  if (item.quantity >= item.product.stock) {
    toast.add({ title: 'المخزون غير كافٍ', color: 'error' })
    return
  }
  item.quantity++
}

const decrement = (item: CartItem) => {
  if (item.quantity > 1) item.quantity--
  else removeFromCart(item.product.id)
}

const total = computed(() =>
  cart.value.reduce((s, i) => s + i.product.price * i.quantity, 0)
)

const clearCart = () => {
  cart.value = []
  lastScanned.value = null
}

const checkout = async () => {
  if (!cart.value.length) return
  isCheckingOut.value = true
  try {
    for (const item of cart.value) {
      const newStock = item.product.stock - item.quantity
      await $fetch('/api/products', {
        method: 'PUT',
        body: {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          price: item.product.price,
          stock: newStock,
          category: item.product.category,
          size: item.product.size,
          barcode: item.product.barcode
        }
      })
      await logTransaction(
        currentUser.value?.name || 'كاشير',
        'إخراج مخزون',
        `${item.product.name}: ${item.product.stock} → ${newStock} (-${item.quantity})`
      )
    }
    await refreshNuxtData('products')
    await refreshProducts()
    toast.add({
      title: 'تم تنفيذ البيع بنجاح',
      description: `الإجمالي: ${total.value.toFixed(2)} MRU`,
      color: 'success'
    })
    clearCart()
  } catch {
    toast.add({ title: 'حدث خطأ أثناء تنفيذ البيع', color: 'error' })
  } finally {
    isCheckingOut.value = false
  }
}

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'نقطة البيع' })
</script>

<template>
  <UDashboardPanel id="cashier">
    <template #header>
      <UDashboardNavbar title="نقطة البيع - الكاشير">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            v-if="cart.length"
            icon="i-lucide-trash-2"
            color="neutral"
            variant="outline"
            @click="clearCart"
          >
            مسح السلة
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 h-full">
        <!-- Left: Scanner -->
        <div class="flex flex-col gap-4">
          <!-- Barcode Input -->
          <div class="rounded-xl border border-default bg-elevated/30 p-6">
            <div class="flex items-center gap-3 mb-4">
              <UIcon name="i-lucide-scan-barcode" class="size-6 text-primary" />
              <h2 class="text-lg font-semibold">مسح الباركود</h2>
            </div>
            <div class="flex gap-2">
              <UInput
                v-model="manualBarcode"
                data-barcode-input
                placeholder="أدخل الباركود يدوياً أو استخدم الماسح..."
                class="flex-1"
                size="lg"
                autofocus
                @keydown.enter="handleManualScan"
              />
              <UButton
                icon="i-lucide-plus"
                size="lg"
                @click="handleManualScan"
              >
                إضافة
              </UButton>
            </div>
            <p class="mt-2 text-xs text-muted">
              <UIcon name="i-lucide-info" class="size-3 inline" />
              الماسح الضوئي يعمل تلقائياً في أي وقت
            </p>
          </div>

          <!-- Last Scanned -->
          <div
            v-if="lastScanned"
            class="rounded-xl border border-primary/30 bg-primary/5 p-5"
          >
            <p class="text-xs text-muted mb-2">آخر منتج تم مسحه</p>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-semibold text-lg">{{ lastScanned.name }}</p>
                <p class="text-sm text-muted">
                  {{ lastScanned.category }} · مخزون: {{ lastScanned.stock }}
                </p>
              </div>
              <p class="text-xl font-bold text-primary">
                {{ lastScanned.price.toFixed(2) }} <span class="text-sm">MRU</span>
              </p>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-if="!lastScanned"
            class="flex flex-col items-center justify-center rounded-xl border border-dashed border-default p-12 text-center"
          >
            <UIcon name="i-lucide-scan-barcode" class="size-12 text-muted mb-3" />
            <p class="text-sm text-muted">في انتظار مسح الباركود...</p>
          </div>
        </div>

        <!-- Right: Cart -->
        <div class="flex flex-col gap-4">
          <div class="rounded-xl border border-default bg-elevated/30 flex flex-col flex-1">
            <div class="flex items-center justify-between p-4 border-b border-default">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-shopping-cart" class="size-5 text-primary" />
                <h2 class="font-semibold">سلة المشتريات</h2>
                <UBadge v-if="cart.length" color="primary" variant="subtle" size="sm">
                  {{ cart.length }}
                </UBadge>
              </div>
            </div>

            <!-- Cart Items -->
            <div class="flex-1 overflow-y-auto">
              <div v-if="!cart.length" class="flex flex-col items-center justify-center py-16 text-center">
                <UIcon name="i-lucide-shopping-cart" class="size-10 text-muted mb-3" />
                <p class="text-sm text-muted">السلة فارغة</p>
              </div>

              <div v-else class="divide-y divide-default">
                <div
                  v-for="item in cart"
                  :key="item.product.id"
                  class="flex items-center gap-3 px-4 py-3"
                >
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">{{ item.product.name }}</p>
                    <p class="text-xs text-muted">{{ item.product.price.toFixed(2) }} MRU × {{ item.quantity }}</p>
                  </div>
                  <div class="flex items-center gap-1">
                    <UButton
                      icon="i-lucide-minus"
                      size="xs"
                      color="neutral"
                      variant="outline"
                      @click="decrement(item)"
                    />
                    <span class="w-8 text-center font-semibold text-sm">{{ item.quantity }}</span>
                    <UButton
                      icon="i-lucide-plus"
                      size="xs"
                      color="neutral"
                      variant="outline"
                      @click="increment(item)"
                    />
                  </div>
                  <p class="w-20 text-right font-semibold text-sm">
                    {{ (item.product.price * item.quantity).toFixed(2) }}
                  </p>
                  <UButton
                    icon="i-lucide-x"
                    size="xs"
                    color="error"
                    variant="ghost"
                    @click="removeFromCart(item.product.id)"
                  />
                </div>
              </div>
            </div>

            <!-- Total & Checkout -->
            <div class="border-t border-default p-4 space-y-3">
              <div class="flex items-center justify-between text-lg font-bold">
                <span>الإجمالي</span>
                <span class="text-primary">{{ total.toFixed(2) }} MRU</span>
              </div>
              <UButton
                block
                size="lg"
                icon="i-lucide-check-circle"
                :loading="isCheckingOut"
                :disabled="!cart.length"
                @click="checkout"
              >
                تأكيد البيع
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
