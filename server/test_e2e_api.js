const BASE_URL = 'http://localhost:5000/api';

async function req(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

async function runTests() {
  console.log('🚀 Starting Automated Full-Flow E2E API Verification with native fetch...\n');

  try {
    // 1. Health check
    const health = await req('/health');
    console.log('✅ Health Check:', health);

    // 2. Login as Employee John Doe
    console.log('\n--- 1. Testing Employee Authentication ---');
    const empLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'john@hrms.local',
        password: 'Emp@123',
      }),
    });
    console.log('✅ Employee Login Successful:', empLogin.user.email, 'Role:', empLogin.user.role);
    const empToken = empLogin.token;
    const empHeaders = { Authorization: `Bearer ${empToken}` };

    // 3. Fetch Today's Shift & Attendance
    console.log('\n--- 2. Testing Today Attendance Query ---');
    const todayRes = await req('/attendance/today', { headers: empHeaders });
    console.log('✅ Today Shift:', todayRes.shift.shiftName, 'Start:', todayRes.shift.startTime, 'End:', todayRes.shift.endTime);

    // Sample Photo SVG Data URI
    const dummyPhoto = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="blue" width="100" height="100"/></svg>';

    // 4. Punch Check In
    console.log('\n--- 3. Testing Check-In Punch ---');
    const checkInRes = await req('/attendance/punch', {
      method: 'POST',
      headers: empHeaders,
      body: JSON.stringify({
        eventType: 'CHECK_IN',
        latitude: 28.6139,
        longitude: 77.2090,
        accuracy: 12,
        photoUrl: dummyPhoto,
      }),
    });
    console.log('✅ Check-In Recorded:', checkInRes.message);
    console.log('   Status:', checkInRes.data.summary.status);

    // 5. Punch Break Start
    console.log('\n--- 4. Testing Break Start Punch ---');
    const breakStartRes = await req('/attendance/punch', {
      method: 'POST',
      headers: empHeaders,
      body: JSON.stringify({
        eventType: 'BREAK_START',
        latitude: 28.6140,
        longitude: 77.2091,
        accuracy: 15,
        photoUrl: dummyPhoto,
        breakType: 'LUNCH',
      }),
    });
    console.log('✅ Break Start Recorded:', breakStartRes.message);
    console.log('   Status:', breakStartRes.data.summary.status);

    // 6. Punch Break End
    console.log('\n--- 5. Testing Break End Punch ---');
    const breakEndRes = await req('/attendance/punch', {
      method: 'POST',
      headers: empHeaders,
      body: JSON.stringify({
        eventType: 'BREAK_END',
        latitude: 28.6141,
        longitude: 77.2089,
        accuracy: 10,
        photoUrl: dummyPhoto,
      }),
    });
    console.log('✅ Break End Recorded:', breakEndRes.message);
    console.log('   Status:', breakEndRes.data.summary.status);

    // 7. Punch Check Out
    console.log('\n--- 6. Testing Check-Out Punch ---');
    const checkOutRes = await req('/attendance/punch', {
      method: 'POST',
      headers: empHeaders,
      body: JSON.stringify({
        eventType: 'CHECK_OUT',
        latitude: 28.6139,
        longitude: 77.2090,
        accuracy: 11,
        photoUrl: dummyPhoto,
      }),
    });
    console.log('✅ Check-Out Recorded:', checkOutRes.message);
    console.log('   Final Status:', checkOutRes.data.summary.status);
    console.log('   Working Hours:', checkOutRes.data.summary.workingHours);

    // 8. Admin Login
    console.log('\n--- 7. Testing Admin Authentication & Dashboard ---');
    const adminLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@hrms.local',
        password: 'Admin@123',
      }),
    });
    console.log('✅ Admin Login Successful:', adminLogin.user.email);
    const adminHeaders = { Authorization: `Bearer ${adminLogin.token}` };

    // 9. Admin Attendance & KPIs
    const allAttendance = await req('/attendance/all', { headers: adminHeaders });
    console.log('✅ Admin KPIs:', allAttendance.kpis);
    console.log('   Today Records Count:', allAttendance.data.length);

    // 10. Reports
    console.log('\n--- 8. Testing Reports Endpoints ---');
    const dailyRep = await req('/reports/daily', { headers: adminHeaders });
    console.log('✅ Daily Report rows:', dailyRep.count);

    const monthlyRep = await req('/reports/monthly', { headers: adminHeaders });
    console.log('✅ Monthly Report rows:', monthlyRep.count);

    const lateRep = await req('/reports/late', { headers: adminHeaders });
    console.log('✅ Late Report rows:', lateRep.count);

    const breakRep = await req('/reports/breaks', { headers: adminHeaders });
    console.log('✅ Break Report rows:', breakRep.count);

    // 11. Audit Logs
    console.log('\n--- 9. Testing Audit Trail ---');
    const auditRes = await req('/audit-logs', { headers: adminHeaders });
    console.log('✅ Total Audit Logs:', auditRes.total);
    console.log('   Latest Action:', auditRes.data[0]?.action, 'by', auditRes.data[0]?.performedByName);

    console.log('\n🎉 ALL FULL-FLOW E2E TESTS PASSED 100% SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

runTests();
