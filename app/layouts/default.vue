<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const toast = useToast()
const { isSupervisorPlus, isAdmin } = useRole()

const open = ref(false)

const allLinks: NavigationMenuItem[] = [{
  label: 'لوحة التحكم',
  icon: 'i-lucide-house',
  to: '/dashboard',
  onSelect: () => { open.value = false }
}, {
  label: 'المنتجات',
  icon: 'i-lucide-package',
  to: '/products',
  onSelect: () => { open.value = false }
}, {
  label: 'نقطة البيع',
  icon: 'i-lucide-scan-barcode',
  to: '/cashier',
  onSelect: () => { open.value = false }
}, {
  label: 'الفواتير',
  icon: 'i-lucide-file-text',
  to: '/invoices',
  onSelect: () => { open.value = false }
}, {
  label: 'المحاسبة',
  icon: 'i-lucide-calculator',
  to: '/accounting',
  onSelect: () => { open.value = false }
}, {
  label: 'السجل',
  icon: 'i-lucide-history',
  to: '/gecmis',
  onSelect: () => { open.value = false }
}, {
  label: 'المصروفات',
  icon: 'i-lucide-receipt',
  to: '/expenses',
  onSelect: () => { open.value = false }
}, {
  label: 'المستخدمون',
  icon: 'i-lucide-users',
  to: '/users',
  onSelect: () => { open.value = false }
}, {
  label: 'الإعدادات',
  to: '/settings',
  icon: 'i-lucide-settings',
  defaultOpen: true,
  type: 'trigger',
  children: [{
    label: 'عام',
    to: '/settings',
    exact: true,
    onSelect: () => { open.value = false }
  }]
}]

// Supervisor+ routes hidden from staff
const supervisorOnlyRoutes = ['/dashboard', '/accounting', '/expenses', '/gecmis', '/invoices']
// Admin-only routes
const adminOnlyRoutes = ['/users']

const visibleLinks = computed(() =>
  allLinks.filter((l) => {
    const path = l.to as string
    if (adminOnlyRoutes.includes(path) && !isAdmin.value) return false
    if (supervisorOnlyRoutes.includes(path) && !isSupervisorPlus.value) return false
    return true
  })
)

const groups = computed(() => [{
  id: 'links',
  label: 'الصفحات',
  items: visibleLinks.value
}])

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title: 'نستخدم ملفات تعريف الارتباط الأساسية لتحسين تجربتك على موقعنا.',
    duration: 0,
    close: false,
    actions: [{
      label: 'قبول',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        cookie.value = 'accepted'
      }
    }, {
      label: 'رفض',
      color: 'neutral',
      variant: 'ghost'
    }]
  })
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="visibleLinks"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <ClientOnly>
          <UserMenu :collapsed="collapsed" />
        </ClientOnly>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />
  </UDashboardGroup>
</template>
