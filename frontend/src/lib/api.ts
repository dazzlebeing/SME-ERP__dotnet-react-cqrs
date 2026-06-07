import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send HttpOnly refresh cookie
})

// Attach token from memory
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 → try refresh → retry once
// IMPORTANT: skip retry for auth endpoints (login/refresh) so their real errors propagate
let refreshing = false
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config
    const isAuthEndpoint = original?.url?.includes('/auth/')
    if (err.response?.status === 401 && !original._retry && !refreshing && !isAuthEndpoint) {
      original._retry = true
      refreshing = true
      try {
        const { data } = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
        sessionStorage.setItem('access_token', data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        refreshing = false
        return api(original)
      } catch {
        refreshing = false
        sessionStorage.removeItem('access_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
