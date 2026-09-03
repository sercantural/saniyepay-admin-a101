import axios from 'axios'
import { apiErrorMessage } from './apiError'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/*
 * Her hatanin uzerine okunabilir bir mesaj isliyoruz.
 *
 * Boylece cagiran taraf e.response?.data?.message zincirini tekrar
 * tekrar yazmak zorunda kalmiyor ve dogrulama hatalarinin alan alan
 * detayi da kaybolmuyor. Hata yine REDDEDILIYOR: bu kesici hatayi
 * yutmuyor, yalnizca anlasilir hale getiriyor.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.uiMessage = apiErrorMessage(error)

    return Promise.reject(error)
  },
)

export default api
