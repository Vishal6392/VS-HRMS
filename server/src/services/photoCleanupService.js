import AttendanceEvent from '../models/AttendanceEvent.js';
import AttendanceSummary from '../models/AttendanceSummary.js';

/**
 * Automatically cleans up base64/photo URLs from attendance records
 * that are older than retentionDays (default: 40 days).
 * Keeps timestamps, GPS lat/long, hours, and attendance logs 100% intact.
 */
export const cleanupExpiredPhotos = async (retentionDays = 40) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // 1. Clear photoUrl in AttendanceEvents older than 40 days
    const eventResult = await AttendanceEvent.updateMany(
      {
        timestamp: { $lt: cutoffDate },
        photoUrl: { $nin: ['', null] },
      },
      {
        $set: { photoUrl: '' },
      }
    );

    // 2. Clear embedded event photoUrls in AttendanceSummaries older than 40 days
    const summaryResult = await AttendanceSummary.updateMany(
      {
        createdAt: { $lt: cutoffDate },
        'events.photoUrl': { $nin: ['', null] },
      },
      {
        $set: { 'events.$[].photoUrl': '' },
      }
    );

    const totalCleared = eventResult.modifiedCount + summaryResult.modifiedCount;
    if (totalCleared > 0) {
      console.log(
        `🧹 Auto-cleanup: Removed photo data from ${totalCleared} record(s) older than ${retentionDays} days. (MongoDB storage optimized)`
      );
    }

    return {
      success: true,
      clearedCount: totalCleared,
      cutoffDate,
      retentionDays,
    };
  } catch (error) {
    console.error('Photo cleanup routine error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Schedules daily background photo cleanup
 */
export const startPhotoCleanupJob = () => {
  // Run once shortly after server startup (5 seconds delay)
  setTimeout(() => {
    cleanupExpiredPhotos(40);
  }, 5000);

  // Run every 24 hours (86,400,000 ms)
  setInterval(() => {
    cleanupExpiredPhotos(40);
  }, 24 * 60 * 60 * 1000);
};

export default { cleanupExpiredPhotos, startPhotoCleanupJob };
