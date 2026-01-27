<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { LoginUser } from '~/types'

definePageMeta({
  layout: false
})

const router = useRouter()
const toast = useToast()
const colorMode = useColorMode()
const { setUser } = useCurrentUser()

const schema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(6, 'En az 6 karakter olmalıdır')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: '',
  password: ''
})

const isLoading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isLoading.value = true
  try {
    const { data } = await useFetch<{ success: boolean, user: LoginUser }>('/api/users', {
      method: 'POST',
      body: {
        email: event.data.email,
        password: event.data.password
      }
    })

    if (data.value?.success) {
      const user = data.value.user
      setUser({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar?.src ? { src: user.avatar.src, alt: user.avatar.alt || user.name } : undefined
      })

      toast.add({
        title: 'Başarılı',
        description: `Hoş geldiniz, ${user.name}!`,
        icon: 'i-lucide-check',
        color: 'success'
      })

      await router.push('/dashboard')
    }
  } catch (error: unknown) {
    toast.add({
      title: 'Hata',
      description: error instanceof Error ? error.message : 'E-posta veya şifre yanlış',
      icon: 'i-lucide-x',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-linear-to-br from-primary/10 to-primary/5 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
    <div class="w-full max-w-md">
      <!-- Logo ve Başlık -->
      <div class="text-center mb-8">
        <div class="flex justify-center items-center gap-4 mb-4">
          <img src="/logo.png" alt="Stok Takibi" class="h-20 w-20 object-contain">
          <div class="p-3 rounded-full bg-primary/10 dark:bg-primary/20">
            <UIcon name="i-lucide-package" class="size-8 text-primary" />
          </div>
        </div>
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Stok Takibi
        </h1>
        <p class="text-gray-600 dark:text-gray-400 text-lg">
          Hesabınıza giriş yapın
        </p>
      </div>

      <!-- Login Kartı -->
      <UCard class="shadow-lg border-0 dark:bg-gray-800/50">
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-5"
          @submit="onSubmit"
        >
          <!-- Email Field -->
          <div>
            <UFormField label="E-posta Adresi" name="email">
              <UInput
                v-model="state.email"
                type="email"
                placeholder="example@email.com"
                icon="i-lucide-mail"
                size="lg"
                autofocus
                class="w-full"
                :ui="{ base: 'rounded-lg' }"
              />
            </UFormField>
          </div>

          <!-- Password Field -->
          <div>
            <UFormField label="Şifre" name="password">
              <UInput
                v-model="state.password"
                type="password"
                placeholder="••••••••"
                icon="i-lucide-lock"
                size="lg"
                class="w-full"
                :ui="{ base: 'rounded-lg' }"
              />
            </UFormField>
          </div>

          <!-- Demo Bilgileri -->
          <!-- <UCard variant="soft" color="blue">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-info" class="size-5" />
                <span class="font-semibold">Demo Hesapları</span>
              </div>
            </template>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <span class="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">admin@example.com</span>
                <span class="text-gray-500">/</span>
                <span class="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">admin123</span>
              </div>
              <div class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <span class="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">user@example.com</span>
                <span class="text-gray-500">/</span>
                <span class="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">user123</span>
              </div>
            </div>
          </UCard> -->

          <!-- Login Button -->
          <UButton
            label="Giriş Yap"
            type="submit"
            block
            size="lg"
            :loading="isLoading"
            class="rounded-lg font-semibold"
          />
        </UForm>
      </UCard>

      <!-- Footer -->
      <div class="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Stok Takibi Sistemi © 2026</p>
      </div>

      <!-- Theme Toggle -->
      <div class="mt-4 flex justify-center">
        <UButton
          :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
        />
      </div>
    </div>
  </div>
</template>
