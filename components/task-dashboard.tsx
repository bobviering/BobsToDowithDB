'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type Task = {
  id: string
  user_id: string
  title: string
  due_date: string | null
  completed: boolean
  created_at: string
  updated_at?: string | null
  priority?: string | null
  list_name?: string | null
  notes?: string | null
}

type EditorState = {
  title: string
  due_date: string
  priority: string
  list_name: string
  notes: string
  completed: boolean
}

const emptyEditor: EditorState = {
  title: '',
  due_date: '',
  priority: 'Medium',
  list_name: 'Personal',
  notes: '',
  completed: false,
}

export default function TaskDashboard({ session }: { session: Session }) {
  const supabase = createClient()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [showTodayOnly, setShowTodayOnly] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>(emptyEditor)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id])

  function flashStatus(message: string) {
    setStatus(message)
    window.clearTimeout((window as any).__todoStatusTimer)
    ;(window as any).__todoStatusTimer = window.setTimeout(() => {
      setStatus('')
    }, 1800)
  }

  async function fetchTasks() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .order('completed', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      setError('Failed to load tasks.')
    } else {
      setTasks((data as Task[]) || [])
    }

    setLoading(false)
  }

  function loadTaskIntoEditor(task: Task) {
    setSelectedTaskId(task.id)
    setEditor({
      title: task.title || '',
      due_date: task.due_date || '',
      priority: task.priority || 'Medium',
      list_name: task.list_name || 'Personal',
      notes: task.notes || '',
      completed: task.completed,
    })
    setError('')
  }

  function resetEditor() {
    setSelectedTaskId(null)
    setEditor(emptyEditor)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const trimmedTitle = editor.title.trim()
    if (!trimmedTitle) {
      setError('Please enter a task title.')
      return
    }

    setSaving(true)

    const payload = {
      title: trimmedTitle,
      due_date: editor.due_date || null,
      priority: editor.priority || null,
      list_name: editor.list_name || null,
      notes: editor.notes || null,
      completed: editor.completed,
      updated_at: new Date().toISOString(),
    }

    if (selectedTaskId) {
      const { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', selectedTaskId)
        .eq('user_id', session.user.id)

      if (error) {
        setError('Could not update task.')
      } else {
        flashStatus('Task updated.')
        await fetchTasks()
      }
    } else {
      const { error } = await supabase.from('tasks').insert({
        ...payload,
        user_id: session.user.id,
        completed: false,
      })

      if (error) {
        setError('Could not add task.')
      } else {
        flashStatus('Task saved.')
        resetEditor()
        await fetchTasks()
      }
    }

    setSaving(false)
  }

  async function toggleComplete(task: Task) {
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('tasks')
      .update({
        completed: !task.completed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .eq('user_id', session.user.id)

    if (error) {
      setError('Could not update task status.')
    } else {
      flashStatus(task.completed ? 'Task reopened.' : 'Task completed.')
      if (selectedTaskId === task.id) {
        setEditor((prev) => ({ ...prev, completed: !task.completed }))
      }
      await fetchTasks()
    }

    setSaving(false)
  }

  async function deleteTask(taskId: string) {
    const confirmed = window.confirm('Delete this task?')
    if (!confirmed) return

    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', session.user.id)

    if (error) {
      setError('Could not delete task.')
    } else {
      flashStatus('Task deleted.')
      if (selectedTaskId === taskId) resetEditor()
      await fetchTasks()
    }

    setSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const filteredTasks = useMemo(() => {
    if (!showTodayOnly) return tasks
    return tasks.filter((task) => !task.completed && task.due_date === today)
  }, [tasks, showTodayOnly, today])

  const todayCount = tasks.filter(
    (task) => !task.completed && task.due_date === today
  ).length

  const lastUpdated =
    tasks.length > 0
      ? [...tasks]
          .map((task) => task.updated_at || task.created_at)
          .filter(Boolean)
          .sort()
          .reverse()[0]
      : null

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">My Tasks</h1>
              <p className="mt-1 text-sm text-slate-600">
                Signed in as {session.user.email}
              </p>
              {lastUpdated ? (
                <p className="mt-1 text-xs text-slate-500">
                  Last updated: {new Date(lastUpdated).toLocaleString()}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowTodayOnly((prev) => !prev)}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                  showTodayOnly
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                {showTodayOnly
                  ? 'Show All Tasks'
                  : `Today Focus${todayCount ? ` (${todayCount})` : ''}`}
              </button>

              <button
                type="button"
                onClick={resetEditor}
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-200"
              >
                New Task
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-200"
              >
                Log Out
              </button>
            </div>
          </div>

          <div className="mt-4 min-h-6">
            {loading && <p className="text-sm text-slate-600">Loading tasks...</p>}
            {!loading && saving && <p className="text-sm text-emerald-700">Saving...</p>}
            {!loading && !!status && <p className="text-sm text-emerald-700">{status}</p>}
            {!!error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {showTodayOnly ? 'Today' : 'All Tasks'}
              </h2>
              <p className="text-sm text-slate-500">
                {filteredTasks.length} item{filteredTasks.length === 1 ? '' : 's'}
              </p>
            </div>

            {loading ? null : filteredTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                {showTodayOnly
                  ? 'Nothing due today.'
                  : 'No tasks yet. Add your first one on the right.'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const isSelected = selectedTaskId === task.id
                  const isDueToday = task.due_date === today && !task.completed

                  return (
                    <div
                      key={task.id}
                      onClick={() => loadTaskIntoEditor(task)}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleComplete(task)
                          }}
                          className={`mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 transition ${
                            task.completed
                              ? 'border-emerald-600 bg-emerald-600'
                              : 'border-slate-400 bg-white hover:border-slate-600'
                          }`}
                        >
                          {task.completed ? (
                            <span className="block text-center text-xs text-white">✓</span>
                          ) : null}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3
                                className={`text-base font-medium ${
                                  task.completed
                                    ? 'text-slate-400 line-through'
                                    : 'text-slate-900'
                                }`}
                              >
                                {task.title}
                              </h3>

                              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                {task.list_name ? (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                                    {task.list_name}
                                  </span>
                                ) : null}

                                {task.priority ? (
                                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
                                    {task.priority}
                                  </span>
                                ) : null}

                                {task.due_date ? (
                                  <span
                                    className={`rounded-full px-2.5 py-1 ${
                                      isDueToday
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    Due {task.due_date}
                                  </span>
                                ) : null}
                              </div>

                              {task.notes ? (
                                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                                  {task.notes}
                                </p>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteTask(task.id)
                              }}
                              className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section
            className={`rounded-2xl bg-white p-4 shadow-sm ring-1 transition sm:p-6 ${
              selectedTaskId ? 'ring-blue-400 shadow-md' : 'ring-slate-200'
            }`}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedTaskId ? 'Edit Task' : 'Add Task'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {selectedTaskId
                  ? 'You are editing the selected task. Make changes and save.'
                  : 'Create a new task here.'}
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  value={editor.title}
                  onChange={(e) =>
                    setEditor((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none ring-0 transition focus:border-blue-500"
                  placeholder="Enter task title"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editor.due_date}
                    onChange={(e) =>
                      setEditor((prev) => ({ ...prev, due_date: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Priority
                  </label>
                  <select
                    value={editor.priority}
                    onChange={(e) =>
                      setEditor((prev) => ({ ...prev, priority: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-blue-500"
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  List
                </label>
                <select
                  value={editor.list_name}
                  onChange={(e) =>
                    setEditor((prev) => ({ ...prev, list_name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-blue-500"
                >
                  <option>Home</option>
                  <option>Work</option>
                  <option>Personal</option>
                  <option>Errands</option>
                  <option>Health</option>
                  <option>Finance</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  value={editor.notes}
                  onChange={(e) =>
                    setEditor((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-blue-500"
                  placeholder="Optional notes"
                />
              </div>

              {selectedTaskId ? (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editor.completed}
                    onChange={(e) =>
                      setEditor((prev) => ({ ...prev, completed: e.target.checked }))
                    }
                  />
                  Mark as completed
                </label>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {selectedTaskId ? 'Save Changes' : 'Add Task'}
                </button>

                {selectedTaskId ? (
                  <button
                    type="button"
                    onClick={resetEditor}
                    className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-200"
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}
