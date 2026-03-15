'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { useStore } from '@/store/useStore'
import toast from 'react-hot-toast'
import {
  Plus, Minus, ShoppingCart, AlertTriangle, Check, Loader2,
  ArrowLeft, Calendar, FileText, Flag, Layers, IndianRupee,
  Wallet, X, ChevronRight, Sparkles
} from 'lucide-react'

interface ServiceItem {
  id: string
  name: string
  description: string
  category: string
  price: number
  unit: string
}

interface CartItem {
  service: ServiceItem
  quantity: number
  notes: string
}

type Priority = 'low' | 'medium' | 'high' | 'urgent'

const priorityConfig: Record<Priority, { label: string; color: string; bg: string; border: string; ring: string }> = {
  low: {
    label: 'Low',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    ring: 'ring-gray-400',
  },
  medium: {
    label: 'Medium',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    ring: 'ring-blue-500',
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    ring: 'ring-orange-500',
  },
  urgent: {
    label: 'Urgent',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    ring: 'ring-red-500',
  },
}

export default function NewTaskPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { updateBalance } = useStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [groupedServices, setGroupedServices] = useState<Record<string, ServiceItem[]>>({})
  const [servicesLoading, setServicesLoading] = useState(true)

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    try {
      const res = await fetch('/api/services')
      if (!res.ok) throw new Error('Failed to load services')
      const data = await res.json()
      setGroupedServices(data.grouped)
    } catch {
      toast.error('Failed to load service catalog')
    } finally {
      setServicesLoading(false)
    }
  }

  function addToCart(service: ServiceItem) {
    setCart((prev) => {
      const existing = prev.find((item) => item.service.id === service.id)
      if (existing) {
        return prev.map((item) =>
          item.service.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { service, quantity: 1, notes: '' }]
    })
  }

  function removeFromCart(serviceId: string) {
    setCart((prev) => prev.filter((item) => item.service.id !== serviceId))
  }

  function updateQuantity(serviceId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.service.id !== serviceId) return item
          const newQty = item.quantity + delta
          if (newQty < 1) return item
          return { ...item, quantity: newQty }
        })
    )
  }

  function updateNotes(serviceId: string, notes: string) {
    setCart((prev) =>
      prev.map((item) =>
        item.service.id === serviceId ? { ...item, notes } : item
      )
    )
  }

  function getCartQuantity(serviceId: string): number {
    const item = cart.find((c) => c.service.id === serviceId)
    return item ? item.quantity : 0
  }

  const grandTotal = cart.reduce(
    (sum, item) => sum + item.service.price * item.quantity,
    0
  )

  const walletBalance = user?.wallet?.balance ?? 0
  const hasSufficientBalance = walletBalance >= grandTotal

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Please enter a task title')
      return
    }
    if (cart.length === 0) {
      toast.error('Please add at least one service item')
      return
    }
    if (!hasSufficientBalance) {
      toast.error('Insufficient wallet balance. Please add funds first.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          dueDate: dueDate || undefined,
          items: cart.map((item) => ({
            serviceItemId: item.service.id,
            quantity: item.quantity,
            notes: item.notes.trim() || undefined,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'Insufficient wallet balance') {
          toast.error(
            `Insufficient balance. Required: \u20B9${data.required?.toLocaleString()}, Available: \u20B9${data.available?.toLocaleString()}`
          )
        } else {
          throw new Error(data.error || 'Failed to create task')
        }
        return
      }

      // Update the local wallet balance
      const balanceRes = await fetch('/api/wallet/balance')
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json()
        updateBalance(balanceData.balance)
      }

      toast.success('Task created successfully!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
            <p className="text-sm text-gray-500">
              Select services and submit your project request
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form + Service Catalog */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Details Card */}
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Task Details
              </h2>

              <div className="space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Social Media Campaign for Product Launch"
                    className="input-field"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you need in detail..."
                    rows={4}
                    className="input-field resize-none"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                    <Flag className="w-4 h-4" />
                    Priority
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.entries(priorityConfig) as [Priority, typeof priorityConfig[Priority]][]).map(
                      ([key, config]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPriority(key)}
                          className={`relative px-4 py-2.5 rounded-xl border-2 text-sm font-medium
                            transition-all duration-200 flex items-center justify-center gap-1.5
                            ${
                              priority === key
                                ? `${config.bg} ${config.border} ${config.color} ring-2 ${config.ring} ring-offset-1`
                                : 'border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          {priority === key && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          {config.label}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Due Date
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="input-field max-w-xs"
                  />
                </div>
              </div>
            </div>

            {/* Service Catalog */}
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Service Catalog
              </h2>

              {servicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-500">Loading services...</span>
                </div>
              ) : Object.keys(groupedServices).length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No services available at the moment.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedServices).map(([category, services]) => (
                    <div key={category}>
                      <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {services.map((service) => {
                          const inCart = getCartQuantity(service.id)
                          return (
                            <div
                              key={service.id}
                              className={`relative rounded-xl border-2 p-4 transition-all duration-200 ${
                                inCart > 0
                                  ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                                  : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                              }`}
                            >
                              {inCart > 0 && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full
                                  flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                  {inCart}
                                </div>
                              )}
                              <div className="flex-1 mb-3">
                                <h4 className="font-semibold text-gray-900 text-sm">
                                  {service.name}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {service.description}
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-base font-bold text-gray-900">
                                    {'\u20B9'}{service.price.toLocaleString()}
                                  </span>
                                  <span className="text-xs text-gray-400 ml-1">
                                    / {service.unit}
                                  </span>
                                </div>
                                {inCart > 0 ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (inCart === 1) {
                                          removeFromCart(service.id)
                                        } else {
                                          updateQuantity(service.id, -1)
                                        }
                                      }}
                                      className="w-7 h-7 rounded-lg bg-white border border-gray-200
                                        flex items-center justify-center hover:bg-red-50
                                        hover:border-red-200 transition-colors"
                                    >
                                      <Minus className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                    <span className="w-6 text-center text-sm font-semibold text-gray-900">
                                      {inCart}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(service.id, 1)}
                                      className="w-7 h-7 rounded-lg bg-white border border-gray-200
                                        flex items-center justify-center hover:bg-blue-50
                                        hover:border-blue-200 transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => addToCart(service)}
                                    className="btn-secondary !px-3 !py-1.5 !text-xs flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Cost Summary (Sticky) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Cart Summary */}
              <div className="card">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Order Summary
                </h2>

                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">
                      No items added yet.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Browse the catalog and add services.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.service.id}
                        className="border border-gray-100 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-medium text-gray-900 text-sm flex-1 pr-2">
                            {item.service.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.service.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">
                            {item.quantity} x {'\u20B9'}{item.service.price.toLocaleString()}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {'\u20B9'}{(item.service.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.quantity === 1) {
                                removeFromCart(item.service.id)
                              } else {
                                updateQuantity(item.service.id, -1)
                              }
                            }}
                            className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center
                              hover:bg-red-50 transition-colors"
                          >
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <span className="w-6 text-center text-xs font-semibold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.service.id, 1)}
                            className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center
                              hover:bg-blue-50 transition-colors"
                          >
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) =>
                            updateNotes(item.service.id, e.target.value)
                          }
                          placeholder="Add notes (optional)"
                          className="mt-2 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-100
                            focus:border-blue-300 focus:ring-1 focus:ring-blue-200 outline-none
                            text-gray-600 placeholder:text-gray-300 transition-colors"
                        />
                      </div>
                    ))}

                    {/* Grand Total */}
                    <div className="border-t-2 border-gray-100 pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">
                          Grand Total
                        </span>
                        <span className="text-xl font-bold text-gray-900">
                          {'\u20B9'}{grandTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet Balance */}
              <div className="card">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Wallet Balance
                </h2>
                <p className="text-2xl font-bold text-gray-900">
                  {'\u20B9'}{walletBalance.toLocaleString()}
                </p>

                {cart.length > 0 && (
                  <div className="mt-3">
                    {hasSufficientBalance ? (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
                        <Check className="w-4 h-4 flex-shrink-0" />
                        <span>Sufficient balance for this order</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Insufficient balance</p>
                          <p className="text-xs mt-0.5">
                            You need {'\u20B9'}
                            {(grandTotal - walletBalance).toLocaleString()} more.
                            Please add funds to your wallet.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {cart.length > 0 && !hasSufficientBalance && (
                  <button
                    type="button"
                    onClick={() => router.push('/wallet')}
                    className="btn-secondary w-full mt-3 flex items-center justify-center gap-2 text-sm"
                  >
                    <IndianRupee className="w-4 h-4" />
                    Add Funds
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  submitting ||
                  cart.length === 0 ||
                  !title.trim() ||
                  !hasSufficientBalance
                }
                className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Task...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Submit Task
                    {grandTotal > 0 && (
                      <span className="ml-1">
                        ({'\u20B9'}{grandTotal.toLocaleString()})
                      </span>
                    )}
                  </>
                )}
              </button>

              {cart.length > 0 && !hasSufficientBalance && (
                <p className="text-center text-xs text-gray-400">
                  Add funds to your wallet before submitting
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  )
}
