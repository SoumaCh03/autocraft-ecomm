import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Helmet } from 'react-helmet-async'

import BASE_URL from '../utils/api'; // adjust the path as needed

const API = BASE_URL;

export default function ResetPassword() {
  const { token }  = useParams()
  const navigate   = useNavigate()

  const [form,     setForm]     = useState({ password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    if (form.password !== form.confirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      await axios.post(`${API}/auth/reset-password/${token}`, { password: form.password })
      setDone(true)
      toast.success('Password reset successful!')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet><title>Reset Password — AUTOCRAFT</title></Helmet>
      <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="card p-8 sm:p-10">
            {done ? (
              <div className="text-center py-4">
                <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                <h2 className="font-display text-2xl font-bold text-dark-text mb-2">Password Reset!</h2>
                <p className="text-dark-muted">Redirecting to login...</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <Link to="/">
                    <img src="/logo.png" alt="AUTOCRAFT" className="h-12 w-auto object-contain mx-auto mb-4" />
                  </Link>
                  <h1 className="font-display text-2xl font-bold text-dark-text">Set New Password</h1>
                  <p className="text-dark-muted text-sm mt-1">Choose a strong password</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-dark-muted mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Min. 6 characters"
                        className="input-field pl-10 pr-10"
                      />
                      <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-muted">
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
                        value={form.confirm}
                        onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                        placeholder="Re-enter password"
                        className="input-field pl-10"
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : 'Reset Password'
                    }
                  </button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}

