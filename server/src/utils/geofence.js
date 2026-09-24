import EmployeeLocationAssignment from '../models/EmployeeLocationAssignment.js';
import Location from '../models/Location.js';

/**
 * Calculates geographic distance between two sets of coordinates using the Haversine formula.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters rounded to nearest integer
 */
export const calculateDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const pLat1 = Number(lat1);
  const pLon1 = Number(lon1);
  const pLat2 = Number(lat2);
  const pLon2 = Number(lon2);

  if (isNaN(pLat1) || isNaN(pLon1) || isNaN(pLat2) || isNaN(pLon2)) {
    return Infinity;
  }

  const R = 6371000; // Mean radius of the Earth in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(pLat2 - pLat1);
  const dLon = toRad(pLon2 - pLon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pLat1)) * Math.cos(toRad(pLat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * Validates employee's current coordinates against their assigned geofences.
 * @param {Object} params
 * @param {Object} params.employee - Populated or queried Employee document
 * @param {number} params.latitude - Employee's current latitude
 * @param {number} params.longitude - Employee's current longitude
 * @param {number} params.accuracy - Employee's GPS accuracy in meters
 * @param {Date} [params.punchDate] - Date of attendance event (default: now)
 * @returns {Promise<Object>} Validation result
 */
export const validateEmployeeGeofence = async ({
  employee,
  latitude,
  longitude,
  accuracy = 0,
  punchDate = new Date(),
}) => {
  if (!employee) {
    return {
      allowed: false,
      reason: 'EMPLOYEE_NOT_FOUND',
      message: 'Employee profile is required for geofence validation.',
    };
  }

  const policy = employee.attendanceLocationPolicy || 'ASSIGNED_LOCATIONS';

  // 1. ANYWHERE policy: exempt from geo-fencing
  if (policy === 'ANYWHERE') {
    return {
      allowed: true,
      geofenceStatus: 'EXEMPT',
      matchedLocation: null,
      matchedLocationName: 'Anywhere (Exempt)',
      distance: 0,
      policy,
      message: 'Attendance location policy set to ANYWHERE. Geofence exemption active.',
    };
  }

  if (latitude === undefined || longitude === undefined || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
    return {
      allowed: false,
      reason: 'MISSING_COORDINATES',
      message: 'GPS latitude and longitude coordinates are required to mark attendance.',
    };
  }

  const currentLat = Number(latitude);
  const currentLng = Number(longitude);
  const currentAccuracy = Number(accuracy) || 0;

  // 2. Fetch all active assignments for this employee
  const assignments = await EmployeeLocationAssignment.find({
    employeeId: employee._id,
    status: 'ACTIVE',
  }).populate('locationId');

  const nowTime = new Date(punchDate).getTime();

  // 3. Filter valid assignments by date and policy
  const eligibleLocations = [];

  for (const asg of assignments) {
    const loc = asg.locationId;
    if (!loc || loc.status !== 'ACTIVE') {
      continue;
    }

    // Temporary location validity dates check
    if (asg.validFrom) {
      const fromDate = new Date(asg.validFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (nowTime < fromDate.getTime()) {
        continue; // Not yet valid
      }
    }

    if (asg.validTill) {
      const tillDate = new Date(asg.validTill);
      tillDate.setHours(23, 59, 59, 999);
      if (nowTime > tillDate.getTime()) {
        continue; // Assignment expired
      }
    }

    // Policy filtering
    if (policy === 'OFFICE_ONLY' && loc.locationType !== 'OFFICE') {
      continue;
    }
    if (policy === 'WFH_ONLY' && loc.locationType !== 'WFH') {
      continue;
    }

    eligibleLocations.push({
      assignment: asg,
      location: loc,
    });
  }

  // 4. If no eligible assigned locations found
  if (eligibleLocations.length === 0) {
    let policyDesc = 'Assigned Locations';
    if (policy === 'OFFICE_ONLY') policyDesc = 'Office Locations';
    if (policy === 'WFH_ONLY') policyDesc = 'Work From Home (WFH) Locations';

    return {
      allowed: false,
      reason: 'NO_ASSIGNED_LOCATIONS',
      policy,
      message: `No active ${policyDesc} are currently assigned or valid for your profile. Please contact HR to assign an authorized work location.`,
    };
  }

  // 5. Calculate distance to each eligible location
  const evaluatedLocations = eligibleLocations.map(({ assignment, location }) => {
    const distance = calculateDistanceInMeters(
      currentLat,
      currentLng,
      location.latitude,
      location.longitude
    );
    const isInsideRadius = distance <= location.allowedRadiusMeters;
    const isAccuracyAcceptable =
      !currentAccuracy ||
      !location.minimumGpsAccuracyMeters ||
      currentAccuracy <= location.minimumGpsAccuracyMeters;

    return {
      assignment,
      location,
      distance,
      allowedRadius: location.allowedRadiusMeters,
      minAccuracyRequired: location.minimumGpsAccuracyMeters || 50,
      isInsideRadius,
      isAccuracyAcceptable,
    };
  });

  // Find all locations inside their allowed radius
  const insideLocations = evaluatedLocations.filter((item) => item.isInsideRadius);

  if (insideLocations.length > 0) {
    // If multiple locations match, select the closest one
    insideLocations.sort((a, b) => a.distance - b.distance);
    const bestMatch = insideLocations[0];

    // Check GPS accuracy for the matched location
    if (!bestMatch.isAccuracyAcceptable) {
      return {
        allowed: false,
        reason: 'POOR_GPS_ACCURACY',
        matchedLocation: bestMatch.location,
        matchedLocationName: bestMatch.location.locationName,
        distance: bestMatch.distance,
        allowedRadius: bestMatch.allowedRadius,
        currentAccuracy: Math.round(currentAccuracy),
        requiredAccuracy: bestMatch.minAccuracyRequired,
        message: `Your current GPS accuracy (±${Math.round(currentAccuracy)}m) is too low for ${bestMatch.location.locationName}. Required accuracy is within ±${bestMatch.minAccuracyRequired}m. Please enable high-accuracy location and try again.`,
      };
    }

    return {
      allowed: true,
      geofenceStatus: 'ALLOWED',
      matchedLocation: bestMatch.location,
      matchedLocationName: bestMatch.location.locationName,
      distance: bestMatch.distance,
      allowedRadius: bestMatch.allowedRadius,
      accuracy: currentAccuracy,
      policy,
      message: `Location verified at ${bestMatch.location.locationName} (${bestMatch.distance}m from center).`,
    };
  }

  // 6. Outside all valid assigned locations
  evaluatedLocations.sort((a, b) => a.distance - b.distance);
  const nearest = evaluatedLocations[0];
  const outsideMeters = Math.max(1, Math.round(nearest.distance - nearest.allowedRadius));

  return {
    allowed: false,
    reason: 'OUTSIDE_GEOFENCE',
    nearestLocation: nearest.location,
    distance: nearest.distance,
    allowedRadius: nearest.allowedRadius,
    outsideMeters,
    policy,
    message: `You are ${outsideMeters} meters outside the allowed attendance area. Nearest approved location: ${nearest.location.locationName} (Distance: ${nearest.distance}m, Allowed: ${nearest.allowedRadius}m).`,
  };
};
