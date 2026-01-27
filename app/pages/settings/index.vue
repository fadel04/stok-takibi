<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { currentUser, setUser, loadUser } = useCurrentUser()
const router = useRouter()

const profileSchema = z.object({
  name: z.string().min(2, 'Çok kısa'),
  email: z.string().email('Geçersiz e-posta'),
  username: z.string().min(2, 'Çok kısa'),
  bio: z.string().optional()
})

type ProfileSchema = z.output<typeof profileSchema>

onMounted(() => {
  loadUser()
  if (!currentUser.value) {
    router.push('/login')
  } else {
    profile.name = currentUser.value.name || ''
    profile.email = currentUser.value.email || ''
  }
})

const profile = reactive<Partial<ProfileSchema>>({
  name: '',
  email: '',
  username: '',
  bio: undefined
})
const toast = useToast()

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  if (currentUser.value) {
    const updatedUser = {
      ...currentUser.value,
      name: event.data.name,
      email: event.data.email,
      username: event.data.username,
      bio: event.data.bio
    }

    try {
      await $fetch('/api/users', {
        method: 'PUT',
        body: {
          id: currentUser.value.id,
          name: event.data.name,
          email: event.data.email,
          username: event.data.username,
          bio: event.data.bio
        }
      })

      setUser(updatedUser)

      toast.add({
        title: 'Başarılı',
        description: 'Ayarlarınız güncellendi.',
        icon: 'i-lucide-check',
        color: 'success'
      })
    } catch (error) {
      toast.add({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Ayarlar güncellenemedi',
        icon: 'i-lucide-x',
        color: 'error'
      })
    }
  }
}
</script>

<template>
  <UForm
    id="settings"
    :schema="profileSchema"
    :state="profile"
    @submit="onSubmit"
  >
    <UPageCard
      title="Profil"
      description="Bu bilgiler herkese açık olarak görüntülenecektir."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        label="Değişiklikleri kaydet"
        color="neutral"
        type="submit"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="name"
        label="İsim"
        description="Fişlerde, faturalarda ve diğer iletişimlerde görünecektir."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.name"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="email"
        label="E-posta"
        description="Oturum açmak, e-posta makbuzları ve ürün güncellemeleri için kullanılır."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.email"
          type="email"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="username"
        label="Kullanıcı adı"
        description="Giriş için benzersiz kullanıcı adınız ve profil URL'niz."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.username"
          type="username"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <!-- <UFormField
        name="bio"
        label="Biyografi"
        description="Profiliniz için kısa açıklama. URL'ler hiper bağlantılıdır."
        class="flex max-sm:flex-col justify-between items-start gap-4"
        :ui="{ container: 'w-full' }"
      >
        <UTextarea
          v-model="profile.bio"
          :rows="5"
          autoresize
          class="w-full"
        />
      </UFormField> -->
    </UPageCard>
  </UForm>
</template>
