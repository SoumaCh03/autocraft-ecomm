import mongoose from 'mongoose';

const customerPurgeAuditLogSchema = new mongoose.Schema({
  requestId: { type: String, required: true, index: true },
  targetCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  initiatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  initiatorReason: { type: String, required: true },
  approverReason: { type: String, required: true },
  executionTimestamp: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['success', 'failed'], required: true },
  ipHash: { type: String },
  deviceInfo: { type: String },
  browserInfo: { type: String }
});

// Explicitly bind to the "CustomerPurgeAuditLogs" collection
export default mongoose.model('CustomerPurgeAuditLog', customerPurgeAuditLogSchema, 'CustomerPurgeAuditLogs');
