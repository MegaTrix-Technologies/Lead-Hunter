const User = require('../models/User');
const Lead = require('../models/Lead');
const ScrapeJob = require('../models/ScrapeJob');

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

/**
 * Super Admin: List all user profiles with live GMB extraction metrics
 */
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ role: 1, createdAt: -1 }).lean();
    const startOfToday = getStartOfToday();

    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const [usedToday, totalExtracted] = await Promise.all([
          Lead.countDocuments({ extractedBy: u._id, createdAt: { $gte: startOfToday } }),
          Lead.countDocuments({ extractedBy: u._id })
        ]);

        const isSuperAdmin = u.role === 'superadmin';
        const limit = u.dailyGmbLimit || 150;
        const remainingToday = isSuperAdmin ? 999999 : Math.max(0, limit - usedToday);

        return {
          id: u._id,
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
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
 * Super Admin: Create new agent profile
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, dailyGmbLimit } = req.body;

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
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: 'agent',
      status: 'active',
      dailyGmbLimit: isNaN(limit) || limit < 1 ? 150 : limit,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: `Agent profile "${user.name}" created successfully.`,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        dailyGmbLimit: user.dailyGmbLimit,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('[User Controller] createUser error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Super Admin: Update agent profile (Limit, status [block/unblock], name, reset password)
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dailyGmbLimit, status, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    // Protect Super Admin from being blocked or downgraded
    if (user.role === 'superadmin' && status === 'blocked') {
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
