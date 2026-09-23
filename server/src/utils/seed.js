import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Shift from '../models/Shift.js';
import AuditLog from '../models/AuditLog.js';
import { connectDB, closeDB } from '../config/db.js';
import { syncSuperAdminFromEnv } from './syncSuperAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const seedDatabase = async () => {
  try {
    console.log('🌱 Checking HRMS system base configuration...');

    // 1. Ensure Standard Shift Masters exist
    let generalShift = await Shift.findOne({ shiftCode: 'GEN-01' });
    if (!generalShift) {
      generalShift = await Shift.create({
        shiftName: 'General Day Shift',
        shiftCode: 'GEN-01',
        shiftType: 'GENERAL',
        startTime: '09:30',
        endTime: '18:30',
        gracePeriodMinutes: 15,
        minWorkingHours: 8,
        breakPolicy: { allowedBreaks: 1, maxBreakMinutes: 60 },
        description: 'Standard 9-hour corporate working schedule with 1-hour lunch break.',
      });
      console.log('✅ Created General Day Shift master.');
    }

    let nightShift = await Shift.findOne({ shiftCode: 'NGT-01' });
    if (!nightShift) {
      nightShift = await Shift.create({
        shiftName: 'Night Operations Shift',
        shiftCode: 'NGT-01',
        shiftType: 'NIGHT',
        startTime: '22:00',
        endTime: '06:00',
        gracePeriodMinutes: 15,
        minWorkingHours: 7.5,
        breakPolicy: { allowedBreaks: 1, maxBreakMinutes: 45 },
        description: 'Overnight shift crossing midnight (10:00 PM to 06:00 AM next day).',
      });
      console.log('✅ Created Night Operations Shift master.');
    }

    let splitShift = await Shift.findOne({ shiftCode: 'SPL-01' });
    if (!splitShift) {
      splitShift = await Shift.create({
        shiftName: 'Hospitality Split Shift',
        shiftCode: 'SPL-01',
        shiftType: 'SPLIT',
        startTime: '06:00',
        endTime: '22:00',
        gracePeriodMinutes: 15,
        minWorkingHours: 8,
        breakPolicy: { allowedBreaks: 2, maxBreakMinutes: 30 },
        splitSegments: [
          { segmentName: 'Morning Service', startTime: '06:00', endTime: '10:00' },
          { segmentName: 'Evening Service', startTime: '18:00', endTime: '22:00' },
        ],
        description: 'Split schedule with two distinct duty segments in a single calendar day.',
      });
      console.log('✅ Created Hospitality Split Shift master.');
    }

    // 2. Synchronize SuperAdmin from Environment Variables (no dummy Employee record)
    await syncSuperAdminFromEnv();

    console.log('✨ HRMS system verified. No dummy employees created.');
  } catch (error) {
    console.error('❌ Error during system base verification:', error);
    throw error;
  }
};

// If run directly via node
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    await connectDB();
    await seedDatabase();
    await closeDB();
    process.exit(0);
  })();
}
