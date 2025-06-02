export interface User {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
    role: 'student' | 'admin'
    created_at: string
    updated_at: string
  }
  
  export interface Course {
    id: string
    title: string
    description?: string
    thumbnail_url?: string
    price: number
    is_active: boolean
    created_by?: string
    created_at: string
    updated_at: string
  }
  
  export interface Module {
    id: string
    course_id: string
    title: string
    description?: string
    order_index: number
    created_at: string
  }
  
  export interface Lesson {
    id: string
    module_id: string
    title: string
    description?: string
    video_url?: string
    video_duration?: number
    order_index: number
    is_free: boolean
    created_at: string
  }
  
  export interface UserCourse {
    id: string
    user_id: string
    course_id: string
    hotmart_transaction_id?: string
    expires_at?: string
    created_at: string
  }
  
  export interface LessonProgress {
    id: string
    user_id: string
    lesson_id: string
    completed: boolean
    watch_time: number
    completed_at?: string
    created_at: string
    updated_at: string
  }