import AuditLog from '../models/AuditLog.js';

export const logAudit = async ({
  req,
  performedBy,
  performedByName,
  action,
  targetModel = '',
  targetId = '',
  targetIdentifier = '',
  details = '',
  beforeValue = null,
  afterValue = null,
}) => {
  try {
    const ipAddress = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers?.['user-agent'] || '';

    await AuditLog.create({
      performedBy: performedBy || req?.user?._id,
      performedByName: performedByName || req?.user?.fullName || req?.user?.email || 'Admin',
      action,
      targetRecord: {
        model: targetModel,
        id: targetId ? targetId.toString() : '',
        identifier: targetIdentifier,
      },
      details,
      beforeValue,
      afterValue,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('Audit logging failed:', error.message);
  }
};
