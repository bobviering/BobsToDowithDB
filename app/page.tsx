'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showTodayOnly, setShowTodayOnly] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [])

  type Task = {
  id: string
  title: string
  due_date: string | null
  completed: boolean
  created_at: string
}
    
  async function fetchTasks() {
    setLoading(true)
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (error) setError('Failed to load tasks')
    else setTasks(data || [])
    setLoading(false)
  }

  async function addTask(title) {
    if (!title) return
    setSaving(true)
    const { error } = await supabase.from('tasks').insert({ title, completed: false })
    if (error) setError('Error saving task')
    await fetchTasks()
    setSaving(false)
  }

  const today = new Date().toISOString().split('T')[0]

  const filteredTasks = showTodayOnly
    ? tasks.filter(t => t.due_date === today)
    : tasks

  return (
    <div style={{ padding: 20 }}>
      <h2>My Tasks</h2>

      <button onClick={() => setShowTodayOnly(!showTodayOnly)}>
        {showTodayOnly ? 'Show All' : 'Today Focus'}
      </button>

      {saving && <p style={{ color: 'green' }}>Saving...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p>Loading tasks...</p>
      ) : filteredTasks.length === 0 ? (
        <p>No tasks yet — add one above.</p>
      ) : (
        filteredTasks.map(task => (
          <div key={task.id} style={{
            padding: 12,
            marginTop: 10,
            border: '1px solid #ccc',
            borderRadius: 8
          }}>
            {task.title}
          </div>
        ))
      )}
    </div>
  )
}
