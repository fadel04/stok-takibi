import type { UserRole } from '~/types'

export const useCurrentUser = () => {
  const currentUser = ref<{
    id: number
    email: string
    name: string
    role: UserRole
    avatar?: {
      src: string
      alt: string
    }
  } | null>(null)

  const loadUser = () => {
    if (process.client) {
      const stored = localStorage.getItem('currentUser')
      if (stored) {
        currentUser.value = JSON.parse(stored)
      }
    }
  }

  const setUser = (user: typeof currentUser.value) => {
    currentUser.value = user
    if (process.client && user) {
      localStorage.setItem('currentUser', JSON.stringify(user))
    }
  }

  const logout = () => {
    currentUser.value = null
    if (process.client) {
      localStorage.removeItem('currentUser')
    }
  }

  if (!currentUser.value) {
    loadUser()
  }

  return {
    currentUser: readonly(currentUser),
    setUser,
    logout,
    loadUser
  }
}
