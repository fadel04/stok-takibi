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
  current: z.string().min(8, 'يجب ألا تقل عن 8 أحرف'),
  new: z.string().min(8, 'يجب ألا تقل عن 8 أحرف')
})

type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive<Partial<PasswordSchema>>({
  current: undefined,
  new: undefined
})

const validate = (state: Partial<PasswordSchema>): FormError[] => {
  const errors: FormError[] = []
  if (state.current && state.new && state.current === state.new) {
    errors.push({ name: 'new', message: 'يجب أن تكون كلمة المرور الجديدة مختلفة' })
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
      title: 'نجاح',
      description: 'تم تحديث كلمة المرور',
      icon: 'i-lucide-check',
      color: 'success'
    })

    password.current = undefined
    password.new = undefined
  } catch (error) {
    toast.add({
      title: 'خطأ',
      description: error instanceof Error ? error.message : 'تعذر تحديث كلمة المرور',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
}
</script>

<template>
  <UPageCard
    title="كلمة المرور"
    description="أكد كلمة المرور الحالية قبل تعيين كلمة مرور جديدة."
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
          placeholder="كلمة المرور الحالية"
          class="w-full"
        />
      </UFormField>

      <UFormField name="new">
        <UInput
          v-model="password.new"
          type="password"
          placeholder="كلمة المرور الجديدة"
          class="w-full"
        />
      </UFormField>

      <UButton label="تحديث" class="w-fit" type="submit" />
    </UForm>
  </UPageCard>

  <UPageCard
    title="الحساب"
    description="هل لم تعد ترغب في استخدام الخدمة؟ يمكنك حذف حسابك من هنا. لا يمكن التراجع عن هذا الإجراء. سيتم حذف جميع بيانات هذا الحساب نهائيًا."
    class="bg-gradient-to-tl from-error/10 from-5% to-default"
  >
    <template #footer>
      <UButton label="حذف الحساب" color="error" />
    </template>
  </UPageCard>
</template>
