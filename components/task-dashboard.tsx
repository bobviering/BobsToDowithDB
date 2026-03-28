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

// ✅ NEW: Priority border helper
function getPriorityBorder(priority: Priority) {
  switch (priority) {
    case 'High':
      return 'border-red-500'
    case 'Medium':
      return 'border-yellow-400'
    case 'Low':
      return 'border-slate-300'
  }
}

export function TaskDashboard({ initialTasks, email }: { initialTasks: TaskRecord[]; email: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks)

  // ... (everything unchanged above this point)

  // 🔽 ONLY CHANGE IS INSIDE TASK RENDER

  return (
    <div className="mt-5 space-y-3">
      {tasks.map((task) => (
        <article
          key={task.id}
          className={`rounded-[24px] border-l-4 p-4 transition ${
            task.completed
              ? 'border-slate-200 bg-slate-50'
              : `${getPriorityBorder(task.priority)} bg-white`
          }`}
        >
          <div className="flex items-start gap-3">
            <button
              type="button"
              className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                task.completed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400 bg-white'
              }`}
            >
              ✓
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className={`text-base font-semibold ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {task.title}
                  </h3>
                  {task.notes && (
                    <p className={`mt-1 text-sm ${task.completed ? 'text-slate-400' : 'text-slate-600'}`}>
                      {task.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${PRIORITY_STYLES[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {task.list_name}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-500">
                  {task.due_date ? `Due ${task.due_date}` : 'No due date'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                    Edit
                  </button>
                  <button className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}