<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const toast = useToast()
const { isSupervisorPlus } = useRole()

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
const supervisorOnlyRoutes = ['/dashboard', '/accounting', '/gecmis']

const visibleLinks = computed(() =>
  isSupervisorPlus.value
    ? allLinks
    : allLinks.filter(l => !supervisorOnlyRoutes.includes(l.to as string))
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
