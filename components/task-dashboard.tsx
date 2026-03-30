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
const PRIORITY_STYLES: Record<Priority, string> = {
  High: 'border-rose-300 bg-rose-50 text-rose-700',
  Medium: 'border-amber-300 bg-amber-50 text-amber-700',
  Low: 'border-slate-300 bg-slate-50 text-slate-700'
}

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

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatTaskMeta(task: TaskRecord) {
  const parts = [
    task.due_date ? `Due ${formatDate(task.due_date)}` : 'No due date',
    task.list_name,
    task.priority
  ]
  return parts.join(' • ')
}

export function TaskDashboard({ initialTasks }: { initialTasks: TaskRecord[] }) {
  const supabase = useMemo(() => createClient(), [])
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks)
  const [draft, setDraft] = useState<DraftTask>(DEFAULT_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [listFilter, setListFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [showCompleted, setShowCompleted] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [reminderDismissedKey, setReminderDismissedKey] = useState<string | null>(null)
  const [reminderOpen, setReminderOpen] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([])

  useEffect(() => {
    const savedSort = window.localStorage.getItem('todo-cloud-sort-mode') as SortMode | null
    if (savedSort && ['date', 'priority', 'list'].includes(savedSort)) {
      setSortMode(savedSort)
    }

    const savedView = window.localStorage.getItem('todo-cloud-view-mode') as ViewMode | null
    if (savedView && ['list', 'calendar'].includes(savedView)) {
      setViewMode(savedView)
    }

    const dismissed = window.localStorage.getItem('todo-cloud-reminder-dismissed')
    if (dismissed) {
      setReminderDismissedKey(dismissed)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('todo-cloud-sort-mode', sortMode)
  }, [sortMode])

  useEffect(() => {
    window.localStorage.setItem('todo-cloud-view-mode', viewMode)
  }, [viewMode])

  useEffect(() => {
    if (viewMode === 'calendar') {
      const now = new Date()
      setCalendarDate(new Date(now.getFullYear(), now.getMonth(), 1))
    }
  }, [viewMode])

  useEffect(() => {
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  useEffect(() => {
    if (!errorMessage) return
    const timer = window.setTimeout(() => setErrorMessage(''), 3200)
    return () => window.clearTimeout(timer)
  }, [errorMessage])

  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const reminderTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.completed && !!task.due_date)
      .filter((task) => task.due_date! <= todayKey)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  }, [tasks, todayKey])

  useEffect(() => {
    const shouldShow = reminderTasks.length > 0 && reminderDismissedKey !== todayKey
    setReminderOpen(shouldShow)
  }, [reminderDismissedKey, reminderTasks.length, todayKey])

  const availableLists = useMemo(() => {
    const values = new Set<string>(PRESET_LISTS.filter((item) => item !== 'Other'))
    tasks.forEach((task) => values.add(task.list_name))
    return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b))]
  }, [tasks])

  const filteredTasks = useMemo(() => {
    const searchLower = search.trim().toLowerCase()

    const result = tasks.filter((task) => {
      const matchesSearch =
        !searchLower ||
        task.title.toLowerCase().includes(searchLower) ||
        (task.notes ?? '').toLowerCase().includes(searchLower)

      const matchesList = listFilter === 'all' || task.list_name === listFilter
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
      const matchesCompleted = showCompleted || !task.completed

      return matchesSearch && matchesList && matchesPriority && matchesCompleted
    })

    return result.sort((a, b) => {
      if (sortMode === 'priority') {
        return (
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
          (a.due_date ?? '9999-99-99').localeCompare(b.due_date ?? '9999-99-99')
        )
      }

      if (sortMode === 'list') {
        return (
          a.list_name.localeCompare(b.list_name) ||
          (a.due_date ?? '9999-99-99').localeCompare(b.due_date ?? '9999-99-99')
        )
      }

      const aRank = a.due_date ? a.due_date : '9999-99-99'
      const bRank = b.due_date ? b.due_date : '9999-99-99'
      return aRank.localeCompare(bRank) || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    })
  }, [tasks, search, listFilter, priorityFilter, showCompleted, sortMode])

  const calendarMatrix = useMemo(() => {
    const monthStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1)
    const monthEnd = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0)
    const startOffset = monthStart.getDay()
    const totalCells = Math.ceil((startOffset + monthEnd.getDate()) / 7) * 7

    const cells = Array.from({ length: totalCells }, (_, index) => {
      const dayNumber = index - startOffset + 1
      const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), dayNumber)
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const dayTasks = filteredTasks.filter((task) => task.due_date === dateKey)

      return {
        date,
        dateKey,
        inMonth: date.getMonth() === calendarDate.getMonth(),
        tasks: dayTasks
      }
    })

    const rows = [] as typeof cells[]
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7))
    }

    return rows
  }, [calendarDate, filteredTasks])

  async function refreshTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setTasks((data ?? []) as TaskRecord[])
  }

  function resetDraft() {
    setDraft(DEFAULT_DRAFT)
    setEditingId(null)
  }

  function startNewTask() {
    resetDraft()
    setShowForm(true)
    setViewMode('list')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function draftListValue() {
    return draft.presetList === 'Other' ? draft.customList.trim() : draft.presetList
  }

  function toggleTaskExpanded(id: string) {
    setExpandedTaskIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function isTaskExpanded(id: string) {
    return expandedTaskIds.includes(id)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    const listName = draftListValue()

    if (!draft.title.trim()) {
      setErrorMessage('Task title is required.')
      return
    }

    if (!listName) {
      setErrorMessage('Pick a list or name one in Other.')
      return
    }

    const payload = {
      title: draft.title.trim(),
      notes: draft.notes.trim() || null,
      due_date: draft.due_date || null,
      priority: draft.priority,
      list_name: listName,
      updated_at: new Date().toISOString()
    }

    if (editingId) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', editingId)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setStatusMessage('Task updated.')
    } else {
      const { error } = await supabase.from('tasks').insert(payload)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      setStatusMessage('Task added.')
    }

    resetDraft()
    setShowForm(false)
    setViewMode('list')
    await refreshTasks()
  }

  function startEdit(task: TaskRecord) {
    const presetList = PRESET_LISTS.includes(task.list_name as PresetList)
      ? (task.list_name as PresetList)
      : 'Other'

    setDraft({
      title: task.title,
      notes: task.notes ?? '',
      due_date: task.due_date ?? '',
      priority: task.priority,
      presetList,
      customList: presetList === 'Other' ? task.list_name : ''
    })

    setEditingId(task.id)
    setViewMode('list')
    setShowForm(true)
    setExpandedTaskIds((current) => (current.includes(task.id) ? current : [...current, task.id]))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function toggleTask(task: TaskRecord) {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed, updated_at: new Date().toISOString() })
      .eq('id', task.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setStatusMessage(task.completed ? 'Task reopened.' : 'Task completed.')
    await refreshTasks()
  }

  async function deleteTask(id: string) {
    const confirmed = window.confirm('Delete this task?')
    if (!confirmed) return

    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      setErrorMessage(error.message)
      return
    }

    setExpandedTaskIds((current) => current.filter((item) => item !== id))
    setStatusMessage('Task deleted.')
    await refreshTasks()
  }

  async function clearCompleted() {
    const confirmed = window.confirm('Delete all completed tasks?')
    if (!confirmed) return

    const { error } = await supabase.from('tasks').delete().eq('completed', true)
    if (error) {
      setErrorMessage(error.message)
      return
    }

    setStatusMessage('Completed tasks cleared.')
    await refreshTasks()
  }

  async function deleteAllTasks() {
    const confirmed = window.confirm('Delete every task in your account? This cannot be undone.')
    if (!confirmed) return

    const { error } = await supabase.from('tasks').delete().neq('id', '')
    if (error) {
      setErrorMessage(error.message)
      return
    }

    setExpandedTaskIds([])
    setStatusMessage('All tasks deleted.')
    await refreshTasks()
  }

  function downloadData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      tasks
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

    link.href = url
    link.download = `todo-cloud-data-${timestamp}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setStatusMessage('Data downloaded.')
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function dismissReminderForToday() {
    window.localStorage.setItem('todo-cloud-reminder-dismissed', todayKey)
    setReminderDismissedKey(todayKey)
    setReminderOpen(false)
  }

  const monthLabel = calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-7xl p-3 sm:p-6 lg:p-8">
      {reminderOpen ? (
        <div className="mb-4 rounded-[24px] border border-amber-200 bg-amber-50 p-4 shadow-soft sm:mb-6 sm:rounded-[28px] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-amber-900">Due now</h2>
              <p className="mt-1 text-sm text-amber-800">
                You have {reminderTasks.length} open task{reminderTasks.length === 1 ? '' : 's'} due today or overdue.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-amber-900">
                {reminderTasks.slice(0, 5).map((task) => (
                  <li key={task.id}>
                    <span className="font-semibold">{task.title}</span>
                    {task.due_date ? <span className="ml-2 text-amber-700">({formatDate(task.due_date)})</span> : null}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="min-h-[44px] rounded-2xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Show tasks
              </button>
              <button
                type="button"
                onClick={dismissReminderForToday}
                className="min-h-[44px] rounded-2xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900"
              >
                Dismiss today
              </button>
              <button
                type="button"
                onClick={() => setReminderOpen(false)}
                className="min-h-[44px] rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-amber-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {statusMessage || errorMessage ? (
        <div className="mb-4 flex flex-col gap-2 sm:mb-6">
          {statusMessage ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{statusMessage}</div> : null}
          {errorMessage ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-6">
        <section
          className={`rounded-[24px] border border-slate-200 bg-white p-4 shadow-soft sm:rounded-[28px] sm:p-6 ${
            showForm ? 'block' : 'hidden'
          } lg:block`}
        >
          <div className="mb-4 flex items-center justify-between sm:mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                {editingId ? 'Edit task' : 'Add task'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {editingId ? (
                <button
                  type="button"
                  onClick={resetDraft}
                  className="hidden min-h-[40px] rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 lg:inline-flex"
                >
                  Cancel
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setShowForm((prev) => !prev)}
                className="min-h-[40px] rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 lg:hidden"
              >
                {showForm ? '– Hide' : '+ Show'}
              </button>
            </div>
          </div>

          <div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Task</span>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-500"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
                <textarea
                  value={draft.notes}
                  onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-500"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Due date</span>
                  <input
                    type="date"
                    value={draft.due_date}
                    onChange={(event) => setDraft((current) => ({ ...current, due_date: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Priority</span>
                  <select
                    value={draft.priority}
                    onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as Priority }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">List</span>
                  <select
                    value={draft.presetList}
                    onChange={(event) => setDraft((current) => ({ ...current, presetList: event.target.value as PresetList }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-500"
                  >
                    {PRESET_LISTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                {draft.presetList === 'Other' ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Custom list name</span>
                    <input
                      value={draft.customList}
                      onChange={(event) => setDraft((current) => ({ ...current, customList: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-500"
                      placeholder="Projects"
                    />
                  </label>
                ) : (
                  <div className="hidden rounded-[22px] p-4 text-sm text-slate-500 sm:block" />
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <button
                  type="submit"
                  className="min-h-[48px] w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                >
                  {editingId ? 'Save changes' : 'Add task'}
                </button>

                {editingId ? (
                  <button
                    type="button"
                    onClick={resetDraft}
                    className="min-h-[48px] w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 lg:hidden"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-soft sm:rounded-[28px] sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Tasks</h2>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`min-h-[40px] rounded-xl px-3 py-2 text-xs font-semibold sm:min-h-[40px] sm:rounded-xl sm:px-3 sm:text-sm lg:min-h-[36px] lg:px-3 lg:py-1.5 ${
                  viewMode === 'list' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                List
              </button>

              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`min-h-[40px] rounded-xl px-3 py-2 text-xs font-semibold sm:min-h-[40px] sm:rounded-xl sm:px-3 sm:text-sm lg:min-h-[36px] lg:px-3 lg:py-1.5 ${
                  viewMode === 'calendar' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Calendar
              </button>

              <button
                type="button"
                onClick={clearCompleted}
                className="min-h-[40px] rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 sm:min-h-[40px] sm:rounded-xl sm:px-3 sm:text-sm lg:min-h-[36px] lg:px-3 lg:py-1.5"
              >
                Clear done
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between lg:hidden">
            <h3 className="text-sm font-semibold text-slate-700">Filters</h3>
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className="text-sm font-semibold text-slate-600"
            >
              {showFilters ? '– Hide' : '+ Show'}
            </button>
          </div>

          <div className={showFilters ? 'block lg:block' : 'hidden lg:block'}>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1.6fr)_repeat(3,minmax(140px,0.75fr))_minmax(190px,1fr)]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-500 sm:col-span-2 lg:col-span-1 lg:py-2 lg:text-sm"
              />

              <select
                value={listFilter}
                onChange={(event) => setListFilter(event.target.value)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-500 lg:py-2 lg:text-sm"
              >
                {availableLists.map((item) => (
                  <option key={item} value={item}>
                    {item === 'all' ? 'All lists' : item}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as 'all' | Priority)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-500 lg:py-2 lg:text-sm"
              >
                <option value="all">All priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-500 lg:py-2 lg:text-sm"
              >
                <option value="date">Sort by date</option>
                <option value="priority">Sort by priority</option>
                <option value="list">Sort by list</option>
              </select>

              <button
                type="button"
                onClick={() => setShowCompleted((prev) => !prev)}
                className={`rounded-2xl border px-4 py-3 text-base font-medium outline-none transition lg:whitespace-nowrap lg:py-2 lg:text-sm ${
                  showCompleted
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {showCompleted ? 'Hide completed tasks' : 'Show completed tasks'}
              </button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="mt-5 space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 sm:p-8">
                  No tasks match your current filters.
                </div>
              ) : (
                filteredTasks.map((task) => {
  const expanded = isTaskExpanded(task.id)

  return (
    <article
      key={task.id}
      className={`rounded-[20px] border border-slate-200 p-4 transition lg:px-5 lg:py-3 ${getPriorityCardAccent(task.priority, task.completed)}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => toggleTask(task)}
          className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm ${
            task.completed
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-slate-400 bg-white text-transparent'
          }`}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          ✓
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => toggleTaskExpanded(task.id)}
            className="flex w-full items-center justify-between gap-3 text-left"
            aria-expanded={expanded}
          >
            <h3
              className={`min-w-0 flex-1 text-base font-semibold ${
                task.completed ? 'text-slate-400 line-through' : 'text-slate-900'
              }`}
            >
              {task.title}
            </h3>

            <div className="shrink-0 text-lg font-semibold text-slate-400">
              {expanded ? '–' : '+'}
            </div>
          </button>

          {expanded ? (
            <div className="mt-3 space-y-3">
              <div className={`text-sm ${task.completed ? 'text-slate-400' : 'text-slate-500'}`}>
                {formatTaskMeta(task)}
              </div>

              {task.notes ? (
                <p className={`text-sm ${task.completed ? 'text-slate-400' : 'text-slate-600'}`}>
                  {task.notes}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${PRIORITY_STYLES[task.priority]}`}
                >
                  {task.priority} priority
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {task.list_name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => startEdit(task)}
                  className="min-h-[40px] rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  className="min-h-[40px] rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
})
                  )
                })
              )}
            </div>
          ) : (
            <div className="mt-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                  className="min-h-[40px] rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Previous
                </button>
                <h3 className="text-center text-base font-bold text-slate-900 sm:text-lg">{monthLabel}</h3>
                <button
                  type="button"
                  onClick={() => setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  className="min-h-[40px] rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Next
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:gap-2 sm:text-xs">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="pb-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="space-y-1 sm:space-y-2">
                {calendarMatrix.map((row, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-7 gap-1 sm:gap-2">
                    {row.map((cell) => {
                      const isToday = cell.dateKey === todayKey

                      return (
                        <div
                          key={cell.dateKey}
                          className={`min-h-24 rounded-[16px] border p-1.5 sm:min-h-32 sm:rounded-[20px] sm:p-2 ${
                            cell.inMonth ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-slate-100 text-slate-400'
                          }`}
                        >
                          <div
                            className={`mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold sm:h-7 sm:w-7 sm:text-sm ${
                              isToday ? 'bg-slate-900 text-white' : 'text-slate-700'
                            }`}
                          >
                            {cell.date.getDate()}
                          </div>

                          <div className="space-y-1">
                            {cell.tasks.slice(0, 3).map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => startEdit(task)}
                                className={`block w-full rounded-xl border px-2 py-1 text-left text-[11px] font-medium sm:text-xs ${
                                  PRIORITY_STYLES[task.priority]
                                } ${task.completed ? 'opacity-60 line-through' : ''}`}
                              >
                                {task.title}
                              </button>
                            ))}

                            {cell.tasks.length > 3 ? (
                              <div className="text-[11px] text-slate-500 sm:text-xs">
                                +{cell.tasks.length - 3} more
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={deleteAllTasks}
              className="text-sm font-semibold text-slate-400 hover:text-rose-700"
            >
              Delete all tasks
            </button>
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={startNewTask}
        className="fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-2xl font-semibold text-white shadow-lg lg:hidden"
        aria-label="Add task"
      >
        +
      </button>

      <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={downloadData}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          Download my data
        </button>

        <button
          type="button"
          onClick={signOut}
          className="text-sm font-semibold text-slate-600 hover:text-rose-700"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
