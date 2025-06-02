// ============================================
// ARCHIVO: src/components/admin/ModuleManagement.tsx
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Play,
  Clock,
  DollarSign,
  Code,
  Video,
  Link,
  Eye,
  Gift
} from 'lucide-react'

interface Module {
  id: string
  title: string
  description: string
  order_index: number
  course_id: string
  created_at: string
}

interface Lesson {
  id: string
  title: string
  description: string
  video_url: string
  video_duration?: number
  order_index: number
  is_free: boolean
  module_id: string
  created_at: string
}

interface ModuleWithLessons extends Module {
  lessons: Lesson[]
}

interface ModuleManagementProps {
  courseId: string
  courseName: string
  onBack: () => void
}

type FormType = 'module' | 'lesson' | null
type EditingItem = Module | Lesson | null
type VideoType = 'url' | 'embed'

export default function ModuleManagement({ courseId, courseName, onBack }: ModuleManagementProps) {
  const [modules, setModules] = useState<ModuleWithLessons[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState<FormType>(null)
  const [editingItem, setEditingItem] = useState<EditingItem>(null)
  const [selectedModuleId, setSelectedModuleId] = useState<string>('')
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [videoType, setVideoType] = useState<VideoType>('url')
  
  const [moduleFormData, setModuleFormData] = useState({
    title: '',
    description: '',
    order_index: 1
  })
  
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    is_free: false,
    module_id: ''
  })

  useEffect(() => {
    loadModulesAndLessons()
  }, [courseId])

  const loadModulesAndLessons = async () => {
    try {
      // Cargar módulos
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })

      if (modulesError) throw modulesError

      // Cargar lecciones para cada módulo
      const modulesWithLessons: ModuleWithLessons[] = []
      
      for (const module of modulesData || []) {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('module_id', module.id)
          .order('order_index', { ascending: true })

        if (lessonsError) throw lessonsError

        modulesWithLessons.push({
          ...module,
          lessons: lessonsData || []
        })
      }

      setModules(modulesWithLessons)
      
      // Expandir todos los módulos por defecto
      const moduleIds = new Set(modulesWithLessons.map(m => m.id))
      setExpandedModules(moduleIds)
      
    } catch (error) {
      console.error('Error loading modules and lessons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const moduleData = {
        ...moduleFormData,
        course_id: courseId
      }

      if (editingItem && 'course_id' in editingItem) {
        // Actualizar módulo existente
        const { error } = await supabase
          .from('modules')
          .update(moduleData)
          .eq('id', editingItem.id)

        if (error) throw error
      } else {
        // Crear nuevo módulo
        const { error } = await supabase
          .from('modules')
          .insert([moduleData])

        if (error) throw error
      }

      await loadModulesAndLessons()
      resetForms()
    } catch (error) {
      console.error('Error saving module:', error)
      alert('Error al guardar el módulo')
    } finally {
      setLoading(false)
    }
  }

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Calcular el siguiente order_index automáticamente
      const module = modules.find(m => m.id === lessonFormData.module_id)
      const nextOrder = module ? module.lessons.length + 1 : 1

      const lessonData = {
        ...lessonFormData,
        order_index: editingItem && 'module_id' in editingItem ? 
          (editingItem as Lesson).order_index : nextOrder
      }

      if (editingItem && 'module_id' in editingItem) {
        // Actualizar lección existente
        const { error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', editingItem.id)

        if (error) throw error
      } else {
        // Crear nueva lección
        const { error } = await supabase
          .from('lessons')
          .insert([lessonData])

        if (error) throw error
      }

      await loadModulesAndLessons()
      resetForms()
    } catch (error) {
      console.error('Error saving lesson:', error)
      alert('Error al guardar la lección')
    } finally {
      setLoading(false)
    }
  }

  const handleEditModule = (module: Module) => {
    setEditingItem(module)
    setModuleFormData({
      title: module.title,
      description: module.description,
      order_index: module.order_index
    })
    setShowForm('module')
  }

  const handleEditLesson = (lesson: Lesson) => {
    setEditingItem(lesson)
    setLessonFormData({
      title: lesson.title,
      description: lesson.description,
      video_url: lesson.video_url,
      is_free: lesson.is_free,
      module_id: lesson.module_id
    })
    
    // Detectar tipo de video automáticamente
    if (lesson.video_url.includes('<iframe') || lesson.video_url.includes('<embed')) {
      setVideoType('embed')
    } else {
      setVideoType('url')
    }
    
    setShowForm('lesson')
  }

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('¿Estás seguro? Esto eliminará el módulo y todas sus lecciones.')) return

    try {
      // Primero eliminar las lecciones del módulo
      await supabase.from('lessons').delete().eq('module_id', moduleId)
      
      // Luego eliminar el módulo
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId)

      if (error) throw error
      await loadModulesAndLessons()
    } catch (error) {
      console.error('Error deleting module:', error)
      alert('Error al eliminar el módulo')
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta lección?')) return

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId)

      if (error) throw error
      await loadModulesAndLessons()
    } catch (error) {
      console.error('Error deleting lesson:', error)
      alert('Error al eliminar la lección')
    }
  }

  const toggleModuleExpansion = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  const resetForms = () => {
    setModuleFormData({ title: '', description: '', order_index: 1 })
    setLessonFormData({ 
      title: '', 
      description: '', 
      video_url: '', 
      is_free: false, 
      module_id: '' 
    })
    setEditingItem(null)
    setShowForm(null)
    setSelectedModuleId('')
    setVideoType('url')
  }

  const openLessonForm = (moduleId: string) => {
    setLessonFormData({
      title: '',
      description: '',
      video_url: '',
      is_free: false,
      module_id: moduleId
    })
    setSelectedModuleId(moduleId)
    setVideoType('url')
    setShowForm('lesson')
  }

  const detectVideoType = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube'
    if (url.includes('vimeo.com')) return 'Vimeo'
    if (url.includes('wistia.com')) return 'Wistia'
    if (url.includes('loom.com')) return 'Loom'
    if (url.includes('<iframe') || url.includes('<embed')) return 'Código embebido'
    return 'URL de video'
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Sin duración'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (loading && modules.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white text-xl">Cargando contenido...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestión de Contenido</h2>
          <p className="text-gray-400">{courseName}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowForm('module')}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Módulo
          </button>
        </div>
      </div>

      {/* Forms Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                {showForm === 'module' 
                  ? (editingItem ? 'Editar Módulo' : 'Nuevo Módulo')
                  : (editingItem ? 'Editar Lección' : 'Nueva Lección')
                }
              </h3>
              <button
                onClick={resetForms}
                className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Module Form */}
            {showForm === 'module' && (
              <form onSubmit={handleModuleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Título del Módulo *
                  </label>
                  <input
                    type="text"
                    required
                    value={moduleFormData.title}
                    onChange={(e) => setModuleFormData({ ...moduleFormData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Ej: Fundamentos de React"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows={4}
                    value={moduleFormData.description}
                    onChange={(e) => setModuleFormData({ ...moduleFormData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                    placeholder="Describe el contenido y objetivos de este módulo..."
                  />
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={resetForms}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {loading ? 'Guardando...' : 'Guardar Módulo'}
                  </button>
                </div>
              </form>
            )}

            {/* Lesson Form */}
            {showForm === 'lesson' && (
              <form onSubmit={handleLessonSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Título de la Lección *
                  </label>
                  <input
                    type="text"
                    required
                    value={lessonFormData.title}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Ej: Introducción a los Hooks"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    value={lessonFormData.description}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                    placeholder="Describe el contenido de esta lección..."
                  />
                </div>

                {/* Selector de tipo de video */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Tipo de Video *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVideoType('url')}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        videoType === 'url'
                          ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                          : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <Link className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">URL de Video</div>
                      <div className="text-xs opacity-75">YouTube, Vimeo, etc.</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setVideoType('embed')}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        videoType === 'embed'
                          ? 'border-purple-500 bg-purple-600/20 text-purple-400'
                          : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <Code className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Código Embebido</div>
                      <div className="text-xs opacity-75">HTML, iframe</div>
                    </button>
                  </div>
                </div>

                {/* Campo de video */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {videoType === 'url' ? 'URL del Video *' : 'Código de Embebido *'}
                  </label>
                  
                  {videoType === 'url' ? (
                    <div>
                      <input
                        type="text"
                        required
                        value={lessonFormData.video_url}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, video_url: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/..."
                      />
                      <div className="mt-2 text-xs text-gray-400">
                        <strong>Plataformas soportadas:</strong> YouTube, Vimeo, Wistia, Loom, y cualquier URL de video
                      </div>
                    </div>
                  ) : (
                    <div>
                      <textarea
                        rows={6}
                        required
                        value={lessonFormData.video_url}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, video_url: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none font-mono text-sm"
                        placeholder='<iframe src="https://player.vimeo.com/video/123456789" width="640" height="360" frameborder="0" allowfullscreen></iframe>'
                      />
                      <div className="mt-2 text-xs text-gray-400">
                        <strong>Pega aquí el código iframe</strong> que te proporciona la plataforma de video (Vimeo, Wistia, etc.)
                      </div>
                    </div>
                  )}
                  
                  {/* Preview del tipo de video detectado */}
                  {lessonFormData.video_url && (
                    <div className="mt-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="flex items-center gap-2 text-sm">
                        <Video className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">Detectado:</span>
                        <span className="text-blue-400 font-medium">{detectVideoType(lessonFormData.video_url)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lección gratuita */}
                <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-xl border border-gray-600">
                  <input
                    type="checkbox"
                    id="is_free"
                    checked={lessonFormData.is_free}
                    onChange={(e) => setLessonFormData({ ...lessonFormData, is_free: e.target.checked })}
                    className="w-5 h-5 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <label htmlFor="is_free" className="flex items-center gap-2 text-white font-medium cursor-pointer">
                    <Gift className="w-5 h-5 text-green-400" />
                    Lección gratuita (visible sin inscripción)
                  </label>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={resetForms}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {loading ? 'Guardando...' : 'Guardar Lección'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modules and Lessons List */}
      <div className="space-y-6">
        {modules.map((module) => (
          <div key={module.id} className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
            {/* Module Header */}
            <div className="p-6 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => toggleModuleExpansion(module.id)}
                    className="text-gray-400 hover:text-white p-2 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {expandedModules.has(module.id) ? 
                      <ChevronDown className="w-6 h-6" /> : 
                      <ChevronRight className="w-6 h-6" />
                    }
                  </button>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{module.title}</h3>
                    <p className="text-gray-300">{module.description}</p>
                    <div className="flex items-center gap-6 mt-2">
                      <span className="text-sm text-gray-400 flex items-center gap-1">
                        <Video className="w-4 h-4" />
                        {module.lessons.length} lecciones
                      </span>
                      <span className="text-sm text-gray-400 flex items-center gap-1">
                        <Gift className="w-4 h-4" />
                        {module.lessons.filter(l => l.is_free).length} gratuitas
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openLessonForm(module.id)}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:scale-105"
                  >
                    + Nueva Lección
                  </button>
                  <button
                    onClick={() => handleEditModule(module)}
                    className="p-3 text-blue-400 hover:text-blue-300 hover:bg-blue-600/20 rounded-lg transition-all duration-200"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteModule(module.id)}
                    className="p-3 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Lessons List */}
            {expandedModules.has(module.id) && (
              <div className="p-6">
                {module.lessons.length > 0 ? (
                  <div className="space-y-4">
                    {module.lessons.map((lesson, index) => (
                      <div key={lesson.id} className="bg-gray-700/50 border border-gray-600 p-5 rounded-xl hover:bg-gray-700/70 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-white text-lg">{lesson.title}</h4>
                                {lesson.is_free && (
                                  <span className="px-3 py-1 bg-green-600/20 text-green-400 text-xs font-medium rounded-full border border-green-600/30">
                                    <Gift className="w-3 h-3 inline mr-1" />
                                    Gratis
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-300 mb-3">{lesson.description}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Video className="w-4 h-4" />
                                  <span>{detectVideoType(lesson.video_url)}</span>
                                </div>
                                {lesson.video_duration && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatDuration(lesson.video_duration)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditLesson(lesson)}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-600/20 rounded-lg transition-all duration-200"
                              title="Editar lección"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded-lg transition-all duration-200"
                              title="Eliminar lección"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-4">No hay lecciones en este módulo</p>
                    <button
                      onClick={() => openLessonForm(module.id)}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg"
                    >
                      Crear primera lección
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {modules.length === 0 && (
          <div className="text-center py-16 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-gray-700">
            <Video className="w-20 h-20 text-gray-600 mx-auto mb-6" />
            <div className="text-gray-400 text-xl mb-4">No hay módulos en este curso</div>
            <p className="text-gray-500 mb-6">Crea el primer módulo para comenzar a estructurar tu contenido</p>
            <button
              onClick={() => setShowForm('module')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg text-lg font-semibold"
            >
              Crear primer módulo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}