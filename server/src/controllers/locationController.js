import Location from '../models/Location.js';
import EmployeeLocationAssignment from '../models/EmployeeLocationAssignment.js';
import Employee from '../models/Employee.js';
import AttendanceEvent from '../models/AttendanceEvent.js';
import { logAudit } from '../services/auditService.js';

// ==========================================
// 1. LOCATION MASTER CONTROLLERS
// ==========================================

export const getLocations = async (req, res) => {
  try {
    const { search, type, status } = req.query;
    const filter = {};

    if (type) filter.locationType = type;
    if (status) filter.status = status;
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ locationName: searchRegex }, { address: searchRegex }];
    }

    const locations = await Location.find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 });

    // Aggregate active assigned employee counts for each location
    const counts = await EmployeeLocationAssignment.aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: '$locationId', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    const enrichedLocations = locations.map((loc) => ({
      ...loc.toObject(),
      assignedEmployeesCount: countMap[loc._id.toString()] || 0,
    }));

    res.json({
      success: true,
      count: enrichedLocations.length,
      data: enrichedLocations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    const assignedCount = await EmployeeLocationAssignment.countDocuments({
      locationId: location._id,
      status: 'ACTIVE',
    });

    res.json({
      success: true,
      data: {
        ...location.toObject(),
        assignedEmployeesCount: assignedCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLocation = async (req, res) => {
  try {
    const {
      locationName,
      locationType = 'OFFICE',
      address,
      latitude,
      longitude,
      allowedRadiusMeters = 100,
      minimumGpsAccuracyMeters = 50,
      description = '',
      status = 'ACTIVE',
    } = req.body;

    if (!locationName || !address || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Location Name, Address, Latitude, and Longitude are required.',
      });
    }

    const parsedLat = Number(latitude);
    const parsedLng = Number(longitude);

    if (isNaN(parsedLat) || isNaN(parsedLng) || parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Valid geographical coordinates are required (Lat: -90 to 90, Lng: -180 to 180).',
      });
    }

    const newLocation = await Location.create({
      locationName: locationName.trim(),
      locationType,
      address: address.trim(),
      latitude: parsedLat,
      longitude: parsedLng,
      allowedRadiusMeters: Math.max(10, Number(allowedRadiusMeters) || 100),
      minimumGpsAccuracyMeters: Math.max(5, Number(minimumGpsAccuracyMeters) || 50),
      description: description ? description.trim() : '',
      status: status || 'ACTIVE',
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await logAudit({
      req,
      action: 'LOCATION_CREATED',
      targetModel: 'Location',
      targetId: newLocation._id,
      targetIdentifier: newLocation.locationName,
      details: `Created new geo-fence location '${newLocation.locationName}' (${newLocation.locationType}) with radius ${newLocation.allowedRadiusMeters}m`,
      afterValue: newLocation.toObject(),
    });

    res.status(201).json({
      success: true,
      message: `Location '${newLocation.locationName}' created successfully.`,
      data: newLocation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    const beforeValue = location.toObject();

    const updatableFields = [
      'locationName',
      'locationType',
      'address',
      'latitude',
      'longitude',
      'allowedRadiusMeters',
      'minimumGpsAccuracyMeters',
      'description',
      'status',
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'latitude' || field === 'longitude' || field === 'allowedRadiusMeters' || field === 'minimumGpsAccuracyMeters') {
          location[field] = Number(req.body[field]);
        } else if (typeof req.body[field] === 'string') {
          location[field] = req.body[field].trim();
        } else {
          location[field] = req.body[field];
        }
      }
    });

    location.updatedBy = req.user?._id;
    await location.save();

    await logAudit({
      req,
      action: 'LOCATION_UPDATED',
      targetModel: 'Location',
      targetId: location._id,
      targetIdentifier: location.locationName,
      details: `Updated location '${location.locationName}'`,
      beforeValue,
      afterValue: location.toObject(),
    });

    res.json({
      success: true,
      message: `Location '${location.locationName}' updated successfully.`,
      data: location,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleLocationStatus = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    const newStatus = location.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    location.status = newStatus;
    location.updatedBy = req.user?._id;
    await location.save();

    await logAudit({
      req,
      action: newStatus === 'ACTIVE' ? 'LOCATION_ACTIVATED' : 'LOCATION_DEACTIVATED',
      targetModel: 'Location',
      targetId: location._id,
      targetIdentifier: location.locationName,
      details: `Changed status of location '${location.locationName}' to ${newStatus}`,
    });

    res.json({
      success: true,
      message: `Location '${location.locationName}' is now ${newStatus}.`,
      data: location,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    // Safety Check 1: Check active assignments
    const activeAssignments = await EmployeeLocationAssignment.countDocuments({
      locationId: location._id,
      status: 'ACTIVE',
    });

    if (activeAssignments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete location '${location.locationName}' because it is actively assigned to ${activeAssignments} employee(s). Please unassign all employees first or deactivate the location.`,
      });
    }

    // Safety Check 2: Check historical attendance references
    const linkedAttendance = await AttendanceEvent.countDocuments({
      matchedLocation: location._id,
    });

    if (linkedAttendance > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot permanently delete '${location.locationName}' because ${linkedAttendance} historical attendance event(s) are recorded at this location. You can deactivate it instead to preserve audit records.`,
      });
    }

    // Delete any inactive assignments
    await EmployeeLocationAssignment.deleteMany({ locationId: location._id });

    // Delete the location
    await Location.findByIdAndDelete(location._id);

    await logAudit({
      req,
      action: 'LOCATION_DELETED',
      targetModel: 'Location',
      targetId: location._id,
      targetIdentifier: location.locationName,
      details: `Permanently deleted location '${location.locationName}'`,
    });

    res.json({
      success: true,
      message: `Location '${location.locationName}' permanently deleted.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLocationAssignedEmployees = async (req, res) => {
  try {
    const assignments = await EmployeeLocationAssignment.find({
      locationId: req.params.id,
    })
      .populate('employeeId', 'employeeId fullName email department designation employmentStatus profilePhoto')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. EMPLOYEE LOCATION ASSIGNMENT CONTROLLERS
// ==========================================

export const getEmployeeLocations = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const assignments = await EmployeeLocationAssignment.find({
      employeeId: employee._id,
    })
      .populate('locationId')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        attendanceLocationPolicy: employee.attendanceLocationPolicy || 'ASSIGNED_LOCATIONS',
      },
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignLocationToEmployee = async (req, res) => {
  try {
    const { locationId, validFrom, validTill, status = 'ACTIVE' } = req.body;
    const employeeId = req.params.employeeId;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    // Check if assignment already exists
    let assignment = await EmployeeLocationAssignment.findOne({
      employeeId: employee._id,
      locationId: location._id,
    });

    if (assignment) {
      assignment.status = status || 'ACTIVE';
      assignment.validFrom = validFrom ? new Date(validFrom) : null;
      assignment.validTill = validTill ? new Date(validTill) : null;
      assignment.assignedBy = req.user?._id;
      await assignment.save();
    } else {
      assignment = await EmployeeLocationAssignment.create({
        employeeId: employee._id,
        locationId: location._id,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTill: validTill ? new Date(validTill) : null,
        status: status || 'ACTIVE',
        assignedBy: req.user?._id,
      });
    }

    await logAudit({
      req,
      action: 'LOCATION_ASSIGNED_TO_EMPLOYEE',
      targetModel: 'EmployeeLocationAssignment',
      targetId: assignment._id,
      targetIdentifier: `${employee.fullName} -> ${location.locationName}`,
      details: `Assigned location '${location.locationName}' to ${employee.fullName} (${employee.employeeId})`,
      afterValue: assignment.toObject(),
    });

    const populated = await EmployeeLocationAssignment.findById(assignment._id)
      .populate('locationId')
      .populate('assignedBy', 'name email');

    res.status(201).json({
      success: true,
      message: `Location '${location.locationName}' assigned to ${employee.fullName}.`,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEmployeeLocationAssignment = async (req, res) => {
  try {
    const assignment = await EmployeeLocationAssignment.findById(req.params.assignmentId)
      .populate('employeeId', 'fullName employeeId')
      .populate('locationId', 'locationName');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Location assignment record not found.' });
    }

    const beforeValue = assignment.toObject();

    if (req.body.validFrom !== undefined) {
      assignment.validFrom = req.body.validFrom ? new Date(req.body.validFrom) : null;
    }
    if (req.body.validTill !== undefined) {
      assignment.validTill = req.body.validTill ? new Date(req.body.validTill) : null;
    }
    if (req.body.status) {
      assignment.status = req.body.status;
    }

    assignment.assignedBy = req.user?._id;
    await assignment.save();

    await logAudit({
      req,
      action: 'EMPLOYEE_LOCATION_ASSIGNMENT_UPDATED',
      targetModel: 'EmployeeLocationAssignment',
      targetId: assignment._id,
      targetIdentifier: `${assignment.employeeId?.fullName} -> ${assignment.locationId?.locationName}`,
      details: `Updated assignment parameters for ${assignment.employeeId?.fullName} at ${assignment.locationId?.locationName}`,
      beforeValue,
      afterValue: assignment.toObject(),
    });

    res.json({
      success: true,
      message: 'Assignment parameters updated successfully.',
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeEmployeeLocationAssignment = async (req, res) => {
  try {
    const assignment = await EmployeeLocationAssignment.findById(req.params.assignmentId)
      .populate('employeeId', 'fullName employeeId')
      .populate('locationId', 'locationName');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const empName = assignment.employeeId?.fullName || 'Employee';
    const locName = assignment.locationId?.locationName || 'Location';

    await EmployeeLocationAssignment.findByIdAndDelete(assignment._id);

    await logAudit({
      req,
      action: 'LOCATION_REMOVED_FROM_EMPLOYEE',
      targetModel: 'EmployeeLocationAssignment',
      targetId: assignment._id,
      targetIdentifier: `${empName} -> ${locName}`,
      details: `Removed location assignment '${locName}' from employee ${empName}`,
    });

    res.json({
      success: true,
      message: `Location '${locName}' unassigned from ${empName}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleAssignmentStatus = async (req, res) => {
  try {
    const assignment = await EmployeeLocationAssignment.findById(req.params.assignmentId)
      .populate('employeeId', 'fullName employeeId')
      .populate('locationId', 'locationName');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const newStatus = assignment.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    assignment.status = newStatus;
    assignment.assignedBy = req.user?._id;
    await assignment.save();

    await logAudit({
      req,
      action: newStatus === 'ACTIVE' ? 'LOCATION_ASSIGNMENT_ACTIVATED' : 'LOCATION_ASSIGNMENT_DEACTIVATED',
      targetModel: 'EmployeeLocationAssignment',
      targetId: assignment._id,
      targetIdentifier: `${assignment.employeeId?.fullName} -> ${assignment.locationId?.locationName}`,
      details: `Set location assignment status to ${newStatus} for ${assignment.employeeId?.fullName}`,
    });

    res.json({
      success: true,
      message: `Assignment is now ${newStatus}.`,
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEmployeeLocationPolicy = async (req, res) => {
  try {
    const { attendanceLocationPolicy } = req.body;
    const allowedPolicies = ['OFFICE_ONLY', 'WFH_ONLY', 'ASSIGNED_LOCATIONS', 'ANYWHERE'];

    if (!attendanceLocationPolicy || !allowedPolicies.includes(attendanceLocationPolicy)) {
      return res.status(400).json({
        success: false,
        message: `Invalid policy. Allowed values: ${allowedPolicies.join(', ')}`,
      });
    }

    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const beforePolicy = employee.attendanceLocationPolicy || 'ASSIGNED_LOCATIONS';
    employee.attendanceLocationPolicy = attendanceLocationPolicy;
    await employee.save();

    await logAudit({
      req,
      action: 'EMPLOYEE_LOCATION_POLICY_CHANGED',
      targetModel: 'Employee',
      targetId: employee._id,
      targetIdentifier: `${employee.fullName} (${employee.employeeId})`,
      details: `Changed attendance location policy from ${beforePolicy} to ${attendanceLocationPolicy}`,
      beforeValue: { attendanceLocationPolicy: beforePolicy },
      afterValue: { attendanceLocationPolicy },
    });

    res.json({
      success: true,
      message: `Attendance policy updated to ${attendanceLocationPolicy}.`,
      data: {
        _id: employee._id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        attendanceLocationPolicy: employee.attendanceLocationPolicy,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
