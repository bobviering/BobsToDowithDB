'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Priority = 'High' | 'Medium' | 'Low'
type PresetList = 'Home' | 'Work' | 'Personal' | 'Errands' | 'Health' | 'Finance' | 'Other'
type SortMode = 'date' | 'priority' | 'list'
type ViewMode = 'list' | 'calendar'

type TaskRecord = {
  id: string
  user_id: string
  title: string
  notes: string | null
  due_date: string | null
  priority: Priority
  list_name: string
  completed: boolean
  created_at: string
  updated_at: string
}

type DraftTask = {
  title: string
  notes: string
  due_date: string
  priority: Priority
  presetList: PresetList
  customList: string
}

const DEFAULT_DRAFT: DraftTask = {
  title: '',
  notes: '',
  due_date: '',
  priority: 'Medium',
  presetList: 'Home',
  customList: ''
}

const PRESET_LISTS: PresetList[] = ['Home', 'Work', 'Personal', 'Errands', 'Health', 'Finance', 'Other']
const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }

function getPriorityCardAccent(priority: Priority, completed: boolean) {
  if (completed) return 'border-l-4 border-l-slate-300 bg-slate-50 opacity-70'

  switch (priority) {
    case 'High':
      return 'border-l-4 border-l-red-600 bg-red-50'
    case 'Medium':
      return 'border-l-4 border-l-amber-500 bg-amber-50'
    case 'Low':
      return 'border-l-4 border-l-slate-400 bg-white'
    default:
      return 'border-l-4 border-l-slate-300 bg-white'
  }
}

export function TaskDashboard({ initialTasks, email }: { initialTasks: TaskRecord[]; email: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks)
  const [draft, setDraft] = useState<DraftTask>(DEFAULT_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [listFilter, setListFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [showCompleted, setShowCompleted] = useState(true)

  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // 👇 NEW
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  async function refreshTasks() {
    const { data } = await supabase.from('tasks').select('*')
    setTasks((data ?? []) as TaskRecord[])
  }

  function resetDraft() {
    setDraft(DEFAULT_DRAFT)
    setEditingId(null)
  }

  async function handleSubmit(e: any) {
    e.preventDefault()

    const payload = {
      title: draft.title,
      notes: draft.notes || null,
      due_date: draft.due_date || null,
      priority: draft.priority,
      list_name: draft.presetList,
      updated_at: new Date().toISOString()
    }

    if (editingId) {
      await supabase.from('tasks').update(payload).eq('id', editingId)
    } else {
      await supabase.from('tasks').insert(payload)
    }

    resetDraft()
    await refreshTasks()
  }

  function startEdit(task: TaskRecord) {
    setDraft({
      title: task.title,
      notes: task.notes ?? '',
      due_date: task.due_date ?? '',
      priority: task.priority,
      presetList: task.list_name as PresetList,
      customList: ''
    })

    setEditingId(task.id)
    setShowForm(true) // 👈 important
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function toggleTask(task: TaskRecord) {
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id)
    await refreshTasks()
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    await refreshTasks()
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      return (
        (search === '' || task.title.toLowerCase().includes(search.toLowerCase())) &&
        (listFilter === 'all' || task.list_name === listFilter) &&
        (priorityFilter === 'all' || task.priority === priorityFilter) &&
        (showCompleted || !task.completed)
      )
    })
  }, [tasks, search, listFilter, priorityFilter, showCompleted])

  return (
    <div className="mx-auto max-w-7xl p-4">

      {/* ADD / EDIT */}
      <section className="mb-4 rounded-2xl border p-4 bg-white">

        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">
            {editingId ? 'Edit Task' : 'Add Task'}
          </h2>

          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm bg-slate-100 px-3 py-1 rounded-xl"
          >
            {showForm ? '– Hide' : '+ Show'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Task"
              className="w-full border p-2 rounded-xl"
            />

            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Notes"
              className="w-full border p-2 rounded-xl"
            />

            <select
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
              className="w-full border p-2 rounded-xl"
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <button className="w-full bg-black text-white p-2 rounded-xl">
              {editingId ? 'Save' : 'Add'}
            </button>
          </form>
        )}
      </section>

      {/* TASKS */}
      <section className="rounded-2xl border p-4 bg-white">

        {/* FILTER TOGGLE */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">Tasks</h2>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm bg-slate-100 px-3 py-1 rounded-xl"
          >
            {showFilters ? '– Filters' : '+ Filters'}
          </button>
        </div>

        {/* FILTERS */}
        {showFilters && (
          <div className="grid gap-2 mb-4">
            <input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border p-2 rounded-xl"
            />

            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)}>
              <option value="all">All priorities</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
        )}

        {/* TASK LIST */}
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-3 rounded-xl border ${getPriorityCardAccent(task.priority, task.completed)}`}
            >
              <div className="flex justify-between">
                <div>
                  <div className={task.completed ? 'line-through' : ''}>
                    {task.title}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => startEdit(task)}>Edit</button>
                  <button onClick={() => deleteTask(task.id)}>Delete</button>
                </div>
              </div>

              <button onClick={() => toggleTask(task)}>
                {task.completed ? 'Undo' : 'Complete'}
              </button>
            </div>
          ))}
        </div>

      </section>
    </div>
  )
}
