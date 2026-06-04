import mongoose from 'mongoose';

const governanceRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true, index: true },
  actionType: {
    type: String,
    required: true,
    enum: [
      'demote_super_admin',
      'disable_super_admin',
      'delete_super_admin',
      'modify_super_admin_permissions',
      'promote_to_admin',
      'promote_to_super_admin',
      'demote_to_customer',
      'demote_to_admin',
      'disable_user',
      'enable_user',
      'bootstrap_super_admin'
    ]
  },
  initiatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  initiatorReason: { type: String, required: true },
  approverReason: { type: String },
  requestedRole: { type: String, enum: ['customer', 'admin', 'super_admin'] },
  requestedStatus: { type: String, enum: ['active', 'disabled'] },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  createdAt: { type: Date, default: Date.now, index: true },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  ipHash: { type: String },
  deviceInfo: { type: String },
  browserInfo: { type: String }
});

// Explicitly bind to the "GovernanceRequests" collection
export default mongoose.model('GovernanceRequest', governanceRequestSchema, 'GovernanceRequests');
