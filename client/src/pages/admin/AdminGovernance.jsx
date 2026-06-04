import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Shield,
  Users,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Search,
  AlertTriangle,
  RefreshCw,
  Sliders,
  UserCheck,
  UserX,
  FileText,
  Table as TableIcon,
  HelpCircle,
  Trash2
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import BASE_URL from '../../utils/api'
import { useAuth } from '../../context/AuthContext'

const API = `${BASE_URL}/governance`

export default function AdminGovernance() {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Data states
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
  const [roleLogs, setRoleLogs] = useState([])
  const [securityLogs, setSecurityLogs] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [govLogs, setGovLogs] = useState([])

  // Search & Pagination states
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Modals state
  const [selectedUser, setSelectedUser] = useState(null)
  const [actionType, setActionType] = useState('') // 'promote_admin', 'promote_super', 'demote_customer', 'demote_admin', 'disable', 'enable'
  const [reason, setReason] = useState('')
  const [showActionModal, setShowActionModal] = useState(false)

  // Approval Modal state
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [approvalAction, setApprovalAction] = useState('') // 'approve', 'reject'
  const [approverReason, setApproverReason] = useState('')
  const [password, setPassword] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)

  // Fetch data depending on active tab
  useEffect(() => {
    fetchData()
  }, [activeTab, page, roleFilter, statusFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'users') {
        const { data } = await axios.get(`${API}/users`, {
          params: { role: roleFilter, status: statusFilter, search, page, limit: 15 },
          withCredentials: true
        })
        setUsers(data.users || [])
        setTotalPages(data.pages || 1)
      } else if (activeTab === 'requests' || activeTab === 'approvals') {
        const statusParam = activeTab === 'approvals' ? 'pending' : ''
        const { data } = await axios.get(`${API}/requests`, {
          params: { status: statusParam, page, limit: 15 },
          withCredentials: true
        })
        setRequests(data.requests || [])
        setTotalPages(data.pages || 1)
      } else if (activeTab === 'role-logs') {
        const { data } = await axios.get(`${API}/logs/role`, { params: { page, limit: 20 }, withCredentials: true })
        setRoleLogs(data.logs || [])
        setTotalPages(data.pages || 1)
      } else if (activeTab === 'security-logs') {
        const { data } = await axios.get(`${API}/logs/security`, { params: { page, limit: 20 }, withCredentials: true })
        setSecurityLogs(data.logs || [])
        setTotalPages(data.pages || 1)
      } else if (activeTab === 'activity-logs') {
        const { data } = await axios.get(`${API}/logs/activity`, { params: { page, limit: 20 }, withCredentials: true })
        setActivityLogs(data.logs || [])
        setTotalPages(data.pages || 1)
      } else if (activeTab === 'governance-logs') {
        const { data } = await axios.get(`${API}/logs/governance`, { params: { page, limit: 20 }, withCredentials: true })
        setGovLogs(data.logs || [])
        setTotalPages(data.pages || 1)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load governance data')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchData()
  }

  const openActionModal = (user, type) => {
    setSelectedUser(user)
    setActionType(type)
    setReason('')
    setShowActionModal(true)
  }

  const handleActionSubmit = async (e) => {
    e.preventDefault()
    if (reason.trim().length < 20 || reason.trim().length > 1000) {
      return toast.error('Reason must be between 20 and 1000 characters.')
    }

    let requestedRole = undefined
    let requestedStatus = undefined
    let actionTypeVal = undefined

    if (actionType === 'promote_admin') requestedRole = 'admin'
    else if (actionType === 'promote_super') requestedRole = 'super_admin'
    else if (actionType === 'demote_customer') requestedRole = 'customer'
    else if (actionType === 'demote_admin') requestedRole = 'admin'
    else if (actionType === 'disable') requestedStatus = 'disabled'
    else if (actionType === 'enable') requestedStatus = 'active'
    else if (actionType === 'delete_super_admin') actionTypeVal = 'delete_super_admin'

    try {
      const { data } = await axios.post(`${API}/requests`, {
        targetUserId: selectedUser._id,
        requestedRole,
        requestedStatus,
        actionType: actionTypeVal,
        initiatorReason: reason
      }, { withCredentials: true })

      toast.success(data.message)
      setShowActionModal(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    }
  }

  const openApprovalModal = (reqObj, action) => {
    setSelectedRequest(reqObj)
    setApprovalAction(action)
    setApproverReason('')
    setPassword('')
    setShowApprovalModal(true)
  }

  const handleApprovalSubmit = async (e) => {
    e.preventDefault()
    if (approverReason.trim().length < 20 || approverReason.trim().length > 1000) {
      return toast.error('Reason must be between 20 and 1000 characters.')
    }
    if (!password) {
      return toast.error('Password confirmation is required.')
    }

    try {
      const url = `${API}/requests/${approvalAction === 'approve' ? 'approve' : 'reject'}/${selectedRequest._id}`
      const { data } = await axios.post(url, {
        approverReason,
        password
      }, { withCredentials: true })

      toast.success(data.message)
      setShowApprovalModal(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Processing failed')
    }
  }

  // Export Utilities
  const exportExcel = (data, filename) => {
    if (!data.length) return toast.error('No logs available to export.')
    setExporting(true)
    try {
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs')
      XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Logs exported to Excel')
    } finally {
      setExporting(false)
    }
  }

  const exportPDF = (title, headers, bodyRows, filename) => {
    if (!bodyRows.length) return toast.error('No logs available to export.')
    setExporting(true)
    try {
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.setTextColor(59, 107, 255)
      doc.text('AUTOCRAFT SECURITY AUDIT', 14, 18)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`${title} · Generated: ${new Date().toLocaleString('en-IN')}`, 14, 25)

      autoTable(doc, {
        startY: 32,
        head: [headers],
        body: bodyRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 107, 255] }
      })

      doc.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Logs exported to PDF')
    } finally {
      setExporting(false)
    }
  }

  // Generate body rows for PDF exports
  const getRolePDFData = () => {
    const headers = ['Timestamp', 'Actor', 'Target', 'Before', 'After', 'Initiator Reason', 'Approver Reason']
    const rows = roleLogs.map(l => [
      new Date(l.timestamp).toLocaleString('en-IN'),
      l.actorName,
      l.targetName,
      l.roleBefore || l.statusBefore,
      l.roleAfter || l.statusAfter,
      l.initiatorReason || '-',
      l.approverReason || '-'
    ])
    return { headers, rows }
  }

  const getSecurityPDFData = () => {
    const headers = ['Timestamp', 'Action', 'Target User', 'Status', 'IP Hash', 'Reason']
    const rows = securityLogs.map(l => [
      new Date(l.timestamp).toLocaleString('en-IN'),
      l.action,
      l.targetName || '-',
      l.status,
      l.ipHash?.slice(0, 10) + '...',
      l.reason || '-'
    ])
    return { headers, rows }
  }

  const getActivityPDFData = () => {
    const headers = ['Timestamp', 'Admin', 'Action', 'Target Type', 'Target ID', 'Details']
    const rows = activityLogs.map(l => [
      new Date(l.timestamp).toLocaleString('en-IN'),
      l.adminName,
      l.action,
      l.targetType || '-',
      l.targetId || '-',
      l.details || '-'
    ])
    return { headers, rows }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-dark-text tracking-wide flex items-center gap-3">
            <Shield size={32} className="text-primary-500" />
            Administrative Governance &amp; Security
          </h1>
          <p className="text-dark-muted mt-1 text-sm">
            Control user access roles, suspension configurations, dual-approval authorization requests, and download real-time security audits.
          </p>
        </div>
        <button
          onClick={() => {
            fetchData()
            toast.success('Governance console synchronized')
          }}
          disabled={loading}
          className="btn-outline py-2 px-4 text-xs font-semibold flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Sync Dashboard
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 border-b border-dark-border/40 scrollbar-none">
        {[
          { id: 'users', label: 'User RBAC Control', icon: Users },
          { id: 'approvals', label: 'Pending Approvals', icon: Clock },
          { id: 'requests', label: 'Role Requests Log', icon: Sliders },
          { id: 'role-logs', label: 'Role Audit Trail', icon: FileText },
          { id: 'security-logs', label: 'Security Audits', icon: ShieldCheck },
          { id: 'activity-logs', label: 'Admin Activity Logs', icon: FileText },
          { id: 'governance-logs', label: 'Governance Panel Audits', icon: FileText }
        ].map(tab => {
          const TabIcon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setPage(1)
              }}
              className={`flex items-center gap-2 shrink-0 py-2.5 px-4 text-sm font-semibold rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary-500/15 text-primary-500 border-primary-500/30'
                  : 'text-dark-muted border-transparent hover:text-dark-text hover:bg-dark-border/20'
              }`}
            >
              <TabIcon size={14} /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content Panels */}
      <div className="card p-6 backdrop-blur-md bg-dark-card/60 border-dark-border/40 min-h-[400px]">
        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            {/* Filter & Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 bg-dark-bg/50 border border-dark-border/60 rounded-xl px-3 py-1.5 w-full md:w-80">
                <Search size={16} className="text-dark-muted" />
                <input
                  type="text"
                  placeholder="Search user email or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-sm text-dark-text placeholder-dark-muted focus:outline-none w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="input-field text-xs py-1.5 w-32"
                >
                  <option value="">All Roles</option>
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field text-xs py-1.5 w-32"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>

                <button type="submit" className="btn-primary text-xs py-1.5 px-4">
                  Apply Filters
                </button>
              </div>
            </form>

            {/* Users List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-dark-border/60 text-dark-muted font-medium">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-dark-muted">No users matched your query.</td>
                    </tr>
                  ) : users.map(u => (
                    <tr key={u._id} className="hover:bg-dark-border/10 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-dark-text">{u.name}</td>
                      <td className="py-3.5 px-4 text-dark-muted font-mono">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                          u.role === 'super_admin'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : u.role === 'admin'
                              ? 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                              : 'bg-dark-border/40 text-dark-muted border-dark-border/60'
                        }`}>
                          {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'Customer'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          u.status === 'active'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-dark-muted text-xs">
                        {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u._id !== currentUser?._id && (
                            <>
                              {u.role === 'customer' && (
                                <button
                                  onClick={() => openActionModal(u, 'promote_admin')}
                                  className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
                                >
                                  Make Admin
                                </button>
                              )}
                              {u.role === 'admin' && (
                                <>
                                  <button
                                    onClick={() => openActionModal(u, 'promote_super')}
                                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                                  >
                                    Promote Super
                                  </button>
                                  <button
                                    onClick={() => openActionModal(u, 'demote_customer')}
                                    className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
                                  >
                                    Demote
                                  </button>
                                </>
                              )}
                              {u.role === 'super_admin' && (
                                <>
                                  <button
                                    onClick={() => openActionModal(u, 'demote_admin')}
                                    className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
                                  >
                                    Demote Admin
                                  </button>
                                  <button
                                    onClick={() => openActionModal(u, 'delete_super_admin')}
                                    className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                                    title="Delete Super Admin Account"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                              {u.status === 'active' ? (
                                <button
                                  onClick={() => openActionModal(u, 'disable')}
                                  className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                                  title="Suspend Account"
                                >
                                  <UserX size={14} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => openActionModal(u, 'enable')}
                                  className="p-1 text-green-400 hover:bg-green-500/10 rounded"
                                  title="Activate Account"
                                >
                                  <UserCheck size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PENDING APPROVALS TAB */}
        {activeTab === 'approvals' && (
          <div>
            <div className="flex items-center gap-2 text-orange-400 mb-6 bg-orange-500/5 border border-orange-500/10 p-3 rounded-xl">
              <AlertTriangle size={16} />
              <p className="text-xs">
                Destructive actions affecting Super Admins (suspension, demotion) require validation and signature by a separate Super Admin.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-dark-border/60 text-dark-muted font-medium">
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Requester</th>
                    <th className="py-3 px-4">Target User</th>
                    <th className="py-3 px-4">Proposed Role</th>
                    <th className="py-3 px-4">Proposed Status</th>
                    <th className="py-3 px-4">Initiator Reason</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-dark-muted">No pending approvals queue found.</td>
                    </tr>
                  ) : requests.map(r => (
                    <tr key={r._id} className="hover:bg-dark-border/10 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-primary-500">{r._id}</td>
                      <td className="py-3.5 px-4 text-dark-text">{r.requester?.name}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-dark-text">{r.targetUser?.name}</p>
                        <p className="text-xs text-dark-muted">{r.targetUser?.email}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        {r.requestedRole ? (
                          <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            {r.requestedRole}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {r.requestedStatus ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                            r.requestedStatus === 'active'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {r.requestedStatus}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-dark-muted text-xs max-w-xs truncate" title={r.initiatorReason}>
                        {r.initiatorReason}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {r.requester?._id !== currentUser?._id && r.targetUser?._id !== currentUser?._id ? (
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => openApprovalModal(r, 'approve')}
                              className="text-xs text-green-400 hover:text-green-300 font-semibold flex items-center gap-1"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openApprovalModal(r, 'reject')}
                              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-dark-muted italic">Self-action locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ROLE CHANGE REQUESTS LOG TAB */}
        {activeTab === 'requests' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-dark-border/60 text-dark-muted font-medium">
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Requester</th>
                    <th className="py-3 px-4">Target User</th>
                    <th className="py-3 px-4">Requested Shift</th>
                    <th className="py-3 px-4">Initiator Reason</th>
                    <th className="py-3 px-4">Approver &amp; Reason</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-dark-muted">No request documents created yet.</td>
                    </tr>
                  ) : requests.map(r => (
                    <tr key={r._id} className="hover:bg-dark-border/10 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-primary-500">{r._id}</td>
                      <td className="py-3.5 px-4 text-dark-text">{r.requester?.name}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-dark-text">{r.targetUser?.name}</p>
                        <p className="text-xs text-dark-muted">{r.targetUser?.email}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        {r.requestedRole && (
                          <div className="text-xs text-purple-400">Role &rarr; {r.requestedRole}</div>
                        )}
                        {r.requestedStatus && (
                          <div className="text-xs text-orange-400">Status &rarr; {r.requestedStatus}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-dark-muted text-xs max-w-xs break-all" title={r.initiatorReason}>
                        {r.initiatorReason}
                      </td>
                      <td className="py-3.5 px-4 text-dark-muted text-xs max-w-xs break-all">
                        {r.approver ? (
                          <>
                            <p className="font-semibold text-dark-text">By: {r.approver?.name}</p>
                            <p>{r.approverReason}</p>
                          </>
                        ) : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                          r.status === 'approved'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : r.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ROLE AUDIT LOGS TAB */}
        {activeTab === 'role-logs' && (
          <div>
            <div className="flex justify-end gap-3 mb-6">
              <button
                onClick={() => exportExcel(roleLogs, 'RBAC_Role_Audit_Logs')}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Download size={12} /> Excel Report
              </button>
              <button
                onClick={() => {
                  const { headers, rows } = getRolePDFData()
                  exportPDF('Role Audit Logs', headers, rows, 'RBAC_Role_Audit_Logs')
                }}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <FileText size={12} /> PDF Report
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-dark-border/60 text-dark-muted font-medium">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Target User</th>
                    <th className="py-3 px-4">Role Shift</th>
                    <th className="py-3 px-4">Status Shift</th>
                    <th className="py-3 px-4">Initiator Reason</th>
                    <th className="py-3 px-4">Approver Reason</th>
                    <th className="py-3 px-4">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {roleLogs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-dark-muted">No role audit logs found.</td>
                    </tr>
                  ) : roleLogs.map(l => (
                    <tr key={l._id} className="hover:bg-dark-border/10 transition-colors">
                      <td className="py-3 px-4 text-xs text-dark-muted font-mono">
                        {new Date(l.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-dark-text font-medium">{l.actorName}</td>
                      <td className="py-3 px-4 text-dark-text">{l.targetName}</td>
                      <td className="py-3 px-4 text-xs">
                        {l.roleBefore && `${l.roleBefore} \u2192 ${l.roleAfter}`}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {l.statusBefore && `${l.statusBefore} \u2192 ${l.statusAfter}`}
                      </td>
                      <td className="py-3 px-4 text-xs text-dark-muted max-w-xs break-words">{l.initiatorReason}</td>
                      <td className="py-3 px-4 text-xs text-dark-muted max-w-xs break-words">{l.approverReason}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded">
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECURITY AUDITS TAB */}
        {activeTab === 'security-logs' && (
          <div>
            <div className="flex justify-end gap-3 mb-6">
              <button
                onClick={() => exportExcel(securityLogs, 'Security_Audit_Logs')}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Download size={12} /> Excel Report
              </button>
              <button
                onClick={() => {
                  const { headers, rows } = getSecurityPDFData()
                  exportPDF('Security Audit Logs', headers, rows, 'Security_Audit_Logs')
                }}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <FileText size={12} /> PDF Report
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-dark-border/60 text-dark-muted font-medium">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action Event</th>
                    <th className="py-3 px-4">Target User</th>
                    <th className="py-3 px-4">Device / Browser</th>
                    <th className="py-3 px-4">IP Hash</th>
                    <th className="py-3 px-4">Reason / Outcome</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {securityLogs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-dark-muted">No security audit logs found.</td>
                    </tr>
                  ) : securityLogs.map(l => (
                    <tr key={l._id} className="hover:bg-dark-border/10 transition-colors">
                      <td className="py-3 px-4 text-xs text-dark-muted font-mono">
                        {new Date(l.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-dark-text">{l.actorName}</td>
                      <td className="py-3 px-4 font-semibold text-primary-400">{l.action}</td>
                      <td className="py-3 px-4">{l.targetName || '-'}</td>
                      <td className="py-3 px-4 text-xs text-dark-muted">
                        {l.deviceInformation} ({l.browserInformation})
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-dark-muted" title={l.ipHash}>
                        {l.ipHash?.slice(0, 12)}...
                      </td>
                      <td className="py-3 px-4 text-xs text-dark-muted max-w-xs break-words">{l.reason}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          l.status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADMIN ACTIVITY TAB */}
        {activeTab === 'activity-logs' && (
          <div>
            <div className="flex justify-end gap-3 mb-6">
              <button
                onClick={() => exportExcel(activityLogs, 'Admin_Activity_Logs')}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Download size={12} /> Excel Report
              </button>
              <button
                onClick={() => {
                  const { headers, rows } = getActivityPDFData()
                  exportPDF('Admin Activity Logs', headers, rows, 'Admin_Activity_Logs')
                }}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <FileText size={12} /> PDF Report
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-dark-border/60 text-dark-muted font-medium">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Admin Name</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Type</th>
                    <th className="py-3 px-4">Target ID</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">IP Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-dark-muted">No admin activity logs found.</td>
                    </tr>
                  ) : activityLogs.map(l => (
                    <tr key={l._id} className="hover:bg-dark-border/10 transition-colors">
                      <td className="py-3 px-4 text-xs text-dark-muted font-mono">
                        {new Date(l.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-dark-text font-medium">{l.adminName}</td>
                      <td className="py-3 px-4 text-primary-400 font-semibold">{l.action}</td>
                      <td className="py-3 px-4 text-xs capitalize">{l.targetType}</td>
                      <td className="py-3 px-4 text-xs font-mono">{l.targetId || '-'}</td>
                      <td className="py-3 px-4 text-xs text-dark-muted max-w-sm break-words">{l.details}</td>
                      <td className="py-3 px-4 text-xs font-mono text-dark-muted" title={l.ipHash}>
                        {l.ipHash?.slice(0, 10)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GOVERNANCE TAB */}
        {activeTab === 'governance-logs' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-dark-border/60 text-dark-muted font-medium">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Governance Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">IP Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {govLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-dark-muted">No governance logs found.</td>
                    </tr>
                  ) : govLogs.map(l => (
                    <tr key={l._id} className="hover:bg-dark-border/10 transition-colors">
                      <td className="py-3 px-4 text-xs text-dark-muted font-mono">
                        {new Date(l.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-dark-text font-medium">{l.actorName}</td>
                      <td className="py-3 px-4 text-purple-400 font-semibold">{l.action}</td>
                      <td className="py-3 px-4 text-xs text-dark-muted max-w-md break-words">{l.details}</td>
                      <td className="py-3 px-4 text-xs font-mono text-dark-muted" title={l.ipHash}>
                        {l.ipHash?.slice(0, 10)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-dark-border/40 pt-4 mt-6">
            <span className="text-xs text-dark-muted">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="btn-outline py-1 px-3 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                className="btn-outline py-1 px-3 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SENSITIVE ACTION REASON MODAL */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md bg-dark-card border-dark-border p-6 shadow-2xl animate-fade-in relative">
            <h3 className="font-display text-xl font-bold text-dark-text mb-2">
              Mandatory Reason Verification
            </h3>
            <p className="text-xs text-dark-muted mb-4">
              You are performing a sensitive security configuration action on <strong>{selectedUser?.name}</strong>.
            </p>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">
                  Action Detail
                </label>
                <div className="bg-dark-bg/60 p-3 rounded-lg border border-dark-border/40 text-xs text-dark-text capitalize">
                  {actionType?.replace('_', ' ')}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">
                  Initiator Audit Reason (Min 20 characters)
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Provide detailed corporate context or reason for this role/status modifications..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input-field w-full text-sm p-3 bg-dark-bg"
                />
                <div className="flex justify-between items-center text-[10px] text-dark-muted mt-1.5 font-mono">
                  <span>Minimum: 20 · Maximum: 1000</span>
                  <span className={reason.length < 20 ? 'text-red-400 font-bold' : 'text-green-400'}>
                    Length: {reason.length} chars
                  </span>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reason.length < 20}
                  className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
                >
                  Confirm &amp; Execute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DUAL APPROVAL REASON MODAL */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md bg-dark-card border-dark-border p-6 shadow-2xl animate-fade-in relative">
            <h3 className="font-display text-xl font-bold text-dark-text mb-2">
              Review Role Request Approval
            </h3>
            <p className="text-xs text-dark-muted mb-4">
              Provide your approver reason to {approvalAction === 'approve' ? 'approve' : 'reject'} this request.
            </p>

            <div className="bg-dark-bg/60 p-3 rounded-lg border border-dark-border/40 text-xs text-dark-text mb-4 space-y-2">
              <p><strong>Target User:</strong> {selectedRequest?.targetUser?.name}</p>
              <p><strong>Requested shift:</strong> {selectedRequest?.requestedRole ? `Role -> ${selectedRequest.requestedRole}` : ''} {selectedRequest?.requestedStatus ? `Status -> ${selectedRequest.requestedStatus}` : ''}</p>
              <p className="border-t border-dark-border/40 pt-2 text-dark-muted"><strong>Initiator Reason:</strong> "{selectedRequest?.initiatorReason}"</p>
            </div>

            <form onSubmit={handleApprovalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">
                  Approver Reason (Min 20 characters)
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Provide detailed approver verification details..."
                  value={approverReason}
                  onChange={(e) => setApproverReason(e.target.value)}
                  className="input-field w-full text-sm p-3 bg-dark-bg"
                />
                <div className="flex justify-between items-center text-[10px] text-dark-muted mt-1.5 font-mono">
                  <span>Minimum: 20 · Maximum: 1000</span>
                  <span className={approverReason.length < 20 ? 'text-red-400 font-bold' : 'text-green-400'}>
                    Length: {approverReason.length} chars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">
                  Password Confirmation
                </label>
                <input
                  type="password"
                  required
                  placeholder="Verify your account password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field w-full text-sm p-3 bg-dark-bg"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approverReason.length < 20 || !password}
                  className={`btn-primary text-xs px-4 py-2 disabled:opacity-50 ${
                    approvalAction === 'reject' ? 'bg-red-600 hover:bg-red-500' : ''
                  }`}
                >
                  {approvalAction === 'approve' ? 'Approve Request' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
