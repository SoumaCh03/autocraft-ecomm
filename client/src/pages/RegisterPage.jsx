import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, User, Phone, UserPlus, Shield, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Helmet } from 'react-helmet-async'

import BASE_URL from '../utils/api'; //adjust the import path as needed

const API = BASE_URL; // from utils/api.js

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [step,     setStep]     = useState(1) // 1=form, 2=otp
  const [form,     setForm]     = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [otp,      setOtp]      = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [sending,  setSending]  = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSendOTP = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return toast.error('Please fill all required fields')
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    if (form.password !== form.confirm) return toast.error('Passwords do not match')

    setSending(true)
    try {
      await axios.post(`${API}/auth/send-otp`, { email: form.email, type: 'register' })
      toast.success('OTP sent to your email!')
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP')
    } finally {
      setSending(false)
    }
  }

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) return toast.error('Please enter the 6-digit OTP')

    setLoading(true)
    try {
      // Verify OTP first
      await axios.post(`${API}/auth/verify-otp`, { email: form.email, otp })

      // Then register
      await register({ name: form.name, email: form.email, password: form.password, phone: form.phone })
      toast.success('Account created! Welcome to AUTOCRAFT!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setSending(true)
    try {
      await axios.post(`${API}/auth/send-otp`, { email: form.email, type: 'register' })
      toast.success('New OTP sent!')
    } catch {
      toast.error('Failed to resend OTP')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Helmet><title>Create Account — AUTOCRAFT</title></Helmet>

      <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="card p-8 sm:p-10">

            <div className="text-center mb-8">
              <Link to="/">
                <img src="/logo.png" alt="AUTOCRAFT" className="h-12 w-auto object-contain mx-auto mb-4" />
              </Link>
              <h1 className="font-display text-2xl font-bold text-dark-text">
                {step === 1 ? 'Create your account' : 'Verify your email'}
              </h1>
              <p className="text-dark-muted text-sm mt-1">
                {step === 1 ? 'Join AUTOCRAFT customers' : `OTP sent to ${form.email}`}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleSendOTP}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm text-dark-muted mb-1.5">Full Name *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                      <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" className="input-field pl-10" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-dark-muted mb-1.5">Email Address *</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                      <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="input-field pl-10" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-dark-muted mb-1.5">Phone Number <span className="text-dark-muted/60">(optional)</span></label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                      <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" className="input-field pl-10" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-dark-muted mb-1.5">Password *</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Min. 6 characters"
                        className="input-field pl-10 pr-10"
                      />
                      <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-dark-muted mb-1.5">Confirm Password *</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        name="confirm"
                        value={form.confirm}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        className="input-field pl-10"
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                    {sending
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><Shield size={16} /> Send Verification OTP</>
                    }
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleVerifyAndRegister}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail size={28} className="text-primary-500" />
                    </div>
                    <p className="text-dark-muted text-sm">Check your inbox and enter the 6-digit OTP</p>
                  </div>

                  <div>
                    <label className="block text-sm text-dark-muted mb-1.5 text-center">Enter OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      maxLength={6}
                      className="input-field text-center text-2xl tracking-widest font-mono"
                    />
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><UserPlus size={17} /> Create Account</>
                    }
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button type="button" onClick={() => setStep(1)} className="text-dark-muted hover:text-dark-text flex items-center gap-1 transition-colors">
                      <ArrowLeft size={14} /> Go back
                    </button>
                    <button type="button" onClick={handleResendOTP} disabled={sending} className="text-primary-500 hover:text-primary-600 transition-colors">
                      {sending ? 'Sending...' : 'Resend OTP'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {step === 1 && (
              <>
                <div className="flex items-center gap-3 my-6">
                  <hr className="flex-1 border-dark-border" />
                  <span className="text-xs text-dark-muted">or</span>
                  <hr className="flex-1 border-dark-border" />
                </div>

                <a
                  href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/api/auth/google`}
                  className="w-full flex items-center justify-center gap-3 border border-dark-border rounded-xl py-3 text-sm text-dark-text bg-white/5 hover:bg-white/10 transition-all duration-200"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  <span className="font-medium">Continue with Google</span>
                </a>

                <p className="text-center text-sm text-dark-muted mt-6">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium transition-colors">Sign in</Link>
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}
