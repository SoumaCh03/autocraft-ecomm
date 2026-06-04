import mongoose from 'mongoose';

const roleChangeRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedRole: { type: String, enum: ['customer', 'admin', 'super_admin'] },
  requestedStatus: { type: String, enum: ['active', 'disabled'] },
  initiatorReason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approverReason: { type: String },
  resolvedAt: Date
}, { timestamps: true });

roleChangeRequestSchema.index({ requester: 1 });
roleChangeRequestSchema.index({ targetUser: 1 });
roleChangeRequestSchema.index({ status: 1 });
roleChangeRequestSchema.index({ createdAt: -1 });

export default mongoose.model('RoleChangeRequest', roleChangeRequestSchema);
