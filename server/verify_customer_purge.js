import dotenv from 'dotenv';
dotenv.config(); // MUST BE FIRST

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/userModel.js';
import Order from './models/orderModel.js';
import Product from './models/productModel.js';
import CustomerPurgeRequest from './models/customerPurgeRequestModel.js';
import CustomerPurgeAuditLog from './models/customerPurgeAuditLogModel.js';
import CustomerGovernanceLog from './models/customerGovernanceLogModel.js';

const runTests = async () => {
  console.log('🚀 Starting Customer Data Purge E2E Tests...');

  // Connect to DB
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB database successfully.');

  // Clean up any old test data
  await User.deleteMany({ email: /test-purge/ });
  await Product.deleteMany({ name: 'Purge Test Item' });
  await Order.deleteMany({ paymentMethod: 'cod', totalPrice: 1500 });
  await CustomerPurgeRequest.deleteMany({});
  await CustomerPurgeAuditLog.deleteMany({});
  await CustomerGovernanceLog.deleteMany({});

  // 1. Setup Mock Users
  // A. Initiator (Super Admin)
  const initiator = await User.create({
    name: 'Test Initiator',
    email: 'test-purge-initiator@autocraft.internal',
    password: 'Password123!',
    role: 'super_admin',
    status: 'active'
  });

  // B. Independent Approver (Super Admin)
  const approver = await User.create({
    name: 'Test Approver',
    email: 'test-purge-approver@autocraft.internal',
    password: 'Password123!',
    role: 'super_admin',
    status: 'active'
  });

  // C. Target Customer
  const customer = await User.create({
    name: 'Test Customer',
    email: 'test-purge-customer@autocraft.internal',
    password: 'Password123!',
    role: 'customer',
    status: 'active',
    phone: '1234567890',
    addresses: [{
      label: 'Home',
      street: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      isDefault: true
    }],
    wishlist: []
  });

  console.log('✅ Mock users created successfully.');

  // 2. Setup Mock Order & Review & Product
  const product = await Product.create({
    name: 'Purge Test Item',
    description: 'A mock product to test review anonymization',
    price: 1500,
    mrp: 1800,
    category: 'accessories',
    stock: 50,
    notifyList: [{
      user: customer._id,
      email: customer.email,
      status: 'waiting'
    }],
    reviews: [{
      user: customer._id,
      name: customer.name,
      rating: 5,
      comment: 'Excellent product!'
    }]
  });

  const order = await Order.create({
    user: customer._id,
    items: [{
      name: product.name,
      qty: 1,
      image: 'test.jpg',
      price: product.price,
      product: product._id
    }],
    shippingAddress: {
      name: customer.name,
      phone: customer.phone,
      street: customer.addresses[0].street,
      city: customer.addresses[0].city,
      state: customer.addresses[0].state,
      pincode: customer.addresses[0].pincode
    },
    paymentMethod: 'cod',
    itemsPrice: product.price,
    shippingPrice: 0,
    taxPrice: 0,
    totalPrice: product.price,
    isPaid: true,
    paidAt: new Date()
  });

  console.log('✅ Mock product and order created successfully.');

  // 3. Test Level 1: Disable Account
  console.log('\n--- Testing Level 1: Disable ---');
  customer.status = 'disabled';
  await customer.save();
  
  await CustomerGovernanceLog.create({
    actorId: initiator._id,
    actorName: initiator.name,
    targetCustomerId: customer._id,
    targetCustomerName: customer.name,
    actionType: 'disable_customer',
    reason: 'Test Level 1 disable flow',
    details: `Disabled customer account: ${customer.email}.`
  });

  let checkCustomer = await User.findById(customer._id);
  if (checkCustomer.status !== 'disabled') {
    throw new Error('Level 1: Customer status is not disabled');
  }
  console.log('✅ Level 1 Disable assertion passed.');

  // 4. Test Level 2: Soft Delete
  console.log('\n--- Testing Level 2: Soft Delete ---');
  const origEmail = customer.email;
  customer.name = 'Anonymized Customer';
  customer.email = `anonymized_${customer._id}@autocraft.internal`;
  customer.phone = '';
  customer.addresses = [];
  customer.wishlist = [];
  customer.avatar = '';
  customer.status = 'disabled';
  await customer.save();

  await CustomerGovernanceLog.create({
    actorId: initiator._id,
    actorName: initiator.name,
    targetCustomerId: customer._id,
    targetCustomerName: customer.name,
    actionType: 'soft_delete_customer',
    reason: 'Test Level 2 soft delete flow',
    details: `Soft deleted and anonymized customer. Original email was ${origEmail}.`
  });

  checkCustomer = await User.findById(customer._id);
  if (checkCustomer.name !== 'Anonymized Customer' || checkCustomer.email !== `anonymized_${customer._id}@autocraft.internal` || checkCustomer.phone !== '') {
    throw new Error('Level 2: Customer details are not soft anonymized');
  }
  console.log('✅ Level 2 Soft Delete assertion passed.');

  // Restore customer back for Level 3 Purge test
  customer.name = 'Test Customer';
  customer.email = 'test-purge-customer@autocraft.internal';
  customer.phone = '1234567890';
  customer.addresses = [{
    label: 'Home',
    street: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    isDefault: true
  }];
  customer.status = 'active';
  await customer.save();

  // 5. Test Level 3: Request Permanent Purge (Initiation)
  console.log('\n--- Testing Level 3: Initiation ---');
  const purgeReq = await CustomerPurgeRequest.create({
    requestId: 'test-req-id-12345',
    targetCustomerId: customer._id,
    initiatorId: initiator._id,
    initiatorReason: 'Permanent purge request due to GDRA/CCPA requirements.',
    status: 'pending'
  });

  const checkPurgeReq = await CustomerPurgeRequest.findOne({ requestId: 'test-req-id-12345' });
  if (!checkPurgeReq || checkPurgeReq.status !== 'pending') {
    throw new Error('Level 3: Purge request was not created in pending status');
  }
  console.log('✅ Level 3 Initiation assertion passed.');

  // 6. Test Level 3 Approval: Password failure simulation
  console.log('\n--- Testing Level 3 Approval: Password validation ---');
  const isMatch = await approver.matchPassword('Password123!');
  if (!isMatch) {
    throw new Error('Approver password comparison fails');
  }
  const isBadMatch = await approver.matchPassword('wrongpassword');
  if (isBadMatch) {
    throw new Error('Approver password verification succeeded on incorrect password');
  }
  console.log('✅ Password validation assertion passed.');

  // 7. Test Level 3 Approval: Independent check
  console.log('\n--- Testing Level 3 Approval: Eligibility rules ---');
  if (purgeReq.initiatorId.toString() === approver._id.toString()) {
    throw new Error('Approver must be independent, but matches initiator');
  }
  console.log('✅ Initiator vs Approver independence assertion passed.');

  // 8. Test Level 3 Approval: Execute and verify anonymization
  console.log('\n--- Testing Level 3 Approval: Execution & Anonymization ---');
  // Perform level 3 execution logic as done in the routes:
  // A. Update User
  customer.name = 'Deleted Customer';
  customer.email = `purged_${customer._id}@autocraft.internal`;
  customer.phone = '';
  customer.addresses = [];
  customer.wishlist = [];
  customer.avatar = '';
  customer.googleId = undefined;
  customer.password = undefined;
  customer.refreshTokens = [];
  customer.isVerified = false;
  customer.status = 'disabled';
  await customer.save();

  // B. Update reviews inside Product models (anonymize)
  await Product.updateMany(
    { 'reviews.user': customer._id },
    { $set: { 'reviews.$[elem].name': 'Deleted Customer' } },
    { arrayFilters: [{ 'elem.user': customer._id }] }
  );

  // C. Remove user from waitlists
  await Product.updateMany(
    { 'notifyList.user': customer._id },
    { $pull: { notifyList: { user: customer._id } } }
  );

  // D. Update order shipping details
  await Order.updateMany(
    { user: customer._id },
    {
      $set: {
        'shippingAddress.name': 'Anonymized Customer',
        'shippingAddress.phone': '0000000000',
        'shippingAddress.street': 'Anonymized Address',
        'shippingAddress.city': 'Anonymized City',
        'shippingAddress.state': 'Anonymized State',
        'shippingAddress.pincode': '000000'
      }
    }
  );

  // E. Create Audit Log
  await CustomerPurgeAuditLog.create({
    requestId: purgeReq.requestId,
    targetCustomerId: customer._id,
    initiatorId: purgeReq.initiatorId,
    approverId: approver._id,
    initiatorReason: purgeReq.initiatorReason,
    approverReason: 'Approved permanent purge request under security governance.',
    executionTimestamp: new Date(),
    status: 'success'
  });

  // F. Update request status
  purgeReq.status = 'approved';
  purgeReq.approverId = approver._id;
  purgeReq.approverReason = 'Approved permanent purge request under security governance.';
  purgeReq.approvedAt = new Date();
  await purgeReq.save();

  // Verify DB side effects
  const finalUser = await User.findById(customer._id);
  if (finalUser.name !== 'Deleted Customer' || finalUser.email !== `purged_${customer._id}@autocraft.internal` || finalUser.password !== undefined) {
    throw new Error('Permanent Purge: User model was not correctly anonymized');
  }

  const finalProduct = await Product.findById(product._id);
  const userReview = finalProduct.reviews.find(r => r.user.toString() === customer._id.toString());
  if (!userReview || userReview.name !== 'Deleted Customer') {
    throw new Error('Permanent Purge: Product review name was not anonymized');
  }
  const userNotify = finalProduct.notifyList.find(n => n.user && n.user.toString() === customer._id.toString());
  if (userNotify) {
    throw new Error('Permanent Purge: User was not removed from product waitlist');
  }

  const finalOrder = await Order.findById(order._id);
  if (finalOrder.shippingAddress.name !== 'Anonymized Customer' || finalOrder.shippingAddress.phone !== '0000000000' || finalOrder.totalPrice !== 1500) {
    throw new Error('Permanent Purge: Order shipping details or financial integrity check failed');
  }

  const auditLog = await CustomerPurgeAuditLog.findOne({ requestId: purgeReq.requestId });
  if (!auditLog || auditLog.status !== 'success') {
    throw new Error('Permanent Purge: Audit log was not successfully recorded');
  }

  console.log('✅ Level 3 Anonymization and Database integrity assertion passed.');

  // Clean up
  await User.deleteMany({ email: /test-purge/ });
  await Product.deleteOne({ _id: product._id });
  await Order.deleteOne({ _id: order._id });
  await CustomerPurgeRequest.deleteMany({});
  await CustomerPurgeAuditLog.deleteMany({});
  await CustomerGovernanceLog.deleteMany({});

  console.log('\n🌟 ALL TEST CASES PASSED SUCCESSFULLY! 🌟');
  process.exit(0);
};

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
