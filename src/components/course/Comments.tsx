'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { MessageCircle, Send, Trash2, Sparkles, Reply, ChevronDown, ChevronUp } from 'lucide-react'

interface Reply {
  id: string
  content: string
  created_at: string
  user_id: string
  comment_id: string
  profiles: {
    full_name: string | null
    email: string
  }
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  lesson_id: string
  profiles: {
    full_name: string | null
    email: string
  }
  replies?: Reply[]
}

interface CommentsProps {
  lessonId: string
}

export default function Comments({ lessonId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const { user, profile } = useAuth()

  useEffect(() => {
    if (lessonId) {
      fetchComments()
    }
  }, [lessonId])

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Cargar respuestas para cada comentario
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: repliesData } = await supabase
            .from('comment_replies')
            .select(`
              *,
              profiles (
                full_name,
                email
              )
            `)
            .eq('comment_id', comment.id)
            .order('created_at', { ascending: true })

          return {
            ...comment,
            replies: repliesData || []
          }
        })
      )

      setComments(commentsWithReplies)
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          lesson_id: lessonId,
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

      setComments(prev => [...prev, { ...data, replies: [] }])
      setNewComment('')
    } catch (error) {
      console.error('Error posting comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const submitReply = async (commentId: string) => {
    if (!replyContent.trim() || !user) return

    setSubmitting(true)
    try {
      console.log('Enviando respuesta:', {
        content: replyContent.trim(),
        comment_id: commentId,
        user_id: user.id
      })

      const { data, error } = await supabase
        .from('comment_replies')
        .insert({
          content: replyContent.trim(),
          comment_id: commentId,
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

      if (error) {
        console.error('Error de Supabase:', error)
        alert(`Error al enviar respuesta: ${error.message}`)
        throw error
      }

      console.log('Respuesta guardada:', data)

      // Actualizar el comentario con la nueva respuesta
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? { ...comment, replies: [...(comment.replies || []), data] }
            : comment
        )
      )

      setReplyContent('')
      setReplyingTo(null)
      setExpandedComments(prev => new Set(prev).add(commentId))
    } catch (error: any) {
      console.error('Error posting reply:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      })
    } finally {
      setSubmitting(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este comentario y todas sus respuestas?')) return

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user?.id)

      if (error) throw error

      setComments(prev => prev.filter(comment => comment.id !== commentId))
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const deleteReply = async (replyId: string, commentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta respuesta?')) return

    try {
      const { error } = await supabase
        .from('comment_replies')
        .delete()
        .eq('id', replyId)
        .eq('user_id', user?.id)

      if (error) throw error

      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? { ...comment, replies: comment.replies?.filter(r => r.id !== replyId) }
            : comment
        )
      )
    } catch (error) {
      console.error('Error deleting reply:', error)
    }
  }

  const toggleExpanded = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return 'Ahora mismo'
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} d`

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-24 bg-gray-700 rounded-xl"></div>
            <div className="h-24 bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  const totalReplies = comments.reduce((sum, comment) => sum + (comment.replies?.length || 0), 0)

  return (
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Comentarios
            </h3>
            <p className="text-sm text-gray-400">
              {comments.length} {comments.length === 1 ? 'comentario' : 'comentarios'}
              {totalReplies > 0 && ` • ${totalReplies} ${totalReplies === 1 ? 'respuesta' : 'respuestas'}`}
            </p>
          </div>
        </div>

        {(comments.length > 0 || totalReplies > 0) && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-full">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">
              Conversación activa
            </span>
          </div>
        )}
      </div>

      {/* Formulario para nuevo comentario */}
      <form onSubmit={submitComment} className="mb-8">
        <div className="bg-gray-800/50 border border-gray-600 rounded-2xl p-6 backdrop-blur-sm transition-all duration-200 hover:border-gray-500">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-sm font-bold text-white">
                  {getInitials(profile?.full_name || null, user?.email || 'U')}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Comparte tus pensamientos sobre esta lección..."
                className="w-full bg-gray-700/50 text-white placeholder-gray-400 p-4 border border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                rows={4}
              />
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-500">
                  {newComment.length}/500 caracteres
                </p>
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting || newComment.length > 500}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:scale-105 disabled:scale-100 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'Enviando...' : 'Publicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Lista de comentarios */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-r from-gray-700 to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <MessageCircle className="h-10 w-10 text-gray-400" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">
              No hay comentarios aún
            </h4>
            <p className="text-gray-400 mb-6">
              Sé el primero en compartir tu opinión sobre esta lección
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-400 font-medium">
                Inicia la conversación
              </span>
            </div>
          </div>
        ) : (
          comments.map((comment, index) => {
            const isOwnComment = comment.user_id === user?.id
            const hasReplies = (comment.replies?.length || 0) > 0
            const isExpanded = expandedComments.has(comment.id)

            return (
              <div
                key={comment.id}
                className="group relative bg-gray-800/50 border border-gray-700 rounded-2xl p-6 transition-all duration-200 hover:border-gray-600 hover:bg-gray-800/70"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                      isOwnComment
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600'
                    }`}>
                      <span className="text-sm font-bold text-white">
                        {getInitials(comment.profiles?.full_name, comment.profiles?.email)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-white flex items-center gap-2">
                          {comment.profiles?.full_name || comment.profiles?.email?.split('@')[0] || 'Usuario'}
                          {isOwnComment && (
                            <span className="px-2 py-0.5 bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-medium rounded-full">
                              Tú
                            </span>
                          )}
                          {profile?.role === 'admin' && comment.user_id === user?.id && (
                            <span className="px-2 py-0.5 bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-medium rounded-full">
                              Admin
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-400 mt-0.5">
                          {formatDate(comment.created_at)}
                        </p>
                      </div>

                      {isOwnComment && (
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-600/20 p-2 rounded-lg transition-all duration-200"
                          title="Eliminar comentario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap mb-4">
                      {comment.content}
                    </p>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Reply className="h-4 w-4" />
                        Responder
                      </button>

                      {hasReplies && (
                        <button
                          onClick={() => toggleExpanded(comment.id)}
                          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {comment.replies?.length} {comment.replies?.length === 1 ? 'respuesta' : 'respuestas'}
                        </button>
                      )}
                    </div>

                    {/* Formulario de respuesta */}
                    {replyingTo === comment.id && (
                      <div className="mt-4 ml-4 pl-4 border-l-2 border-blue-500">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-xs font-bold text-white">
                                {getInitials(profile?.full_name || null, user?.email || 'U')}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Escribe tu respuesta..."
                              className="w-full bg-gray-700/50 text-white placeholder-gray-400 p-3 border border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                              rows={3}
                            />
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(null)
                                  setReplyContent('')
                                }}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => submitReply(comment.id)}
                                disabled={!replyContent.trim() || submitting}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                              >
                                <Send className="h-3.5 w-3.5" />
                                {submitting ? 'Enviando...' : 'Responder'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Respuestas */}
                    {hasReplies && isExpanded && (
                      <div className="mt-4 space-y-3 ml-4 pl-4 border-l-2 border-gray-600">
                        {comment.replies?.map((reply) => {
                          const isOwnReply = reply.user_id === user?.id

                          return (
                            <div key={reply.id} className="group/reply flex gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                              <div className="flex-shrink-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow ${
                                  isOwnReply
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                                    : 'bg-gradient-to-r from-orange-600 to-red-600'
                                }`}>
                                  <span className="text-xs font-bold text-white">
                                    {getInitials(reply.profiles?.full_name, reply.profiles?.email)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h5 className="font-medium text-sm text-white flex items-center gap-2">
                                      {reply.profiles?.full_name || reply.profiles?.email?.split('@')[0] || 'Usuario'}
                                      {isOwnReply && (
                                        <span className="px-1.5 py-0.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-medium rounded-full">
                                          Tú
                                        </span>
                                      )}
                                      {profile?.role === 'admin' && reply.user_id === user?.id && (
                                        <span className="px-1.5 py-0.5 bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-medium rounded-full">
                                          Admin
                                        </span>
                                      )}
                                    </h5>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {formatDate(reply.created_at)}
                                    </p>
                                  </div>

                                  {isOwnReply && (
                                    <button
                                      onClick={() => deleteReply(reply.id, comment.id)}
                                      className="opacity-0 group-hover/reply:opacity-100 text-red-400 hover:text-red-300 p-1 rounded transition-all"
                                      title="Eliminar respuesta"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>

                                <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                                  {reply.content}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Decorative element for first comment */}
                {index === 0 && comments.length > 1 && (
                  <div className="absolute -top-2 -right-2">
                    <div className="px-3 py-1 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-full shadow-lg">
                      <span className="text-xs font-bold text-white">Primero</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
