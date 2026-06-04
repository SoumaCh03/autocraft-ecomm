import mongoose from 'mongoose';

const roleAuditLogsSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorName: { type: String, required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetName: { type: String, required: true },
  roleBefore: String,
  roleAfter: String,
  statusBefore: String,
  statusAfter: String,
  initiatorReason: String,
  approverReason: String,
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoleChangeRequest' },
  approvalId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoleApproval' },
  deviceInformation: String,
  browserInformation: String,
  ipHash: String,
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  timestamp: { type: Date, default: Date.now }
});

roleAuditLogsSchema.index({ actor: 1 });
roleAuditLogsSchema.index({ target: 1 });
roleAuditLogsSchema.index({ timestamp: -1 });

export default mongoose.model('RoleAuditLogs', roleAuditLogsSchema);
