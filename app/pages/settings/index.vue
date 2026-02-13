<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { currentUser, setUser, loadUser } = useCurrentUser()
const router = useRouter()

const profileSchema = z.object({
  name: z.string().min(2, 'قصير جدًا'),
  email: z.string().email('بريد إلكتروني غير صالح'),
  username: z.string().min(2, 'قصير جدًا'),
  bio: z.string().optional()
})

type ProfileSchema = z.output<typeof profileSchema>

onMounted(() => {
  loadUser()
  if (!currentUser.value) {
    router.push('/login')
  } else {
    const user = currentUser.value as typeof currentUser.value & { username?: string, bio?: string }
    profile.name = currentUser.value.name || ''
    profile.email = currentUser.value.email || ''
    profile.username = user.username || ''
    profile.bio = user.bio || ''
  }
})

const profile = reactive<Partial<ProfileSchema>>({
  name: '',
  email: '',
  username: '',
  bio: ''
})
const toast = useToast()

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  if (!currentUser.value) return

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
      title: 'نجاح',
      description: 'تم تحديث الإعدادات.',
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'خطأ',
      description: error instanceof Error ? error.message : 'تعذر تحديث الإعدادات',
      icon: 'i-lucide-x',
      color: 'error'
    })
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
      title="الملف الشخصي"
      description="ستكون هذه المعلومات مرئية للجميع."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        label="حفظ التغييرات"
        color="neutral"
        type="submit"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="name"
        label="الاسم"
        description="سيظهر في الإيصالات والفواتير ووسائل التواصل الأخرى."
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
        label="البريد الإلكتروني"
        description="يُستخدم لتسجيل الدخول وإيصالات البريد الإلكتروني وتحديثات المنتجات."
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
        label="اسم المستخدم"
        description="اسم المستخدم الفريد لتسجيل الدخول ورابط ملفك الشخصي."
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
      <!--
      <UFormField
        name="bio"
        label="نبذة"
        description="وصف قصير لملفك الشخصي. الروابط تكون قابلة للنقر."
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
      -->
    </UPageCard>
  </UForm>
</template>
