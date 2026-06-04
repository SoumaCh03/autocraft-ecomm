import mongoose from 'mongoose';

const customerGovernanceLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorName: { type: String, required: true },
  targetCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetCustomerName: { type: String, required: true },
  actionType: {
    type: String,
    enum: [
      'disable_customer',
      'soft_delete_customer',
      'initiate_purge_customer',
      'approve_purge_customer',
      'reject_purge_customer'
    ],
    required: true,
    index: true
  },
  details: { type: String },
  reason: { type: String },
  ipHash: { type: String },
  deviceInfo: { type: String },
  browserInfo: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
});

// Explicitly bind to the "CustomerGovernanceLogs" collection
export default mongoose.model('CustomerGovernanceLog', customerGovernanceLogSchema, 'CustomerGovernanceLogs');
