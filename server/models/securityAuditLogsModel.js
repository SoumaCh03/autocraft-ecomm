import mongoose from 'mongoose';

const securityAuditLogsSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, default: 'System/Guest' },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetName: String,
  action: { type: String, required: true },
  deviceInformation: String,
  browserInformation: String,
  ipHash: String,
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  reason: String,
  timestamp: { type: Date, default: Date.now }
});

securityAuditLogsSchema.index({ actor: 1 });
securityAuditLogsSchema.index({ action: 1 });
securityAuditLogsSchema.index({ timestamp: -1 });

export default mongoose.model('SecurityAuditLogs', securityAuditLogsSchema);
