import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, Send, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Helmet } from 'react-helmet-async'

import BASE_URL from '../utils/api'; //adjust the import path as needed

const API = BASE_URL; // from utils/api.js

export default function ForgotPassword() {
  const navigate = useNavigate()

  const [step,     setStep]     = useState(1) // 1=email, 2=otp, 3=newpassword
  const [email,    setEmail]    = useState('')
  const [otp,      setOtp]      = useState('')
  const [passwords, setPasswords] = useState({ password: '', confirm: '' })
  const [resetToken, setResetToken] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  const handleSendOTP = async (e) => {
    e.preventDefault()
    if (!email) return toast.error('Please enter your email')
    setLoading(true)
    try {
      await axios.post(`${API}/auth/send-otp`, { email, type: 'reset' })
      toast.success('OTP sent to your email!')
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) return toast.error('Enter the 6-digit OTP')
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/auth/verify-otp`, { email, otp })
      setResetToken(data.resetToken || '')
      toast.success('OTP verified!')
      setStep(3)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    
    // Strict password strength validation
    if (passwords.password.length < 12) return toast.error('Password must be at least 12 characters')
    if (!/[A-Z]/.test(passwords.password)) return toast.error('Password must contain at least one uppercase letter')
    if (!/[a-z]/.test(passwords.password)) return toast.error('Password must contain at least one lowercase letter')
    if (!/[0-9]/.test(passwords.password)) return toast.error('Password must contain at least one number')
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/;`]/.test(passwords.password)) {
      return toast.error('Password must contain at least one special character')
    }
    if (passwords.password !== passwords.confirm) return toast.error('Passwords do not match')
    
    setLoading(true)
    try {
      // Use OTP-based reset — send new password with verified email and cryptographic reset token
      await axios.post(`${API}/auth/reset-password-otp`, {
        email,
        password: passwords.password,
        token: resetToken,
      })
      setDone(true)
      toast.success('Password reset successfully!')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet><title>Forgot Password — AUTOCRAFT</title></Helmet>

      <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="card p-8 sm:p-10">
            <Link to="/login" className="inline-flex items-center gap-2 text-dark-muted hover:text-dark-text text-sm mb-6 transition-colors">
              <ArrowLeft size={15} /> Back to Login
            </Link>

            {done ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-green-400" />
                </div>
                <h2 className="font-display text-xl font-bold text-dark-text mb-2">Password Reset!</h2>
                <p className="text-dark-muted text-sm">Redirecting to login...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">

                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="text-center mb-8">
                      <h1 className="font-display text-2xl font-bold text-dark-text">Forgot password?</h1>
                      <p className="text-dark-muted text-sm mt-1">Enter your email to receive an OTP</p>
                    </div>
                    <form onSubmit={handleSendOTP} className="space-y-4">
                      <div>
                        <label className="block text-sm text-dark-muted mb-1.5">Email Address</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input-field pl-10" />
                        </div>
                      </div>
                      <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={16} /> Send OTP</>}
                      </button>
                    </form>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="text-center mb-8">
                      <div className="w-14 h-14 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Mail size={24} className="text-primary-500" />
                      </div>
                      <h1 className="font-display text-2xl font-bold text-dark-text">Enter OTP</h1>
                      <p className="text-dark-muted text-sm mt-1">Sent to <span className="text-dark-text">{email}</span></p>
                    </div>
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                      <input
                        type="text"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="• • • • • •"
                        maxLength={6}
                        className="input-field text-center text-2xl tracking-widest font-mono"
                      />
                      <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Verify OTP'}
                      </button>
                      <button type="button" onClick={() => setStep(1)} className="w-full text-center text-sm text-dark-muted hover:text-dark-text transition-colors">
                        Change email
                      </button>
                    </form>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="text-center mb-8">
                      <h1 className="font-display text-2xl font-bold text-dark-text">Set New Password</h1>
                      <p className="text-dark-muted text-sm mt-1">Choose a strong password</p>
                    </div>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div>
                        <label className="block text-sm text-dark-muted mb-1.5">New Password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                          <input
                            type={showPass ? 'text' : 'password'}
                            value={passwords.password}
                            onChange={e => setPasswords(p => ({ ...p, password: e.target.value }))}
                            placeholder="Min. 6 characters"
                            className="input-field pl-10 pr-10"
                          />
                          <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text">
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-dark-muted mb-1.5">Confirm Password</label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                          <input
                            type={showPass ? 'text' : 'password'}
                            value={passwords.confirm}
                            onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                            placeholder="Re-enter password"
                            className="input-field pl-10"
                          />
                        </div>
                      </div>
                      <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reset Password'}
                      </button>
                    </form>
                  </motion.div>
                )}

              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}

