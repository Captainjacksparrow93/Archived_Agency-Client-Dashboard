'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import {
  FolderKanban, Clock, CheckCircle2, Timer, Loader2, ArrowRight,
  MessageSquare, AlertCircle, Eye, Save, User, Users, RotateCcw,
  Wrench, ChevronDown, ChevronUp
} from 'lucide-react'

interface Feedback {
  id: string
  round: number
  content: string
  createdAt: string
}

interface ChangeRequest {
  id: string
  title: string
  cost: number
  status: string
}

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  createdAt: string
  etaHours: number | null
  etaStartedAt: string | null
  etaExtendedBy: number
  progressPct: number
  feedbackCount: number
  assignedPm?: { id: string; name: string } | null
  assignedEmployee?: { id: string; name: string; employeeRole?: string } | null
  user: { name: string; email?: string; company?: string }
  feedbacks: Feedback[]
  changeRequests: ChangeRequest[]
  _count: { messages: number }
}

interface Employee {
  id: string
  name: string
  email: string
  employeeRole?: string
  _count: { employeeTasks: number }
}

const statusConfig: Record<string, { label: string; class: string }> = {
  pending:     { label: 'Pending',     class: 'badge-pending' },
  in_progress: { label: 'In Progress', class: 'badge-in-progress' },
  in_review:   { label: 'In Review',   class: 'badge-review' },
  completed:   { label: 'Completed',   class: 'badge-completed' },
  cancelled:   { label: 'Cancelled',   class: 'badge-cancelled' },
}

function getTimeRemaining(task: Task) {
  if (!task.etaHours || !task.etaStartedAt) return null
  const start = new Date(task.etaStartedAt).getTime()
  const totalMs = (task.etaHours + task.etaExtendedBy) * 3600000
  return start + totalMs - Date.now()
}

function formatDuration(ms: number) {
  const abs = Math.abs(ms)
  const hrs = Math.floor(abs / 3600000)
  const mins = Math.floor((abs % 3600000) / 60000)
  return `${hrs}h ${mins}m`
}

export default function PMDashboard() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ETA modal
  const [etaModal, setEtaModal] = useState<string | null>(null)
  const [etaValue, setEtaValue] = useState('')
  const [extendValue, setExtendValue] = useState('')
  const [progressValue, setProgressValue] = useState(0)

  // Assign modal
  const [assignModal, setAssignModal] = useState<Task | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [, setTick] = useState(0)

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [user])

  async function fetchData() {
    try {
      const [tasksRes, empRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/employees'),
      ])
      if (tasksRes.ok) {
        const data = await tasksRes.json()
        setTasks(data.tasks || [])
      }
      if (empRes.ok) {
        const data = await empRes.json()
        setEmployees(data.employees || [])
      }
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(taskId: string, status: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success('Status updated')
      fetchData()
    } catch {
      toast.error('Failed to update')
    }
  }

  async function saveEta(taskId: string) {
    try {
      const body: any = { progressPct: progressValue }
      if (etaValue) body.etaHours = parseFloat(etaValue)
      if (extendValue) {
        const task = tasks.find(t => t.id === taskId)
        body.etaExtendedBy = (task?.etaExtendedBy || 0) + parseFloat(extendValue)
      }
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success('ETA updated')
      setEtaModal(null)
      setEtaValue(''); setExtendValue('')
      fetchData()
    } catch {
      toast.error('Failed to update ETA')
    }
  }

  async function assignEmployee() {
    if (!assignModal || !selectedEmployee) return
    setAssigning(true)
    try {
      const res = await fetch(`/api/tasks/${assignModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedEmployeeId: selectedEmployee }),
      })
      if (!res.ok) throw new Error()
      toast.success('Employee assigned')
      setAssignModal(null)
      setSelectedEmployee('')
      fetchData()
    } catch {
      toast.error('Failed to assign')
    } finally {
      setAssigning(false)
    }
  }

  function openEtaModal(task: Task) {
    setEtaModal(task.id)
    setEtaValue(task.etaHours?.toString() || '')
    setExtendValue('')
    setProgressValue(task.progressPct || 0)
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div></AppLayout>

  if (user?.role !== 'pm' && user?.role !== 'admin') return (
    <AppLayout>
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
      </div>
    </AppLayout>
  )

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
  const reviewCount = tasks.filter(t => t.status === 'in_review').length
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const filteredTasks = activeTab === 'all' ? tasks : tasks.filter(t => t.status === activeTab)
  const etaTasks = tasks.filter(t => t.etaHours && t.etaStartedAt && !['completed','cancelled'].includes(t.status))
  const needsReview = tasks.filter(t => t.status === 'in_review')

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Project Manager Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage tasks, assign team members, track progress</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pending', count: pendingCount, Icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
          { label: 'In Progress', count: inProgressCount, Icon: Timer, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'In Review', count: reviewCount, Icon: Eye, bg: 'bg-purple-50', color: 'text-purple-600' },
          { label: 'Completed', count: completedCount, Icon: CheckCircle2, bg: 'bg-green-50', color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="card">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* In-Review alert */}
      {needsReview.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-purple-600" />
            <p className="font-semibold text-purple-900">{needsReview.length} task{needsReview.length > 1 ? 's' : ''} awaiting client review</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {needsReview.map(t => (
              <Link key={t.id} href={`/tasks/${t.id}`} className="text-sm bg-white border border-purple-200 text-purple-700 px-3 py-1 rounded-lg hover:bg-purple-100 transition-colors">
                {t.title}
                {t.feedbackCount > 0 && <span className="ml-1.5 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">{t.feedbackCount}/2 feedback</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ETA Timers */}
      {etaTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Active ETA Timers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {etaTasks.map(task => {
              const remaining = getTimeRemaining(task)
              const isOverdue = remaining !== null && remaining < 0
              const totalHrs = (task.etaHours || 0) + task.etaExtendedBy
              const elapsed = task.etaStartedAt ? (Date.now() - new Date(task.etaStartedAt).getTime()) / 3600000 : 0
              const timePct = totalHrs > 0 ? Math.min(100, (elapsed / totalHrs) * 100) : 0
              return (
                <div key={task.id} className={`card border-l-4 ${isOverdue ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Link href={`/tasks/${task.id}`} className="font-semibold text-gray-900 hover:text-blue-600 truncate">{task.title}</Link>
                    <span className={statusConfig[task.status]?.class}>{statusConfig[task.status]?.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    {task.user.name}
                    {task.assignedEmployee && ` · ${task.assignedEmployee.name}`}
                  </p>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Time Elapsed</span>
                      <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>{isOverdue ? `Overdue by ${formatDuration(remaining!)}` : `${formatDuration(remaining!)} remaining`}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${timePct}%` }} /></div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Work Progress</span><span>{task.progressPct}%</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full bg-green-500" style={{ width: `${task.progressPct}%` }} /></div>
                  </div>
                  <button onClick={() => openEtaModal(task)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Manage ETA</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Task Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All', count: tasks.length },
          { key: 'pending', label: 'Pending', count: pendingCount },
          { key: 'in_progress', label: 'In Progress', count: inProgressCount },
          { key: 'in_review', label: 'In Review', count: reviewCount },
          { key: 'completed', label: 'Completed', count: completedCount },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 && (
          <div className="text-center py-12 card"><FolderKanban className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No tasks found</p></div>
        )}

        {filteredTasks.map(task => {
          const si = statusConfig[task.status] || statusConfig.pending
          const isExpanded = expandedId === task.id
          return (
            <div key={task.id} className="card hover:border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link href={`/tasks/${task.id}`} className="font-semibold text-gray-900 hover:text-blue-600 truncate">{task.title}</Link>
                    <span className={si.class}>{si.label}</span>
                    {task._count.messages > 0 && <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><MessageSquare className="w-3 h-3" />{task._count.messages}</span>}
                    {task.feedbackCount > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium"><RotateCcw className="w-3 h-3 inline mr-0.5" />Feedback ×{task.feedbackCount}</span>}
                    {task.changeRequests?.length > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium"><Wrench className="w-3 h-3 inline mr-0.5" />CR ×{task.changeRequests.length}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                    <span>{task.user.name}{task.user.company ? ` (${task.user.company})` : ''}</span>
                    {task.assignedEmployee
                      ? <span className="flex items-center gap-1 text-blue-600"><User className="w-3 h-3" />{task.assignedEmployee.name}</span>
                      : <button onClick={() => { setAssignModal(task); setSelectedEmployee(task.assignedEmployee?.id || '') }} className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium"><Users className="w-3 h-3" />Assign employee</button>
                    }
                    {task.assignedEmployee && (
                      <button onClick={() => { setAssignModal(task); setSelectedEmployee(task.assignedEmployee?.id || '') }} className="text-xs text-gray-400 hover:text-blue-600">(change)</button>
                    )}
                    {task.etaHours && <span className="text-blue-600">ETA: {task.etaHours + task.etaExtendedBy}h</span>}
                  </div>
                  {task.progressPct > 0 && (
                    <div className="mt-1.5 w-48">
                      <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-green-500" style={{ width: `${task.progressPct}%` }} /></div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setExpandedId(isExpanded ? null : task.id)} className="text-gray-400 hover:text-gray-600 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEtaModal(task)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium">ETA</button>
                  <select value={task.status} onChange={(e) => updateStatus(task.id, e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    {Object.entries(statusConfig).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
                  </select>
                  <Link href={`/tasks/${task.id}`} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><ArrowRight className="w-4 h-4" /></Link>
                </div>
              </div>

              {/* Expanded: feedback + change requests */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
                  {task.feedbacks && task.feedbacks.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Client Feedback</p>
                      {task.feedbacks.map(fb => (
                        <div key={fb.id} className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-2">
                          <div className="flex justify-between mb-1"><span className="text-xs font-bold text-orange-700">Round {fb.round}</span><span className="text-xs text-gray-400">{new Date(fb.createdAt).toLocaleDateString('en-IN')}</span></div>
                          <p className="text-sm text-gray-700">{fb.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {task.changeRequests && task.changeRequests.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Change Requests</p>
                      {task.changeRequests.map(cr => (
                        <div key={cr.id} className="flex items-center justify-between border border-gray-100 rounded-xl px-3 py-2">
                          <span className="text-sm text-gray-700">{cr.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">₹{cr.cost.toLocaleString()}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${cr.status === 'completed' ? 'bg-green-100 text-green-700' : cr.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{cr.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Assign Employee Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Assign Employee</h3>
            <p className="text-sm text-gray-500 mb-4">Task: <span className="font-medium text-gray-700">{assignModal.title}</span></p>
            {employees.length === 0 ? (
              <p className="text-gray-500 text-sm">No employees found. Add employees from the Admin panel.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {employees.map(emp => (
                  <label key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedEmployee === emp.id ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <input type="radio" name="employee" value={emp.id} checked={selectedEmployee === emp.id} onChange={() => setSelectedEmployee(emp.id)} className="accent-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.employeeRole || 'Team Member'} · {emp._count.employeeTasks} active task{emp._count.employeeTasks !== 1 ? 's' : ''}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAssignModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm">Cancel</button>
              <button onClick={assignEmployee} disabled={assigning || !selectedEmployee} className="flex-1 btn-primary flex items-center justify-center gap-2">
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />} Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ETA Modal */}
      {etaModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEtaModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Manage ETA</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ETA (hours)</label>
                <input type="number" value={etaValue} onChange={e => setEtaValue(e.target.value)} placeholder="e.g. 24" className="input-field" min="0" step="0.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Extend by (hours)</label>
                <input type="number" value={extendValue} onChange={e => setExtendValue(e.target.value)} placeholder="e.g. 4" className="input-field" min="0" step="0.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Progress: {progressValue}%</label>
                <input type="range" value={progressValue} onChange={e => setProgressValue(parseInt(e.target.value))} min="0" max="100" step="5" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEtaModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => saveEta(etaModal)} className="btn-primary flex-1 flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
