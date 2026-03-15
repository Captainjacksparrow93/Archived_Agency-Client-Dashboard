'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Clock, Send, Loader2, AlertCircle,
  CheckCircle2, Timer, XCircle, Eye, Play, Plus,
  Target, User2, MessageSquare, ThumbsUp, RotateCcw,
  IndianRupee, AlertTriangle, Wrench
} from 'lucide-react'

interface TaskItem {
  id: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
  notes?: string
  serviceItem: { name: string; unit: string }
}

interface Message {
  id: string
  content: string
  sender: string
  createdAt: string
  user: { name: string; role: string }
}

interface Feedback {
  id: string
  round: number
  content: string
  createdAt: string
  user: { name: string }
}

interface ChangeRequest {
  id: string
  title: string
  description: string
  cost: number
  status: string
  createdAt: string
}

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  totalCost?: number
  dueDate?: string
  createdAt: string
  etaHours?: number
  etaStartedAt?: string
  etaExtendedBy?: number
  progressPct?: number
  feedbackCount: number
  assignedPm?: { id: string; name: string; email?: string }
  assignedEmployee?: { id: string; name: string; email?: string; employeeRole?: string }
  items: TaskItem[]
  messages: Message[]
  feedbacks: Feedback[]
  changeRequests: ChangeRequest[]
  user: { id: string; name: string; email?: string; company?: string }
}

const statusConfig: Record<string, { label: string; class: string; icon: any }> = {
  pending:     { label: 'Pending',     class: 'badge-pending',     icon: Clock },
  in_progress: { label: 'In Progress', class: 'badge-in-progress', icon: Timer },
  in_review:   { label: 'In Review',   class: 'badge-review',      icon: Eye },
  completed:   { label: 'Completed',   class: 'badge-completed',   icon: CheckCircle2 },
  cancelled:   { label: 'Cancelled',   class: 'badge-cancelled',   icon: XCircle },
}

const priorityColors: Record<string, string> = {
  low: 'text-gray-500', medium: 'text-blue-600', high: 'text-orange-500', urgent: 'text-red-600',
}

function ETATimerDisplay({ task }: { task: Task }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!task.etaHours || !task.etaStartedAt) return null
  const started = new Date(task.etaStartedAt)
  const totalHours = task.etaHours + (task.etaExtendedBy || 0)
  const deadline = new Date(started.getTime() + totalHours * 3600000)
  const elapsed = (now.getTime() - started.getTime()) / 3600000
  const remaining = Math.max(0, totalHours - elapsed)
  const timeProgress = Math.min(100, (elapsed / totalHours) * 100)
  const isOverdue = remaining === 0
  const h = Math.floor(remaining)
  const m = Math.floor((remaining - h) * 60)
  const s = Math.floor(((remaining - h) * 60 - m) * 60)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Timer className="w-4 h-4" /> ETA Timer
        </h3>
        {isOverdue && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Overdue</span>}
      </div>
      <div className="text-center mb-4">
        <div className={`text-3xl font-bold font-mono ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
          {isOverdue ? '00:00:00' : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
        </div>
        <p className="text-xs text-gray-500 mt-1">{isOverdue ? 'Time exceeded' : 'Time Remaining'}</p>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Time Elapsed</span><span>{Math.round(timeProgress)}%</span></div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all duration-1000 ${isOverdue ? 'bg-red-500' : timeProgress > 80 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, timeProgress)}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Work Progress</span><span>{task.progressPct || 0}%</span></div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${task.progressPct || 0}%` }} />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 space-y-1 text-xs text-gray-500">
        <div className="flex justify-between"><span>Total ETA</span><span className="text-gray-700 font-medium">{totalHours}h</span></div>
        {(task.etaExtendedBy || 0) > 0 && <div className="flex justify-between"><span>Extended by</span><span className="text-amber-600 font-medium">+{task.etaExtendedBy}h</span></div>}
        <div className="flex justify-between"><span>Deadline</span><span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>{deadline.toLocaleDateString()} {deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
      </div>
    </div>
  )
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ETA management
  const [showEtaModal, setShowEtaModal] = useState(false)
  const [etaHours, setEtaHours] = useState('')
  const [extendBy, setExtendBy] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [savingEta, setSavingEta] = useState(false)

  // Feedback
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackContent, setFeedbackContent] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  // Change request
  const [showCRModal, setShowCRModal] = useState(false)
  const [crTitle, setCrTitle] = useState('')
  const [crDesc, setCrDesc] = useState('')
  const [crCost, setCrCost] = useState('')
  const [submittingCR, setSubmittingCR] = useState(false)

  const taskId = params.id as string
  const isAdmin = user?.role === 'admin'
  const isPM = user?.role === 'pm'
  const isEmployee = user?.role === 'employee'
  const isClient = user?.role === 'client'
  const canManage = isAdmin || isPM

  useEffect(() => {
    fetchTask()
    const interval = setInterval(fetchTask, 5000)
    return () => clearInterval(interval)
  }, [taskId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [task?.messages])

  async function fetchTask() {
    try {
      const res = await fetch(`/api/tasks/${taskId}`)
      if (!res.ok) throw new Error('Task not found')
      const data = await res.json()
      setTask(data.task)
      setProgressPct(data.task.progressPct || 0)
    } catch {
      toast.error('Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/chat/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message.trim() }),
      })
      if (!res.ok) throw new Error('Failed to send')
      const data = await res.json()
      setTask((prev) => prev ? { ...prev, messages: [...prev.messages, data.message] } : prev)
      setMessage('')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  async function updateStatus(status: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success(`Status updated to ${statusConfig[status]?.label}`)
      fetchTask()
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function approveTask() {
    await updateStatus('completed')
  }

  async function submitFeedback() {
    if (!feedbackContent.trim()) return
    setSubmittingFeedback(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: feedbackContent.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit feedback')
      toast.success(`Feedback (round ${data.round}) submitted`)
      setShowFeedbackModal(false)
      setFeedbackContent('')
      fetchTask()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingFeedback(false)
    }
  }

  async function submitChangeRequest() {
    if (!crTitle.trim() || !crDesc.trim() || !crCost) return
    setSubmittingCR(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/change-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: crTitle, description: crDesc, cost: parseFloat(crCost) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit change request')
      toast.success('Change request submitted and payment deducted')
      setShowCRModal(false)
      setCrTitle(''); setCrDesc(''); setCrCost('')
      fetchTask()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingCR(false)
    }
  }

  async function saveEta() {
    setSavingEta(true)
    try {
      const body: any = { progressPct }
      if (etaHours) body.etaHours = parseFloat(etaHours)
      if (extendBy) body.etaExtendedBy = (task?.etaExtendedBy || 0) + parseFloat(extendBy)
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to update ETA')
      toast.success('ETA updated')
      setShowEtaModal(false)
      setEtaHours(''); setExtendBy('')
      fetchTask()
    } catch {
      toast.error('Failed to update ETA')
    } finally {
      setSavingEta(false)
    }
  }

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div></AppLayout>

  if (!task) return (
    <AppLayout>
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Task Not Found</h2>
        <Link href={isAdmin ? '/admin' : isPM ? '/pm' : isEmployee ? '/employee' : '/dashboard'} className="text-blue-600 hover:text-blue-700">Back to Dashboard</Link>
      </div>
    </AppLayout>
  )

  const statusInfo = statusConfig[task.status] || statusConfig.pending
  const StatusIcon = statusInfo.icon
  const feedbacksLeft = Math.max(0, 2 - (task.feedbackCount || 0))
  const inReview = task.status === 'in_review'

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={statusInfo.class}><StatusIcon className="w-3 h-3 mr-1" />{statusInfo.label}</span>
              <span className={`text-sm font-medium ${priorityColors[task.priority]}`}>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority</span>
              {task.assignedPm && <span className="text-sm text-gray-500 flex items-center gap-1"><User2 className="w-3.5 h-3.5" /> PM: {task.assignedPm.name}</span>}
              {task.assignedEmployee && <span className="text-sm text-gray-500 flex items-center gap-1"><User2 className="w-3.5 h-3.5" /> {task.assignedEmployee.name}</span>}
              {task.feedbackCount > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Feedback rounds: {task.feedbackCount}/2</span>}
            </div>
          </div>
          {isClient && task.totalCost !== undefined && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">₹{task.totalCost.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Client: In-Review Action Banner */}
      {isClient && inReview && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-purple-900">Your task is ready for review!</p>
              <p className="text-sm text-purple-700 mt-0.5">
                Please review the work and either approve it or submit feedback.
                {feedbacksLeft > 0
                  ? ` You have ${feedbacksLeft} feedback round${feedbacksLeft !== 1 ? 's' : ''} remaining.`
                  : ' You have used all 2 feedback rounds. Use Change Request for additional revisions (paid).'}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-4 flex-wrap">
            <button
              onClick={approveTask}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-green-700 transition-colors"
            >
              <ThumbsUp className="w-4 h-4" /> Approve & Complete
            </button>
            {feedbacksLeft > 0 && (
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-orange-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Request Revision ({feedbacksLeft} left)
              </button>
            )}
            {feedbacksLeft === 0 && (
              <button
                onClick={() => setShowCRModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Change Request (Paid)
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {task.description && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* ETA Timer */}
          {task.etaHours && task.etaStartedAt && <ETATimerDisplay task={task} />}

          {/* Feedback History */}
          {task.feedbacks && task.feedbacks.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Revision History
              </h3>
              <div className="space-y-3">
                {task.feedbacks.map((fb) => (
                  <div key={fb.id} className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-orange-700">Round {fb.round} — {fb.user.name}</span>
                      <span className="text-xs text-gray-400">{new Date(fb.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{fb.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Change Requests */}
          {task.changeRequests && task.changeRequests.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Change Requests
              </h3>
              <div className="space-y-3">
                {task.changeRequests.map((cr) => (
                  <div key={cr.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-gray-900">{cr.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">₹{cr.cost.toLocaleString()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          cr.status === 'completed' ? 'bg-green-100 text-green-700' :
                          cr.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{cr.status}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{cr.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Items */}
          {(isClient || isAdmin) && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Service Items</h3>
              <div className="space-y-3">
                {task.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.serviceItem.name}</p>
                      {item.unitPrice !== undefined && <p className="text-sm text-gray-500">{item.quantity} × ₹{item.unitPrice.toLocaleString()} ({item.serviceItem.unit})</p>}
                      {item.notes && <p className="text-sm text-gray-400 mt-1">{item.notes}</p>}
                    </div>
                    {item.totalPrice !== undefined && <p className="font-semibold text-gray-900">₹{item.totalPrice.toLocaleString()}</p>}
                  </div>
                ))}
                {task.totalCost !== undefined && (
                  <div className="flex items-center justify-between pt-3 border-t-2 border-gray-100">
                    <p className="font-semibold text-gray-900">Total</p>
                    <p className="text-lg font-bold text-gray-900">₹{task.totalCost.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PM/Admin: Status Controls */}
          {canManage && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Update Status</h3>
                <button onClick={() => setShowEtaModal(true)} className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center gap-1">
                  <Timer className="w-4 h-4" /> Manage ETA
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusConfig).map(([key, config]) => (
                  <button key={key} onClick={() => updateStatus(key)} disabled={task.status === key}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${task.status === key ? 'bg-blue-100 text-blue-700 cursor-default' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Client: Change Request button (always visible for completed tasks) */}
          {isClient && task.status === 'completed' && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Need More Changes?</h3>
              <p className="text-sm text-gray-600 mb-3">This task is complete. Submit a paid change request for additional revisions.</p>
              <button onClick={() => setShowCRModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" /> Add Change Request
              </button>
            </div>
          )}
        </div>

        {/* Right - Chat + Details */}
        <div className="lg:col-span-1">
          <div className="card flex flex-col" style={{ height: '500px' }}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Chat
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
              {task.messages.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No messages yet.</p>}
              {task.messages.map((msg) => {
                const isOwn = msg.sender === (isClient ? 'client' : 'agency')
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isOwn ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
                      {!isOwn && <p className="text-xs font-medium mb-1 text-gray-500">{msg.user.name}</p>}
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="flex gap-2">
              <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." className="input-field flex-1 !py-2.5 !text-sm" />
              <button type="submit" disabled={!message.trim() || sending} className="btn-primary !px-3 !py-2.5">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>

          {/* Task Info */}
          <div className="card mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Created</span><span className="text-gray-900">{new Date(task.createdAt).toLocaleDateString()}</span></div>
              {task.dueDate && <div className="flex justify-between"><span className="text-gray-500">Due Date</span><span className="text-gray-900">{new Date(task.dueDate).toLocaleDateString()}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Client</span><span className="text-gray-900">{task.user.name}</span></div>
              {task.user.company && <div className="flex justify-between"><span className="text-gray-500">Company</span><span className="text-gray-900">{task.user.company}</span></div>}
              {task.assignedPm && <div className="flex justify-between"><span className="text-gray-500">PM</span><span className="text-gray-900">{task.assignedPm.name}</span></div>}
              {task.assignedEmployee && <div className="flex justify-between"><span className="text-gray-500">Assigned To</span><span className="text-gray-900">{task.assignedEmployee.name}</span></div>}
              {task.progressPct !== undefined && task.progressPct > 0 && <div className="flex justify-between"><span className="text-gray-500">Progress</span><span className="text-gray-900 font-medium">{task.progressPct}%</span></div>}
              {isClient && <div className="flex justify-between"><span className="text-gray-500">Feedback Rounds</span><span className={`font-medium ${task.feedbackCount >= 2 ? 'text-red-600' : 'text-gray-900'}`}>{task.feedbackCount}/2 used</span></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowFeedbackModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-500" /> Request Revision
            </h3>
            <p className="text-sm text-gray-500 mb-4">Round {(task.feedbackCount || 0) + 1} of 2. Be specific about what needs to change.</p>
            <textarea
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              placeholder="Describe exactly what changes you need..."
              rows={5}
              className="input-field w-full resize-none"
              autoFocus
            />
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              After {feedbacksLeft === 1 ? 'this round' : '2 rounds'}, additional revisions require a paid Change Request.
            </p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowFeedbackModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm">Cancel</button>
              <button onClick={submitFeedback} disabled={submittingFeedback || !feedbackContent.trim()} className="flex-1 btn-primary flex items-center justify-center gap-2">
                {submittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {showCRModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCRModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" /> Additional Change Request
            </h3>
            <p className="text-sm text-gray-500 mb-4">Payment will be deducted from your wallet immediately.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={crTitle} onChange={(e) => setCrTitle(e.target.value)} placeholder="Brief title for the change" className="input-field w-full" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea value={crDesc} onChange={(e) => setCrDesc(e.target.value)} placeholder="Describe the changes needed..." rows={4} className="input-field w-full resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost (₹) *</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" value={crCost} onChange={(e) => setCrCost(e.target.value)} placeholder="0" min="1" className="input-field w-full pl-9" />
                </div>
                <p className="text-xs text-gray-400 mt-1">This amount will be deducted from your wallet</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCRModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm">Cancel</button>
              <button onClick={submitChangeRequest} disabled={submittingCR || !crTitle.trim() || !crDesc.trim() || !crCost} className="flex-1 btn-primary flex items-center justify-center gap-2">
                {submittingCR ? <Loader2 className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />} Pay & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ETA Modal */}
      {showEtaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEtaModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Timer className="w-5 h-5 text-blue-600" /> Manage ETA</h3>
            <div className="space-y-4">
              {!task.etaStartedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Set ETA (hours)</label>
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-emerald-600" />
                    <input type="number" value={etaHours} onChange={(e) => setEtaHours(e.target.value)} placeholder="e.g. 24" className="input-field flex-1" min="0.5" step="0.5" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">This starts the countdown</p>
                </div>
              )}
              {task.etaStartedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Extend Time (hours)</label>
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-600" />
                    <input type="number" value={extendBy} onChange={(e) => setExtendBy(e.target.value)} placeholder="e.g. 4" className="input-field flex-1" min="0.5" step="0.5" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Current: {(task.etaHours || 0) + (task.etaExtendedBy || 0)}h total</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Progress: {progressPct}%</label>
                <input type="range" value={progressPct} onChange={(e) => setProgressPct(parseInt(e.target.value))} min="0" max="100" step="5" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEtaModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm">Cancel</button>
              <button onClick={saveEta} disabled={savingEta} className="flex-1 btn-primary flex items-center justify-center gap-2">
                {savingEta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
