<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const toast = useToast()

const open = ref(false)

const links = [[{
  label: 'Kontrol Paneli',
  icon: 'i-lucide-house',
  to: '/dashboard',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Ürünler',
  icon: 'i-lucide-package',
  to: '/products',
  onSelect: () => {
    open.value = false
  }
// }, {
//   label: 'Faturalar',
//   icon: 'i-lucide-file-text',
//   to: '/invoices',
//   onSelect: () => {
//     open.value = false
//   }
}, {
  label: 'Geçmiş',
  icon: 'i-lucide-history',
  to: '/gecmis',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Ayarlar',
  to: '/settings',
  icon: 'i-lucide-settings',
  defaultOpen: true,
  type: 'trigger',
  children: [{
    label: 'Genel',
    to: '/settings',
    exact: true,
    onSelect: () => {
      open.value = false
    }
    // }, {

  //   label: 'Güvenlik',
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
//   label: 'Yardım ve Destek',
//   icon: 'i-lucide-info',
//   to: 'https://github.com/nuxt-ui-templates/dashboard',
//   target: '_blank'
// }
// ]
] satisfies NavigationMenuItem[][]

const groups = computed(() => [{
  id: 'links',
  label: 'Sayfalar',
  items: links.flat()
}])

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title: 'Web sitemizde deneyiminizi geliştirmek için birinci taraf çerezleri kullanıyoruz.',
    duration: 0,
    close: false,
    actions: [{
      label: 'Kabul Et',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        cookie.value = 'accepted'
      }
    }, {
      label: 'Reddet',
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
