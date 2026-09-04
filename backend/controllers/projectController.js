const Project = require('../models/Project');
const Sale = require('../models/Sale');
const User = require('../models/User');

/**
 * GET /api/projects
 * List projects (Super admin sees all; Developers see only assigned projects)
 */
exports.getProjects = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    const user = req.user;
    const isSuperAdmin = user.roles ? user.roles.includes('super_admin') : user.role === 'superadmin';

    if (!isSuperAdmin) {
      if (user.roles?.includes('developer')) {
        query.assignedDevelopers = user._id;
      } else {
        return res.status(403).json({ success: false, message: 'Access denied: Developer privileges required.' });
      }
    }

    const projects = await Project.find(query)
      .populate({
        path: 'saleId',
        select: 'customer products totalAmount advanceAmount remainingAmount status closedByName leadGeneratedByName closedAt notes'
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    // In-memory search by client name, area, or assigned developer
    let filteredProjects = projects;
    if (search) {
      const s = search.toLowerCase();
      filteredProjects = projects.filter(p => {
        const clientName = p.saleId?.customer?.businessName?.toLowerCase() || '';
        const clientArea = p.saleId?.customer?.area?.toLowerCase() || '';
        const devNames = (p.assignedDeveloperNames || []).join(' ').toLowerCase();
        return clientName.includes(s) || clientArea.includes(s) || devNames.includes(s);
      });
    }

    res.json({
      success: true,
      count: filteredProjects.length,
      data: filteredProjects
    });
  } catch (error) {
    console.error('[Project Controller] getProjects error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/projects/:id/assign
 * Super Admin assigns developers to a project
 */
exports.assignDevelopers = async (req, res) => {
  try {
    const { id } = req.params;
    const { developerIds } = req.body;

    if (!Array.isArray(developerIds)) {
      return res.status(400).json({ success: false, message: 'developerIds must be an array.' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Resolve developer names
    const devs = await User.find({ _id: { $in: developerIds } });
    const devNames = devs.map(d => d.name);
    const validDevIds = devs.map(d => d._id);

    project.assignedDevelopers = validDevIds;
    project.assignedDeveloperNames = devNames;

    project.deliveryNotes.push({
      note: `Developers assigned: ${devNames.length > 0 ? devNames.join(', ') : 'None'}. Assigned by ${req.user.name}.`,
      author: req.user.name,
      authorId: req.user._id,
      timestamp: new Date()
    });

    await project.save();

    // Also sync to linked Sale
    await Sale.findByIdAndUpdate(project.saleId, {
      assignedDevelopers: validDevIds,
      assignedDeveloperNames: devNames,
      status: project.status === 'active' ? 'project_active' : 'project_completed'
    });

    res.json({
      success: true,
      message: `Assigned ${devNames.length} developer(s) to project.`,
      data: project
    });
  } catch (error) {
    console.error('[Project Controller] assignDevelopers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/projects/:id/notes
 * Developer or Super Admin adds a delivery progress note
 */
exports.addDeliveryNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note text cannot be empty.' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const user = req.user;
    const isSuperAdmin = user.roles ? user.roles.includes('super_admin') : user.role === 'superadmin';

    // Verify developer assignment if not super admin
    if (!isSuperAdmin && !project.assignedDevelopers.some(d => d.toString() === user._id.toString())) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this project.' });
    }

    project.deliveryNotes.push({
      note: note.trim(),
      author: user.name,
      authorId: user._id,
      timestamp: new Date()
    });

    await project.save();

    res.json({
      success: true,
      message: 'Delivery note recorded.',
      data: project
    });
  } catch (error) {
    console.error('[Project Controller] addDeliveryNote error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/projects/:id/complete
 * Developer or Super Admin marks project completed
 */
exports.completeProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryNote } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const user = req.user;
    const isSuperAdmin = user.roles ? user.roles.includes('super_admin') : user.role === 'superadmin';

    if (!isSuperAdmin && !project.assignedDevelopers.some(d => d.toString() === user._id.toString())) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this project.' });
    }

    project.status = 'completed';
    project.completedAt = new Date();

    project.deliveryNotes.push({
      note: deliveryNote ? `[Delivery Completed] ${deliveryNote.trim()}` : `[Delivery Completed] Marked ready for final customer inspection by ${user.name}.`,
      author: user.name,
      authorId: user._id,
      timestamp: new Date()
    });

    await project.save();

    // Update linked sale status to 'project_completed' if it was advance_paid or project_active
    const sale = await Sale.findById(project.saleId);
    if (sale && sale.status !== 'payment_completed') {
      sale.status = 'project_completed';
      await sale.save();
    }

    res.json({
      success: true,
      message: 'Project marked completed! Sale now awaiting final payment collection by closer.',
      data: project
    });
  } catch (error) {
    console.error('[Project Controller] completeProject error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
