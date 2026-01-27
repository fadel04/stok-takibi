export const useTransactionLogger = () => {
  const { currentUser } = useCurrentUser()

  const logTransaction = async (action: string, description: string, username?: string) => {
    try {
      await $fetch('/api/transactions/add', {
        method: 'POST',
        body: {
          action,
          description,
          username: username || currentUser.value?.name || 'Sistem Kullanıcısı'
        }
      })
    } catch (error) {
      console.error('Failed to log transaction:', error)
    }
  }

  return {
    logTransaction
  }
}
