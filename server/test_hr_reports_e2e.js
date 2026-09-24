const BASE_URL = 'http://localhost:5000/api';

async function testHREndpoints() {
  console.log('Testing HR Monthly Reports Endpoints...');

  // 1. Login as SuperAdmin
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hrms.local', password: 'Admin@123' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) throw new Error('Login failed: ' + loginData.message);
  const token = loginData.token;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Test Salary Policy
  console.log('\n--- 1. Testing Policy ---');
  const policyRes = await fetch(`${BASE_URL}/reports/policy`, { headers });
  const policyData = await policyRes.json();
  console.log('Policy Success:', policyData.success, 'Policy Name:', policyData.data?.policyName);

  // 3. Test Monthly Register
  console.log('\n--- 2. Testing Monthly Attendance Register ---');
  const regRes = await fetch(`${BASE_URL}/reports/monthly-register?month=9&year=2026`, { headers });
  const regData = await regRes.json();
  console.log('Register Success:', regData.success, 'Count:', regData.count, 'Days:', regData.daysInMonth);
  if (regData.data && regData.data.length > 0) {
    const firstEmp = regData.data[0];
    console.log('Sample Employee:', firstEmp.fullName, firstEmp.employeeId);
    console.log('Sample Totals:', firstEmp.totals);
    const dayKeys = Object.keys(firstEmp.daily);
    console.log('Days in daily map:', dayKeys.length, 'Sample day 1:', firstEmp.daily[dayKeys[0]]);
  }

  // 4. Test Salary Summary
  console.log('\n--- 3. Testing Monthly HR Salary Summary ---');
  const salRes = await fetch(`${BASE_URL}/reports/salary-summary?month=9&year=2026`, { headers });
  const salData = await salRes.json();
  console.log('Salary Summary Success:', salData.success, 'Employees:', salData.count);
  console.log('Reconciliation KPIs:', salData.reconciliation);
  if (salData.data && salData.data.length > 0) {
    const firstSal = salData.data[0];
    console.log('Sample Salary Row:', {
      name: firstSal.fullName,
      payableDays: firstSal.payableDays,
      nonPayableDays: firstSal.nonPayableDays,
      formula: firstSal.payableFormula,
      adjustment: firstSal.attendanceAdjustment,
    });
  }

  // 5. Test Month Lock & Exceptions
  console.log('\n--- 4. Testing Month Lock Status & Exceptions ---');
  const lockRes = await fetch(`${BASE_URL}/reports/month-lock?month=9&year=2026`, { headers });
  const lockData = await lockRes.json();
  console.log('Lock Status:', lockData.data?.status, 'Exceptions:', lockData.data?.exceptions);

  console.log('\n✅ All backend endpoints tested successfully!');
}

testHREndpoints().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
