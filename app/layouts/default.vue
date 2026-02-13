<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const toast = useToast()

const open = ref(false)

const links = [[{
  label: 'لوحة التحكم',
  icon: 'i-lucide-house',
  to: '/dashboard',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'المنتجات',
  icon: 'i-lucide-package',
  to: '/products',
  onSelect: () => {
    open.value = false
  }
// }, {
//   label: 'الفواتير',
//   icon: 'i-lucide-file-text',
//   to: '/invoices',
//   onSelect: () => {
//     open.value = false
//   }
}, {
  label: 'المحاسبة',
  icon: 'i-lucide-calculator',
  to: '/accounting',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'السجل',
  icon: 'i-lucide-history',
  to: '/gecmis',
  onSelect: () => {
    open.value = false
  }
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
    onSelect: () => {
      open.value = false
    }
    // }, {

  //   label: 'الأمان',
  //   to: '/settings/security',
  //   onSelect: () => {
  //     open.value = false
  //   }
  }]
}]
// [
//   {
//   label: 'Geri Bildirim',
//   icon: 'i-lucide-message-circle',
//   to: 'https://github.com/nuxt-ui-templates/dashboard',
//   target: '_blank'
//   }, {
//   label: 'المساعدة والدعم',
//   icon: 'i-lucide-info',
//   to: 'https://github.com/nuxt-ui-templates/dashboard',
//   target: '_blank'
// }
// ]
] satisfies NavigationMenuItem[][]

const groups = computed(() => [{
  id: 'links',
  label: 'الصفحات',
  items: links.flat()
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
          :items="links[0]"
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
