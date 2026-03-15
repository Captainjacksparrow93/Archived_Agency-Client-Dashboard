'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import {
  CheckCircle2, Clock, Loader2, Play, AlertCircle,
  ChevronDown, ChevronUp, MessageSquare, CalendarDays,
  BarChart3, ListTodo, Timer, User
} from 'lucide-react'

interface Feedback {
  id: string
  round: number
  content: string
  createdAt: string
  user: { name: string }
}

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  createdAt: string
  dueDate?: string | null
  etaHours?: number | null
  etaStartedAt?: string | null
  etaExtendedBy: number
  progressPct: number
  feedbackCount: number
  feedbacks: Feedback[]
  user: { name: string; company?: string }
  assignedPm?: { name: string } | null
  _count: { messages: number }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pending',     color: 'text-gray-600',  bg: 'bg-gray-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-700',  bg: 'bg-blue-100' },
  in_review:   { label: 'In Review',   color: 'text-purple-700',bg: 'bg-purple-100' },
  completed:   { label: 'Completed',   color: 'text-green-700', bg: 'bg-green-100' },
  cancelled:   { label: 'Cancelled',   color: 'text-red-700',   bg: 'bg-red-100' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'text-gray-500' },
  medium: { label: 'Medium', color: 'text-amber-600' },
  high:   { label: 'High',   color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' },
}

function getEtaStatus(task: Task) {
  if (!task.etaHours || !task.etaStartedAt) return null
  const start = new Date(task.etaStartedAt).getTime()
  const total = (task.etaHours + task.etaExtendedBy) * 3600000
  const deadline = start + total
  const diff = deadline - Date.now()
  return diff
}

function formatDuration(ms: number) {
  const abs = Math.abs(ms)
  const h = Math.floor(abs / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  return `${h}h ${m}m`
}

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'review' | 'completed'>('active')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [progressMap, setProgressMap] = useState<Record<string, number>>({})
  const [savingProgress, setSavingProgress] = useState<string | null>(null)

  useEffect(() => { fetchTasks() }, [user])

  async function fetchTasks() {
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
        const map: Record<string, number> = {}
        for (const t of (data.tasks || [])) map[t.id] = t.progressPct
        setProgressMap(map)
      }
    } catch {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  async function updateProgress(taskId: string) {
    setSavingProgress(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressPct: progressMap[taskId] }),
      })
      if (!res.ok) throw new Error()
      toast.success('Progress updated')
      fetchTasks()
    } catch {
      toast.error('Failed to update progress')
    } finally {
      setSavingProgress(null)
    }
  }

  const activeTasks = tasks.filter(t => ['pending', 'in_progress'].includes(t.status))
  const reviewTasks = tasks.filter(t => t.status === 'in_review')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  const tabTasks = activeTab === 'active' ? activeTasks
    : activeTab === 'review' ? reviewTasks
    : completedTasks

  const stats = {
    active: activeTasks.length,
    review: reviewTasks.length,
    completed: completedTasks.length,
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {user?.name} · {user?.employeeRole || 'Team Member'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active', value: stats.active, icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'In Review', value: stats.review, icon: Timer, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {([
            { id: 'active', label: `Active (${stats.active})` },
            { id: 'review', label: `In Review (${stats.review})` },
            { id: 'completed', label: `Completed (${stats.completed})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        {tabTasks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No tasks here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tabTasks.map((task) => {
              const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
              const pcfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
              const eta = getEtaStatus(task)
              const isExpanded = expandedId === task.id

              return (
                <div key={task.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Task header */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className={`text-xs font-medium ${pcfg.color}`}>
                            {pcfg.label}
                          </span>
                          {task._count.messages > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <MessageSquare className="w-3 h-3" />
                              {task._count.messages}
                            </span>
                          )}
                          {task.feedbackCount > 0 && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                              Feedback ×{task.feedbackCount}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.user.name}{task.user.company ? ` · ${task.user.company}` : ''}
                          {task.assignedPm && ` · PM: ${task.assignedPm.name}`}
                        </p>
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : task.id)}
                        className="text-gray-400 hover:text-gray-600 ml-2 mt-0.5"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* ETA bar */}
                    {eta !== null && task.status !== 'completed' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Time {eta < 0 ? 'overdue by' : 'remaining'}: {formatDuration(eta)}</span>
                          <span className={eta < 0 ? 'text-red-500 font-medium' : ''}>
                            {eta < 0 ? 'Overdue' : 'On track'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Progress */}
                    {task.status === 'in_progress' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{progressMap[task.id] ?? task.progressPct}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0} max={100} step={5}
                            value={progressMap[task.id] ?? task.progressPct}
                            onChange={(e) => setProgressMap(prev => ({ ...prev, [task.id]: Number(e.target.value) }))}
                            className="flex-1 accent-blue-600"
                          />
                          {(progressMap[task.id] ?? task.progressPct) !== task.progressPct && (
                            <button
                              onClick={() => updateProgress(task.id)}
                              disabled={savingProgress === task.id}
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              {savingProgress === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                            </button>
                          )}
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${progressMap[task.id] ?? task.progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-50 p-4 space-y-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Description</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description || '—'}</p>
                      </div>

                      {task.dueDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CalendarDays className="w-4 h-4 text-gray-400" />
                          Due: {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}

                      {/* Feedback history */}
                      {task.feedbacks && task.feedbacks.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Client Feedback</p>
                          <div className="space-y-2">
                            {task.feedbacks.map((fb) => (
                              <div key={fb.id} className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-semibold text-orange-700">Round {fb.round}</span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(fb.createdAt).toLocaleDateString('en-IN')}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{fb.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
