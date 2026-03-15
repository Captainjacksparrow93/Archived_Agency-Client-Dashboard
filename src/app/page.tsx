'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useStore } from '@/store/useStore'
import {
  Mail, Phone, MessageCircle, ArrowRight, Sparkles, Shield,
  Zap, ChevronRight, Loader2, LogIn, UserCircle, ShieldCheck, ClipboardList
} from 'lucide-react'

type AuthMethod = 'email' | 'sms' | 'whatsapp'
type Step = 'method' | 'input' | 'otp' | 'register' | 'demo'

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useStore()

  const [step, setStep] = useState<Step>('method')
  const [method, setMethod] = useState<AuthMethod>('email')
  const [target, setTarget] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isNewUser, setIsNewUser] = useState(false)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [devOtp, setDevOtp] = useState('')
  const [demoEmail, setDemoEmail] = useState('')
  const [demoPassword, setDemoPassword] = useState('')

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const methods = [
    { id: 'email' as AuthMethod, label: 'Email', icon: Mail, desc: 'Get a code via email' },
    { id: 'sms' as AuthMethod, label: 'SMS', icon: Phone, desc: 'Get a code via text message' },
    { id: 'whatsapp' as AuthMethod, label: 'WhatsApp', icon: MessageCircle, desc: 'Get a code via WhatsApp' },
  ]

  async function handleSendOTP() {
    if (!target.trim()) {
      toast.error(method === 'email' ? 'Enter your email' : 'Enter your phone number')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim(), method }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setIsNewUser(data.isNewUser)
      if (data.otp) setDevOtp(data.otp)
      setStep('otp')
      toast.success(`Code sent via ${method}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  function handleOTPChange(index: number, value: string) {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('')
      const newOtp = [...otp]
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d
      })
      setOtp(newOtp)
      const nextIndex = Math.min(index + digits.length, 5)
      otpRefs.current[nextIndex]?.focus()
      return
    }

    const newOtp = [...otp]
    newOtp[index] = value.replace(/\D/g, '')
    setOtp(newOtp)

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  function handleOTPKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerifyOTP() {
    const code = otp.join('')
    if (code.length !== 6) {
      toast.error('Enter the full 6-digit code')
      return
    }

    if (isNewUser) {
      setStep('register')
      return
    }

    await doVerify(code)
  }

  async function doVerify(code?: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: target.trim(),
          code: code || otp.join(''),
          method,
          name: name.trim() || undefined,
          company: company.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setUser(data.user)
      toast.success('Welcome!')

      if (data.user.role === 'admin') {
        router.push('/admin')
      } else if (data.user.role === 'pm') {
        router.push('/pm')
      } else if (data.user.role === 'employee') {
        router.push('/employee')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDemoLogin() {
    if (!demoEmail.trim() || !demoPassword.trim()) {
      toast.error('Enter email and password')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail.trim(), password: demoPassword.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setUser(data.user)
      toast.success('Welcome!')

      if (data.user.role === 'admin') {
        router.push('/admin')
      } else if (data.user.role === 'pm') {
        router.push('/pm')
      } else if (data.user.role === 'employee') {
        router.push('/employee')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  function fillDemoCredentials(email: string, password: string) {
    setDemoEmail(email)
    setDemoPassword(password)
  }

  return (
    <div className="min-h-screen gradient-bg flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 text-white">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold">AdFlow Agency</h1>
          </div>
          <h2 className="text-5xl font-bold leading-tight mb-6">
            Your Digital Marketing
            <br />
            <span className="text-cyan-300">Command Center</span>
          </h2>
          <p className="text-lg text-blue-100 mb-10 leading-relaxed">
            Manage projects, track credits, communicate with our team, and get stunning creatives delivered — all from one place.
          </p>
          <div className="space-y-4">
            {[
              { icon: Zap, text: 'Instant project submissions with credit-based billing' },
              { icon: Shield, text: 'Secure wallet with multiple payment options' },
              { icon: MessageCircle, text: 'Real-time chat connected with our Telegram team' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-blue-100">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <item.icon className="w-4 h-4" />
                </div>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold gradient-text">AdFlow Agency</span>
            </div>

            {/* Step: Choose Method */}
            {step === 'method' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome</h2>
                <p className="text-gray-500 mb-6">Choose how you&apos;d like to sign in</p>

                {/* Demo Sign In - prominent */}
                <button
                  onClick={() => setStep('demo')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-green-200
                             bg-green-50/50 hover:border-green-300 hover:bg-green-50 transition-all duration-200 group mb-4"
                >
                  <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center
                                  group-hover:bg-green-200 transition-colors">
                    <LogIn className="w-5 h-5 text-green-700" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-gray-900">Demo Sign In</div>
                    <div className="text-sm text-green-600">Sign in with email &amp; password</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-green-300 group-hover:text-green-500 transition-colors" />
                </button>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400 uppercase tracking-wider">or sign in via OTP</span></div>
                </div>

                <div className="space-y-3">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setMethod(m.id); setStep('input') }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100
                                 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-200 group"
                    >
                      <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center
                                      group-hover:bg-blue-100 transition-colors">
                        <m.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-gray-900">{m.label}</div>
                        <div className="text-sm text-gray-500">{m.desc}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Demo Sign In */}
            {step === 'demo' && (
              <div className="animate-fade-in">
                <button onClick={() => setStep('method')} className="text-sm text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 rotate-180" /> Back
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h2>
                <p className="text-gray-500 mb-6">Enter your email and password</p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDemoLogin()}
                      className="input-field"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={demoPassword}
                      onChange={(e) => setDemoPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDemoLogin()}
                      className="input-field"
                    />
                  </div>
                </div>

                <button onClick={handleDemoLogin} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mb-5">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                </button>

                {/* Quick fill demo accounts */}
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Quick Demo Access</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => fillDemoCredentials('demo@client.com', 'demo1234')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100
                                 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group"
                    >
                      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
                        <UserCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Demo Client</p>
                        <p className="text-xs text-gray-400">demo@client.com / demo1234</p>
                      </div>
                    </button>
                    <button
                      onClick={() => fillDemoCredentials('admin@adflow.agency', 'admin1234')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100
                                 hover:border-purple-200 hover:bg-purple-50/30 transition-all text-left group"
                    >
                      <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100">
                        <ShieldCheck className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Admin</p>
                        <p className="text-xs text-gray-400">admin@adflow.agency / admin1234</p>
                      </div>
                    </button>
                    <button
                      onClick={() => fillDemoCredentials('pm@adflow.agency', 'pm1234')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100
                                 hover:border-amber-200 hover:bg-amber-50/30 transition-all text-left group"
                    >
                      <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center group-hover:bg-amber-100">
                        <ClipboardList className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Project Manager</p>
                        <p className="text-xs text-gray-400">pm@adflow.agency / pm1234</p>
                      </div>
                    </button>
                    <button
                      onClick={() => fillDemoCredentials('employee@adflow.agency', 'emp1234')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100
                                 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group"
                    >
                      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Employee (Designer)</p>
                        <p className="text-xs text-gray-400">employee@adflow.agency / emp1234</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Enter Email/Phone */}
            {step === 'input' && (
              <div className="animate-fade-in">
                <button onClick={() => setStep('method')} className="text-sm text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 rotate-180" /> Back
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {method === 'email' ? 'Enter your email' : 'Enter your phone'}
                </h2>
                <p className="text-gray-500 mb-6">
                  We&apos;ll send you a verification code via {method === 'email' ? 'email' : method === 'sms' ? 'SMS' : 'WhatsApp'}
                </p>

                <input
                  type={method === 'email' ? 'email' : 'tel'}
                  placeholder={method === 'email' ? 'you@company.com' : '+91 98765 43210'}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                  className="input-field mb-4"
                  autoFocus
                />

                <button onClick={handleSendOTP} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Code <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            )}

            {/* Step: Enter OTP */}
            {step === 'otp' && (
              <div className="animate-fade-in">
                <button onClick={() => setStep('input')} className="text-sm text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 rotate-180" /> Back
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter verification code</h2>
                <p className="text-gray-500 mb-6">
                  Sent to <span className="font-medium text-gray-700">{target}</span>
                </p>

                {devOtp && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm">
                    <span className="font-semibold text-amber-800">Dev Mode:</span>{' '}
                    <span className="text-amber-700">OTP is <code className="font-mono font-bold">{devOtp}</code></span>
                  </div>
                )}

                <div className="flex gap-2 justify-center mb-6">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOTPChange(i, e.target.value)}
                      onKeyDown={(e) => handleOTPKeyDown(i, e)}
                      className="otp-input"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <button onClick={handleVerifyOTP} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify <ArrowRight className="w-4 h-4" /></>}
                </button>

                <button onClick={handleSendOTP} className="w-full text-center text-sm text-gray-500 hover:text-blue-600 mt-4 transition-colors">
                  Didn&apos;t receive the code? Resend
                </button>
              </div>
            )}

            {/* Step: Register (new user) */}
            {step === 'register' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Almost there!</h2>
                <p className="text-gray-500 mb-6">Tell us a bit about yourself</p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company (optional)</label>
                    <input
                      type="text"
                      placeholder="Your Company Name"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                <button
                  onClick={() => doVerify()}
                  disabled={loading || !name.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-blue-100 mt-6">
            By continuing, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  )
}
