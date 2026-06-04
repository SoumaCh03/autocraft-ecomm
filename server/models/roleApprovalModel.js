import mongoose from 'mongoose';

const roleApprovalSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'RoleChangeRequest', required: true },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  decision: { type: String, enum: ['approved', 'rejected'], required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

roleApprovalSchema.index({ request: 1 });
roleApprovalSchema.index({ approver: 1 });

export default mongoose.model('RoleApproval', roleApprovalSchema);
