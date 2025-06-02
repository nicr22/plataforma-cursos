'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { MessageSquare, Plus, ArrowLeft, User, Reply, Clock } from 'lucide-react'
import CourseProgress from '@/components/course/CourseProgress'


interface CommunityPost {
  id: string
  title: string
  content: string
  created_at: string
  user_id: string
  course_id: string
  profiles: {
    full_name: string | null
    email: string
  }
  replies_count?: number
}

interface CommunityReply {
  id: string
  content: string
  created_at: string
  user_id: string
  post_id: string
  profiles: {
    full_name: string | null
    email: string
  }
}

export default function CommunityPage() {
  const params = useParams()
  const courseId = params.id as string
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)
  const [replies, setReplies] = useState<CommunityReply[]>([])
  const [showNewPostForm, setShowNewPostForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState({ title: '', content: '' })
  const [newReply, setNewReply] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    if (courseId) {
      fetchPosts()
    }
  }, [courseId])

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Obtener conteo de respuestas para cada post
      const postsWithReplies = await Promise.all(
        (data || []).map(async (post) => {
          const { count } = await supabase
            .from('community_replies')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)

          return { ...post, replies_count: count || 0 }
        })
      )

      setPosts(postsWithReplies)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReplies = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_replies')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setReplies(data || [])
    } catch (error) {
      console.error('Error fetching replies:', error)
    }
  }

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.title.trim() || !newPost.content.trim() || !user) return

    try {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          title: newPost.title.trim(),
          content: newPost.content.trim(),
          course_id: courseId,
          user_id: user.id
        })
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .single()

      if (error) throw error

      setPosts(prev => [{ ...data, replies_count: 0 }, ...prev])
      setNewPost({ title: '', content: '' })
      setShowNewPostForm(false)
    } catch (error) {
      console.error('Error creating post:', error)
    }
  }

  const createReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReply.trim() || !selectedPost || !user) return

    try {
      const { data, error } = await supabase
        .from('community_replies')
        .insert({
          content: newReply.trim(),
          post_id: selectedPost.id,
          user_id: user.id
        })
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .single()

      if (error) throw error

      setReplies(prev => [...prev, data])
      setNewReply('')
      
      // Actualizar conteo de respuestas
      setPosts(prev => prev.map(post => 
        post.id === selectedPost.id 
          ? { ...post, replies_count: (post.replies_count || 0) + 1 }
          : post
      ))
    } catch (error) {
      console.error('Error creating reply:', error)
    }
  }

  const selectPost = (post: CommunityPost) => {
    setSelectedPost(post)
    fetchReplies(post.id)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Cargando comunidad...</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <button 
              onClick={() => window.location.href = `/course/${courseId}`}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al curso
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Comunidad del Curso</h1>
                <p className="text-gray-600">Haz preguntas y comparte conocimiento con otros estudiantes</p>
              </div>
              <button
                onClick={() => setShowNewPostForm(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nueva Pregunta
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {selectedPost ? (
            /* Vista de post individual con respuestas */
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a la lista
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedPost.title}</h2>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedPost.profiles?.full_name || selectedPost.profiles?.email}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDate(selectedPost.created_at)}
                  </div>
                </div>
                <p className="text-gray-700 mt-4 whitespace-pre-wrap">{selectedPost.content}</p>
              </div>

              {/* Respuestas */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Respuestas ({replies.length})
                </h3>

                {/* Formulario para nueva respuesta */}
                <form onSubmit={createReply} className="mb-6">
                  <textarea
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    placeholder="Escribe tu respuesta..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={!newReply.trim()}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Reply className="h-4 w-4" />
                      Responder
                    </button>
                  </div>
                </form>

                {/* Lista de respuestas */}
                <div className="space-y-4">
                  {replies.map((reply) => (
                    <div key={reply.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm text-gray-900">
                          {reply.profiles?.full_name || reply.profiles?.email}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(reply.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))}
                  
                  {replies.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Reply className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay respuestas aún</p>
                      <p className="text-sm">Sé el primero en responder</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Lista de posts */
            <div>
              {/* Modal para nuevo post */}
              {showNewPostForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Nueva Pregunta</h3>
                    <form onSubmit={createPost}>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Título
                        </label>
                        <input
                          type="text"
                          value={newPost.title}
                          onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="¿Cuál es tu pregunta?"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Descripción
                        </label>
                        <textarea
                          value={newPost.content}
                          onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Describe tu pregunta con más detalle..."
                          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={5}
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setShowNewPostForm(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={!newPost.title.trim() || !newPost.content.trim()}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          Publicar Pregunta
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Lista de posts */}
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <div className="bg-white rounded-lg p-12 text-center">
                    <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No hay preguntas aún
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Sé el primero en hacer una pregunta en esta comunidad
                    </p>
                    <button
                      onClick={() => setShowNewPostForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Hacer Primera Pregunta
                    </button>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => selectPost(post)}
                      className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {post.content}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {post.profiles?.full_name || post.profiles?.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDate(post.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {post.replies_count || 0} respuestas
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}