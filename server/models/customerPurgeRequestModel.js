import mongoose from 'mongoose';

const customerPurgeRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true, index: true },
  targetCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  initiatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  initiatorReason: { type: String, required: true },
  approverReason: { type: String },
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

// Explicitly bind to the "CustomerPurgeRequests" collection
export default mongoose.model('CustomerPurgeRequest', customerPurgeRequestSchema, 'CustomerPurgeRequests');
