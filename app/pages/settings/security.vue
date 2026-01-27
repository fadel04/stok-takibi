<script setup lang="ts">
import * as z from 'zod'
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

const { currentUser, setUser, loadUser } = useCurrentUser()
const toast = useToast()
const router = useRouter()

onMounted(() => {
  loadUser()
  if (!currentUser.value) {
    router.push('/login')
  }
})

const passwordSchema = z.object({
  current: z.string().min(8, 'En az 8 karakter olmalıdır'),
  new: z.string().min(8, 'En az 8 karakter olmalıdır')
})

type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive<Partial<PasswordSchema>>({
  current: undefined,
  new: undefined
})

const validate = (state: Partial<PasswordSchema>): FormError[] => {
  const errors: FormError[] = []
  if (state.current && state.new && state.current === state.new) {
    errors.push({ name: 'new', message: 'Şifreler farklı olmalıdır' })
  }
  return errors
}

async function onPasswordSubmit(event: FormSubmitEvent<PasswordSchema>) {
  if (!currentUser.value) return

  try {
    await $fetch('/api/users', {
      method: 'PUT',
      body: {
        id: currentUser.value.id,
        password: event.data.new
      }
    })

    const updatedUser = {
      ...currentUser.value,
      password: event.data.new
    }
    setUser(updatedUser)

    toast.add({
      title: 'Başarılı',
      description: 'Şifreniz güncellendi',
      icon: 'i-lucide-check',
      color: 'success'
    })

    password.current = undefined
    password.new = undefined
  } catch (error) {
    toast.add({
      title: 'Hata',
      description: error instanceof Error ? error.message : 'Şifre güncellenemedi',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
}
</script>

<template>
  <UPageCard
    title="Şifre"
    description="Yeni bir şifre belirlemeden önce mevcut şifrenizi onaylayın."
    variant="subtle"
  >
    <UForm
      :schema="passwordSchema"
      :state="password"
      :validate="validate"
      @submit="onPasswordSubmit"
      class="flex flex-col gap-4 max-w-xs"
    >
      <UFormField name="current">
        <UInput
          v-model="password.current"
          type="password"
          placeholder="Mevcut şifre"
          class="w-full"
        />
      </UFormField>

      <UFormField name="new">
        <UInput
          v-model="password.new"
          type="password"
          placeholder="Yeni şifre"
          class="w-full"
        />
      </UFormField>

      <UButton label="Güncelle" class="w-fit" type="submit" />
    </UForm>
  </UPageCard>

  <UPageCard
    title="Hesap"
    description="Artık hizmetimizi kullanmak istemiyor musunuz? Hesabınızı buradan silebilirsiniz. Bu işlem geri alınamaz. Bu hesapla ilgili tüm bilgiler kalıcı olarak silinecektir."
    class="bg-gradient-to-tl from-error/10 from-5% to-default"
  >
    <template #footer>
      <UButton label="Hesabı sil" color="error" />
    </template>
  </UPageCard>
</template>
