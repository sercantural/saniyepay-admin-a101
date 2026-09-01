import { useAuthStore } from '@/stores/auth'

/**
 * Rolun gorunen adi.
 *
 * Eskiden her ekranda ayri bir etiket haritasi vardi
 * ({ grup_yoneticisi: 'Grup Yöneticisi', ... }). Super admin panelden
 * yeni bir rol olusturdugunda hicbirinde gorunmuyor, ham makine adiyla
 * ("destek_ekibi") ekrana dusuyordu. Rol adi da degistirilemiyordu
 * cunku etiket koda gomuluydu.
 *
 * Artik ad rolun kendisinden geliyor. Parametre bir rol NESNESI de
 * olabilir (API'den gelen satir) ya da yalnizca makine adi -- ikinci
 * durumda kullanicinin bildigi roller arasinda aranir.
 */
export function roleLabel(role) {
  if (!role) return '—'
  if (typeof role === 'object') return role.display_name || role.name || '—'

  const auth = useAuthStore()
  const bilinen = [...(auth.assignableRoles || []), ...(auth.user?.roles || [])]

  return bilinen.find((r) => r?.name === role)?.display_name || role
}
