import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/userModel.js';
import GovernanceRequest from '../models/governanceRequestsModel.js';
import RoleAuditLogs from '../models/roleAuditLogsModel.js';
import SecurityAuditLogs from '../models/securityAuditLogsModel.js';
import AdminActivityLogs from '../models/adminActivityLogsModel.js';
import GovernanceLogs from '../models/governanceLogsModel.js';
import CustomerPurgeRequest from '../models/customerPurgeRequestModel.js';
import CustomerPurgeAuditLog from '../models/customerPurgeAuditLogModel.js';
import CustomerGovernanceLog from '../models/customerGovernanceLogModel.js';
import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import { protect, superAdminOnly } from '../middleware/authMiddleware.js';
import {
  logRoleChange,
  logGovernanceEvent,
  logSecurityEvent,
  getIpHash,
  getClientInfo
} from '../utils/auditLogger.js';

const router = express.Router();

// 1. PUBLIC BOOTSTRAP (Requires protect but not superAdminOnly yet, as there are 0 super admins)
router.post('/bootstrap', protect, async (req, res) => {
  try {
    const superAdminCount = await User.countDocuments({ role: 'super_admin' });
    if (superAdminCount > 0) {
      return res.status(403).json({ message: 'Bootstrapping is disabled. A Super Admin already exists.' });
    }

    const { reason } = req.body;
    if (!reason || reason.trim().length < 20 || reason.trim().length > 1000) {
      return res.status(400).json({ message: 'A valid reason of 20 to 1000 characters is mandatory.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const roleBefore = user.role;
    user.role = 'super_admin';
    await user.save();

    const ipHash = getIpHash(req);
    const { device, browser } = getClientInfo(req);
    const requestId = uuidv4();

    await GovernanceRequest.create({
      requestId,
      actionType: 'bootstrap_super_admin',
      initiatorId: user._id,
      targetUserId: user._id,
      approverId: user._id,
      initiatorReason: reason.trim(),
      approverReason: 'System Bootstrap Initialization',
      status: 'approved',
      approvedAt: new Date(),
      ipHash,
      deviceInfo: device,
      browserInfo: browser
    });

    await logRoleChange(req, {
      actor: user,
      target: user,
      roleBefore,
      roleAfter: 'super_admin',
      statusBefore: user.status,
      statusAfter: user.status,
      initiatorReason: reason.trim(),
      approverReason: 'System Bootstrap Initialization',
      requestId,
      status: 'success'
    });

    await logSecurityEvent(req, {
      actorId: user._id,
      actorName: user.name,
      action: 'BOOTSTRAP_SUPER_ADMIN',
      status: 'success',
      reason: 'Bootstrapped first Super Admin'
    });

    res.json({ message: 'Successfully promoted to Super Admin', role: 'super_admin' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check if system needs bootstrapping
router.get('/check-bootstrap', protect, async (req, res) => {
  try {
    const superAdminCount = await User.countDocuments({ role: 'super_admin' });
    res.json({ needsBootstrap: superAdminCount === 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Apply protect & superAdminOnly guard for all other governance routes
router.use(protect, superAdminOnly);

// 2. GET /users - list all users (excluding password)
router.get('/users', async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -refreshTokens')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    await logGovernanceEvent(req, {
      action: 'VIEW_USER_LIST',
      details: `Queried user list with filters: ${JSON.stringify(req.query)}`
    });

    res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. POST /requests - submit role/status/delete change request
router.post('/requests', async (req, res) => {
  try {
    const { targetUserId, requestedRole, requestedStatus, initiatorReason, actionType: bodyActionType } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required.' });
    }

    if (!initiatorReason || initiatorReason.trim().length < 20 || initiatorReason.trim().length > 1000) {
      return res.status(400).json({ message: 'Initiator reason must be between 20 and 1000 characters.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found.' });
    }

    // Role and status parameters validation
    const targetRole = requestedRole || targetUser.role;
    const targetStatus = requestedStatus || targetUser.status;

    if (requestedRole && !['customer', 'admin', 'super_admin'].includes(requestedRole)) {
      return res.status(400).json({ message: 'Invalid requested role.' });
    }

    if (requestedStatus && !['active', 'disabled'].includes(requestedStatus)) {
      return res.status(400).json({ message: 'Invalid requested status.' });
    }

    // Determine Action Type
    let actionType = bodyActionType;
    const isTargetSuperAdmin = targetUser.role === 'super_admin';

    if (!actionType) {
      if (requestedRole) {
        if (isTargetSuperAdmin && requestedRole !== 'super_admin') {
          actionType = 'demote_super_admin';
        } else {
          actionType = requestedRole === 'super_admin' ? 'promote_to_super_admin' : (requestedRole === 'admin' ? 'promote_to_admin' : 'demote_to_customer');
        }
      } else if (requestedStatus) {
        if (isTargetSuperAdmin && requestedStatus === 'disabled') {
          actionType = 'disable_super_admin';
        } else {
          actionType = requestedStatus === 'disabled' ? 'disable_user' : 'enable_user';
        }
      }
    }

    if (!actionType) {
      return res.status(400).json({ message: 'No role, status, or delete action was requested.' });
    }

    // Check Last Super Admin Protection
    const isTargetActive = targetUser.status === 'active';
    const isDestructiveAction = isTargetSuperAdmin && ['demote_super_admin', 'disable_super_admin', 'delete_super_admin'].includes(actionType);

    if (isDestructiveAction) {
      const activeSuperAdminCount = await User.countDocuments({ role: 'super_admin', status: 'active' });
      if (isTargetActive && activeSuperAdminCount <= 1) {
        return res.status(400).json({
          message: 'Destructive action blocked: Target is the last active Super Admin. At least one active Super Admin must always exist.'
        });
      }
    }

    // Determine if request requires Dual-Approval
    const requiresDualApproval = isTargetSuperAdmin && ['demote_super_admin', 'disable_super_admin', 'delete_super_admin', 'modify_super_admin_permissions'].includes(actionType);

    const ipHash = getIpHash(req);
    const { device, browser } = getClientInfo(req);
    const requestId = uuidv4();

    if (requiresDualApproval) {
      // Create request in pending state
      const request = await GovernanceRequest.create({
        requestId,
        actionType,
        initiatorId: req.user._id,
        targetUserId: targetUser._id,
        initiatorReason: initiatorReason.trim(),
        requestedRole: requestedRole || undefined,
        requestedStatus: requestedStatus || undefined,
        status: 'pending',
        ipHash,
        deviceInfo: device,
        browserInfo: browser
      });

      await logGovernanceEvent(req, {
        action: 'SUBMIT_DUAL_APPROVAL_REQUEST',
        details: `Submitted pending request #${request.requestId} to ${actionType.replace(/_/g, ' ')} on Super Admin ${targetUser.name}`,
        reason: initiatorReason.trim()
      });

      return res.status(201).json({
        message: 'Request submitted. Dual-approval is required. A second Super Admin must approve this action.',
        request,
        requiresApproval: true
      });
    } else {
      // Execute immediately (non-destructive or promotion action)
      const roleBefore = targetUser.role;
      const statusBefore = targetUser.status;

      if (actionType === 'delete_super_admin') {
        // Safe check: if we somehow reach here without dual approval targeting a Super Admin
        if (isTargetSuperAdmin) {
          return res.status(400).json({ message: 'Delete Super Admin requires dual approval.' });
        }
        await User.deleteOne({ _id: targetUser._id });
      } else {
        if (requestedRole) targetUser.role = requestedRole;
        if (requestedStatus) targetUser.status = requestedStatus;
        await targetUser.save();
      }

      const request = await GovernanceRequest.create({
        requestId,
        actionType,
        initiatorId: req.user._id,
        targetUserId: targetUser._id,
        approverId: req.user._id,
        initiatorReason: initiatorReason.trim(),
        approverReason: 'Auto-Approved (Direct Action)',
        requestedRole: requestedRole || undefined,
        requestedStatus: requestedStatus || undefined,
        status: 'approved',
        approvedAt: new Date(),
        ipHash,
        deviceInfo: device,
        browserInfo: browser
      });

      await logRoleChange(req, {
        actor: req.user,
        target: targetUser,
        roleBefore,
        roleAfter: actionType === 'delete_super_admin' ? 'deleted' : targetUser.role,
        statusBefore,
        statusAfter: actionType === 'delete_super_admin' ? 'deleted' : targetUser.status,
        initiatorReason: initiatorReason.trim(),
        approverReason: 'Auto-Approved (Direct Action)',
        requestId: request.requestId,
        status: 'success'
      });

      return res.json({
        message: 'Action completed and logged successfully.',
        user: { _id: targetUser._id, role: targetUser.role, status: targetUser.status },
        requiresApproval: false
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. GET /requests - list requests
router.get('/requests', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await GovernanceRequest.countDocuments(query);
    const requests = await GovernanceRequest.find(query)
      .populate('initiatorId', 'name email')
      .populate('targetUserId', 'name email role status')
      .populate('approverId', 'name email')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    // Populate compatibility fields for frontend UI
    const mappedRequests = requests.map(r => {
      const obj = r.toObject();
      obj.requester = obj.initiatorId;
      obj.targetUser = obj.targetUserId;
      obj.approver = obj.approverId;
      return obj;
    });

    res.json({ requests: mappedRequests, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. POST /requests/approve/:id - approve request (Dual approval & Password validation)
router.post('/requests/approve/:id', async (req, res) => {
  try {
    const { approverReason, password } = req.body;

    if (!approverReason || approverReason.trim().length < 20 || approverReason.trim().length > 1000) {
      return res.status(400).json({ message: 'Approver reason must be between 20 and 1000 characters.' });
    }

    if (!password) {
      return res.status(400).json({ message: 'Password confirmation is required for identity verification.' });
    }

    const request = await GovernanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Cannot approve request with status: ${request.status}` });
    }

    // 1. Password Reconfirmation check
    const userWithPassword = await User.findById(req.user._id).select('+password');
    const isPasswordValid = await userWithPassword.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Identity verification failed: Invalid password.' });
    }

    // 2. Strict Eligibility Rules check
    if (req.user.role !== 'super_admin' || req.user.status !== 'active') {
      return res.status(403).json({ message: 'Approval blocked: Approver must be an active Super Admin.' });
    }

    if (request.initiatorId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Approval blocked: Initiator cannot approve their own request.' });
    }

    if (request.targetUserId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Approval blocked: Target cannot approve requests acting on themselves.' });
    }

    const targetUser = await User.findById(request.targetUserId);
    if (!targetUser) return res.status(404).json({ message: 'Target user no longer exists.' });

    // 3. Double check Last Super Admin Protection
    const isTargetSuperAdmin = targetUser.role === 'super_admin';
    const isTargetActive = targetUser.status === 'active';
    const isDestructiveAction = isTargetSuperAdmin && ['demote_super_admin', 'disable_super_admin', 'delete_super_admin'].includes(request.actionType);

    if (isDestructiveAction) {
      const activeSuperAdminCount = await User.countDocuments({ role: 'super_admin', status: 'active' });
      if (isTargetActive && activeSuperAdminCount <= 1) {
        // Auto reject request in DB due to protection trigger
        request.status = 'rejected';
        request.approverId = req.user._id;
        request.approverReason = 'System Auto-Reject: Last Super Admin Protection triggered during approval phase.';
        request.rejectedAt = new Date();
        await request.save();

        return res.status(400).json({
          message: 'Approval rejected: Target is the last active Super Admin. There must always be at least one active Super Admin.'
        });
      }
    }

    // Execute the changes
    const roleBefore = targetUser.role;
    const statusBefore = targetUser.status;

    if (request.actionType === 'delete_super_admin') {
      await User.deleteOne({ _id: targetUser._id });
    } else {
      if (request.requestedRole) targetUser.role = request.requestedRole;
      if (request.requestedStatus) targetUser.status = request.requestedStatus;
      await targetUser.save();
    }

    // Update request state
    request.status = 'approved';
    request.approverId = req.user._id;
    request.approverReason = approverReason.trim();
    request.approvedAt = new Date();
    await request.save();

    // Audit Log Role Change
    await logRoleChange(req, {
      actor: await User.findById(request.initiatorId),
      target: targetUser,
      roleBefore,
      roleAfter: request.actionType === 'delete_super_admin' ? 'deleted' : targetUser.role,
      statusBefore,
      statusAfter: request.actionType === 'delete_super_admin' ? 'deleted' : targetUser.status,
      initiatorReason: request.initiatorReason,
      approverReason: approverReason.trim(),
      requestId: request.requestId,
      status: 'success'
    });

    res.json({ message: 'Request approved and role/status updated successfully.', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. POST /requests/reject/:id - reject request (Requires Password validation)
router.post('/requests/reject/:id', async (req, res) => {
  try {
    const { approverReason, password } = req.body;

    if (!approverReason || approverReason.trim().length < 20 || approverReason.trim().length > 1000) {
      return res.status(400).json({ message: 'Approver reason for rejection must be between 20 and 1000 characters.' });
    }

    if (!password) {
      return res.status(400).json({ message: 'Password confirmation is required for identity verification.' });
    }

    const request = await GovernanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Cannot reject request with status: ${request.status}` });
    }

    // 1. Password Reconfirmation check
    const userWithPassword = await User.findById(req.user._id).select('+password');
    const isPasswordValid = await userWithPassword.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Identity verification failed: Invalid password.' });
    }

    // 2. Strict Eligibility Rules check
    if (req.user.role !== 'super_admin' || req.user.status !== 'active') {
      return res.status(403).json({ message: 'Rejection blocked: Approver must be an active Super Admin.' });
    }

    if (request.initiatorId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Rejection blocked: Initiator cannot reject their own request.' });
    }

    if (request.targetUserId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Rejection blocked: Target cannot reject requests acting on themselves.' });
    }

    // Update request state
    request.status = 'rejected';
    request.approverId = req.user._id;
    request.approverReason = approverReason.trim();
    request.rejectedAt = new Date();
    await request.save();

    res.json({ message: 'Request rejected successfully.', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 7. GET /logs/role - fetch role audit logs
router.get('/logs/role', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const total = await RoleAuditLogs.countDocuments();
    const logs = await RoleAuditLogs.find()
      .skip(skip)
      .limit(Number(limit))
      .sort({ timestamp: -1 });

    await logGovernanceEvent(req, {
      action: 'VIEW_ROLE_AUDIT_LOGS',
      details: `Viewed page ${page} of role audit logs`
    });

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 8. GET /logs/security - fetch security logs
router.get('/logs/security', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const total = await SecurityAuditLogs.countDocuments();
    const logs = await SecurityAuditLogs.find()
      .skip(skip)
      .limit(Number(limit))
      .sort({ timestamp: -1 });

    await logGovernanceEvent(req, {
      action: 'VIEW_SECURITY_LOGS',
      details: `Viewed page ${page} of security audit logs`
    });

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 9. GET /logs/activity - fetch admin activity logs
router.get('/logs/activity', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const total = await AdminActivityLogs.countDocuments();
    const logs = await AdminActivityLogs.find()
      .skip(skip)
      .limit(Number(limit))
      .sort({ timestamp: -1 });

    await logGovernanceEvent(req, {
      action: 'VIEW_ADMIN_ACTIVITY_LOGS',
      details: `Viewed page ${page} of admin activity logs`
    });

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 10. GET /logs/governance - fetch governance logs
router.get('/logs/governance', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const total = await GovernanceLogs.countDocuments();
    const logs = await GovernanceLogs.find()
      .skip(skip)
      .limit(Number(limit))
      .sort({ timestamp: -1 });

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// CUSTOMER GOVERNANCE & DATA PURGE WORKFLOWS
// ==========================================

// Helper to log customer governance audit events
const logCustomerGovernanceEvent = async (req, { targetCustomer, actionType, reason, details }) => {
  try {
    const ipHash = getIpHash(req);
    const { device, browser } = getClientInfo(req);
    return await CustomerGovernanceLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      targetCustomerId: targetCustomer._id,
      targetCustomerName: targetCustomer.name,
      actionType,
      reason: reason.trim(),
      details,
      ipHash,
      deviceInfo: device,
      browserInfo: browser
    });
  } catch (err) {
    console.error('Failed to log customer governance audit:', err.message);
  }
};

// 11. POST /customer/disable - Level 1: Disable Customer Account
router.post('/customer/disable', async (req, res) => {
  try {
    const { targetCustomerId, initiatorReason } = req.body;

    if (!targetCustomerId) {
      return res.status(400).json({ message: 'Target customer ID is required.' });
    }

    if (!initiatorReason || initiatorReason.trim().length < 20 || initiatorReason.trim().length > 1000) {
      return res.status(400).json({ message: 'Initiator reason must be between 20 and 1000 characters.' });
    }

    const customer = await User.findById(targetCustomerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    if (customer.role === 'super_admin') {
      return res.status(400).json({ message: 'Cannot perform customer governance actions on a Super Admin.' });
    }

    customer.status = 'disabled';
    await customer.save();

    await logCustomerGovernanceEvent(req, {
      targetCustomer: customer,
      actionType: 'disable_customer',
      reason: initiatorReason,
      details: `Disabled customer account: ${customer.email}.`
    });

    res.json({ message: 'Customer account disabled successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 12. POST /customer/soft-delete - Level 2: Soft Delete Customer Account (anonymize personal fields)
router.post('/customer/soft-delete', async (req, res) => {
  try {
    const { targetCustomerId, initiatorReason } = req.body;

    if (!targetCustomerId) {
      return res.status(400).json({ message: 'Target customer ID is required.' });
    }

    if (!initiatorReason || initiatorReason.trim().length < 20 || initiatorReason.trim().length > 1000) {
      return res.status(400).json({ message: 'Initiator reason must be between 20 and 1000 characters.' });
    }

    const customer = await User.findById(targetCustomerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    if (customer.role === 'super_admin') {
      return res.status(400).json({ message: 'Cannot perform customer governance actions on a Super Admin.' });
    }

    // Level 2 Soft Delete: Anonymize personal fields and disable login
    const originalEmail = customer.email;
    customer.name = 'Anonymized Customer';
    customer.email = `anonymized_${customer._id}@autocraft.internal`;
    customer.phone = '';
    customer.addresses = [];
    customer.wishlist = [];
    customer.avatar = '';
    customer.status = 'disabled';
    customer.refreshTokens = [];
    await customer.save();

    await logCustomerGovernanceEvent(req, {
      targetCustomer: customer,
      actionType: 'soft_delete_customer',
      reason: initiatorReason,
      details: `Soft deleted and anonymized customer account. Original email was ${originalEmail}.`
    });

    res.json({ message: 'Customer account soft deleted and anonymized successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 13. POST /customer/purge/initiate - Level 3: Request Permanent Purge
router.post('/customer/purge/initiate', async (req, res) => {
  try {
    const { targetCustomerId, initiatorReason } = req.body;

    if (!targetCustomerId) {
      return res.status(400).json({ message: 'Target customer ID is required.' });
    }

    if (!initiatorReason || initiatorReason.trim().length < 20 || initiatorReason.trim().length > 1000) {
      return res.status(400).json({ message: 'Initiator reason must be between 20 and 1000 characters.' });
    }

    const customer = await User.findById(targetCustomerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    if (customer.role === 'super_admin') {
      return res.status(400).json({ message: 'Cannot perform customer governance actions on a Super Admin.' });
    }

    // Check if a pending purge request already exists for this customer
    const existingRequest = await CustomerPurgeRequest.findOne({
      targetCustomerId: customer._id,
      status: 'pending'
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'A pending purge request already exists for this customer.' });
    }

    const ipHash = getIpHash(req);
    const { device, browser } = getClientInfo(req);
    const requestId = uuidv4();

    const request = await CustomerPurgeRequest.create({
      requestId,
      targetCustomerId: customer._id,
      initiatorId: req.user._id,
      initiatorReason: initiatorReason.trim(),
      status: 'pending',
      ipHash,
      deviceInfo: device,
      browserInfo: browser
    });

    await logCustomerGovernanceEvent(req, {
      targetCustomer: customer,
      actionType: 'initiate_purge_customer',
      reason: initiatorReason,
      details: `Initiated permanent purge request #${requestId} for customer ${customer.name}.`
    });

    res.status(201).json({
      message: 'Permanent purge request created. Dual approval is required.',
      request
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 14. GET /customer/stats/:id - Get customer statistics for confirmation screen
router.get('/customer/stats/:id', async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    const accountAgeDays = Math.floor((Date.now() - customer.createdAt) / (1000 * 60 * 60 * 24));
    
    // Order Count & Spending
    const orderCount = await Order.countDocuments({ user: customer._id });
    const paidOrders = await Order.find({ user: customer._id, isPaid: true });
    const totalSpending = paidOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    // Saved Addresses Count
    const addressesCount = customer.addresses ? customer.addresses.length : 0;

    // Review Count
    const products = await Product.find({ 'reviews.user': customer._id });
    let reviewCount = 0;
    products.forEach(p => {
      p.reviews.forEach(r => {
        if (r.user.toString() === customer._id.toString()) {
          reviewCount++;
        }
      });
    });

    // Wishlist Count
    const wishlistCount = customer.wishlist ? customer.wishlist.length : 0;

    res.json({
      name: customer.name,
      email: customer.email,
      accountAgeDays,
      orderCount,
      totalSpending,
      addressesCount,
      reviewCount,
      wishlistCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 15. GET /customer/purge/requests - Get all customer purge requests
router.get('/customer/purge/requests', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await CustomerPurgeRequest.countDocuments(query);
    const requests = await CustomerPurgeRequest.find(query)
      .populate('initiatorId', 'name email')
      .populate('targetCustomerId', 'name email role status')
      .populate('approverId', 'name email')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json({ requests, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 16. POST /customer/purge/approve/:id - Approve and execute Level 3 Purge
router.post('/customer/purge/approve/:id', async (req, res) => {
  try {
    const { approverReason, password, confirmationText } = req.body;

    if (!approverReason || approverReason.trim().length < 20 || approverReason.trim().length > 1000) {
      return res.status(400).json({ message: 'Approver reason must be between 20 and 1000 characters.' });
    }

    if (!password) {
      return res.status(400).json({ message: 'Password confirmation is required.' });
    }

    if (confirmationText !== 'DELETE CUSTOMER DATA') {
      return res.status(400).json({ message: 'Confirmation text must match "DELETE CUSTOMER DATA" exactly.' });
    }

    const request = await CustomerPurgeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Purge request not found.' });

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Cannot approve request with status: ${request.status}` });
    }

    // 1. Password Reconfirmation check
    const userWithPassword = await User.findById(req.user._id).select('+password');
    const isPasswordValid = await userWithPassword.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Identity verification failed: Invalid password.' });
    }

    // 2. Strict Eligibility Rules check
    if (req.user.role !== 'super_admin' || req.user.status !== 'active') {
      return res.status(403).json({ message: 'Approval blocked: Approver must be an active Super Admin.' });
    }

    if (request.initiatorId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Approval blocked: Initiator cannot approve their own request.' });
    }

    const customer = await User.findById(request.targetCustomerId);
    if (!customer) return res.status(404).json({ message: 'Target customer no longer exists.' });

    // Execute Permanent Purge Workflow securely
    const originalEmail = customer.email;
    const originalName = customer.name;

    // A. Update target User document: Strip all personal details
    customer.name = 'Deleted Customer';
    customer.email = `purged_${customer._id}@autocraft.internal`;
    customer.phone = '';
    customer.addresses = [];
    customer.wishlist = [];
    customer.avatar = '';
    customer.googleId = undefined;
    customer.password = undefined;
    customer.refreshTokens = [];
    customer.isVerified = false;
    customer.status = 'disabled';
    await customer.save();

    // B. Update reviews inside Product models (anonymize)
    await Product.updateMany(
      { 'reviews.user': customer._id },
      { $set: { 'reviews.$[elem].name': 'Deleted Customer' } },
      { arrayFilters: [{ 'elem.user': customer._id }] }
    );

    // C. Remove user from any back-in-stock Product waitlists (notifyList)
    await Product.updateMany(
      { 'notifyList.user': customer._id },
      { $pull: { notifyList: { user: customer._id } } }
    );

    // D. Update shipping address in customer Orders (anonymize)
    await Order.updateMany(
      { user: customer._id },
      {
        $set: {
          'shippingAddress.name': 'Anonymized Customer',
          'shippingAddress.phone': '0000000000',
          'shippingAddress.street': 'Anonymized Address',
          'shippingAddress.city': 'Anonymized City',
          'shippingAddress.state': 'Anonymized State',
          'shippingAddress.pincode': '000000'
        }
      }
    );

    // E. Save permanent Purge Audit Log
    const ipHash = getIpHash(req);
    const { device, browser } = getClientInfo(req);

    await CustomerPurgeAuditLog.create({
      requestId: request.requestId,
      targetCustomerId: customer._id,
      initiatorId: request.initiatorId,
      approverId: req.user._id,
      initiatorReason: request.initiatorReason,
      approverReason: approverReason.trim(),
      executionTimestamp: new Date(),
      status: 'success',
      ipHash,
      deviceInfo: device,
      browserInfo: browser
    });

    // F. Update request state
    request.status = 'approved';
    request.approverId = req.user._id;
    request.approverReason = approverReason.trim();
    request.approvedAt = new Date();
    await request.save();

    await logCustomerGovernanceEvent(req, {
      targetCustomer: customer,
      actionType: 'approve_purge_customer',
      reason: approverReason,
      details: `Approved and executed customer data purge for ID ${customer._id}.`
    });

    res.json({ message: 'Customer data purged successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 17. POST /customer/purge/reject/:id - Reject Level 3 Purge
router.post('/customer/purge/reject/:id', async (req, res) => {
  try {
    const { approverReason, password } = req.body;

    if (!approverReason || approverReason.trim().length < 20 || approverReason.trim().length > 1000) {
      return res.status(400).json({ message: 'Approver reason must be between 20 and 1000 characters.' });
    }

    if (!password) {
      return res.status(400).json({ message: 'Password confirmation is required.' });
    }

    const request = await CustomerPurgeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Purge request not found.' });

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Cannot reject request with status: ${request.status}` });
    }

    // 1. Password Reconfirmation check
    const userWithPassword = await User.findById(req.user._id).select('+password');
    const isPasswordValid = await userWithPassword.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Identity verification failed: Invalid password.' });
    }

    // 2. Strict Eligibility Rules check
    if (req.user.role !== 'super_admin' || req.user.status !== 'active') {
      return res.status(403).json({ message: 'Rejection blocked: Approver must be an active Super Admin.' });
    }

    if (request.initiatorId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Rejection blocked: Initiator cannot reject their own request.' });
    }

    const customer = await User.findById(request.targetCustomerId);
    if (!customer) return res.status(404).json({ message: 'Customer no longer exists.' });

    // Update request state
    request.status = 'rejected';
    request.approverId = req.user._id;
    request.approverReason = approverReason.trim();
    request.rejectedAt = new Date();
    await request.save();

    await logCustomerGovernanceEvent(req, {
      targetCustomer: customer,
      actionType: 'reject_purge_customer',
      reason: approverReason,
      details: `Rejected customer data purge for ID ${customer._id}.`
    });

    res.json({ message: 'Purge request rejected successfully.', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 18. GET /customer/logs - Fetch customer governance logs
router.get('/customer/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const total = await CustomerGovernanceLog.countDocuments();
    const logs = await CustomerGovernanceLog.find()
      .skip(skip)
      .limit(Number(limit))
      .sort({ timestamp: -1 });

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 19. GET /customer/purge/audit-logs - Fetch purge audit logs
router.get('/customer/purge/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const total = await CustomerPurgeAuditLog.countDocuments();
    const logs = await CustomerPurgeAuditLog.find()
      .skip(skip)
      .limit(Number(limit))
      .sort({ executionTimestamp: -1 });

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
