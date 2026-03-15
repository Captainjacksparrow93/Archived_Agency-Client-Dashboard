'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { useStore } from '@/store/useStore'
import toast from 'react-hot-toast'
import {
  Wallet,
  Plus,
  ListTodo,
  Clock,
  ArrowRight,
  Loader2,
  FolderKanban,
  IndianRupee,
  CalendarDays,
  Inbox,
  CheckCircle2,
  Timer,
  TrendingUp,
  AlertTriangle,
  User,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TaskItem {
  serviceItem: { name: string }
  quantity: number
  totalPrice: number
}

interface Task {
  id: string
  title: string
  status: string
  totalCost: number
  priority: string
  createdAt: string
  etaHours?: number | null
  etaStartedAt?: string | null
  etaExtendedBy?: number | null
  progressPct?: number | null
  assignedPm?: { name: string } | null
  items: TaskItem[]
  _count: { messages: number }
}

/* ------------------------------------------------------------------ */
/*  Lookup maps                                                        */
/* ------------------------------------------------------------------ */

const statusBadgeClass: Record<string, string> = {
  pending: 'badge-pending',
  in_progress: 'badge-in-progress',
  review: 'badge-review',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
}

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  review: 'In Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Returns the remaining milliseconds for a task ETA, negative means overdue */
function getEtaRemainingMs(task: Task): number | null {
  if (!task.etaHours || !task.etaStartedAt) return null
  const start = new Date(task.etaStartedAt).getTime()
  const totalHours = task.etaHours + (task.etaExtendedBy ?? 0)
  const deadline = start + totalHours * 60 * 60 * 1000
  return deadline - Date.now()
}

/** Format milliseconds into a human-readable countdown string */
function formatCountdown(ms: number): string {
  const abs = Math.abs(ms)
  const totalSeconds = Math.floor(abs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
  }
  return `${pad(minutes)}m ${pad(seconds)}s`
}

/* ------------------------------------------------------------------ */
/*  ETA Countdown Card (isolated so only this re-renders per tick)     */
/* ------------------------------------------------------------------ */

function EtaCountdownCard({ task }: { task: Task }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const start = new Date(task.etaStartedAt!).getTime()
  const totalHours = task.etaHours! + (task.etaExtendedBy ?? 0)
  const deadline = start + totalHours * 60 * 60 * 1000
  const remainingMs = deadline - now
  const overdue = remainingMs < 0
  const progress = task.progressPct ?? 0

  return (
    <Link href={`/tasks/${task.id}`} className="card block group hover:border-gray-200">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 truncate max-w-[60%] group-hover:text-blue-600 transition-colors">
          {task.title}
        </h4>
        <span className={statusBadgeClass[task.status] || 'badge-pending'}>
          {statusLabel[task.status] || task.status}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            overdue ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>{progress}% complete</span>
        {task.assignedPm?.name && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {task.assignedPm.name}
          </span>
        )}
      </div>

      {/* Timer display */}
      <div
        className={`flex items-center gap-2 text-sm font-medium ${
          overdue ? 'text-red-600' : 'text-emerald-600'
        }`}
      >
        {overdue ? (
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        ) : (
          <Timer className="w-4 h-4 flex-shrink-0" />
        )}
        {overdue
          ? `Overdue by ${formatCountdown(remainingMs)}`
          : `${formatCountdown(remainingMs)} remaining`}
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard Page                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { user } = useAuth()
  const { user: storeUser } = useStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)

  const walletBalance = storeUser?.wallet?.balance ?? 0
  const firstName = user?.name?.split(' ')[0] || 'there'

  /* ---- Fetch tasks ---- */
  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch('/api/tasks')
        if (res.ok) {
          const data = await res.json()
          setTasks(data.tasks || [])
        } else {
          toast.error('Failed to load tasks')
        }
      } catch {
        toast.error('Network error loading tasks')
      } finally {
        setTasksLoading(false)
      }
    }
    fetchTasks()
  }, [])

  /* ---- Derived data ---- */
  const totalTasks = tasks.length
  const inProgressTasks = tasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'review'
  ).length
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const totalSpent = tasks.reduce((sum, t) => sum + (t.totalCost || 0), 0)

  const etaTasks = tasks.filter(
    (t) =>
      t.etaHours &&
      t.etaStartedAt &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
  )

  const recentTasks = tasks.slice(0, 5)

  /* ---- Analytics cards data ---- */
  const analytics = [
    {
      label: 'Total Tasks',
      value: totalTasks,
      icon: FolderKanban,
      bg: 'bg-blue-50',
      text: 'text-blue-600',
    },
    {
      label: 'In Progress',
      value: inProgressTasks,
      icon: Clock,
      bg: 'bg-amber-50',
      text: 'text-amber-600',
    },
    {
      label: 'Completed',
      value: completedTasks,
      icon: CheckCircle2,
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    {
      label: 'Total Spent',
      value: formatCurrency(totalSpent),
      icon: TrendingUp,
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      isCurrency: true,
    },
  ]

  /* ---- Quick actions ---- */
  const quickActions = [
    {
      label: 'New Task',
      description: 'Submit a new project request',
      href: '/tasks/new',
      icon: Plus,
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Add Funds',
      description: 'Top up your wallet balance',
      href: '/wallet',
      icon: IndianRupee,
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      label: 'Price List',
      description: 'Browse available services',
      href: '/services',
      icon: ListTodo,
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ]

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* -------------------------------------------------------- */}
        {/*  Welcome Header + Compact Wallet                         */}
        {/* -------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: greeting */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, <span className="gradient-text">{firstName}</span>
            </h1>
            <p className="text-gray-500 mt-1">
              Here&apos;s an overview of your account and recent activity.
            </p>
          </div>

          {/* Right: compact wallet pill */}
          <Link
            href="/wallet"
            className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200
                       rounded-full px-4 py-2 transition-colors w-fit"
          >
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(walletBalance)}
            </span>
            <Plus className="w-3.5 h-3.5 text-gray-400" />
          </Link>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Analytics Widgets Row                                    */}
        {/* -------------------------------------------------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {analytics.map((item) => (
            <div key={item.label} className="card flex items-center gap-4">
              <div
                className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
              >
                <item.icon className={`w-5 h-5 ${item.text}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="text-xl font-bold text-gray-900 truncate">
                  {tasksLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-300 inline-block" />
                  ) : (
                    item.value
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* -------------------------------------------------------- */}
        {/*  ETA Timer Section                                        */}
        {/* -------------------------------------------------------- */}
        {!tasksLoading && etaTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Timer className="w-5 h-5 text-blue-600" />
              Active Timers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {etaTasks.map((task) => (
                <EtaCountdownCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/*  Quick Actions                                            */}
        {/* -------------------------------------------------------- */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="card group flex items-center gap-4 hover:border-gray-200"
              >
                <div
                  className={`w-12 h-12 ${action.bgLight} rounded-xl flex items-center justify-center
                              flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}
                >
                  <action.icon className={`w-6 h-6 ${action.textColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{action.label}</p>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Recent Tasks                                             */}
        {/* -------------------------------------------------------- */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
            {tasks.length > 0 && (
              <Link
                href="/tasks"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {tasksLoading ? (
            <div className="card flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading tasks...</p>
              </div>
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-12">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Inbox className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">No tasks yet</h3>
              <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">
                Get started by creating your first task. Browse our services and submit a
                project request.
              </p>
              <Link
                href="/tasks/new"
                className="btn-primary inline-flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Create Your First Task
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => {
                const hasEta = task.etaHours && task.etaStartedAt
                const progress = task.progressPct ?? 0
                const remainingMs = hasEta ? getEtaRemainingMs(task) : null
                const overdue = remainingMs !== null && remainingMs < 0

                return (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="card block group cursor-pointer hover:border-gray-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      {/* Task icon */}
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FolderKanban className="w-5 h-5 text-blue-600" />
                      </div>

                      {/* Task info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {task.title}
                          </h3>
                          <span
                            className={
                              statusBadgeClass[task.status] || 'badge-pending'
                            }
                          >
                            {statusLabel[task.status] || task.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <IndianRupee className="w-3.5 h-3.5" />
                            {formatCurrency(task.totalCost)}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {formatDate(task.createdAt)}
                          </span>
                          {task._count.messages > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {task._count.messages} message
                              {task._count.messages !== 1 ? 's' : ''}
                            </span>
                          )}
                          {task.assignedPm?.name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {task.assignedPm.name}
                            </span>
                          )}
                        </div>

                        {/* ETA progress bar inline (if applicable) */}
                        {hasEta && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-400">{progress}% done</span>
                              {remainingMs !== null && (
                                <span
                                  className={
                                    overdue
                                      ? 'text-red-500 font-medium'
                                      : 'text-gray-400'
                                  }
                                >
                                  {overdue
                                    ? `Overdue by ${formatCountdown(remainingMs)}`
                                    : `${formatCountdown(remainingMs)} left`}
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                  overdue ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                                style={{
                                  width: `${Math.min(progress, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 hidden sm:block" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
