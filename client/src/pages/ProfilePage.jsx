import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, Save } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

import BASE_URL from '../utils/api'; // Adjust the import path as needed

const API = BASE_URL; // from utils/api.js

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [form, setForm]   = useState({
    name:  user?.name  || '',
    phone: user?.phone || '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

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

  return (
    <>
      <Helmet><title>My Profile — AUTOCRAFT</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <h1 className="font-display text-3xl font-bold text-dark-text mb-8">My Profile</h1>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-8">

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white font-display text-2xl font-bold">
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

          <form onSubmit={handleSave} className="space-y-4">
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

          <hr className="border-dark-border my-6" />

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/my-orders" className="btn-outline text-center text-sm">View My Orders</Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="btn-primary text-center text-sm">Admin Panel</Link>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}