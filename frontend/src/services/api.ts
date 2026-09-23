import axios from 'axios'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'https://rentit-sd6y.onrender.com/api', withCredentials: true, headers: { 'Content-Type': 'application/json' } })
export const authApi = { register: (data: unknown) => api.post('/auth/register', data), login: (data: unknown) => api.post('/auth/login', data), me: () => api.get('/auth/me'), logout: () => api.post('/auth/logout') }
export const propertyApi = { get: () => api.get('/property'), save: (data: unknown) => api.post('/property', data) }
export const roomApi = { list: () => api.get('/rooms'), create: (data: unknown) => api.post('/rooms', data) }
export const tenantApi = { list: () => api.get('/tenants'), create: (data: unknown) => api.post('/tenants', data) }
export const rentApi = { dashboard: (month?: number, year?: number) => api.get('/dashboard', { params: { month, year } }) }
export const paymentApi = { list: () => api.get('/payments'), create: (data: unknown) => api.post('/payments', data) }
export const reportApi = { monthly: () => api.get('/reports/monthly'), yearly: () => api.get('/reports/yearly') }
