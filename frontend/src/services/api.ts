import axios from 'axios'
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api', withCredentials: true })
export const authApi = { me: () => api.get('/auth/me'), login: (data: unknown) => api.post('/auth/login', data), register: (data: unknown) => api.post('/auth/register', data), logout: () => api.post('/auth/logout') }
export const propertyApi = { get: () => api.get('/property'), save: (data: unknown) => api.post('/property', data) }
export const roomApi = { list: () => api.get('/rooms'), create: (data: unknown) => api.post('/rooms', data), remove: (id: string) => api.delete(`/rooms/${id}`) }
export const tenantApi = { list: () => api.get('/tenants'), create: (data: unknown) => api.post('/tenants', data), remove: (id: string) => api.delete(`/tenants/${id}`) }
export const paymentApi = { list: () => api.get('/payments'), create: (data: unknown) => api.post('/payments', data) }
export const dashboardApi = { get: (month?: number, year?: number) => api.get('/dashboard', { params: { month, year } }) }
export const reportApi = { monthly: (month?: number, year?: number) => api.get('/reports/monthly', { params: { month, year } }), yearly: (year?: number) => api.get('/reports/yearly', { params: { year } }) }
