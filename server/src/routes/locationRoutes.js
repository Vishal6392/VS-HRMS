import express from 'express';
import {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  toggleLocationStatus,
  deleteLocation,
  getLocationAssignedEmployees,
  getEmployeeLocations,
  assignLocationToEmployee,
  updateEmployeeLocationAssignment,
  removeEmployeeLocationAssignment,
  toggleAssignmentStatus,
  updateEmployeeLocationPolicy,
} from '../controllers/locationController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Location Master Routes (Admin only)
router.get('/', getLocations);
router.post('/', requireRole('admin'), createLocation);
router.get('/:id', getLocationById);
router.put('/:id', requireRole('admin'), updateLocation);
router.delete('/:id', requireRole('admin'), deleteLocation);
router.patch('/:id/toggle-status', requireRole('admin'), toggleLocationStatus);
router.get('/:id/assigned-employees', requireRole('admin'), getLocationAssignedEmployees);

// Employee Location Assignment Routes (Admin only)
router.get('/employee/:employeeId', requireRole('admin'), getEmployeeLocations);
router.post('/employee/:employeeId', requireRole('admin'), assignLocationToEmployee);
router.patch('/employee/:employeeId/policy', requireRole('admin'), updateEmployeeLocationPolicy);
router.put('/assignment/:assignmentId', requireRole('admin'), updateEmployeeLocationAssignment);
router.delete('/assignment/:assignmentId', requireRole('admin'), removeEmployeeLocationAssignment);
router.patch('/assignment/:assignmentId/toggle-status', requireRole('admin'), toggleAssignmentStatus);

export default router;
