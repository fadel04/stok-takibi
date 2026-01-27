<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const fileRef = ref<HTMLInputElement>()
const { currentUser, setUser, loadUser } = useCurrentUser()
const router = useRouter()

const profileSchema = z.object({
  name: z.string().min(2, 'Çok kısa'),
  email: z.string().email('Geçersiz e-posta'),
  username: z.string().min(2, 'Çok kısa'),
  avatar: z.string().optional(),
  bio: z.string().optional()
})

type ProfileSchema = z.output<typeof profileSchema>

onMounted(() => {
  loadUser()
  if (!currentUser.value) {
    router.push('/login')
  } else {
    // Load current user data into profile form
    profile.name = currentUser.value.name || ''
    profile.email = currentUser.value.email || ''
    profile.username = currentUser.value.username || ''
    profile.avatar = currentUser.value.avatar?.src
    profile.bio = currentUser.value.bio
  }
})

const profile = reactive<Partial<ProfileSchema>>({
  name: '',
  email: '',
  username: '',
  avatar: undefined,
  bio: undefined
})
const toast = useToast()
const isUploading = ref(false)

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  if (currentUser.value) {
    let avatarPath = event.data.avatar

    if (event.data.avatar && event.data.avatar.startsWith('data:image/')) {
      isUploading.value = true
      try {
        const response = await $fetch<{ success: boolean; path: string }>('/api/upload-avatar', {
          method: 'POST',
          body: {
            avatar: event.data.avatar,
            userId: currentUser.value.id
          }
        })

        if (response.success) {
          avatarPath = response.path
        }
      } catch (error) {
        toast.add({
          title: 'Hata',
          description: 'Avatar yüklenemedi',
          icon: 'i-lucide-x',
          color: 'error'
        })
        isUploading.value = false
        return
      } finally {
        isUploading.value = false
      }
    }

    const updatedUser = {
      ...currentUser.value,
      name: event.data.name,
      email: event.data.email,
      username: event.data.username,
      bio: event.data.bio,
      avatar: avatarPath ? {
        src: avatarPath,
        alt: event.data.name
      } : currentUser.value.avatar
    }

    try {
      await $fetch('/api/users', {
        method: 'PUT',
        body: {
          id: currentUser.value.id,
          name: event.data.name,
          email: event.data.email,
          username: event.data.username,
          bio: event.data.bio,
          avatar: updatedUser.avatar
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

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement

  if (!input.files?.length) {
    return
  }

  const file = input.files[0]!

  // Check file size (1MB max)
  if (file.size > 1024 * 1024) {
    toast.add({
      title: 'Hata',
      description: 'Dosya boyutu 1MB\'dan büyük olamaz',
      icon: 'i-lucide-x',
      color: 'error'
    })
    return
  }

  // Convert to base64
  const reader = new FileReader()
  reader.onload = (event) => {
    profile.avatar = event.target?.result as string
  }
  reader.readAsDataURL(file)
}

function onFileClick() {
  fileRef.value?.click()
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
        :loading="isUploading"
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
      <UFormField
        name="avatar"
        label="Avatar"
        description="JPG, GIF veya PNG. Maksimum 1MB."
        class="flex max-sm:flex-col justify-between sm:items-center gap-4"
      >
        <div class="flex flex-wrap items-center gap-3">
          <UAvatar
            :src="profile.avatar"
            :alt="profile.name"
            size="lg"
          />
          <UButton
            label="Seç"
            color="neutral"
            @click="onFileClick"
          />
          <input
            ref="fileRef"
            type="file"
            class="hidden"
            accept=".jpg, .jpeg, .png, .gif"
            @change="onFileChange"
          >
        </div>
      </UFormField>
      <USeparator />
      <UFormField
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
      </UFormField>
    </UPageCard>
  </UForm>
</template>
