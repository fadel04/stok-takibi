<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

interface SystemUser {
  id: number
  name: string
  email: string
  username?: string | null
  bio?: string | null
  role: string
}

const toast = useToast()
const { isAdmin } = useRole()

const { data: systemUsers, refresh } = await useFetch<SystemUser[]>('/api/users', {
  lazy: true,
  default: () => []
})

const isAddOpen = ref(false)
const isEditOpen = ref(false)
const isDeleteOpen = ref(false)
const selectedUser = ref<SystemUser | null>(null)
const isLoading = ref(false)

const roleOptions = [
  { label: 'مدير', value: 'admin' },
  { label: 'مشرف', value: 'supervisor' },
  { label: 'موظف', value: 'staff' }
]

// Add form
const addSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  email: z.string().email('بريد إلكتروني غير صالح'),
  username: z.string().optional(),
  password: z.string().min(6, '٦ أحرف على الأقل'),
  role: z.enum(['admin', 'supervisor', 'staff'])
})
type AddSchema = z.output<typeof addSchema>

const addState = reactive<Partial<AddSchema>>({
  name: '',
  email: '',
  username: '',
  password: '',
  role: 'staff'
})

// Edit form
const editSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  email: z.string().email('بريد إلكتروني غير صالح'),
  username: z.string().optional(),
  password: z.string().optional(),
  role: z.enum(['admin', 'supervisor', 'staff'])
})
type EditSchema = z.output<typeof editSchema>

const editState = reactive<Partial<EditSchema>>({
  name: '',
  email: '',
  username: '',
  password: '',
  role: 'staff'
})

const openEdit = (user: SystemUser) => {
  selectedUser.value = user
  editState.name = user.name
  editState.email = user.email
  editState.username = user.username || ''
  editState.password = ''
  editState.role = user.role as 'admin' | 'supervisor' | 'staff'
  isEditOpen.value = true
}

const openDelete = (user: SystemUser) => {
  selectedUser.value = user
  isDeleteOpen.value = true
}

const handleAdd = async (event: FormSubmitEvent<AddSchema>) => {
  isLoading.value = true
  try {
    await $fetch('/api/users/create', { method: 'POST', body: event.data })
    toast.add({ title: 'تم إنشاء الحساب بنجاح', color: 'success' })
    isAddOpen.value = false
    Object.assign(addState, { name: '', email: '', username: '', password: '', role: 'staff' })
    await refresh()
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'حدث خطأ', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const handleEdit = async (event: FormSubmitEvent<EditSchema>) => {
  if (!selectedUser.value) return
  isLoading.value = true
  try {
    const body = { id: selectedUser.value.id, ...event.data }
    if (!body.password) delete body.password
    await $fetch('/api/users', { method: 'PUT', body })
    toast.add({ title: 'تم تحديث الحساب', color: 'success' })
    isEditOpen.value = false
    await refresh()
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'حدث خطأ', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const handleDelete = async () => {
  if (!selectedUser.value) return
  isLoading.value = true
  try {
    await $fetch(`/api/users/${selectedUser.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'تم حذف الحساب', color: 'success' })
    isDeleteOpen.value = false
    await refresh()
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'حدث خطأ', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const getRoleLabel = (role: string) => roleOptions.find(r => r.value === role)?.label || role

const getRoleColor = (role: string): 'error' | 'warning' | 'neutral' => {
  if (role === 'admin') return 'error'
  if (role === 'supervisor') return 'warning'
  return 'neutral'
}

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'إدارة المستخدمين' })
</script>

<template>
  <UDashboardPanel id="users">
    <template #header>
      <UDashboardNavbar title="إدارة المستخدمين">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            v-if="isAdmin"
            icon="i-lucide-user-plus"
            @click="isAddOpen = true"
          >
            إضافة مستخدم
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4">
        <div v-if="!systemUsers?.length" class="flex flex-col items-center justify-center py-16">
          <UIcon name="i-lucide-users" class="size-12 text-muted mb-3" />
          <p class="text-muted">لا يوجد مستخدمون</p>
        </div>

        <div v-else class="overflow-x-auto rounded-xl border border-default">
          <table class="w-full">
            <thead class="border-b border-default bg-elevated/50">
              <tr>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">#</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">الاسم</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">البريد الإلكتروني</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">اسم المستخدم</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">الدور</th>
                <th v-if="isAdmin" class="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="user in systemUsers"
                :key="user.id"
                class="hover:bg-elevated/30"
              >
                <td class="px-4 py-4 text-sm text-muted">{{ user.id }}</td>
                <td class="px-4 py-4">
                  <div class="flex items-center gap-3">
                    <UAvatar :alt="user.name" size="sm" />
                    <span class="font-medium text-sm">{{ user.name }}</span>
                  </div>
                </td>
                <td class="px-4 py-4 text-sm text-muted">{{ user.email }}</td>
                <td class="px-4 py-4 text-sm text-muted">{{ user.username || '-' }}</td>
                <td class="px-4 py-4">
                  <UBadge :color="getRoleColor(user.role)" variant="subtle" size="sm">
                    {{ getRoleLabel(user.role) }}
                  </UBadge>
                </td>
                <td v-if="isAdmin" class="px-4 py-4">
                  <div class="flex gap-2">
                    <UButton
                      icon="i-lucide-pencil"
                      size="xs"
                      color="neutral"
                      variant="outline"
                      @click="openEdit(user)"
                    />
                    <UButton
                      icon="i-lucide-trash-2"
                      size="xs"
                      color="error"
                      variant="outline"
                      @click="openDelete(user)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Add Modal -->
  <UModal v-model:open="isAddOpen" title="إضافة مستخدم جديد">
    <template #body>
      <UForm :schema="addSchema" :state="addState" class="space-y-4" @submit="handleAdd">
        <UFormField label="الاسم" name="name" required>
          <UInput v-model="addState.name" placeholder="اسم المستخدم" class="w-full" />
        </UFormField>
        <UFormField label="البريد الإلكتروني" name="email" required>
          <UInput v-model="addState.email" type="email" placeholder="example@store.com" class="w-full" />
        </UFormField>
        <UFormField label="اسم المستخدم" name="username">
          <UInput v-model="addState.username" placeholder="اختياري" class="w-full" />
        </UFormField>
        <UFormField label="كلمة المرور" name="password" required>
          <UInput v-model="addState.password" type="password" placeholder="٦ أحرف على الأقل" class="w-full" />
        </UFormField>
        <UFormField label="الدور" name="role" required>
          <USelect v-model="addState.role" :items="roleOptions" value-key="value" label-key="label" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2 pt-2">
          <UButton color="neutral" variant="outline" @click="isAddOpen = false">إلغاء</UButton>
          <UButton type="submit" :loading="isLoading">إنشاء الحساب</UButton>
        </div>
      </UForm>
    </template>
  </UModal>

  <!-- Edit Modal -->
  <UModal v-model:open="isEditOpen" title="تعديل الحساب">
    <template #body>
      <UForm :schema="editSchema" :state="editState" class="space-y-4" @submit="handleEdit">
        <UFormField label="الاسم" name="name" required>
          <UInput v-model="editState.name" class="w-full" />
        </UFormField>
        <UFormField label="البريد الإلكتروني" name="email" required>
          <UInput v-model="editState.email" type="email" class="w-full" />
        </UFormField>
        <UFormField label="اسم المستخدم" name="username">
          <UInput v-model="editState.username" class="w-full" />
        </UFormField>
        <UFormField label="كلمة المرور الجديدة" name="password">
          <UInput v-model="editState.password" type="password" placeholder="اتركه فارغاً للإبقاء على الحالية" class="w-full" />
        </UFormField>
        <UFormField label="الدور" name="role" required>
          <USelect v-model="editState.role" :items="roleOptions" value-key="value" label-key="label" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2 pt-2">
          <UButton color="neutral" variant="outline" @click="isEditOpen = false">إلغاء</UButton>
          <UButton type="submit" :loading="isLoading">حفظ التغييرات</UButton>
        </div>
      </UForm>
    </template>
  </UModal>

  <!-- Delete Confirm -->
  <UModal v-model:open="isDeleteOpen" title="حذف الحساب">
    <template #body>
      <p class="text-sm text-muted mb-4">
        هل أنت متأكد من حذف حساب <span class="font-semibold text-default">{{ selectedUser?.name }}</span>؟
        لا يمكن التراجع عن هذا الإجراء.
      </p>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="isDeleteOpen = false">إلغاء</UButton>
        <UButton color="error" :loading="isLoading" @click="handleDelete">حذف</UButton>
      </div>
    </template>
  </UModal>
</template>
