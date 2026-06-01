import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, Save, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

import BASE_URL from '../utils/api'; // Adjust the import path as needed

const API = BASE_URL; // from utils/api.js
const SPECIAL_CHARS = '!@#$%^&*(),.?":{}|<>_-+=[]\\/;`'
const hasSpecialChar = (value) => [...SPECIAL_CHARS].some((char) => value.includes(char))

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  
  const [form, setForm] = useState({
    name:  user?.name  || '',
    phone: user?.phone || '',
  })
  const [loading, setLoading] = useState(false)

  // Password update states
  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passLoading, setPassLoading] = useState(false)
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)

  // Password policy validation flags
  const hasMinLength = passForm.newPassword.length >= 12
  const hasUpper = /[A-Z]/.test(passForm.newPassword)
  const hasLower = /[a-z]/.test(passForm.newPassword)
  const hasNumber = /[0-9]/.test(passForm.newPassword)
  const hasSpecial = hasSpecialChar(passForm.newPassword)
  const strengthCount = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  
  const handlePassChange = (e) => setPassForm({ ...passForm, [e.target.name]: e.target.value })

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await axios.put(`${API}/auth/profile`,
        { name: form.name, phone: form.phone },
        { withCredentials: true }
      )
      setUser(data.user)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    
    // Front-end validations
    if (!passForm.currentPassword || !passForm.newPassword || !passForm.confirmPassword) {
      return toast.error('Please fill in all password fields')
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      return toast.error('New passwords do not match')
    }
    if (strengthCount < 5) {
      return toast.error('Please meet all password strength requirements')
    }

    setPassLoading(true)
    try {
      await axios.put(`${API}/auth/update-password`,
        {
          currentPassword: passForm.currentPassword,
          newPassword: passForm.newPassword,
          confirmPassword: passForm.confirmPassword,
        },
        { withCredentials: true }
      )
      
      toast.success('Password updated! Logging out of all sessions...')
      setUser(null) // clear local session state
      
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password')
    } finally {
      setPassLoading(false)
    }
  }

  return (
    <>
      <Helmet><title>My Profile — AUTOCRAFT</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <h1 className="font-display text-3xl font-bold text-dark-text mb-8">My Profile</h1>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-8 space-y-8">

          {/* Avatar Details */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white font-display text-2xl font-bold select-none">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-dark-text text-lg">{user?.name}</p>
              <p className="text-dark-muted text-sm">{user?.email}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                user?.role === 'admin'
                  ? 'bg-accent-400/10 text-accent-400'
                  : 'bg-primary-500/10 text-primary-500'
              }`}>
                {user?.role}
              </span>
            </div>
          </div>

          {/* Profile Details Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <h3 className="text-lg font-semibold text-dark-text flex items-center gap-2">
              <User size={18} className="text-primary-500" /> Account Settings
            </h3>
            
            <div>
              <label className="block text-sm text-dark-muted mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-dark-muted mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                <input
                  value={user?.email}
                  disabled
                  className="input-field pl-10 opacity-50 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-dark-muted mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm text-dark-muted mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Save size={16} /> Save Changes</>
              }
            </button>
          </form>

          <hr className="border-dark-border" />

          {/* Secure Password Update Section */}
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <h3 className="text-lg font-semibold text-dark-text flex items-center gap-2">
              <ShieldCheck size={18} className="text-green-400" /> Update Password
            </h3>

            <div>
              <label className="block text-sm text-dark-muted mb-1.5">Current Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  name="currentPassword"
                  value={passForm.currentPassword}
                  onChange={handlePassChange}
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text transition-colors"
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-dark-muted mb-1.5">New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  name="newPassword"
                  value={passForm.newPassword}
                  onChange={handlePassChange}
                  className="input-field pl-10 pr-10"
                  placeholder="Min. 12 chars, mixed case, alphanumeric & special"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text transition-colors"
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength Checklist & Bar */}
              {passForm.newPassword && (
                <div className="space-y-2 mt-3 p-4 rounded-xl border border-dark-border bg-dark-bg/40">
                  <div className="flex h-1.5 w-full bg-dark-border rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strengthCount <= 2 ? 'bg-red-500 w-1/3' :
                        strengthCount <= 4 ? 'bg-amber-500 w-2/3' :
                        'bg-green-500 w-full'
                      }`}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-green-400' : 'text-dark-muted'}`}>
                      <span>●</span> 12+ characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-green-400' : 'text-dark-muted'}`}>
                      <span>●</span> Uppercase letter
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLower ? 'text-green-400' : 'text-dark-muted'}`}>
                      <span>●</span> Lowercase letter
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-green-400' : 'text-dark-muted'}`}>
                      <span>●</span> Number
                    </div>
                    <div className={`flex items-center gap-1.5 sm:col-span-2 ${hasSpecial ? 'text-green-400' : 'text-dark-muted'}`}>
                      <span>●</span> Special character (!@#$%^&*...)
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-dark-muted mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passForm.confirmPassword}
                  onChange={handlePassChange}
                  className="input-field pl-10"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <button type="submit" disabled={passLoading} className="btn-outline flex items-center gap-2">
              {passLoading
                ? <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                : <><Lock size={16} /> Update Password</>
              }
            </button>
          </form>

          <hr className="border-dark-border" />

          {/* Navigation Links */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link to="/my-orders" className="btn-outline text-center text-sm flex-1">View My Orders</Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="btn-primary text-center text-sm flex-1">Admin Panel</Link>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}
