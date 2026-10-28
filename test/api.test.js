import assert from 'assert';
import http from 'http';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log(' Starting UniTransit (Karunya University) Tests');
  console.log('======================================================\n');

  // Test 1: Health check
  console.log('Test 1: Health check endpoint...');
  const health = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  });
  assert.strictEqual(health.status, 200);
  console.log(' Passed: API online.');

  // Test 2: Transport Admin Login
  console.log('\nTest 2: Transport Admin Login authentication...');
  const adminLogin = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'transportadmin', password: 'password123' });

  assert.strictEqual(adminLogin.status, 200);
  assert.strictEqual(adminLogin.data.success, true);
  const adminToken = adminLogin.data.token;
  console.log(' Passed: Transport Admin authenticated.');

  // Test 3: Student Login (Rahul)
  console.log('\nTest 3: Student Login authentication (Rahul Krishnan)...');
  const studentLogin = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'student.rahul', password: 'password123' });

  assert.strictEqual(studentLogin.status, 200);
  assert.strictEqual(studentLogin.data.user.role, 'STUDENT');
  const studentToken = studentLogin.data.token;
  console.log(' Passed: Student authenticated.');

  // Test 4: Driver Login (Muthuswamy)
  console.log('\nTest 4: Driver Login authentication (Muthuswamy)...');
  const driverLogin = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'driver.muthu', password: 'password123' });

  assert.strictEqual(driverLogin.status, 200);
  assert.strictEqual(driverLogin.data.user.role, 'DRIVER');
  const driverToken = driverLogin.data.token;
  console.log(' Passed: Driver authenticated.');

  // Test 5: RBAC Security verification
  console.log('\nTest 5: RBAC Security verification (Student cannot add bus)...');
  const forbiddenCreateBus = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/buses',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  }, { regNumber: 'TN-37-UNAUTHORIZED', capacity: 30 });

  assert.strictEqual(forbiddenCreateBus.status, 403);
  console.log(' Passed: HTTP 403 Forbidden correctly returned.');

  // Test 6: Verify Buses 1 to 10
  console.log('\nTest 6: Verify authentic Karunya Buses 1 to 10...');
  const busesRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/buses',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(busesRes.status, 200);
  assert.ok(busesRes.data.data.length >= 10, 'Must have at least 10 buses seeded (Bus 1 to 10)');
  console.log(` Passed: Verified ${busesRes.data.data.length} buses registered in fleet.`);

  // Test 7: Verify Karunya Nagar to Coimbatore Routes
  console.log('\nTest 7: Verify Karunya Nagar to Coimbatore routes...');
  const routesRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/routes',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(routesRes.status, 200);
  assert.ok(routesRes.data.data.length >= 10, 'Must have at least 10 routes active in Karunya network');
  console.log(` Passed: Verified ${routesRes.data.data.length} Coimbatore corridors active (1 to 10).`);

  // Test 8: Driver marking student attendance
  console.log('\nTest 8: Driver marking student attendance on active trip...');
  const attendanceRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/attendance',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    }
  }, {
    tripId: 'TRP-101',
    studentId: 'URK22CS1045',
    studentName: 'Rahul Krishnan',
    routeId: 'RT-1',
    stopName: 'Gandhipuram Central Bus Stand',
    eventType: 'BOARDED'
  });
  assert.strictEqual(attendanceRes.status, 201);
  console.log(' Passed: Attendance event recorded.');

  // Test 9: Reports summary calculation
  console.log('\nTest 9: Admin generating transport reports summary...');
  const reportSummary = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/reports/summary',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(reportSummary.status, 200);
  assert.ok(reportSummary.data.data.totalFleetCapacity >= 500);
  console.log(` Passed: Summary verified (Fleet capacity: ${reportSummary.data.data.totalFleetCapacity} seats).`);

  // Test 10: Reports CSV export endpoint
  console.log('\nTest 10: Admin exporting buses CSV file...');
  const exportRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/reports/export/buses',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(exportRes.status, 200);
  assert.ok(typeof exportRes.data === 'string' && exportRes.data.includes('Bus ID,Registration Number'));
  console.log(' Passed: Fleet CSV export generated with valid headers.');

  // Test 11: Secondary Database Archive endpoint verification
  console.log('\nTest 11: Verify Secondary MongoDB Database (/api/archive/audit-logs)...');
  const auditRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/archive/audit-logs',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(auditRes.status, 200);
  assert.strictEqual(auditRes.data.database, 'unitransit_karunya_archive_db');
  assert.ok(auditRes.data.data.length >= 2);
  console.log(` Passed: Connected to secondary database '${auditRes.data.database}' with ${auditRes.data.data.length} audit records.`);

  // Test 12: Dynamic Database Connection Switcher endpoint
  console.log('\nTest 12: Dynamic Database Switcher endpoint (/api/database/connect)...');
  const switchDbRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/database/connect',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}` 
    }
  }, {
    databaseName: 'karunya_eval_testing_db'
  });
  assert.strictEqual(switchDbRes.status, 200);
  assert.strictEqual(switchDbRes.data.success, true);
  assert.strictEqual(switchDbRes.data.databaseName, 'karunya_eval_testing_db');
  console.log(` Passed: Dynamic endpoint created and pinged target database 'karunya_eval_testing_db'.`);

  // Test 13: Multi-User Driver & Student Logins (driver1, driver2, student1, student2)
  console.log('\nTest 13: Multi-User Driver & Student Authentication (driver1, driver2, student1, student2)...');
  const d1 = await request({ host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { username: 'driver1', password: 'driver1' });
  assert.strictEqual(d1.status, 200);
  assert.strictEqual(d1.data.user.role, 'DRIVER');
  assert.strictEqual(d1.data.user.assignedBusId, 'BUS-1');

  const d2 = await request({ host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { username: 'driver2', password: 'driver2' });
  assert.strictEqual(d2.status, 200);
  assert.strictEqual(d2.data.user.role, 'DRIVER');
  assert.strictEqual(d2.data.user.assignedBusId, 'BUS-2');

  const s1 = await request({ host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { username: 'student1', password: 'student1' });
  assert.strictEqual(s1.status, 200);
  assert.strictEqual(s1.data.user.role, 'STUDENT');
  assert.strictEqual(s1.data.user.studentId, 'URK22CS1045');

  const s2 = await request({ host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { username: 'student2', password: 'student2' });
  assert.strictEqual(s2.status, 200);
  assert.strictEqual(s2.data.user.role, 'STUDENT');
  assert.strictEqual(s2.data.user.studentId, 'URK23AI1012');
  console.log(' Passed: Multi-user accounts driver1, driver2, student1, student2 verified successfully.');

  // Test 14: Driver Self-Registration & Management Route Assignment
  console.log('\nTest 14: Driver Self-Registration & Management Route Assignment...');
  const testDriverUser = `driver.test.${Date.now().toString().slice(-4)}`;
  const newDriverReg = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/auth/register-driver',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'S. Kumaran',
    username: testDriverUser,
    password: 'password123',
    licenseNumber: 'TN-37-20220019245',
    phone: '+91 98422 99887'
  });
  assert.strictEqual(newDriverReg.status, 201);
  assert.strictEqual(newDriverReg.data.user.role, 'DRIVER');
  const kumaranId = newDriverReg.data.user.id;
  console.log(' Passed: Driver registered successfully.');

  // Management assigns Route 5 and Bus 5 to newly registered driver
  const assignRouteRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/drivers/${kumaranId}/assign`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, {
    assignedRouteId: 'Route 5 (Saibaba Colony & RS Puram to Karunya)',
    assignedBusId: 'BUS-5'
  });
  assert.strictEqual(assignRouteRes.status, 200);
  assert.strictEqual(assignRouteRes.data.data.assignedBusId, 'BUS-5');
  console.log(' Passed: Management successfully assigned Route 5 and Bus 5 to driver.');

  // Test 15: Student Self-Registration choosing their Bus
  console.log('\nTest 15: Student Self-Registration with Chosen Bus...');
  const testStuUser = `student.test.${Date.now().toString().slice(-4)}`;
  const testStuId = `URK24CS${Date.now().toString().slice(-4)}`;
  const newStudentReg = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/auth/register-student',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'K. Vignesh',
    studentId: testStuId,
    department: 'Computer Science & Engineering',
    username: testStuUser,
    password: 'password123',
    chosenBusId: 'BUS-4',
    chosenStopId: 'Peelamedu PSG Tech Junction'
  });
  assert.strictEqual(newStudentReg.status, 201);
  assert.strictEqual(newStudentReg.data.user.role, 'STUDENT');
  assert.strictEqual(newStudentReg.data.user.assignedBusId, 'BUS-4');
  console.log(' Passed: Student registered with designated Bus 4 and pass invoice generated.');

  console.log('\n======================================================');
  console.log(' ALL 15/15 REALTIME REGISTRATION & ROUTE ALLOCATION TESTS PASSED');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
