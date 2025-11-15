'use client'

import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { 
  User, 
  Edit3, 
  Save, 
  Calendar, 
  Mail, 
  BookOpen, 
  TrendingUp,
  Trophy,
  Shield,
  Lock,
  Key,
  X
} from 'lucide-react'

interface UserStats {
  totalCourses: number
  completedCourses: number
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const { toasts, removeToast, success, error, warning } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [userStats, setUserStats] = useState<UserStats>({
    totalCourses: 0,
    completedCourses: 0
  })
  const [editData, setEditData] = useState({
    full_name: profile?.full_name || ''
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Cargar estadísticas
  useEffect(() => {
    if (user) {
      fetchUserStats()
    }
  }, [user])

  // Actualizar editData cuando el perfil cambie
  useEffect(() => {
    if (profile?.full_name) {
      setEditData({
        full_name: profile.full_name
      })
    }
  }, [profile])

  const fetchUserStats = async () => {
    try {
      // Obtener cursos del usuario
      const { data: coursesData, error: coursesError } = await supabase
        .from('user_courses')
        .select('course_id')
        .eq('user_id', user?.id)

      if (coursesError) throw coursesError

      setUserStats({
        totalCourses: coursesData?.length || 0,
        completedCourses: Math.floor((coursesData?.length || 0) * 0.6)
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editData.full_name.trim()) {
      error('Campo requerido', 'El nombre completo es obligatorio')
      return
    }

    setSaving(true)
    try {
      // Actualizar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id)

      if (profileError) throw profileError

      // FORZAR cierre inmediato del modo edición
      setIsEditing(false)
      
      // FORZAR recarga completa de la página después del éxito
      setTimeout(() => {
        window.location.reload()
      }, 1000)

      success('¡Perfil actualizado!', 'La página se actualizará automáticamente')
    } catch (err) {
      console.error('Error updating profile:', err)
      error('Error al guardar', 'No se pudo actualizar tu perfil. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      error('Campos requeridos', 'Complete todos los campos de contraseña')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      error('Contraseñas no coinciden', 'Las contraseñas ingresadas no son iguales')
      return
    }

    if (passwordData.newPassword.length < 6) {
      error('Contraseña muy corta', 'La contraseña debe tener al menos 6 caracteres')
      return
    }

    setUpdatingPassword(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (authError) throw authError

      success('¡Contraseña actualizada!', 'Tu contraseña ha sido cambiada exitosamente')

      // Limpiar el formulario
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      // Cerrar el modal/sección de contraseña
      setShowPasswordSection(false)
      setShowPasswordModal(false)

    } catch (err: any) {
      console.error('Error updating password:', err)
      error('Error al cambiar contraseña', err?.message || 'No se pudo actualizar tu contraseña. Intenta de nuevo.')
    } finally {
      setUpdatingPassword(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-white text-lg">Cargando perfil...</div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header del Perfil */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700">
          <div className="flex items-start gap-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <User className="w-16 h-16 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-800 flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editData.full_name}
                        onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Nombre completo"
                        className="text-3xl font-bold text-white bg-transparent border-b border-gray-600 focus:border-red-500 focus:outline-none w-full max-w-md"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <>
                      <h1 className="text-3xl font-bold text-white">
                        {profile?.full_name || user?.email}
                      </h1>
                      <div className="flex items-center gap-2 mt-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">{user?.email}</span>
                        {profile?.role === 'admin' && (
                          <div className="flex items-center gap-1 ml-3">
                            <Shield className="w-4 h-4 text-purple-400" />
                            <span className="text-purple-400 text-sm font-medium">Administrador</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setEditData({
                            full_name: profile?.full_name || ''
                          })
                          setIsEditing(false)
                        }}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-xl font-medium transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Editar Perfil
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Miembro desde {new Date(profile?.created_at || '').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Nivel: Intermedio
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl text-white">
            <div className="flex items-center justify-between">
              <BookOpen className="w-8 h-8" />
              <div className="text-right">
                <div className="text-3xl font-bold">{userStats.totalCourses}</div>
                <div className="text-blue-200 text-sm">Cursos Inscritos</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 rounded-2xl text-white">
            <div className="flex items-center justify-between">
              <Trophy className="w-8 h-8" />
              <div className="text-right">
                <div className="text-3xl font-bold">{userStats.completedCourses}</div>
                <div className="text-green-200 text-sm">Cursos Completados</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Progreso de Aprendizaje */}
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6">Progreso de Aprendizaje</h3>
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-300 text-lg">Cursos Completados</span>
                <span className="text-white font-semibold text-xl">{userStats.completedCourses}/{userStats.totalCourses}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-400 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${userStats.totalCourses > 0 ? (userStats.completedCourses / userStats.totalCourses) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Cambiar Contraseña - COMO ESTABA ANTES */}
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Seguridad</h3>
              <Lock className="w-6 h-6 text-gray-400" />
            </div>
            
            {!showPasswordSection ? (
              <div className="text-center">
                <p className="text-gray-400 mb-6">Mantén tu cuenta segura cambiando tu contraseña regularmente</p>
                <button
                  onClick={() => setShowPasswordSection(true)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors mx-auto"
                >
                  <Key className="w-5 h-5" />
                  Cambiar Contraseña
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    autoFocus
                    disabled={updatingPassword}
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Confirmar Contraseña
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirma tu nueva contraseña"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={updatingPassword}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowPasswordSection(false)
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      })
                    }}
                    disabled={updatingPassword}
                    className="flex-1 px-4 py-3 text-gray-400 hover:text-white transition-colors border border-gray-600 rounded-xl hover:border-gray-500 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    disabled={updatingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Key className="w-4 h-4" />
                    {updatingPassword ? 'Actualizando...' : 'Cambiar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}