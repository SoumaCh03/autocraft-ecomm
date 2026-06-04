import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 6, select: false },
  phone:    { type: String, trim: true },
  role:     { type: String, enum: ['customer', 'admin', 'super_admin'], default: 'customer' },
  status:   { type: String, enum: ['active', 'disabled'], default: 'active' },
  avatar:   { type: String, default: '' },
  googleId: String,
  addresses: [{
    label:     String,
    street:    String,
    city:      String,
    state:     String,
    pincode:   String,
    isDefault: { type: Boolean, default: false },
  }],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  resetPasswordToken:  String,
  resetPasswordExpire: Date,
  isVerified: { type: Boolean, default: false },
  passwordHistory: [{ type: String }],
  otpCode:    String,
  otpExpire:   Date,
  otpVerified: { type: Boolean, default: false },
  refreshTokens: [{
    token:     { type: String, required: true },
    expiresAt: { type: Date, required: true },
  }],
}, { timestamps: true });

userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

/* ✅ FIXED PRE SAVE HOOK */
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return; // ✅ no next()
  }

  this.password = await bcrypt.hash(this.password, 12);
});

/* ✅ PASSWORD MATCH */
userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

export default mongoose.model('User', userSchema);
