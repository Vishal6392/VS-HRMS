import Shift from '../models/Shift.js';
import { logAudit } from '../services/auditService.js';

export const getShifts = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const filter = {};
    if (activeOnly === 'true') {
      filter.isActive = true;
    }
    const shifts = await Shift.find(filter).sort({ shiftName: 1 });
    res.json({ success: true, count: shifts.length, data: shifts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShiftById = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found.' });
    }
    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createShift = async (req, res) => {
  try {
    const {
      shiftName,
      shiftCode,
      shiftType,
      startTime,
      endTime,
      gracePeriodMinutes,
      minWorkingHours,
      breakPolicy,
      splitSegments,
      description,
    } = req.body;

    if (!shiftName || !shiftCode || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Shift Name, Code, Start Time, and End Time are required.',
      });
    }

    const existingCode = await Shift.findOne({ shiftCode: shiftCode.toUpperCase().trim() });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Shift code '${shiftCode}' is already in use.`,
      });
    }

    const shift = await Shift.create({
      shiftName: shiftName.trim(),
      shiftCode: shiftCode.toUpperCase().trim(),
      shiftType: shiftType || 'GENERAL',
      startTime,
      endTime,
      gracePeriodMinutes: Number(gracePeriodMinutes) || 15,
      minWorkingHours: Number(minWorkingHours) || 8,
      breakPolicy: breakPolicy || { allowedBreaks: 1, maxBreakMinutes: 60 },
      splitSegments: shiftType === 'SPLIT' ? splitSegments || [] : [],
      description: description || '',
    });

    await logAudit({
      req,
      action: 'SHIFT_CREATED',
      targetModel: 'Shift',
      targetId: shift._id,
      targetIdentifier: shift.shiftName,
      details: `Created new shift: ${shift.shiftName} (${shift.shiftCode})`,
      afterValue: shift,
    });

    res.status(201).json({ success: true, message: 'Shift created successfully.', data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateShift = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found.' });
    }

    const beforeValue = shift.toObject();

    Object.assign(shift, req.body);
    if (req.body.shiftCode) {
      shift.shiftCode = req.body.shiftCode.toUpperCase().trim();
    }
    await shift.save();

    await logAudit({
      req,
      action: 'SHIFT_UPDATED',
      targetModel: 'Shift',
      targetId: shift._id,
      targetIdentifier: shift.shiftName,
      details: `Updated shift details for: ${shift.shiftName}`,
      beforeValue,
      afterValue: shift.toObject(),
    });

    res.json({ success: true, message: 'Shift updated successfully.', data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleShiftStatus = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found.' });
    }

    shift.isActive = !shift.isActive;
    await shift.save();

    await logAudit({
      req,
      action: shift.isActive ? 'SHIFT_ACTIVATED' : 'SHIFT_DEACTIVATED',
      targetModel: 'Shift',
      targetId: shift._id,
      targetIdentifier: shift.shiftName,
      details: `${shift.isActive ? 'Activated' : 'Deactivated'} shift: ${shift.shiftName}`,
    });

    res.json({
      success: true,
      message: `Shift ${shift.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: shift,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
