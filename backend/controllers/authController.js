const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Dataset = require('../models/Dataset');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

/**
 * Bootstrap default Super Admin if not already present
 * Also link unassigned historical leads & datasets to the Super Admin
 */
exports.seedSuperAdmin = async () => {
  try {
    const adminEmail = 'sales@megatrixai.com';
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      console.log('[Auth Boot] Seeding default Super Admin (sales@megatrixai.com)...');
      admin = await User.create({
        name: 'Sales Desk',
        email: adminEmail,
        password: 'Orangeman235!',
        role: 'superadmin',
        roles: ['super_admin'],
        commissionRates: { leadGenPercent: 0, closerPercent: 0, developerPercent: 0 },
        status: 'active',
        dailyGmbLimit: 999999
      });
      console.log('✔ Default Super Admin initialized.');
    } else if (!admin.roles || admin.roles.length === 0) {
      admin.roles = ['super_admin'];
      await admin.save();
    }

    // Ensure ghost/demo agent accounts are never recreated; only super admin creates agents
    await User.deleteMany({ email: 'demoagent@megatrixai.com' });

    // Link unassigned legacy leads to the Super Admin
    const unassignedLeads = await Lead.countDocuments({ extractedBy: null });
    if (unassignedLeads > 0) {
      console.log(`[Auth Boot] Assigning ${unassignedLeads} legacy leads to Super Admin...`);
      await Lead.updateMany(
        { extractedBy: null },
        { $set: { extractedBy: admin._id, extractedByName: admin.name } }
      );
    }

    // Link unassigned legacy datasets to the Super Admin
    const unassignedDatasets = await Dataset.countDocuments({ createdBy: null });
    if (unassignedDatasets > 0) {
      console.log(`[Auth Boot] Assigning ${unassignedDatasets} legacy datasets to Super Admin...`);
      await Dataset.updateMany(
        { createdBy: null },
        { $set: { createdBy: admin._id, createdByName: admin.name } }
      );
    }
  } catch (err) {
    console.error('[Auth Boot] seedSuperAdmin error:', err.message);
  }
};

/**
 * Login user (Super Admin or Agent)
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials and try again.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials and try again.'
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by the Super Administrator. Please contact support.'
      });
    }

    // Generate JWT token (7 days validity)
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Compute today's usage & quota
    const isSuperAdmin = user.roles ? user.roles.includes('super_admin') : user.role === 'superadmin';
    let usedToday = 0;
    if (!isSuperAdmin) {
      usedToday = await Lead.countDocuments({
        extractedBy: user._id,
        createdAt: { $gte: getStartOfToday() }
      });
    }

    const dailyLimit = user.dailyGmbLimit || 150;
    const remainingToday = isSuperAdmin ? 999999 : Math.max(0, dailyLimit - usedToday);
    const userRoles = user.roles && user.roles.length > 0 ? user.roles : (isSuperAdmin ? ['super_admin'] : ['sales_agent']);

    return res.json({
      success: true,
      message: `Authentication successful. Welcome back, ${user.name}!`,
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        roles: userRoles,
        commissionRates: user.commissionRates || { leadGenPercent: 0, closerPercent: 0, developerPercent: 0 },
        dailyGmbLimit: user.dailyGmbLimit,
        loginTime: new Date().toISOString()
      },
      quota: {
        isSuperAdmin,
        dailyLimit,
        usedToday,
        remainingToday
      },
      token
    });
  } catch (err) {
    console.error('[Auth Controller] login error:', err);
    res.status(500).json({ success: false, message: 'Server authentication error.' });
  }
};

/**
 * Get current authenticated user profile and live remaining daily GMB quota
 */
exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    const isSuperAdmin = user.roles ? user.roles.includes('super_admin') : user.role === 'superadmin';
    
    let usedToday = 0;
    if (!isSuperAdmin) {
      usedToday = await Lead.countDocuments({
        extractedBy: user._id,
        createdAt: { $gte: getStartOfToday() }
      });
    }

    const dailyLimit = user.dailyGmbLimit || 150;
    const remainingToday = isSuperAdmin ? 999999 : Math.max(0, dailyLimit - usedToday);
    const userRoles = user.roles && user.roles.length > 0 ? user.roles : (isSuperAdmin ? ['super_admin'] : ['sales_agent']);

    res.json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: userRoles,
        commissionRates: user.commissionRates || { leadGenPercent: 0, closerPercent: 0, developerPercent: 0 },
        status: user.status,
        dailyGmbLimit: user.dailyGmbLimit
      },
      quota: {
        isSuperAdmin,
        dailyLimit,
        usedToday,
        remainingToday
      }
    });
  } catch (err) {
    console.error('[Auth Controller] getMe error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Change portal password (Both Super Admin and Agent)
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password. Please verify and try again.'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Portal password updated successfully. Please use your new password next time you log in.'
    });
  } catch (err) {
    console.error('[Auth Controller] changePassword error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
