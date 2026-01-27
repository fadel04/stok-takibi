<script setup lang="ts">
const router = useRouter()

onMounted(() => {
  const currentUser = localStorage.getItem('currentUser')

  if (currentUser) {
    router.push('/dashboard')
  } else {
    router.push('/login')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="size-8 animate-spin border-4 border-primary border-t-transparent rounded-full" />
  </div>
</template>
