'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { 
  Users, 
  Shield, 
  ShieldCheck,
  BookOpen,
  Plus,
  Minus,
  Search,
  Eye,
  Calendar,
  Award,
  X,
  UserPlus,
  Download,
  FileText,
  CheckSquare,
  Square,
  Trash2,
  RefreshCw,
  BarChart3
} from 'lucide-react'

interface User {
  id: string
  email: string
  role: 'admin' | 'student'
  full_name?: string
  avatar_url?: string
  created_at: string
  last_sign_in?: string
}

interface UserCourse {
  id: string
  user_id: string
  course_id: string
  hotmart_transaction_id?: string
  expires_at?: string
  created_at: string
  course: {
    id: string
    title: string
    price: number
    image_url?: string
    thumbnail_url?: string
  }
}

interface Course {
  id: string
  title: string
  price: number
  image_url?: string
  thumbnail_url?: string
}

interface UserStats {
  totalUsers: number
  totalAdmins: number
  totalStudents: number
  activeUsers: number
}

interface NewUserForm {
  email: string
  full_name: string
  role: 'admin' | 'student'
  password: string
  selectedCourses: string[]
}

export default function UserManagement() {
  // Toast hook
  const { toasts, removeToast, success, error, warning, info } = useToast()
  
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [userCourses, setUserCourses] = useState<UserCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all')
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [courseSearchTerm, setCourseSearchTerm] = useState('')
  
  // Estados para selección múltiple
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    totalAdmins: 0,
    totalStudents: 0,
    activeUsers: 0
  })
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    email: '',
    full_name: '',
    role: 'student',
    password: '',
    selectedCourses: []
  })
  const [creatingUser, setCreatingUser] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      await Promise.all([
        loadUsers(),
        loadCourses(),
        loadUserCourses()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      error('Error al cargar datos', 'Hubo un problema al cargar la información')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (loadError) throw loadError
    
    const users = data || []
    setUsers(users)
    
    const totalUsers = users.length
    const totalAdmins = users.filter(u => u.role === 'admin').length
    const totalStudents = users.filter(u => u.role === 'student').length
    const activeUsers = users.filter(u => {
      if (!u.last_sign_in) return false
      const lastSignIn = new Date(u.last_sign_in)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return lastSignIn > thirtyDaysAgo
    }).length

    setStats({ totalUsers, totalAdmins, totalStudents, activeUsers })
  }

  const loadCourses = async () => {
    try {
      const { data, error: loadError } = await supabase
        .from('courses')
        .select('id, title, price, thumbnail_url, is_active')
        .eq('is_active', true)
        .order('title')

      if (loadError) {
        console.error('Error loading courses:', loadError)
        setCourses([])
        return
      }

      const mappedCourses = (data || []).map(course => ({
        id: course.id,
        title: course.title,
        price: course.price,
        image_url: course.thumbnail_url,
        thumbnail_url: course.thumbnail_url
      }))

      setCourses(mappedCourses)
    } catch (err) {
      console.error('Error inesperado:', err)
      setCourses([])
    }
  }

  const loadUserCourses = async () => {
    try {
      const { data, error: loadError } = await supabase
        .from('user_courses')
        .select(`
          *,
          course:courses(id, title, price, thumbnail_url)
        `)
        .order('created_at', { ascending: false })

      if (loadError) {
        console.error('Error loading user courses:', loadError)
        setUserCourses([])
        return
      }

      const mappedUserCourses = (data || []).map(userCourse => ({
        ...userCourse,
        course: userCourse.course ? {
          ...userCourse.course,
          image_url: userCourse.course.thumbnail_url
        } : null
      })).filter(uc => uc.course !== null)

      setUserCourses(mappedUserCourses)
    } catch (err) {
      console.error('Error inesperado loading user courses:', err)
      setUserCourses([])
    }
  }

  const getSimulatedProgress = (userId: string, courseId: string): number => {
    const userCourse = userCourses.find(uc => uc.user_id === userId && uc.course_id === courseId)
    if (!userCourse) return 0
    
    const daysAgo = Math.floor((Date.now() - new Date(userCourse.created_at).getTime()) / (1000 * 60 * 60 * 24))
    return Math.min(daysAgo * 15, 100) // 15% por día hasta 100%
  }

  const getOverallUserProgress = (userId: string): number => {
    const userCoursesList = getUserCourses(userId)
    if (userCoursesList.length === 0) return 0

    const totalProgress = userCoursesList.reduce((sum, uc) => {
      return sum + getSimulatedProgress(userId, uc.course_id)
    }, 0)

    return Math.round(totalProgress / userCoursesList.length)
  }

  // Funciones de selección múltiple
  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
    }
    setSelectAll(!selectAll)
  }

  const clearSelection = () => {
    setSelectedUsers(new Set())
    setSelectAll(false)
  }

  const exportToCSV = async () => {
    const selectedUsersList = users.filter(u => selectedUsers.has(u.id))
    
    let csvContent = "Email,Nombre,Rol,Fecha_Registro,Ultimo_Acceso,Cursos_Totales,Progreso_Promedio\n"

    selectedUsersList.forEach(user => {
      const userCoursesCount = getUserCourses(user.id).length
      const overallProgress = getOverallUserProgress(user.id)
      
      const row = `"${user.email}","${user.full_name || ''}","${user.role}","${formatDate(user.created_at)}","${user.last_sign_in ? formatDate(user.last_sign_in) : 'Nunca'}",${userCoursesCount},${overallProgress}%`
      csvContent += row + "\n"
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    success('Exportación exitosa', `Se ha exportado información de ${selectedUsersList.length} usuarios`)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUser(true)

    try {
      if (!newUserForm.email || !newUserForm.password) {
        error('Campos requeridos', 'Email y contraseña son requeridos')
        return
      }

      if (newUserForm.password.length < 6) {
        error('Contraseña inválida', 'La contraseña debe tener al menos 6 caracteres')
        return
      }

      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', newUserForm.email)
        .single()

      if (existingUser) {
        error('Usuario duplicado', 'Ya existe un usuario con este email')
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: newUserForm.password,
        options: {
          data: {
            full_name: newUserForm.full_name,
            role: newUserForm.role
          },
          emailRedirectTo: undefined
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        error('Error de autenticación', `Error al crear usuario: ${authError.message}`)
        return
      }

      if (!authData.user) {
        error('Error del sistema', 'No se pudo crear el usuario')
        return
      }

      await new Promise(resolve => setTimeout(resolve, 1000))

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: authData.user.id,
          email: newUserForm.email,
          full_name: newUserForm.full_name,
          role: newUserForm.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'id'
        })

      if (profileError) {
        console.error('Profile error:', profileError)
        error('Error de perfil', `Error al crear perfil: ${profileError.message}`)
        return
      }

      if (newUserForm.selectedCourses.length > 0) {
        const courseInserts = newUserForm.selectedCourses.map(courseId => ({
          user_id: authData.user.id,
          course_id: courseId,
          created_at: new Date().toISOString()
        }))

        const { error: coursesError } = await supabase
          .from('user_courses')
          .insert(courseInserts)

        if (coursesError) {
          console.error('Courses error:', coursesError)
          warning('Usuario creado con advertencias', `Usuario creado, pero error al asignar cursos: ${coursesError.message}`)
        }
      }

      setNewUserForm({
        email: '',
        full_name: '',
        role: 'student',
        password: '',
        selectedCourses: []
      })

      setShowCreateUserModal(false)
      await loadData()
      success('¡Usuario creado!', 'El usuario ha sido creado exitosamente')

    } catch (err) {
      console.error('Error creating user:', err)
      error('Error inesperado', 'Error inesperado al crear usuario')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'student') => {
    if (!confirm(`¿Estás seguro de cambiar el rol a ${newRole}?`)) return

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (updateError) throw updateError
      await loadUsers()
      success('Rol actualizado', `El rol ha sido cambiado a ${newRole}`)
    } catch (err) {
      console.error('Error updating role:', err)
      error('Error al cambiar rol', 'No se pudo actualizar el rol del usuario')
    }
  }

  const handleGrantAccess = async (userId: string, courseId: string) => {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('user_courses')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking existing access:', checkError)
        error('Error de verificación', `Error al verificar acceso existente: ${checkError.message}`)
        return
      }

      if (existing) {
        warning('Acceso duplicado', 'El usuario ya tiene acceso a este curso')
        return
      }

      const { data: insertData, error: insertError } = await supabase
        .from('user_courses')
        .insert([{
          user_id: userId,
          course_id: courseId,
          created_at: new Date().toISOString()
        }])
        .select()

      if (insertError) {
        console.error('Error granting access:', insertError)
        error('Error al otorgar acceso', `Error al otorgar acceso: ${insertError.message}`)
        return
      }

      await loadUserCourses()
      setShowAccessModal(false)
      setSelectedUser(null)
      setCourseSearchTerm('')
      success('¡Acceso otorgado!', 'El acceso al curso ha sido otorgado correctamente')
      
    } catch (err) {
      console.error('Error inesperado:', err)
      error('Error inesperado', 'Error inesperado al otorgar acceso')
    }
  }

  const handleRevokeAccess = async (userCourseId: string) => {
    if (!confirm('¿Estás seguro de revocar este acceso?')) return

    try {
      const { error: deleteError } = await supabase
        .from('user_courses')
        .delete()
        .eq('id', userCourseId)

      if (deleteError) throw deleteError
      await loadUserCourses()
      success('Acceso revocado', 'El acceso al curso ha sido revocado exitosamente')
    } catch (err) {
      console.error('Error revoking access:', err)
      error('Error al revocar acceso', 'No se pudo revocar el acceso al curso')
    }
  }

  const getUserCourses = (userId: string) => {
    return userCourses.filter(uc => uc.user_id === userId)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    
    let matchesCourse = true
    if (courseFilter !== 'all') {
      const userCoursesList = getUserCourses(user.id)
      matchesCourse = userCoursesList.some(uc => uc.course_id === courseFilter)
    }
    
    return matchesSearch && matchesRole && matchesCourse
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getAvailableCoursesForUser = (userId: string) => {
    const userCourseIds = getUserCourses(userId).map(uc => uc.course_id)
    return courses.filter(course => !userCourseIds.includes(course.id))
  }

  const toggleCourseSelection = (courseId: string) => {
    setNewUserForm(prev => ({
      ...prev,
      selectedCourses: prev.selectedCourses.includes(courseId)
        ? prev.selectedCourses.filter(id => id !== courseId)
        : [...prev.selectedCourses, courseId]
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white text-xl">Cargando usuarios...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Usuarios</p>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Administradores</p>
              <p className="text-2xl font-bold text-white">{stats.totalAdmins}</p>
            </div>
            <ShieldCheck className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Estudiantes</p>
              <p className="text-2xl font-bold text-white">{stats.totalStudents}</p>
            </div>
            <Award className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Activos (30d)</p>
              <p className="text-2xl font-bold text-white">{stats.activeUsers}</p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Header and Filters */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-white">Gestión de Usuarios</h2>
            <p className="text-gray-400 mt-1">
              {filteredUsers.length} de {users.length} usuarios
              {selectedUsers.size > 0 && ` • ${selectedUsers.size} seleccionados`}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              title="Recargar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Agregar Usuario</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'student')}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="student">Estudiantes</option>
          </select>

          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los cursos</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="bg-blue-900/50 border border-blue-600 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-white font-medium">{selectedUsers.size} usuarios seleccionados</span>
              <button
                onClick={clearSelection}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Limpiar selección
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={handleSelectAll}
                    className="text-gray-400 hover:text-white"
                  >
                    {selectAll ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Cursos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Progreso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Registro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Último acceso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredUsers.map((user) => {
                const userCoursesCount = getUserCourses(user.id).length
                const overallProgress = getOverallUserProgress(user.id)
                const isSelected = selectedUsers.has(user.id)
                
                return (
                  <tr key={user.id} className={`hover:bg-gray-700 ${isSelected ? 'bg-blue-900/30' : ''}`}>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleSelectUser(user.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        {isSelected ? <CheckSquare className="w-5 h-5 text-blue-400" /> : <Square className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name || user.email}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-sm font-medium">
                              {(user.full_name || user.email).charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {user.full_name || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'student')}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-blue-500 ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-white">{userCoursesCount}</span>
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowUserModal(true)
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Ver detalles
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-gray-600 rounded-full h-2 min-w-[100px]">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              overallProgress >= 80 ? 'bg-green-500' :
                              overallProgress >= 50 ? 'bg-yellow-500' :
                              overallProgress > 0 ? 'bg-blue-500' : 'bg-gray-500'
                            }`}
                            style={{ width: `${overallProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-white font-medium w-12 text-right">
                          {overallProgress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {user.last_sign_in ? formatDate(user.last_sign_in) : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowAccessModal(true)
                          }}
                          className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Gestionar accesos"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowUserModal(true)
                          }}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Ver perfil"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">No se encontraron usuarios</div>
            {(searchTerm || roleFilter !== 'all' || courseFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setRoleFilter('all')
                  setCourseFilter('all')
                }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                Crear Nuevo Usuario
              </h3>
              <button
                onClick={() => {
                  setShowCreateUserModal(false)
                  setNewUserForm({
                    email: '',
                    full_name: '',
                    role: 'student',
                    password: '',
                    selectedCourses: []
                  })
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={newUserForm.full_name}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre completo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rol
                  </label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'student' }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="student">Estudiante</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Asignar cursos (opcional)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-700 p-4 rounded-lg">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`course-${course.id}`}
                        checked={newUserForm.selectedCourses.includes(course.id)}
                        onChange={() => toggleCourseSelection(course.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`course-${course.id}`} className="flex items-center space-x-3 flex-1 cursor-pointer">
                        {course.image_url && (
                          <img
                            src={course.image_url}
                            alt={course.title}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <div>
                          <div className="text-white text-sm font-medium">{course.title}</div>
                          <div className="text-green-400 text-xs">${course.price.toFixed(2)}</div>
                        </div>
                      </label>
                    </div>
                  ))}
                  {courses.length === 0 && (
                    <div className="text-gray-400 text-center py-4">
                      No hay cursos disponibles
                    </div>
                  )}
                </div>
                {newUserForm.selectedCourses.length > 0 && (
                  <div className="mt-2 text-sm text-blue-400">
                    {newUserForm.selectedCourses.length} curso(s) seleccionado(s)
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUserModal(false)
                    setNewUserForm({
                      email: '',
                      full_name: '',
                      role: 'student',
                      password: '',
                      selectedCourses: []
                    })
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {creatingUser ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Crear Usuario</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                Perfil de Usuario
              </h3>
              <button
                onClick={() => {
                  setShowUserModal(false)
                  setSelectedUser(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center">
                  {selectedUser.avatar_url ? (
                    <img
                      src={selectedUser.avatar_url}
                      alt={selectedUser.full_name || selectedUser.email}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xl font-medium">
                      {(selectedUser.full_name || selectedUser.email).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">
                    {selectedUser.full_name || 'Sin nombre'}
                  </h4>
                  <p className="text-gray-400">{selectedUser.email}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedUser.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedUser.role === 'admin' ? 'Administrador' : 'Estudiante'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">Fecha de registro</div>
                  <div className="text-white font-medium">
                    {formatDate(selectedUser.created_at)}
                  </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">Último acceso</div>
                  <div className="text-white font-medium">
                    {selectedUser.last_sign_in ? formatDate(selectedUser.last_sign_in) : 'Nunca'}
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h5 className="text-lg font-semibold text-white mb-3">Progreso General</h5>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 bg-gray-600 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        getOverallUserProgress(selectedUser.id) >= 80 ? 'bg-green-500' :
                        getOverallUserProgress(selectedUser.id) >= 50 ? 'bg-yellow-500' :
                        getOverallUserProgress(selectedUser.id) > 0 ? 'bg-blue-500' : 'bg-gray-500'
                      }`}
                      style={{ width: `${getOverallUserProgress(selectedUser.id)}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-semibold">{getOverallUserProgress(selectedUser.id)}%</span>
                </div>
              </div>

              <div>
                <h5 className="text-lg font-semibold text-white mb-4">
                  Cursos Asignados ({getUserCourses(selectedUser.id).length})
                </h5>
                <div className="space-y-3">
                  {getUserCourses(selectedUser.id).map((userCourse) => (
                    <div key={userCourse.id} className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {userCourse.course.image_url && (
                            <img
                              src={userCourse.course.image_url}
                              alt={userCourse.course.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <div className="text-white font-medium">{userCourse.course.title}</div>
                            <div className="text-sm text-gray-400">
                              Otorgado: {formatDate(userCourse.created_at)}
                            </div>
                            <div className="text-sm text-green-400">
                              ${userCourse.course.price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeAccess(userCourse.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded-lg transition-colors"
                          title="Revocar acceso"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Progreso del curso</span>
                          <span className="text-white">{getSimulatedProgress(selectedUser.id, userCourse.course_id)}%</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 bg-gray-600 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                getSimulatedProgress(selectedUser.id, userCourse.course_id) >= 80 ? 'bg-green-500' :
                                getSimulatedProgress(selectedUser.id, userCourse.course_id) >= 50 ? 'bg-yellow-500' :
                                getSimulatedProgress(selectedUser.id, userCourse.course_id) > 0 ? 'bg-blue-500' : 'bg-gray-500'
                              }`}
                              style={{ width: `${getSimulatedProgress(selectedUser.id, userCourse.course_id)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {getUserCourses(selectedUser.id).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      Este usuario no tiene cursos asignados
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grant Access Modal */}
      {showAccessModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Otorgar Acceso a Curso
                </h3>
                <p className="text-gray-400 mt-1">
                  Usuario: <span className="text-white font-medium">{selectedUser.email}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAccessModal(false)
                  setSelectedUser(null)
                  setCourseSearchTerm('')
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar cursos disponibles..."
                  value={courseSearchTerm}
                  onChange={(e) => setCourseSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium text-lg">Cursos disponibles</h4>
                <span className="text-sm text-gray-400">
                  {getAvailableCoursesForUser(selectedUser.id).filter(course => 
                    course.title.toLowerCase().includes(courseSearchTerm.toLowerCase())
                  ).length} cursos encontrados
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {getAvailableCoursesForUser(selectedUser.id)
                  .filter(course => 
                    course.title.toLowerCase().includes(courseSearchTerm.toLowerCase())
                  )
                  .map((course) => (
                  <div key={course.id} className="bg-gray-700 p-4 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
                    <div className="flex items-start space-x-4">
                      {course.image_url ? (
                        <img
                          src={course.image_url}
                          alt={course.title}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h5 className="text-white font-medium text-sm mb-1 line-clamp-2">
                          {course.title}
                        </h5>
                        <div className="text-green-400 font-semibold text-lg mb-3">
                          ${course.price.toFixed(2)}
                        </div>
                        
                        <button
                          onClick={() => handleGrantAccess(selectedUser.id, course.id)}
                          className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Otorgar Acceso</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {getAvailableCoursesForUser(selectedUser.id).filter(course => 
                course.title.toLowerCase().includes(courseSearchTerm.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <div className="text-gray-400 text-lg mb-2">
                    {courseSearchTerm 
                      ? 'No se encontraron cursos con ese término'
                      : 'Este usuario ya tiene acceso a todos los cursos disponibles'
                    }
                  </div>
                  {courseSearchTerm && (
                    <button
                      onClick={() => setCourseSearchTerm('')}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Limpiar búsqueda
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}