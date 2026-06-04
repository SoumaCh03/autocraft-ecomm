import mongoose from 'mongoose';

const adminActivityLogsSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminName: { type: String, required: true },
  action: { type: String, required: true },
  targetType: String,
  targetId: String,
  details: String,
  deviceInformation: String,
  browserInformation: String,
  ipHash: String,
  timestamp: { type: Date, default: Date.now }
});

adminActivityLogsSchema.index({ admin: 1 });
adminActivityLogsSchema.index({ action: 1 });
adminActivityLogsSchema.index({ timestamp: -1 });

export default mongoose.model('AdminActivityLogs', adminActivityLogsSchema);
