import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Helmet } from 'react-helmet-async'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.email || !form.password) {
      return toast.error('Please fill all fields')
    }

    setLoading(true)

    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Login — AUTOCRAFT</title>
      </Helmet>

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
                <img src="/logo.png" alt="AUTOCRAFT" width={223} height={65} className="h-12 w-auto object-contain mx-auto mb-4" />
              </Link>
              <h1 className="font-display text-2xl font-bold text-dark-text">
                Welcome back
              </h1>
              <p className="text-dark-muted text-sm mt-1">
                Sign in to your AUTOCRAFT account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-sm text-dark-muted mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="input-field pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm text-dark-muted">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary-500 hover:text-primary-600 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />

                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="input-field pl-10 pr-10"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={17} /> Sign In
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <hr className="flex-1 border-dark-border" />
              <span className="text-xs text-dark-muted">
                or continue with
              </span>
              <hr className="flex-1 border-dark-border" />
            </div>

            {/* ✅ UPDATED GOOGLE BUTTON */}
            <a
              href={`${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000'}/api/auth/google`}
              className="w-full flex items-center justify-center gap-3 border border-dark-border rounded-xl py-3 text-sm text-dark-text bg-white/5 hover:bg-white/10 transition-all duration-200"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                width={20}
                height={20}
                className="w-5 h-5"
              />
              <span className="font-medium">Continue with Google</span>
            </a>

            <p className="text-center text-sm text-dark-muted mt-6">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
              >
                Create one free
              </Link>
            </p>

          </div>
        </motion.div>
      </div>
    </>
  )
}

