import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Shift from '../models/Shift.js';
import AttendanceEvent from '../models/AttendanceEvent.js';
import AttendanceSummary from '../models/AttendanceSummary.js';
import { logAudit } from '../services/auditService.js';

export const getEmployees = async (req, res) => {
  try {
    const { search, department, shift, status, page = 1, limit = 50 } = req.query;
    const query = {};

    if (department) query.department = department;
    if (shift) query.assignedShift = shift;
    if (status) query.employmentStatus = status;

    const adminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();
    query.employeeId = { $ne: 'ADM001' };
    query.email = { $ne: adminEmail };

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = [
        {
          $or: [
            { fullName: searchRegex },
            { employeeId: searchRegex },
            { email: searchRegex },
            { designation: searchRegex },
          ],
        },
      ];
    }

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .populate('assignedShift', 'shiftName shiftCode shiftType startTime endTime')
      .sort({ employeeId: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: employees,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('assignedShift')
      .populate('user', 'email role isActive lastLogin');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const {
      employeeId,
      fullName,
      mobile,
      email,
      department,
      designation,
      joiningDate,
      reportingManager,
      assignedShift,
      password = 'Password@123',
      profilePhoto,
      role = 'employee',
    } = req.body;

    if (!employeeId || !fullName || !mobile || !email || !department || !designation || !joiningDate || !assignedShift) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required employee fields.',
      });
    }

    // Check duplicate employee ID or email
    const existingId = await Employee.findOne({ employeeId: employeeId.toUpperCase().trim() });
    if (existingId) {
      return res.status(400).json({
        success: false,
        message: `Employee ID '${employeeId}' is already registered.`,
      });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `Email '${email}' is already associated with an account.`,
      });
    }

    // Validate shift exists
    const shift = await Shift.findById(assignedShift);
    if (!shift) {
      return res.status(400).json({ success: false, message: 'Assigned shift does not exist.' });
    }

    // 1. Create Employee
    const employee = await Employee.create({
      employeeId: employeeId.toUpperCase().trim(),
      fullName: fullName.trim(),
      mobile: mobile.trim(),
      email: email.toLowerCase().trim(),
      department: department.trim(),
      designation: designation.trim(),
      joiningDate: new Date(joiningDate),
      reportingManager: reportingManager ? reportingManager.trim() : '',
      assignedShift,
      profilePhoto: profilePhoto || '',
      employmentStatus: 'ACTIVE',
    });

    // 2. Create User login credentials
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      role: role || 'employee',
      employee: employee._id,
      isActive: true,
    });

    employee.user = user._id;
    await employee.save();

    await logAudit({
      req,
      action: 'EMPLOYEE_CREATED',
      targetModel: 'Employee',
      targetId: employee._id,
      targetIdentifier: `${employee.fullName} (${employee.employeeId})`,
      details: `Created new employee profile and credentials for ${employee.fullName}`,
      afterValue: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
      },
    });

    const populatedEmployee = await Employee.findById(employee._id).populate('assignedShift');

    res.status(201).json({
      success: true,
      message: 'Employee created successfully.',
      data: populatedEmployee,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const beforeValue = employee.toObject();

    const allowedFields = [
      'fullName',
      'mobile',
      'department',
      'designation',
      'joiningDate',
      'reportingManager',
      'assignedShift',
      'profilePhoto',
      'employmentStatus',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        employee[field] = req.body[field];
      }
    });

    // Handle email update with uniqueness validation and sync to User account
    if (req.body.email && req.body.email.toLowerCase().trim() !== employee.email) {
      const newEmail = req.body.email.toLowerCase().trim();

      const duplicateUser = await User.findOne({
        email: newEmail,
        _id: { $ne: employee.user },
      });
      const duplicateEmp = await Employee.findOne({
        email: newEmail,
        _id: { $ne: employee._id },
      });

      if (duplicateUser || duplicateEmp) {
        return res.status(400).json({
          success: false,
          message: `Email '${newEmail}' is already registered with another account.`,
        });
      }

      employee.email = newEmail;

      // Update User account email as well
      await User.findOneAndUpdate(
        { $or: [{ employee: employee._id }, { _id: employee.user }] },
        { email: newEmail }
      );
    }

    await employee.save();

    // If status changed, sync User account isActive
    if (req.body.employmentStatus !== undefined) {
      await User.findOneAndUpdate(
        { employee: employee._id },
        { isActive: req.body.employmentStatus === 'ACTIVE' }
      );
    }

    await logAudit({
      req,
      action: 'EMPLOYEE_UPDATED',
      targetModel: 'Employee',
      targetId: employee._id,
      targetIdentifier: `${employee.fullName} (${employee.employeeId})`,
      details: `Updated employee profile for ${employee.fullName}`,
      beforeValue,
      afterValue: employee.toObject(),
    });

    const updated = await Employee.findById(employee._id).populate('assignedShift');

    res.json({
      success: true,
      message: 'Employee updated successfully.',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Safety: Protect SuperAdmin account from deletion
    if (employee.employeeId === 'ADM001' || employee.email === 'admin@hrms.local') {
      return res.status(400).json({ success: false, message: 'SuperAdmin account cannot be deleted.' });
    }

    const linkedUser = await User.findOne({
      $or: [{ employee: employee._id }, { email: employee.email }, { _id: employee.user }],
    });

    if (linkedUser && linkedUser.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Admin accounts cannot be deleted.' });
    }

    // 1. Delete associated User account
    if (linkedUser) {
      await User.findByIdAndDelete(linkedUser._id);
    }

    // 2. Delete associated Attendance Events and Summaries
    await AttendanceEvent.deleteMany({
      $or: [{ employee: employee._id }, { employeeId: employee.employeeId }],
    });
    await AttendanceSummary.deleteMany({
      $or: [{ employee: employee._id }, { employeeId: employee.employeeId }],
    });

    // 3. Delete Employee document
    await Employee.findByIdAndDelete(employee._id);

    await logAudit({
      req,
      action: 'EMPLOYEE_DELETED',
      targetModel: 'Employee',
      targetId: employee._id,
      targetIdentifier: `${employee.fullName} (${employee.employeeId})`,
      details: `Permanently deleted employee profile, login credentials, and attendance data for ${employee.fullName}`,
    });

    res.json({
      success: true,
      message: `Employee ${employee.fullName} (${employee.employeeId}) permanently deleted.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleEmployeeStatus = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const newStatus = employee.employmentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    employee.employmentStatus = newStatus;
    await employee.save();

    await User.findOneAndUpdate(
      { employee: employee._id },
      { isActive: newStatus === 'ACTIVE' }
    );

    await logAudit({
      req,
      action: newStatus === 'ACTIVE' ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
      targetModel: 'Employee',
      targetId: employee._id,
      targetIdentifier: `${employee.fullName} (${employee.employeeId})`,
      details: `Set employee status to ${newStatus}`,
    });

    res.json({
      success: true,
      message: `Employee marked as ${newStatus}.`,
      data: employee,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminResetEmployeePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    let user = await User.findOne({ employee: employee._id });
    if (!user) {
      user = await User.findOne({ email: employee.email });
    }

    if (!user) {
      // Create user account if missing
      user = await User.create({
        email: employee.email,
        password: newPassword,
        role: 'employee',
        employee: employee._id,
        isActive: employee.employmentStatus === 'ACTIVE',
      });
      employee.user = user._id;
      await employee.save();
    } else {
      user.password = newPassword;
      await user.save();
    }

    await logAudit({
      req,
      action: 'ADMIN_PASSWORD_RESET',
      targetModel: 'Employee',
      targetId: employee._id,
      targetIdentifier: `${employee.fullName} (${employee.employeeId})`,
      details: `Admin reset password for employee ${employee.fullName}`,
    });

    res.json({
      success: true,
      message: `Password successfully updated for ${employee.fullName}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
