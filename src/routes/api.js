import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB, getSecondaryDB, getMongoClient } from '../config/db.js';
import { JWT_SECRET, authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// 1. POST /api/auth/login or /api/login
router.post(['/auth/login', '/login'], async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const db = getDB();
    const user = await db.collection('users').findOne({ 
      $or: [{ username: username.toLowerCase().trim() }, { email: username.toLowerCase().trim() }] 
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedBusId: user.assignedBusId,
      assignedRouteId: user.assignedRouteId,
      studentId: user.studentId
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: tokenPayload
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1b. POST /api/auth/register-driver (Public Registration for Bus Drivers)
router.post('/auth/register-driver', async (req, res) => {
  try {
    const { username, password, name, phone, licenseNumber, licenseExpiry } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: 'Username, password and full name are required.' });
    }

    const db = getDB();
    const existing = await db.collection('users').findOne({
      $or: [{ username: username.toLowerCase().trim() }]
    });

    if (existing) {
      return res.status(409).json({ success: false, message: `Username '${username}' is already registered.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const driverId = `USR-DRV-${Date.now().toString().slice(-4)}`;

    const newDriver = {
      id: driverId,
      username: username.toLowerCase().trim(),
      email: `${username.toLowerCase().trim()}@karunya.edu`,
      password: hashedPassword,
      role: 'DRIVER',
      name: name.trim(),
      licenseNumber: licenseNumber || 'TN-37-APPLIED',
      licenseExpiry: licenseExpiry || '2030-12-31',
      phone: phone || '+91 90000 00000',
      assignedBusId: null, // Awaiting Management assignment
      assignedRouteId: null, // Awaiting Management assignment
      dutyStatus: 'PENDING_ASSIGNMENT',
      createdAt: new Date().toISOString()
    };

    await db.collection('users').insertOne(newDriver);

    // Audit log in secondary database
    const secondaryDb = getSecondaryDB();
    await secondaryDb.collection('audit_logs').insertOne({
      id: `AUD-${Date.now().toString().slice(-4)}`,
      action: 'NEW_DRIVER_REGISTRATION',
      performedBy: `${username} (${name})`,
      details: `New driver registered: ${name} (${username}). Waiting for management route allocation.`,
      timestamp: new Date().toISOString()
    });

    const tokenPayload = {
      id: newDriver.id,
      username: newDriver.username,
      name: newDriver.name,
      email: newDriver.email,
      role: newDriver.role,
      assignedBusId: null,
      assignedRouteId: null
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    res.status(201).json({
      success: true,
      message: 'Driver registration successful! You can now sign in or access your driver cockpit.',
      token,
      user: tokenPayload
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1c. POST /api/auth/register-student (Public Registration for Students with Bus & Stop Choice)
router.post('/auth/register-student', async (req, res) => {
  try {
    const { username, password, name, studentId, department, courseYear, phone, chosenBusId, chosenStopId } = req.body;
    if (!username || !password || !name || !studentId || !chosenBusId) {
      return res.status(400).json({ success: false, message: 'Username, password, student ID, name and selected bus are required.' });
    }

    const db = getDB();
    const existing = await db.collection('users').findOne({
      $or: [{ username: username.toLowerCase().trim() }, { studentId: studentId.trim() }]
    });

    if (existing) {
      return res.status(409).json({ success: false, message: `Username or Student ID is already registered.` });
    }

    // Lookup chosen bus and its route
    const bus = await db.collection('buses').findOne({ id: chosenBusId });
    const assignedRouteId = bus ? bus.assignedRoute : 'Route 1 (Gandhipuram to Karunya Nagar)';

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `USR-STU-${Date.now().toString().slice(-4)}`;
    const regStudentId = studentId.trim().toUpperCase();

    // 1. Create User authentication document
    const newStudentUser = {
      id: userId,
      username: username.toLowerCase().trim(),
      email: `${username.toLowerCase().trim()}@karunya.edu.in`,
      password: hashedPassword,
      role: 'STUDENT',
      name: name.trim(),
      studentId: regStudentId,
      department: department || 'Engineering',
      courseYear: courseYear || 'B.Tech - 1st Year',
      phone: phone || '+91 90000 00000',
      assignedBusId: chosenBusId,
      assignedRouteId: assignedRouteId,
      assignedStopId: chosenStopId || 'Campus Gate / Gandhipuram Stand',
      subscriptionStatus: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    await db.collection('users').insertOne(newStudentUser);

    // 2. Insert into students directory collection for management tracking
    const studentRecord = {
      id: regStudentId,
      name: name.trim(),
      email: newStudentUser.email,
      phone: newStudentUser.phone,
      department: newStudentUser.department,
      courseYear: newStudentUser.courseYear,
      assignedBusId: chosenBusId,
      assignedRouteId: assignedRouteId,
      assignedStopId: newStudentUser.assignedStopId,
      subscriptionStatus: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    await db.collection('students').insertOne(studentRecord);

    // 3. Create initial semester pass fee invoice
    const newInvoice = {
      id: `INV-${Date.now().toString().slice(-5)}`,
      studentId: regStudentId,
      studentName: name.trim(),
      planId: 'FEE-SEM-ODD',
      planTitle: `Semester Transport Pass (${bus ? bus.busNumber || chosenBusId : 'College Bus'})`,
      amount: 14500.00,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'PAID',
      paymentMethod: 'Instant Online Enrollment',
      paidAt: new Date().toISOString(),
      receiptNumber: `KRN-RCPT-${Date.now().toString().slice(-6)}`
    };
    await db.collection('invoices').insertOne(newInvoice);

    // 4. Audit log in secondary database
    const secondaryDb = getSecondaryDB();
    await secondaryDb.collection('audit_logs').insertOne({
      id: `AUD-${Date.now().toString().slice(-4)}`,
      action: 'NEW_STUDENT_ENROLLMENT',
      performedBy: `${username} (${name})`,
      details: `Student ${name} (${regStudentId}) enrolled on ${chosenBusId} & ${assignedRouteId}.`,
      timestamp: new Date().toISOString()
    });

    const tokenPayload = {
      id: newStudentUser.id,
      username: newStudentUser.username,
      name: newStudentUser.name,
      email: newStudentUser.email,
      role: newStudentUser.role,
      assignedBusId: chosenBusId,
      assignedRouteId: assignedRouteId,
      studentId: regStudentId
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    res.status(201).json({
      success: true,
      message: `Enrollment successful! Allocated to ${bus ? bus.busNumber || chosenBusId : 'College Bus'}.`,
      token,
      user: tokenPayload
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const user = await db.collection('users').findOne({ id: req.user.id }, { projection: { password: 0 } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. GET /api/stats (Admin Dashboard Analytics)
router.get('/stats', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const totalBuses = await db.collection('buses').countDocuments();
    const activeBuses = await db.collection('buses').countDocuments({ status: 'ACTIVE' });
    const maintenanceBuses = await db.collection('buses').countDocuments({ status: 'MAINTENANCE' });
    const totalRoutes = await db.collection('routes').countDocuments();
    const activeRoutes = await db.collection('routes').countDocuments({ status: 'ACTIVE' });
    const totalStudents = await db.collection('students').countDocuments();
    const activeStudents = await db.collection('students').countDocuments({ subscriptionStatus: 'ACTIVE' });
    const tripsInProgress = await db.collection('trips').countDocuments({ status: 'IN_PROGRESS' });
    const driversOnDuty = await db.collection('users').countDocuments({ role: 'DRIVER', dutyStatus: 'ON_DUTY' });
    const pendingComplaints = await db.collection('complaints').countDocuments({ status: { $ne: 'RESOLVED' } });

    // Calculate revenue
    const paidInvoices = await db.collection('invoices').find({ status: 'PAID' }).toArray();
    const totalRevenueCollected = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    res.json({
      success: true,
      data: {
        totalBuses,
        activeBuses,
        maintenanceBuses,
        totalRoutes,
        activeRoutes,
        totalStudents,
        activeStudents,
        tripsInProgress,
        driversOnDuty,
        pendingComplaints,
        totalRevenueCollected
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. BUSES CRUD
router.get('/buses', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const buses = await db.collection('buses').find().toArray();
    res.json({ success: true, data: buses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/buses', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const newBus = {
      ...req.body,
      id: req.body.id || `BUS-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString()
    };
    await db.collection('buses').insertOne(newBus);
    res.status(201).json({ success: true, data: newBus, message: 'Bus created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/buses/:id', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    await db.collection('buses').updateOne({ id }, { $set: updateData });
    const updated = await db.collection('buses').findOne({ id });
    res.json({ success: true, data: updated, message: 'Bus updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/buses/:id', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    await db.collection('buses').deleteOne({ id: req.params.id });
    res.json({ success: true, message: 'Bus archived / removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. ROUTES & STOPS
router.get('/routes', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const routes = await db.collection('routes').find().toArray();
    res.json({ success: true, data: routes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/routes', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const newRoute = {
      ...req.body,
      id: req.body.id || `RT-${Date.now().toString().slice(-3)}`,
      createdAt: new Date().toISOString()
    };
    await db.collection('routes').insertOne(newRoute);
    res.status(201).json({ success: true, data: newRoute, message: 'Route configured successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/routes/:id', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    await db.collection('routes').updateOne({ id }, { $set: updateData });
    const updated = await db.collection('routes').findOne({ id });
    res.json({ success: true, data: updated, message: 'Route updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/routes/:id', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    await db.collection('routes').deleteOne({ id: req.params.id });
    res.json({ success: true, message: 'Route removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. STUDENTS DIRECTORY & ALLOCATION
router.get('/students', authenticate, async (req, res) => {
  try {
    const db = getDB();
    // If student role, only return self profile details
    if (req.user.role === 'STUDENT') {
      const student = await db.collection('students').findOne({ email: req.user.email });
      return res.json({ success: true, data: student ? [student] : [] });
    }
    const students = await db.collection('students').find().toArray();
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/students', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const newStudent = {
      ...req.body,
      id: req.body.id || `STU-2024-${Date.now().toString().slice(-3)}`,
      createdAt: new Date().toISOString()
    };
    await db.collection('students').insertOne(newStudent);
    res.status(201).json({ success: true, data: newStudent, message: 'Student registered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/students/:id', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id;

    await db.collection('students').updateOne({ id }, { $set: updateData });
    const updated = await db.collection('students').findOne({ id });
    res.json({ success: true, data: updated, message: 'Student profile updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. DRIVERS DIRECTORY & ROUTE ASSIGNMENT BY MANAGEMENT
router.get('/drivers', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const drivers = await db.collection('users').find({ role: 'DRIVER' }, { projection: { password: 0 } }).toArray();
    res.json({ success: true, data: drivers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Management Assigns Route and Bus to Driver
router.patch('/drivers/:id/assign', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { assignedRouteId, assignedBusId } = req.body;

    const driver = await db.collection('users').findOne({ id });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // 1. Update driver's user record
    await db.collection('users').updateOne(
      { id },
      { $set: { assignedRouteId, assignedBusId, dutyStatus: 'ON_DUTY', updatedAt: new Date().toISOString() } }
    );

    // 2. Reflect on Bus document
    if (assignedBusId) {
      await db.collection('buses').updateOne(
        { id: assignedBusId },
        { $set: { assignedDriver: driver.name, assignedRoute: assignedRouteId } }
      );
    }

    // 3. Reflect on Route document
    if (assignedRouteId) {
      await db.collection('routes').updateOne(
        { id: assignedRouteId },
        { $set: { assignedDriver: driver.name, assignedBusId: assignedBusId || driver.assignedBusId } }
      );
    }

    // 4. Update existing trips OR create an active scheduled trip for this driver on the assigned route
    const existingTrip = await db.collection('trips').findOne({
      $or: [{ driverId: id }, { driverName: driver.name }]
    });

    if (existingTrip) {
      await db.collection('trips').updateMany(
        { $or: [{ driverId: id }, { driverName: driver.name }] },
        { 
          $set: { 
            routeId: assignedRouteId, 
            routeName: assignedRouteId, 
            busId: assignedBusId,
            busRegNumber: assignedBusId,
            driverId: id,
            driverName: driver.name,
            updatedAt: new Date().toISOString()
          } 
        }
      );
    } else {
      // Create an initial active trip record so driver cockpit immediately displays their schedule
      const newTrip = {
        id: `TRP-${Date.now().toString().slice(-4)}`,
        routeId: assignedRouteId,
        routeName: assignedRouteId,
        busId: assignedBusId || driver.assignedBusId || 'BUS-1',
        busRegNumber: assignedBusId || driver.assignedBusId || 'College Bus',
        driverId: id,
        driverName: driver.name,
        type: 'MORNING_PICKUP',
        scheduledDate: new Date().toISOString().split('T')[0],
        startTime: '07:15 AM',
        endTime: '08:15 AM',
        status: 'IN_PROGRESS',
        totalAssignedStudents: 45,
        boardedCount: 0,
        createdAt: new Date().toISOString()
      };
      await db.collection('trips').insertOne(newTrip);
    }

    // 5. Audit log in secondary database
    const secondaryDb = getSecondaryDB();
    await secondaryDb.collection('audit_logs').insertOne({
      id: `AUD-${Date.now().toString().slice(-4)}`,
      action: 'DRIVER_ROUTE_REASSIGNMENT',
      performedBy: `${req.user.username} (${req.user.name})`,
      details: `Reassigned ${driver.name} to ${assignedRouteId} and vehicle ${assignedBusId}.`,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Successfully allocated Driver ${driver.name} to ${assignedRouteId} and vehicle ${assignedBusId}.`,
      data: { id, assignedRouteId, assignedBusId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. TRIPS & LIVE TRACKING SIMULATION
router.get('/trips', authenticate, async (req, res) => {
  try {
    const db = getDB();
    let query = {};
    if (req.user.role === 'DRIVER') {
      // Find trips assigned either by driver's unique ID, username, or full driver name
      query = {
        $or: [
          { driverId: req.user.id },
          { driverName: req.user.name },
          { driverName: { $regex: req.user.name.split(' ')[0], $options: 'i' } }
        ]
      };
    }
    const trips = await db.collection('trips').find(query).toArray();
    res.json({ success: true, data: trips });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/trips', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const newTrip = {
      ...req.body,
      id: `TRP-${Date.now().toString().slice(-4)}`,
      status: 'SCHEDULED',
      createdAt: new Date().toISOString()
    };
    await db.collection('trips').insertOne(newTrip);
    res.status(201).json({ success: true, data: newTrip, message: 'Trip scheduled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Driver updates trip status (e.g. Start Trip, End Trip)
router.patch('/trips/:id/status', authenticate, authorize('DRIVER', 'SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { status } = req.body;
    await db.collection('trips').updateOne({ id }, { $set: { status, updatedAt: new Date().toISOString() } });
    res.json({ success: true, message: `Trip status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Driver or Demo GPS Simulation update
router.post('/tracking/update', authenticate, authorize('DRIVER', 'SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const { busId, lat, lng, speed, stopName } = req.body;
    await db.collection('buses').updateOne(
      { id: busId },
      { $set: { currentLat: lat, currentLng: lng, speedKmh: speed, lastLocationUpdate: new Date().toISOString() } }
    );
    res.json({ success: true, message: 'GPS coordinates broadcasted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. ATTENDANCE & BOARDING
router.get('/attendance', authenticate, async (req, res) => {
  try {
    const db = getDB();
    let query = {};
    if (req.user.role === 'STUDENT') {
      const student = await db.collection('students').findOne({ email: req.user.email });
      query.studentId = student ? student.id : req.user.id;
    }
    const records = await db.collection('attendance').find(query).sort({ timestamp: -1 }).toArray();
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/attendance', authenticate, authorize('DRIVER', 'SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const newRecord = {
      ...req.body,
      id: `ATT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      verifiedBy: req.user.name + ` (${req.user.role})`
    };
    await db.collection('attendance').insertOne(newRecord);
    // Increment boarded count in active trip
    if (req.body.tripId) {
      await db.collection('trips').updateOne({ id: req.body.tripId }, { $inc: { boardedCount: 1 } });
    }
    res.status(201).json({ success: true, data: newRecord, message: 'Boarding verified and recorded.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. INVOICES & DEMO PAYMENTS
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const db = getDB();
    let query = {};
    if (req.user.role === 'STUDENT') {
      const student = await db.collection('students').findOne({ email: req.user.email });
      query.studentId = student ? student.id : req.user.id;
    }
    const invoices = await db.collection('invoices').find(query).toArray();
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/invoices/pay/:id', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { paymentMethod } = req.body;
    const receiptNumber = `RCPT-DEMO-${Date.now().toString().slice(-6)}`;
    
    await db.collection('invoices').updateOne(
      { id },
      { 
        $set: { 
          status: 'PAID', 
          paymentMethod: paymentMethod || 'Instant Demo Campus Wallet Pay',
          paidAt: new Date().toISOString(),
          receiptNumber
        } 
      }
    );

    res.json({ 
      success: true, 
      message: 'Demo Payment processed successfully and receipt issued.', 
      receiptNumber 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 11. COMPLAINTS & LOST PROPERTY
router.get('/complaints', authenticate, async (req, res) => {
  try {
    const db = getDB();
    let query = {};
    if (req.user.role === 'STUDENT') {
      query.submittedBy = { $regex: req.user.name, $options: 'i' };
    }
    const complaints = await db.collection('complaints').find(query).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, data: complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/complaints', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const newComplaint = {
      ...req.body,
      id: `CMP-${Date.now().toString().slice(-4)}`,
      submittedBy: `${req.user.name} (${req.user.studentId || req.user.role})`,
      status: 'OPEN',
      resolutionNotes: '',
      createdAt: new Date().toISOString()
    };
    await db.collection('complaints').insertOne(newComplaint);
    res.status(201).json({ success: true, data: newComplaint, message: 'Ticket submitted to Transport Helpdesk.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/complaints/:id/status', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { status, resolutionNotes } = req.body;
    await db.collection('complaints').updateOne(
      { id },
      { $set: { status, resolutionNotes, resolvedAt: new Date().toISOString() } }
    );
    res.json({ success: true, message: 'Ticket status and resolution updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 12. MAINTENANCE
router.get('/maintenance', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const records = await db.collection('maintenance').find().sort({ scheduledDate: -1 }).toArray();
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/maintenance', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const newRecord = {
      ...req.body,
      id: `MNT-${Date.now().toString().slice(-3)}`,
      createdAt: new Date().toISOString()
    };
    await db.collection('maintenance').insertOne(newRecord);
    res.status(201).json({ success: true, data: newRecord, message: 'Maintenance record logged' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 13. ANNOUNCEMENTS
router.get('/announcements', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const announcements = await db.collection('announcements').find().sort({ createdAt: -1 }).toArray();
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/announcements', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const newAnnouncement = {
      ...req.body,
      id: `ANN-${Date.now().toString().slice(-3)}`,
      createdAt: new Date().toISOString()
    };
    await db.collection('announcements').insertOne(newAnnouncement);
    res.status(201).json({ success: true, data: newAnnouncement, message: 'Announcement broadcasted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 14. REPORTS & ANALYTICS (CSV and Summary)
router.get('/reports/summary', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const buses = await db.collection('buses').find().toArray();
    const students = await db.collection('students').find().toArray();
    const routes = await db.collection('routes').find().toArray();
    const invoices = await db.collection('invoices').find().toArray();
    const attendance = await db.collection('attendance').find().toArray();
    const maintenance = await db.collection('maintenance').find().toArray();
    const complaints = await db.collection('complaints').find().toArray();

    const totalFleetCapacity = buses.reduce((acc, b) => acc + (Number(b.capacity) || 0), 0);
    const totalStudentsAllocated = students.filter(s => s.assignedRouteId).length;
    const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
    const totalMaintenanceExpense = maintenance.reduce((acc, m) => acc + (Number(m.cost) || 0), 0);

    res.json({
      success: true,
      data: {
        totalBuses: buses.length,
        totalFleetCapacity,
        totalStudents: students.length,
        totalStudentsAllocated,
        occupancyRate: totalFleetCapacity ? Math.round((totalStudentsAllocated / totalFleetCapacity) * 100) : 0,
        totalRoutes: routes.length,
        totalRevenue,
        totalMaintenanceExpense,
        netOperationalMargin: totalRevenue - totalMaintenanceExpense,
        totalAttendanceEvents: attendance.length,
        totalComplaints: complaints.length,
        resolvedComplaints: complaints.filter(c => c.status === 'RESOLVED').length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// CSV Export for Students, Fleet, or Financials
router.get('/reports/export/:type', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const db = getDB();
    const { type } = req.params;
    let csv = '';

    if (type === 'students') {
      const records = await db.collection('students').find().toArray();
      csv = 'Student ID,Name,Email,Department,Course Year,Assigned Route,Pickup Stop,Status\n';
      records.forEach(r => {
        csv += `"${r.id}","${r.name}","${r.email}","${r.department}","${r.courseYear}","${r.assignedRouteId || ''}","${r.assignedStopId || ''}","${r.subscriptionStatus}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="students_report.csv"');
      return res.send(csv);
    } else if (type === 'buses') {
      const records = await db.collection('buses').find().toArray();
      csv = 'Bus ID,Registration Number,Model,Capacity,Fuel Type,Status,Assigned Driver,Route,Fitness Expiry\n';
      records.forEach(r => {
        csv += `"${r.id}","${r.regNumber}","${r.model}","${r.capacity}","${r.fuelType}","${r.status}","${r.assignedDriver}","${r.assignedRoute}","${r.fitnessCertExpiry}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="fleet_report.csv"');
      return res.send(csv);
    } else if (type === 'financials') {
      const records = await db.collection('invoices').find().toArray();
      csv = 'Invoice ID,Student ID,Student Name,Plan Title,Amount,Status,Receipt Number,Paid At\n';
      records.forEach(r => {
        csv += `"${r.id}","${r.studentId}","${r.studentName}","${r.planTitle}","${r.amount}","${r.status}","${r.receiptNumber || ''}","${r.paidAt || ''}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="financial_invoices_report.csv"');
      return res.send(csv);
    }

    res.status(400).json({ success: false, message: 'Invalid report type requested' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 15. SECONDARY DATABASE ENDPOINTS (Audit Logs & Fuel Records)
router.get('/archive/audit-logs', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const secondaryDb = getSecondaryDB();
    const logs = await secondaryDb.collection('audit_logs').find().sort({ timestamp: -1 }).toArray();
    res.json({
      success: true,
      database: secondaryDb.databaseName,
      data: logs
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/archive/audit-logs', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const secondaryDb = getSecondaryDB();
    const newLog = {
      ...req.body,
      id: `AUD-${Date.now().toString().slice(-4)}`,
      performedBy: `${req.user.username} (${req.user.name})`,
      timestamp: new Date().toISOString()
    };
    await secondaryDb.collection('audit_logs').insertOne(newLog);
    res.status(201).json({
      success: true,
      database: secondaryDb.databaseName,
      data: newLog,
      message: 'Audit event persisted to secondary archive database'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/archive/fuel-logs', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const secondaryDb = getSecondaryDB();
    const fuel = await secondaryDb.collection('fuel_logs').find().sort({ timestamp: -1 }).toArray();
    res.json({
      success: true,
      database: secondaryDb.databaseName,
      data: fuel
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 16. DYNAMIC DATABASE CONNECTION SWITCHER ENDPOINT
router.post('/database/connect', authenticate, authorize('SUPER_ADMIN', 'TRANSPORT_ADMIN'), async (req, res) => {
  try {
    const { uri, databaseName } = req.body;
    if (!databaseName) {
      return res.status(400).json({ success: false, message: 'databaseName is required' });
    }

    const client = getMongoClient();
    let targetDb;

    if (uri) {
      // Connect to external custom MongoDB endpoint / cluster
      const customClient = new (await import('mongodb')).MongoClient(uri);
      await customClient.connect();
      targetDb = customClient.db(databaseName);
    } else {
      // Create / switch to another database on the current active MongoDB server
      targetDb = client.db(databaseName);
    }

    // Ping test
    const ping = await targetDb.command({ ping: 1 });

    res.json({
      success: true,
      message: `Successfully connected to target database '${databaseName}'`,
      databaseName,
      ping
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Failed to connect to database: ${err.message}` });
  }
});

export default router;
