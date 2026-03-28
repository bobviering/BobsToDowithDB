import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TaskDashboard } from '@/components/task-dashboard'

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/')
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  return <TaskDashboard initialTasks={(tasks ?? []) as any} email={session.user.email ?? 'Signed in'} />
}
