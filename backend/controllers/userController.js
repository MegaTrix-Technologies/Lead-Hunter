const User = require('../models/User');
const Lead = require('../models/Lead');
const ScrapeJob = require('../models/ScrapeJob');

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

/**
 * Super Admin: List all user profiles with live GMB extraction metrics & referral info
 */
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate('referredBy', 'name email roles')
      .sort({ role: 1, createdAt: -1 })
      .lean();
    const startOfToday = getStartOfToday();

    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const [usedToday, totalExtracted, referredUsersCount] = await Promise.all([
          Lead.countDocuments({ extractedBy: u._id, createdAt: { $gte: startOfToday } }),
          Lead.countDocuments({ extractedBy: u._id }),
          User.countDocuments({ referredBy: u._id })
        ]);

        const isSuperAdmin = u.email === 'sales@megatrixai.com' || (u.roles && u.roles.includes('super_admin')) || u.role === 'superadmin';
        const limit = u.dailyGmbLimit || 150;
        const remainingToday = isSuperAdmin ? 999999 : Math.max(0, limit - usedToday);
        let userRoles = u.roles && u.roles.length > 0 ? u.roles : (isSuperAdmin ? ['super_admin'] : ['sales_agent']);
        if (isSuperAdmin && !userRoles.includes('super_admin')) {
          userRoles = ['super_admin', ...userRoles.filter(r => r !== 'super_admin')];
        }

        // Robust referral resolving
        let resolvedRefId = null;
        let resolvedRefName = u.referredByName || '';
        if (u.referredBy) {
          if (typeof u.referredBy === 'object' && u.referredBy._id) {
            resolvedRefId = u.referredBy._id.toString();
            if (!resolvedRefName) resolvedRefName = u.referredBy.name || '';
          } else {
            resolvedRefId = u.referredBy.toString();
          }
        }

        return {
          id: u._id,
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          roles: userRoles,
          commissionRates: u.commissionRates || { leadGenPercent: 0, closerPercent: 0, developerPercent: 0 },
          referredBy: resolvedRefId,
          referredByName: resolvedRefName,
          referralPercent: u.referralPercent || 0,
          referredUsersCount,
          status: u.status,
          dailyGmbLimit: limit,
          usedToday,
          totalExtracted,
          remainingToday,
          createdAt: u.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: enrichedUsers
    });
  } catch (error) {
    console.error('[User Controller] getUsers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Super Admin: Create new user profile with roles, commission rates & optional referral link
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, dailyGmbLimit, roles, commissionRates, referredBy, referralPercent } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    const limit = parseInt(dailyGmbLimit, 10);
    const assignedRoles = Array.isArray(roles) && roles.length > 0 ? roles : ['sales_agent'];
    const rates = {
      leadGenPercent: assignedRoles.includes('sales_agent') ? Math.min(100, Math.max(0, parseFloat(commissionRates?.leadGenPercent) || 0)) : 0,
      closerPercent: assignedRoles.includes('sales_closer') ? Math.min(100, Math.max(0, parseFloat(commissionRates?.closerPercent) || 0)) : 0,
      developerPercent: assignedRoles.includes('developer') ? Math.min(100, Math.max(0, parseFloat(commissionRates?.developerPercent) || 0)) : 0
    };

    // Resolve Referrer
    let resolvedReferredBy = null;
    let resolvedReferredByName = '';
    let resolvedReferralPercent = 0;

    if (referredBy && referredBy !== 'none') {
      const refUser = await User.findById(referredBy);
      if (refUser) {
        resolvedReferredBy = refUser._id;
        resolvedReferredByName = refUser.name;
        resolvedReferralPercent = Math.min(100, Math.max(0, parseFloat(referralPercent) || 0));
      }
    }

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: assignedRoles.includes('super_admin') ? 'superadmin' : 'agent',
      roles: assignedRoles,
      commissionRates: rates,
      referredBy: resolvedReferredBy,
      referredByName: resolvedReferredByName,
      referralPercent: resolvedReferralPercent,
      status: 'active',
      dailyGmbLimit: isNaN(limit) || limit < 1 ? 150 : limit,
      mustChangePassword: true,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: `User profile "${user.name}" created successfully.${resolvedReferredByName ? ` (Referred by: ${resolvedReferredByName} @ ${resolvedReferralPercent}%)` : ''}`,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: user.roles,
        commissionRates: user.commissionRates,
        referredBy: user.referredBy,
        referredByName: user.referredByName,
        referralPercent: user.referralPercent,
        status: user.status,
        dailyGmbLimit: user.dailyGmbLimit,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('[User Controller] createUser error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Super Admin: Update user profile (roles, commissions, limit, status, password, referral link)
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dailyGmbLimit, status, password, roles, commissionRates, referredBy, referralPercent } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    // Protect Super Admin from being blocked or downgraded
    const isTargetSuperAdmin = user.email === 'sales@megatrixai.com' || (user.roles && user.roles.includes('super_admin')) || user.role === 'superadmin';
    if (isTargetSuperAdmin && status === 'blocked') {
      return res.status(400).json({
        success: false,
        message: 'The Super Administrator account cannot be blocked.'
      });
    }

    if (name) user.name = name.trim();
    if (status && ['active', 'blocked'].includes(status)) {
      user.status = status;
    }
    if (dailyGmbLimit !== undefined) {
      const parsed = parseInt(dailyGmbLimit, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        user.dailyGmbLimit = parsed;
      }
    }
    if (password && password.trim().length >= 6) {
      user.password = password.trim();
      user.mustChangePassword = true;
    }
    if (Array.isArray(roles) && roles.length > 0) {
      let finalRoles = [...roles];
      if (user.email === 'sales@megatrixai.com' && !finalRoles.includes('super_admin')) {
        finalRoles.unshift('super_admin');
      }
      user.roles = finalRoles;
      user.role = finalRoles.includes('super_admin') ? 'superadmin' : 'agent';
      user.markModified('roles');
    }
    if (commissionRates && typeof commissionRates === 'object') {
      const assignedRoles = user.roles || [];
      user.commissionRates = {
        leadGenPercent: assignedRoles.includes('sales_agent') && commissionRates.leadGenPercent !== undefined 
          ? Math.min(100, Math.max(0, parseFloat(commissionRates.leadGenPercent) || 0)) 
          : (assignedRoles.includes('sales_agent') ? (user.commissionRates?.leadGenPercent || 0) : 0),
        closerPercent: assignedRoles.includes('sales_closer') && commissionRates.closerPercent !== undefined 
          ? Math.min(100, Math.max(0, parseFloat(commissionRates.closerPercent) || 0)) 
          : (assignedRoles.includes('sales_closer') ? (user.commissionRates?.closerPercent || 0) : 0),
        developerPercent: assignedRoles.includes('developer') && commissionRates.developerPercent !== undefined 
          ? Math.min(100, Math.max(0, parseFloat(commissionRates.developerPercent) || 0)) 
          : (assignedRoles.includes('developer') ? (user.commissionRates?.developerPercent || 0) : 0)
      };
      user.markModified('commissionRates');
    }

    // Referral link management (linking, updating, or removing)
    if (referredBy !== undefined) {
      if (!referredBy || referredBy === 'none' || referredBy === '') {
        user.referredBy = null;
        user.referredByName = '';
        user.referralPercent = 0;
      } else {
        if (referredBy.toString() === user._id.toString()) {
          return res.status(400).json({
            success: false,
            message: 'A user cannot be linked as their own referrer.'
          });
        }
        const refUser = await User.findById(referredBy);
        if (refUser) {
          user.referredBy = refUser._id;
          user.referredByName = refUser.name;
        }
      }
    }

    if (referralPercent !== undefined) {
      user.referralPercent = Math.min(100, Math.max(0, parseFloat(referralPercent) || 0));
    }

    await user.save();

    res.json({
      success: true,
      message: `User profile "${user.name}" updated successfully.`,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: user.roles,
        commissionRates: user.commissionRates,
        referredBy: user.referredBy,
        referredByName: user.referredByName,
        referralPercent: user.referralPercent,
        status: user.status,
        dailyGmbLimit: user.dailyGmbLimit
      }
    });
  } catch (error) {
    console.error('[User Controller] updateUser error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Super Admin: Remove an agent profile
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'superadmin' || user.email === 'sales@megatrixai.com') {
      return res.status(400).json({
        success: false,
        message: 'The Super Administrator account cannot be deleted.'
      });
    }

    // If other users were referred by this user, clear their referrer
    await User.updateMany(
      { referredBy: user._id },
      { $set: { referredBy: null, referredByName: '', referralPercent: 0 } }
    );

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Agent profile "${user.name}" has been permanently removed.`
    });
  } catch (error) {
    console.error('[User Controller] deleteUser error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Super Admin: Usage Breakdown for all users
 */
exports.getUserUsageBreakdown = async (req, res) => {
  try {
    const users = await User.find().sort({ role: 1, name: 1 }).lean();
    const startOfToday = getStartOfToday();

    const breakdown = await Promise.all(
      users.map(async (u) => {
        const [usedToday, totalExtracted, recentJobs] = await Promise.all([
          Lead.countDocuments({ extractedBy: u._id, createdAt: { $gte: startOfToday } }),
          Lead.countDocuments({ extractedBy: u._id }),
          ScrapeJob.find({ userId: u._id }).sort({ createdAt: -1 }).limit(5).lean()
        ]);

        const isSuperAdmin = u.role === 'superadmin';
        const limit = u.dailyGmbLimit || 150;
        const remainingToday = isSuperAdmin ? 999999 : Math.max(0, limit - usedToday);
        const usagePercentage = isSuperAdmin
          ? 0
          : Math.min(100, Math.round((usedToday / (limit || 1)) * 100));

        return {
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          dailyLimit: limit,
          usedToday,
          remainingToday,
          totalExtracted,
          usagePercentage,
          recentJobs: recentJobs.map(j => ({
            keyword: j.keyword,
            area: j.area,
            qualified: j.totalQualified,
            date: j.createdAt
          }))
        };
      })
    );

    res.json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('[User Controller] getUserUsageBreakdown error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
