import * as Ably from 'ably'
import api from './axios'

let instance = null

export function getAbly() {
  if (!instance) {
    instance = new Ably.Realtime({
      authCallback: async (tokenParams, callback) => {
        try {
          const { data } = await api.get('/portal/ably-token')
          callback(null, data.token)
        } catch (err) {
          console.error('[Ably] Token fetch failed', err)
          callback(err, null)
        }
      },
      log: { level: 2 },
    })

    instance.connection.on('connected', () => {
      console.log('[Ably] Connected')
    })

    instance.connection.on('failed', (err) => {
      console.error('[Ably] Connection failed', err)
    })
  }
  return instance
}
