import mongoose from 'mongoose';

const governanceLogsSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorName: { type: String, required: true },
  action: { type: String, required: true },
  details: String,
  reason: String,
  deviceInformation: String,
  browserInformation: String,
  ipHash: String,
  timestamp: { type: Date, default: Date.now }
});

governanceLogsSchema.index({ actor: 1 });
governanceLogsSchema.index({ timestamp: -1 });

export default mongoose.model('GovernanceLogs', governanceLogsSchema);
