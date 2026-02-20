// Supervisor+ only routes (admin and supervisor can access)
const supervisorRoutes = ['/dashboard', '/accounting', '/gecmis']

export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return

  if (process.client) {
    const stored = localStorage.getItem('currentUser')

    // Not logged in → go to login
    if (!stored) return navigateTo('/login')

    const user = JSON.parse(stored)
    const role: string = user.role || 'staff'

    // Staff can only access: /products, /invoices, /settings
    if (supervisorRoutes.includes(to.path) && role === 'staff') {
      return navigateTo('/products')
    }
  }
})
