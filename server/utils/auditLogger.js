import crypto from 'crypto';
import RoleAuditLogs from '../models/roleAuditLogsModel.js';
import SecurityAuditLogs from '../models/securityAuditLogsModel.js';
import AdminActivityLogs from '../models/adminActivityLogsModel.js';
import GovernanceLogs from '../models/governanceLogsModel.js';

// Helper to get client IP hash
export const getIpHash = (req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  let cleanIp = ip;
  if (ip.includes(',')) {
    cleanIp = ip.split(',')[0].trim();
  }
  return crypto.createHash('sha256').update(cleanIp).digest('hex');
};

// Helper to get device and browser info from user-agent
export const getClientInfo = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  
  let browser = 'Unknown Browser';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) browser = 'Internet Explorer';

  let device = 'Unknown Device';
  if (userAgent.includes('Mobi')) device = 'Mobile';
  else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) device = 'Tablet';
  else if (userAgent.includes('Windows')) device = 'Windows PC';
  else if (userAgent.includes('Macintosh')) device = 'Mac';
  else if (userAgent.includes('Linux')) device = 'Linux PC';

  return { device, browser };
};

export const logRoleChange = async (req, {
  actor,
  target,
  roleBefore,
  roleAfter,
  statusBefore,
  statusAfter,
  initiatorReason,
  approverReason,
  requestId,
  approvalId,
  status
}) => {
  try {
    const { device, browser } = getClientInfo(req);
    const ipHash = getIpHash(req);

    return await RoleAuditLogs.create({
      actor: actor._id,
      actorName: actor.name,
      target: target._id,
      targetName: target.name,
      roleBefore,
      roleAfter,
      statusBefore,
      statusAfter,
      initiatorReason,
      approverReason,
      requestId,
      approvalId,
      deviceInformation: device,
      browserInformation: browser,
      ipHash,
      status,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to log role change audit:', err.message);
  }
};

export const logSecurityEvent = async (req, {
  actorId,
  actorName,
  targetId,
  targetName,
  action,
  status,
  reason
}) => {
  try {
    const { device, browser } = getClientInfo(req);
    const ipHash = getIpHash(req);

    return await SecurityAuditLogs.create({
      actor: actorId || null,
      actorName: actorName || 'System/Guest',
      target: targetId || null,
      targetName: targetName || '',
      action,
      deviceInformation: device,
      browserInformation: browser,
      ipHash,
      status,
      reason,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to log security event audit:', err.message);
  }
};

export const logAdminActivity = async (req, {
  action,
  targetType,
  targetId,
  details
}) => {
  try {
    const { device, browser } = getClientInfo(req);
    const ipHash = getIpHash(req);

    return await AdminActivityLogs.create({
      admin: req.user._id,
      adminName: req.user.name,
      action,
      targetType,
      targetId,
      details,
      deviceInformation: device,
      browserInformation: browser,
      ipHash,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to log admin activity audit:', err.message);
  }
};

export const logGovernanceEvent = async (req, {
  action,
  details,
  reason
}) => {
  try {
    const { device, browser } = getClientInfo(req);
    const ipHash = getIpHash(req);

    return await GovernanceLogs.create({
      actor: req.user._id,
      actorName: req.user.name,
      action,
      details,
      reason,
      deviceInformation: device,
      browserInformation: browser,
      ipHash,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to log governance event audit:', err.message);
  }
};
