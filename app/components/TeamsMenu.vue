<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()

const team = {
  label: 'إدارة المخزون',
  avatar: {
    src: '/logo.png',
    alt: 'إدارة المخزون'
  }
}
</script>

<template>
  <UButton
    v-bind="{
      ...team,
      label: collapsed ? undefined : team.label
    }"
    color="neutral"
    variant="ghost"
    block
    :square="collapsed"
    :class="[!collapsed && 'py-1']"
  />
</template>
