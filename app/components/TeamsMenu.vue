<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()

const team = {
  label: 'Nuxt',
  avatar: {
    src: 'https://github.com/nuxt.png',
    alt: 'Nuxt'
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
