'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Save,
  X,
  Image as ImageIcon,
  Link as LinkIcon
} from 'lucide-react'

interface Banner {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  image_url: string | null
  button_text: string
  button_link: string | null
  link_type: 'course' | 'external' | 'none'
  is_active: boolean
  start_date: string | null
  end_date: string | null
  priority: number
  background_color: string
  gradient_from: string
  gradient_to: string
  text_color: string
  created_at: string
}

interface BannerFormData {
  title: string
  subtitle: string
  description: string
  image_url: string
  button_text: string
  button_link: string
  link_type: 'course' | 'external' | 'none'
  is_active: boolean
  start_date: string
  end_date: string
  priority: number
  gradient_from: string
  gradient_to: string
  text_color: string
}

export default function BannerManagement() {
  const { user } = useAuth()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [formData, setFormData] = useState<BannerFormData>({
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    button_text: 'Ver más',
    button_link: '',
    link_type: 'external',
    is_active: true,
    start_date: '',
    end_date: '',
    priority: 0,
    gradient_from: '#1e3a8a',
    gradient_to: '#7c3aed',
    text_color: '#ffffff'
  })

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('priority', { ascending: false })

      if (error) throw error
      setBanners(data || [])
    } catch (error) {
      console.error('Error fetching banners:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const bannerData = {
        title: formData.title,
        subtitle: formData.subtitle || null,
        description: formData.description || null,
        image_url: formData.image_url || null,
        button_text: formData.button_text,
        button_link: formData.button_link || null,
        link_type: formData.link_type,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        priority: formData.priority,
        gradient_from: formData.gradient_from,
        gradient_to: formData.gradient_to,
        text_color: formData.text_color,
        created_by: user?.id
      }

      if (editingBanner) {
        // Actualizar banner existente
        const { error } = await supabase
          .from('banners')
          .update(bannerData)
          .eq('id', editingBanner.id)

        if (error) throw error
        alert('Banner actualizado exitosamente')
      } else {
        // Crear nuevo banner
        const { error } = await supabase
          .from('banners')
          .insert([bannerData])

        if (error) throw error
        alert('Banner creado exitosamente')
      }

      // Resetear formulario
      setShowForm(false)
      setEditingBanner(null)
      setFormData({
        title: '',
        subtitle: '',
        description: '',
        image_url: '',
        button_text: 'Ver más',
        button_link: '',
        link_type: 'external',
        is_active: true,
        start_date: '',
        end_date: '',
        priority: 0,
        gradient_from: '#1e3a8a',
        gradient_to: '#7c3aed',
        text_color: '#ffffff'
      })
      fetchBanners()
    } catch (error) {
      console.error('Error saving banner:', error)
      alert('Error al guardar el banner')
    }
  }

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner)
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      image_url: banner.image_url || '',
      button_text: banner.button_text,
      button_link: banner.button_link || '',
      link_type: banner.link_type,
      is_active: banner.is_active,
      start_date: banner.start_date || '',
      end_date: banner.end_date || '',
      priority: banner.priority,
      gradient_from: banner.gradient_from,
      gradient_to: banner.gradient_to,
      text_color: banner.text_color
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este banner?')) return

    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('Banner eliminado exitosamente')
      fetchBanners()
    } catch (error) {
      console.error('Error deleting banner:', error)
      alert('Error al eliminar el banner')
    }
  }

  const toggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id)

      if (error) throw error
      fetchBanners()
    } catch (error) {
      console.error('Error toggling banner:', error)
      alert('Error al cambiar estado del banner')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestión de Banners</h2>
          <p className="text-gray-400 mt-1">Administra los banners promocionales de la página principal</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingBanner(null)
            setFormData({
              title: '',
              subtitle: '',
              description: '',
              image_url: '',
              button_text: 'Ver más',
              button_link: '',
              link_type: 'external',
              is_active: true,
              start_date: '',
              end_date: '',
              priority: 0,
              gradient_from: '#1e3a8a',
              gradient_to: '#7c3aed',
              text_color: '#ffffff'
            })
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Banner
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800 z-10">
              <h3 className="text-xl font-bold text-white">
                {editingBanner ? 'Editar Banner' : 'Nuevo Banner'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingBanner(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-white font-medium mb-2">Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Subtítulo */}
              <div>
                <label className="block text-white font-medium mb-2">Subtítulo</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-white font-medium mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* URL de Imagen */}
              <div>
                <label className="block text-white font-medium mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  URL de Imagen (opcional)
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-gray-400 text-sm mt-1">Si no se proporciona, se usará el gradiente de colores</p>
              </div>

              {/* Colores de Gradiente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Color Gradiente Inicio</label>
                  <input
                    type="color"
                    value={formData.gradient_from}
                    onChange={(e) => setFormData({ ...formData, gradient_from: e.target.value })}
                    className="w-full h-10 bg-gray-700 rounded-lg border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Color Gradiente Fin</label>
                  <input
                    type="color"
                    value={formData.gradient_to}
                    onChange={(e) => setFormData({ ...formData, gradient_to: e.target.value })}
                    className="w-full h-10 bg-gray-700 rounded-lg border border-gray-600"
                  />
                </div>
              </div>

              {/* Color de Texto */}
              <div>
                <label className="block text-white font-medium mb-2">Color de Texto</label>
                <input
                  type="color"
                  value={formData.text_color}
                  onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                  className="w-full h-10 bg-gray-700 rounded-lg border border-gray-600"
                />
              </div>

              {/* Botón */}
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Texto del Botón</label>
                  <input
                    type="text"
                    value={formData.button_text}
                    onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Tipo de Enlace</label>
                  <select
                    value={formData.link_type}
                    onChange={(e) => setFormData({ ...formData, link_type: e.target.value as any })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="external">URL Externa/Interna</option>
                    <option value="course">ID de Curso</option>
                    <option value="none">Sin Botón</option>
                  </select>
                </div>

                {formData.link_type !== 'none' && (
                  <div>
                    <label className="block text-white font-medium mb-2 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      {formData.link_type === 'course' ? 'ID del Curso' : 'URL del Enlace'}
                    </label>
                    <input
                      type="text"
                      value={formData.button_link}
                      onChange={(e) => setFormData({ ...formData, button_link: e.target.value })}
                      placeholder={formData.link_type === 'course' ? 'uuid-del-curso' : '/courses o https://...'}
                      className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha de Inicio
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha de Fin
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Prioridad (mayor número = mayor prioridad)
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Estado */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-white">Banner activo</label>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  <Save className="w-5 h-5" />
                  {editingBanner ? 'Actualizar' : 'Crear'} Banner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingBanner(null)
                  }}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banners List */}
      <div className="space-y-4">
        {banners.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl">
            <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No hay banners creados</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Crear tu primer banner
            </button>
          </div>
        ) : (
          banners.map((banner) => (
            <div
              key={banner.id}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{banner.title}</h3>
                    {banner.is_active ? (
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-medium rounded-full">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs font-medium rounded-full">
                        Inactivo
                      </span>
                    )}
                    <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs font-medium rounded-full">
                      Prioridad: {banner.priority}
                    </span>
                  </div>

                  {banner.subtitle && (
                    <p className="text-gray-400 mb-2">{banner.subtitle}</p>
                  )}

                  {banner.description && (
                    <p className="text-gray-500 text-sm mb-3">{banner.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {banner.start_date && (
                      <span>Inicio: {new Date(banner.start_date).toLocaleDateString('es-ES')}</span>
                    )}
                    {banner.end_date && (
                      <span>Fin: {new Date(banner.end_date).toLocaleDateString('es-ES')}</span>
                    )}
                    {!banner.start_date && !banner.end_date && (
                      <span>Sin límite de tiempo</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(banner)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title={banner.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {banner.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleEdit(banner)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-600/20 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
