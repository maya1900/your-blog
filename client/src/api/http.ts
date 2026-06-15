import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

export const http = axios.create({
  baseURL: '/api',
  timeout: 10_000,
})

// Attach token from store
http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Normalize errors + auto-logout on 401
http.interceptors.response.use(
  (resp) => resp,
  (error: AxiosError<{ error?: { code: string; message: string } }>) => {
    if (error.response?.status === 401) {
      const store = useAuthStore.getState()
      if (store.token) {
        store.logout()
        // Soft redirect — don't break current render cycle
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign('/login')
        }
      }
    }
    const apiMessage = error.response?.data?.error?.message
    if (apiMessage) {
      error.message = apiMessage
    } else if (error.response?.status) {
      error.message =
        error.response.status >= 500
          ? '服务器开小差了，请稍后再试'
          : `请求失败(${error.response.status})`
    }
    return Promise.reject(error)
  },
)

export interface HealthResponse {
  ok: boolean
  timestamp: string
  env: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await http.get<{ data: HealthResponse }>('/health')
  return data.data
}
