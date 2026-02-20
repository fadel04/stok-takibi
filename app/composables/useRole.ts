export function useRole() {
  const { currentUser } = useCurrentUser()

  const role = computed(() => currentUser.value?.role ?? 'staff')

  // مدير فقط
  const isAdmin = computed(() => role.value === 'admin')

  // مدير أو مشرف
  const isSupervisorPlus = computed(() =>
    role.value === 'admin' || role.value === 'supervisor'
  )

  return { role, isAdmin, isSupervisorPlus }
}
