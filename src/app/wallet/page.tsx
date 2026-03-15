'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { useStore } from '@/store/useStore'
import toast from 'react-hot-toast'
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  IndianRupee,
  Loader2,
  Banknote,
  RefreshCw,
  Inbox,
} from 'lucide-react'

interface Transaction {
  id: string
  type: 'credit' | 'debit'
  amount: number
  description: string
  status: string
  createdAt: string
  task?: { title: string } | null
}

declare global {
  interface Window {
    Razorpay: any
  }
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000]

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

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function WalletPage() {
  const { user } = useAuth()
  const { user: storeUser, updateBalance } = useStore()

  const [selectedAmount, setSelectedAmount] = useState<number | null>(1000)
  const [customAmount, setCustomAmount] = useState('')
  const [isAddingFunds, setIsAddingFunds] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txnLoading, setTxnLoading] = useState(true)

  const walletBalance = storeUser?.wallet?.balance ?? 0

  const activeAmount = customAmount ? parseInt(customAmount, 10) : selectedAmount

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet/transactions')
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
      }
    } catch {
      // silently fail
    } finally {
      setTxnLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  function handlePresetClick(amount: number) {
    setSelectedAmount(amount)
    setCustomAmount('')
  }

  function handleCustomAmountChange(value: string) {
    const sanitized = value.replace(/\D/g, '')
    setCustomAmount(sanitized)
    if (sanitized) {
      setSelectedAmount(null)
    }
  }

  async function handleAddFunds() {
    if (!activeAmount || activeAmount < 100) {
      toast.error('Minimum amount is \u20B9100')
      return
    }

    setIsAddingFunds(true)

    try {
      const res = await fetch('/api/wallet/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: activeAmount }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Dev mode - instant credit
      if (data.devMode) {
        updateBalance(data.balance)
        toast.success(`${formatCurrency(activeAmount)} added to your wallet!`)
        setCustomAmount('')
        setSelectedAmount(1000)
        fetchTransactions()
        return
      }

      // Razorpay flow
      if (data.orderId) {
        const scriptLoaded = await loadRazorpayScript()
        if (!scriptLoaded) {
          toast.error('Failed to load payment gateway. Please try again.')
          return
        }

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: activeAmount * 100,
          currency: 'INR',
          name: 'AdFlow Agency',
          description: 'Wallet Top-up',
          order_id: data.orderId,
          handler: async (response: any) => {
            try {
              const verifyRes = await fetch('/api/wallet/add-funds', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  amount: activeAmount,
                }),
              })

              const verifyData = await verifyRes.json()
              if (!verifyRes.ok) throw new Error(verifyData.error)

              updateBalance(verifyData.balance)
              toast.success(`${formatCurrency(activeAmount)} added to your wallet!`)
              setCustomAmount('')
              setSelectedAmount(1000)
              fetchTransactions()
            } catch (err: any) {
              toast.error(err.message || 'Payment verification failed')
            }
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || '',
          },
          theme: {
            color: '#2563EB',
          },
          modal: {
            ondismiss: () => {
              toast.error('Payment cancelled')
            },
          },
        }

        const razorpay = new window.Razorpay(options)
        razorpay.open()
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate payment')
    } finally {
      setIsAddingFunds(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            <span className="gradient-text">Wallet</span>
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your funds and view transaction history.
          </p>
        </div>

        {/* Balance Card */}
        <div className="gradient-bg rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white/5 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-blue-100">Available Balance</span>
            </div>
            <p className="text-4xl sm:text-5xl font-bold tracking-tight mb-1">
              {formatCurrency(walletBalance)}
            </p>
            <p className="text-blue-200 text-sm">
              Use your balance to pay for tasks and services
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Funds Section */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add Funds</h2>
                <p className="text-sm text-gray-500">Select or enter an amount to top up</p>
              </div>
            </div>

            {/* Preset Amount Chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handlePresetClick(amount)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                    ${
                      selectedAmount === amount && !customAmount
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {formatCurrency(amount)}
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="relative mb-6">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <IndianRupee className="w-4 h-4" />
              </div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter custom amount"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="input-field pl-9"
              />
            </div>

            {/* Add Funds Button */}
            <button
              onClick={handleAddFunds}
              disabled={isAddingFunds || !activeAmount || activeAmount < 100}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isAddingFunds ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Banknote className="w-5 h-5" />
                  Add {activeAmount && activeAmount >= 100 ? formatCurrency(activeAmount) : 'Funds'}
                </>
              )}
            </button>

            {activeAmount !== null && activeAmount > 0 && activeAmount < 100 && (
              <p className="text-xs text-red-500 mt-2 text-center">
                Minimum amount is {formatCurrency(100)}
              </p>
            )}
          </div>

          {/* Transaction History */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
                  <p className="text-sm text-gray-500">Your recent transactions</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTxnLoading(true)
                  fetchTransactions()
                }}
                className="btn-secondary p-2"
                title="Refresh transactions"
              >
                <RefreshCw className={`w-4 h-4 ${txnLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {txnLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading transactions...</p>
                </div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Inbox className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">No transactions yet</h3>
                <p className="text-sm text-gray-500 text-center max-w-sm">
                  Your transaction history will appear here once you add funds or create tasks.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        txn.type === 'credit'
                          ? 'bg-emerald-50'
                          : 'bg-red-50'
                      }`}
                    >
                      {txn.type === 'credit' ? (
                        <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-600" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {txn.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">
                          {formatDate(txn.createdAt)} at {formatTime(txn.createdAt)}
                        </span>
                        {txn.task?.title && (
                          <>
                            <span className="text-xs text-gray-300">|</span>
                            <span className="text-xs text-blue-600 truncate">
                              {txn.task.title}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <span
                      className={`text-sm font-bold flex-shrink-0 ${
                        txn.type === 'credit'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {txn.type === 'credit' ? '+' : '-'}
                      {formatCurrency(txn.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
