const supervisorRoutes = ['/dashboard', '/accounting', '/gecmis']
const adminRoutes = ['/users']

export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return

  if (process.client) {
    const stored = localStorage.getItem('currentUser')

    if (!stored) return navigateTo('/login')

    const user = JSON.parse(stored)
    const role: string = user.role || 'staff'

    if (adminRoutes.includes(to.path) && role !== 'admin') {
      return navigateTo('/products')
    }

    if (supervisorRoutes.includes(to.path) && role === 'staff') {
      return navigateTo('/products')
    }
  }
})
