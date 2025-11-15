'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Settings,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw
} from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  icon: string
  color: string
}

interface Course {
  id: string
  title: string
  description: string
  price: number
  thumbnail_url: string
  is_active: boolean
  is_published_in_catalog?: boolean
  hotmart_url?: string
  category_id?: string
  created_at: string
  category?: Category
  course_code?: number
  hotmart_product_id?: number
}

interface CourseManagementProps {
  onManageContent: (courseId: string, courseTitle: string) => void
}

type SortField = 'title' | 'price' | 'created_at'
type SortOrder = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'

export default function CourseManagement({ onManageContent }: CourseManagementProps) {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [showFilters, setShowFilters] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    thumbnail_url: '',
    is_active: true,
    is_published_in_catalog: false,
    hotmart_url: '',
    category_id: '',
    hotmart_product_id: ''
  })

  useEffect(() => {
    loadCourses()
    loadCategories()
  }, [])

  useEffect(() => {
    filterAndSortCourses()
  }, [courses, searchTerm, statusFilter, sortField, sortOrder, priceRange])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          category:categories(id, name, slug, icon, color)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortCourses = () => {
    let filtered = [...courses]

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(course => 
        statusFilter === 'active' ? course.is_active : !course.is_active
      )
    }

    // Filtro por rango de precio
    if (priceRange.min !== '') {
      filtered = filtered.filter(course => course.price >= parseFloat(priceRange.min))
    }
    if (priceRange.max !== '') {
      filtered = filtered.filter(course => course.price <= parseFloat(priceRange.max))
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'price':
          aValue = a.price
          bValue = b.price
          break
        case 'created_at':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        default:
          return 0
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    setFilteredCourses(filtered)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setPriceRange({ min: '', max: '' })
    setSortField('created_at')
    setSortOrder('desc')
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
  }

  const handleImageUpload = async (file: File) => {
    if (!file) return null

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Solo se permiten archivos JPG, PNG o WebP')
      return null
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen debe ser menor a 5MB')
      return null
    }

    setUploading(true)
    setUploadError(null)

    try {
      // Crear nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `course-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `course-thumbnails/${fileName}`

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('course-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('course-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      setUploadError('Error al subir la imagen. Intenta de nuevo.')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Mostrar preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Subir archivo
    const imageUrl = await handleImageUpload(file)
    if (imageUrl) {
      setFormData({ ...formData, thumbnail_url: imageUrl })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // ============================================
      // PREPARAR DATOS - SIMPLE Y DIRECTO
      // ============================================

      // Limpiar category_id: null si está vacío
      const cleanCategoryId = formData.category_id && formData.category_id.trim()
        ? formData.category_id.trim()
        : null

      // Limpiar y normalizar hotmart_url
      let cleanHotmartUrl = null
      if (formData.hotmart_url && formData.hotmart_url.trim()) {
        cleanHotmartUrl = formData.hotmart_url.trim()
        // Eliminar todas las barras al final
        cleanHotmartUrl = cleanHotmartUrl.replace(/\/+$/, '')
      }

      // Limpiar thumbnail_url: null si está vacío
      const cleanThumbnailUrl = formData.thumbnail_url && formData.thumbnail_url.trim()
        ? formData.thumbnail_url.trim()
        : null

      // Limpiar hotmart_product_id: null si está vacío
      const cleanHotmartProductId = formData.hotmart_product_id && formData.hotmart_product_id.toString().trim()
        ? parseInt(formData.hotmart_product_id.toString().trim())
        : null

      // Objeto final limpio
      const courseData: any = {
        title: formData.title.trim(),
        description: formData.description || null,
        price: parseFloat(formData.price.toString()) || 0,
        thumbnail_url: cleanThumbnailUrl,
        is_active: formData.is_active === true,
        is_published_in_catalog: formData.is_published_in_catalog === true,
        hotmart_url: cleanHotmartUrl,
        category_id: cleanCategoryId,
        hotmart_product_id: cleanHotmartProductId
      }

      // Agregar created_by solo al crear (no al editar)
      if (!editingCourse && user?.id) {
        courseData.created_by = user.id
      }

      // ============================================
      // VALIDACIONES ANTES DE ENVIAR
      // ============================================

      if (!courseData.title) {
        alert('❌ El título es obligatorio')
        setSubmitting(false)
        return
      }

      if (courseData.is_published_in_catalog && !courseData.hotmart_url) {
        alert('❌ Si publicas en catálogo, debes proporcionar la URL de pago (Hotmart, Stripe, etc.)')
        setSubmitting(false)
        return
      }

      // Validar que la URL sea válida
      if (courseData.hotmart_url) {
        try {
          new URL(courseData.hotmart_url)
        } catch (e) {
          alert('❌ La URL de pago no es válida. Asegúrate de incluir el protocolo (https://)')
          setSubmitting(false)
          return
        }
      }

      // ============================================
      // ENVIAR A SUPABASE
      // ============================================

      let result

      if (editingCourse) {
        // ACTUALIZAR
        result = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', editingCourse.id)
          .select()
      } else {
        // CREAR
        result = await supabase
          .from('courses')
          .insert([courseData])
          .select()
      }

      // ============================================
      // MANEJAR RESPUESTA
      // ============================================

      const { data, error } = result

      if (error) {
        console.error('Error al guardar curso:', error)
        alert(`❌ Error al guardar el curso: ${error.message}`)
        setSubmitting(false)
        return
      }

      if (!data || data.length === 0) {
        console.error('No se recibió data de Supabase')
        alert('❌ Error: No se recibió respuesta del servidor')
        setSubmitting(false)
        return
      }

      // ✅ ÉXITO
      alert(editingCourse ? '✅ Curso actualizado correctamente' : '✅ Curso creado correctamente')

      // Recargar y limpiar
      await loadCourses()
      resetForm()

    } catch (error: any) {
      console.error('Error inesperado:', error)
      alert(`❌ Error inesperado: ${error?.message || 'Error desconocido'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (course: Course) => {
    setEditingCourse(course)
    setFormData({
      title: course.title,
      description: course.description,
      price: course.price,
      thumbnail_url: course.thumbnail_url,
      is_active: course.is_active,
      is_published_in_catalog: course.is_published_in_catalog || false,
      hotmart_url: course.hotmart_url || '',
      category_id: course.category_id || '',
      hotmart_product_id: course.hotmart_product_id?.toString() || ''
    })
    setImagePreview(course.thumbnail_url || null)
    setShowForm(true)
  }

  const handleDelete = async (courseId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este curso?')) return

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId)

      if (error) throw error
      await loadCourses()
    } catch (error) {
      console.error('Error deleting course:', error)
      alert('Error al eliminar el curso')
    }
  }

  const toggleStatus = async (course: Course) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_active: !course.is_active })
        .eq('id', course.id)

      if (error) throw error
      await loadCourses()
    } catch (error) {
      console.error('Error updating course status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: 0,
      thumbnail_url: '',
      is_active: true,
      is_published_in_catalog: false,
      hotmart_url: '',
      category_id: '',
      hotmart_product_id: ''
    })
    setEditingCourse(null)
    setShowForm(false)
    setImagePreview(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = () => {
    setFormData({ ...formData, thumbnail_url: '' })
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (loading && courses.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white text-xl">Cargando cursos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Gestión de Cursos</h2>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            {filteredCourses.length} de {courses.length} cursos
            {searchTerm && ` • Búsqueda: "${searchTerm}"`}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => loadCourses()}
            className="flex items-center px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:scale-105 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Nuevo Curso
          </button>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda principal */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar cursos por título o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtros rápidos */}
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </button>

            {(searchTerm || statusFilter !== 'all' || priceRange.min || priceRange.max) && (
              <button
                onClick={clearFilters}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Filtros avanzados */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Precio mínimo
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Precio máximo
                </label>
                <input
                  type="number"
                  placeholder="999.99"
                  step="0.01"
                  min="0"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ordenar por
                </label>
                <select
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-')
                    setSortField(field as SortField)
                    setSortOrder(order as SortOrder)
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created_at-desc">Más recientes</option>
                  <option value="created_at-asc">Más antiguos</option>
                  <option value="title-asc">Título A-Z</option>
                  <option value="title-desc">Título Z-A</option>
                  <option value="price-asc">Precio menor</option>
                  <option value="price-desc">Precio mayor</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                {editingCourse ? 'Editar Curso' : 'Nuevo Curso'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Upload de Imagen */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Imagen del Curso
                </label>
                
                {/* Preview de imagen */}
                {imagePreview ? (
                  <div className="relative mb-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-xl border-2 border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-gray-500 transition-colors">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">Selecciona una imagen para el curso</p>
                    <p className="text-xs text-gray-500">JPG, PNG o WebP (máx. 5MB)</p>
                  </div>
                )}

                {/* Input de archivo */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Subiendo...' : 'Seleccionar Imagen'}
                  </button>
                  
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Quitar Imagen
                    </button>
                  )}
                </div>

                {/* Mensajes de estado */}
                {uploading && (
                  <div className="flex items-center gap-2 mt-3 text-blue-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                    <span className="text-sm">Subiendo imagen...</span>
                  </div>
                )}

                {uploadError && (
                  <div className="flex items-center gap-2 mt-3 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{uploadError}</span>
                  </div>
                )}

                {formData.thumbnail_url && !uploading && (
                  <div className="flex items-center gap-2 mt-3 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Imagen cargada correctamente</span>
                  </div>
                )}
              </div>

              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Ej: Curso de Programación Web"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descripción *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                  placeholder="Describe el contenido y objetivos del curso..."
                />
              </div>

              {/* Precio */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Precio (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="0.00"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Categoría (Opcional)
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ID del Producto en Hotmart */}
              <div className="bg-orange-600/10 p-4 rounded-xl border border-orange-500/30">
                <label className="block text-white font-medium mb-2">
                  🔢 ID del Producto en Hotmart (Integración)
                </label>
                <input
                  type="number"
                  value={formData.hotmart_product_id}
                  onChange={(e) => setFormData({ ...formData, hotmart_product_id: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                  placeholder="Ej: 2484567"
                />
                <p className="text-gray-400 text-sm mt-2">
                  💡 Este es el Product ID que te proporciona Hotmart (opcional). Se usa para vincular las compras del webhook con este curso
                </p>
              </div>

              {/* Estado activo */}
              <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-xl border border-gray-600">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="is_active" className="text-white font-medium">
                  Curso activo y visible para estudiantes que lo tienen
                </label>
              </div>

              {/* Publicar en catálogo - CAMBIADO A SELECT */}
              <div className="p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl border border-purple-500/30">
                <label className="block text-white font-medium mb-2">
                  📢 Publicar en catálogo de ofertas
                </label>
                <select
                  value={formData.is_published_in_catalog ? 'true' : 'false'}
                  onChange={(e) => setFormData({
                    ...formData,
                    is_published_in_catalog: e.target.value === 'true'
                  })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                >
                  <option value="false">❌ NO - Solo para usuarios asignados</option>
                  <option value="true">✅ SÍ - Publicar en catálogo público</option>
                </select>
                <p className="text-gray-400 text-sm mt-2">
                  Si seleccionas "SÍ", el curso aparecerá en la página de ofertas para usuarios que NO lo tengan
                </p>
              </div>

              {/* URL de pago (solo si está publicado en catálogo) */}
              {formData.is_published_in_catalog && (
                <div className="bg-purple-600/10 p-4 rounded-xl border border-purple-500/30">
                  <label className="block text-white font-medium mb-2">
                    🔗 URL de Checkout/Ventas *
                  </label>
                  <input
                    type="text"
                    value={formData.hotmart_url}
                    onChange={(e) => {
                      // Limpiar la URL automáticamente mientras escribe
                      const cleanUrl = e.target.value.trim().replace(/\/+$/, '')
                      setFormData({ ...formData, hotmart_url: cleanUrl })
                    }}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="https://pay.hotmart.com/producto (sin / al final)"
                    required={formData.is_published_in_catalog}
                  />
                  <p className="text-gray-400 text-sm mt-2">
                    💡 URL de tu plataforma de pago (Hotmart, Stripe, Gumroad, etc). Los usuarios serán redirigidos aquí para comprar el curso
                  </p>
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {submitting ? 'Guardando...' : 'Guardar Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Courses Table */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-700 to-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Código
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-2">
                    Curso
                    {getSortIcon('title')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Categoría
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-2">
                    Precio
                    {getSortIcon('price')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-2">
                    Fecha
                    {getSortIcon('created_at')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-600/30 font-mono font-bold text-sm">
                      #{course.course_code || '---'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-16 h-16 rounded-xl overflow-hidden mr-4 bg-gray-700 flex-shrink-0">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white mb-1">
                          {course.title}
                        </div>
                        <div className="text-sm text-gray-400 max-w-xs line-clamp-2">
                          {course.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {course.category ? (
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${course.category.color}20`,
                          color: course.category.color,
                          border: `1px solid ${course.category.color}40`
                        }}
                      >
                        <span className="mr-1">{course.category.icon}</span>
                        {course.category.name}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">Sin categoría</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-semibold text-green-400">
                      ${course.price.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      course.is_active
                        ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                        : 'bg-red-600/20 text-red-400 border border-red-600/30'
                    }`}>
                      {course.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(course.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onManageContent(course.id, course.title)}
                        className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-600/20 rounded-lg transition-all duration-200"
                        title="Gestionar Contenido"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(course)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-600/20 rounded-lg transition-all duration-200"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => toggleStatus(course)}
                        className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-600/20 rounded-lg transition-all duration-200"
                        title={course.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {course.is_active ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded-lg transition-all duration-200"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* No results message */}
        {filteredCourses.length === 0 && courses.length > 0 && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <div className="text-gray-400 text-lg mb-4">
              No se encontraron cursos con los filtros aplicados
            </div>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Empty state */}
        {courses.length === 0 && (
          <div className="text-center py-16">
            <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <div className="text-gray-400 text-lg mb-4">No hay cursos disponibles</div>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
            >
              Crear primer curso
            </button>
          </div>
        )}
      </div>
    </div>
  )
}