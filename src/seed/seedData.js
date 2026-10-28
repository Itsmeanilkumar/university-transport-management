import bcrypt from 'bcryptjs';
import { getDB, getSecondaryDB } from '../config/db.js';

export async function seedDatabase() {
  const db = getDB();
  const secondaryDb = getSecondaryDB();
  
  // Wipe and reset collections to ensure clean, authentic Karunya data
  console.log('[Seed] Setting up authentic Karunya University Transport fleet & routes...');
  await db.collection('users').deleteMany({});
  await db.collection('buses').deleteMany({});
  await db.collection('routes').deleteMany({});
  await db.collection('students').deleteMany({});
  await db.collection('trips').deleteMany({});
  await db.collection('attendance').deleteMany({});
  await db.collection('feePlans').deleteMany({});
  await db.collection('invoices').deleteMany({});
  await db.collection('maintenance').deleteMany({});
  await db.collection('complaints').deleteMany({});
  await db.collection('announcements').deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);
  const managementHash = await bcrypt.hash('management', 10);
  const studentHash = await bcrypt.hash('student', 10);
  const busHash = await bcrypt.hash('bus', 10);
  const driver1Hash = await bcrypt.hash('driver1', 10);
  const driver2Hash = await bcrypt.hash('driver2', 10);
  const student1Hash = await bcrypt.hash('student1', 10);
  const student2Hash = await bcrypt.hash('student2', 10);

  // 1. Authentic Users for Karunya University with requested credentials
  const users = [
    {
      id: 'USR-MGMT',
      username: 'management',
      email: 'management@karunya.edu',
      password: managementHash,
      role: 'TRANSPORT_ADMIN',
      name: 'Transport Management Directorate',
      department: 'Karunya Transport & Fleet Logistics',
      phone: '+91 94433 12345',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-BUS',
      username: 'bus',
      email: 'busdriver@karunya.edu',
      password: busHash,
      role: 'DRIVER',
      name: 'Muthuswamy K. (Bus 1 Driver)',
      licenseNumber: 'TN-37-20150004921',
      licenseExpiry: '2029-06-30',
      phone: '+91 97890 11223',
      assignedBusId: 'BUS-1',
      assignedRouteId: 'RT-1',
      dutyStatus: 'ON_DUTY',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-STU',
      username: 'student',
      email: 'student@karunya.edu.in',
      password: studentHash,
      role: 'STUDENT',
      name: 'Rahul Krishnan',
      studentId: 'URK22CS1045',
      department: 'Computer Science & Engineering',
      courseYear: 'B.Tech CSE - 3rd Year',
      phone: '+91 96291 55667',
      emergencyContact: 'Krishnan V. (+91 94421 88990)',
      assignedRouteId: 'RT-1',
      assignedStopId: 'Gandhipuram Central Bus Stand',
      subscriptionStatus: 'ACTIVE',
      createdAt: new Date().toISOString()
    },
    // Multi-user driver accounts: driver1 and driver2
    {
      id: 'USR-DRV-1',
      username: 'driver1',
      email: 'driver1@karunya.edu',
      password: driver1Hash,
      role: 'DRIVER',
      name: 'Muthuswamy K. (Driver 1 - Bus 1)',
      licenseNumber: 'TN-37-20150004921',
      licenseExpiry: '2029-06-30',
      phone: '+91 97890 11223',
      assignedBusId: 'BUS-1',
      assignedRouteId: 'RT-1',
      dutyStatus: 'ON_DUTY',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-DRV-2',
      username: 'driver2',
      email: 'driver2@karunya.edu',
      password: driver2Hash,
      role: 'DRIVER',
      name: 'Selvakumar R. (Driver 2 - Bus 2)',
      licenseNumber: 'TN-38-20170008812',
      licenseExpiry: '2028-11-15',
      phone: '+91 98940 33445',
      assignedBusId: 'BUS-2',
      assignedRouteId: 'RT-2',
      dutyStatus: 'ON_DUTY',
      createdAt: new Date().toISOString()
    },
    // Multi-user student accounts: student1 and student2
    {
      id: 'USR-STU-1',
      username: 'student1',
      email: 'student1@karunya.edu.in',
      password: student1Hash,
      role: 'STUDENT',
      name: 'Rahul Krishnan (Student 1)',
      studentId: 'URK22CS1045',
      department: 'Computer Science & Engineering',
      courseYear: 'B.Tech CSE - 3rd Year',
      phone: '+91 96291 55667',
      emergencyContact: 'Krishnan V. (+91 94421 88990)',
      assignedRouteId: 'RT-1',
      assignedStopId: 'Gandhipuram Central Bus Stand',
      subscriptionStatus: 'ACTIVE',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-STU-2',
      username: 'student2',
      email: 'student2@karunya.edu.in',
      password: student2Hash,
      role: 'STUDENT',
      name: 'Ananya S. Nair (Student 2)',
      studentId: 'URK23AI1012',
      department: 'Artificial Intelligence & Data Science',
      courseYear: 'B.Tech AI&DS - 2nd Year',
      phone: '+91 98432 77889',
      emergencyContact: 'Suresh Nair (+91 98421 33221)',
      assignedRouteId: 'RT-2',
      assignedStopId: 'Ukkadam Bus Terminus',
      subscriptionStatus: 'ACTIVE',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-ADMIN',
      username: 'transportadmin',
      email: 'transport@karunya.edu',
      password: passwordHash,
      role: 'TRANSPORT_ADMIN',
      name: 'Transport Officer',
      department: 'Karunya Transport & Fleet Logistics',
      phone: '+91 94433 12345',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-SUPER',
      username: 'superadmin',
      email: 'admin@karunya.edu',
      password: passwordHash,
      role: 'SUPER_ADMIN',
      name: 'Dr. E. J. James',
      department: 'University Administration',
      phone: '+91 98422 54321',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-DRV-MUTHU',
      username: 'driver.muthu',
      email: 'muthu.driver@karunya.edu',
      password: passwordHash,
      role: 'DRIVER',
      name: 'Muthuswamy K.',
      licenseNumber: 'TN-37-20150004921',
      licenseExpiry: '2029-06-30',
      phone: '+91 97890 11223',
      assignedBusId: 'BUS-1',
      assignedRouteId: 'RT-1',
      dutyStatus: 'ON_DUTY',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-DRV-SELVAM',
      username: 'driver.selvam',
      email: 'selvam.driver@karunya.edu',
      password: passwordHash,
      role: 'DRIVER',
      name: 'Selvakumar R.',
      licenseNumber: 'TN-38-20170008812',
      licenseExpiry: '2028-11-15',
      phone: '+91 98940 33445',
      assignedBusId: 'BUS-2',
      assignedRouteId: 'RT-2',
      dutyStatus: 'ON_DUTY',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-STU-RAHUL',
      username: 'student.rahul',
      email: 'rahul.k@karunya.edu.in',
      password: passwordHash,
      role: 'STUDENT',
      name: 'Rahul Krishnan',
      studentId: 'URK22CS1045',
      department: 'Computer Science & Engineering',
      courseYear: 'B.Tech CSE - 3rd Year',
      phone: '+91 96291 55667',
      emergencyContact: 'Krishnan V. (+91 94421 88990)',
      assignedRouteId: 'RT-1',
      assignedStopId: 'Gandhipuram Central Bus Stand',
      subscriptionStatus: 'ACTIVE',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-STU-ANANYA',
      username: 'student.ananya',
      email: 'ananya.s@karunya.edu.in',
      password: passwordHash,
      role: 'STUDENT',
      name: 'Ananya S. Nair',
      studentId: 'URK23AI1012',
      department: 'Artificial Intelligence & Data Science',
      courseYear: 'B.Tech AI&DS - 2nd Year',
      phone: '+91 98432 77889',
      emergencyContact: 'Suresh Nair (+91 98421 33221)',
      assignedRouteId: 'RT-2',
      assignedStopId: 'Ukkadam Bus Terminus',
      subscriptionStatus: 'ACTIVE',
      createdAt: new Date().toISOString()
    }
  ];
  await db.collection('users').insertMany(users);

  // 2. Real Karunya University Bus Fleet (Buses 1 to 10)
  // Base coordinates: Karunya Nagar (approx 10.9360 N, 76.7441 E) & Coimbatore City (10.9980 to 11.0168 N, 76.9558 E)
  const buses = [
    {
      id: 'BUS-1',
      busNumber: 'Bus 1',
      regNumber: 'TN 37 BK 1001',
      model: 'Ashok Leyland Viking',
      capacity: 55,
      fuelType: 'Diesel / BS-VI',
      status: 'ACTIVE',
      assignedDriver: 'Muthuswamy K.',
      assignedRoute: 'Route 1 (Gandhipuram to Karunya Nagar)',
      insuranceExpiry: '2027-08-30',
      fitnessCertExpiry: '2027-08-15',
      lastServiceDate: '2026-09-15',
      nextServiceDate: '2026-12-15',
      gpsDeviceId: 'KRN-GPS-01',
      currentLat: 11.0168,
      currentLng: 76.9558,
      speedKmh: 42
    },
    {
      id: 'BUS-2',
      busNumber: 'Bus 2',
      regNumber: 'TN 37 BK 1002',
      model: 'Tata Marcopolo Starbus',
      capacity: 50,
      fuelType: 'Diesel / BS-VI',
      status: 'ACTIVE',
      assignedDriver: 'Selvakumar R.',
      assignedRoute: 'Route 2 (Ukkadam to Karunya Nagar)',
      insuranceExpiry: '2027-09-20',
      fitnessCertExpiry: '2027-09-10',
      lastServiceDate: '2026-10-01',
      nextServiceDate: '2027-01-01',
      gpsDeviceId: 'KRN-GPS-02',
      currentLat: 10.9880,
      currentLng: 76.9610,
      speedKmh: 38
    },
    {
      id: 'BUS-3',
      busNumber: 'Bus 3',
      regNumber: 'TN 37 BK 1003',
      model: 'Ashok Leyland Lynx Smart',
      capacity: 45,
      fuelType: 'Diesel / BS-VI',
      status: 'ACTIVE',
      assignedDriver: 'Palanisamy V.',
      assignedRoute: 'Route 3 (Singanallur to Karunya Nagar)',
      insuranceExpiry: '2027-07-15',
      fitnessCertExpiry: '2027-07-05',
      lastServiceDate: '2026-08-20',
      nextServiceDate: '2026-11-20',
      gpsDeviceId: 'KRN-GPS-03',
      currentLat: 10.9995,
      currentLng: 77.0250,
      speedKmh: 40
    },
    {
      id: 'BUS-4',
      busNumber: 'Bus 4',
      regNumber: 'TN 37 BK 1004',
      model: 'Tata Ultra School Deluxe',
      capacity: 52,
      fuelType: 'Diesel / BS-VI',
      status: 'ACTIVE',
      assignedDriver: 'Karthikeyan M.',
      assignedRoute: 'Route 4 (Peelamedu & Hopes to Karunya Nagar)',
      insuranceExpiry: '2027-06-10',
      fitnessCertExpiry: '2027-06-01',
      lastServiceDate: '2026-09-05',
      nextServiceDate: '2026-12-05',
      gpsDeviceId: 'KRN-GPS-04',
      currentLat: 11.0250,
      currentLng: 77.0120,
      speedKmh: 35
    },
    {
      id: 'BUS-5',
      busNumber: 'Bus 5',
      regNumber: 'TN 37 BK 1005',
      model: 'Ashok Leyland Viking',
      capacity: 55,
      fuelType: 'Diesel / BS-VI',
      status: 'ACTIVE',
      assignedDriver: 'Murugan P.',
      assignedRoute: 'Route 5 (Saibaba Colony & RS Puram to Karunya)',
      insuranceExpiry: '2027-05-18',
      fitnessCertExpiry: '2027-05-02',
      lastServiceDate: '2026-09-22',
      nextServiceDate: '2026-12-22',
      gpsDeviceId: 'KRN-GPS-05',
      currentLat: 11.0280,
      currentLng: 76.9400,
      speedKmh: 36
    },
    {
      id: 'BUS-6',
      busNumber: 'Bus 6',
      regNumber: 'TN 37 BK 1006',
      model: 'Eicher Skyline Pro',
      capacity: 48,
      fuelType: 'Diesel / BS-VI',
      status: 'ACTIVE',
      assignedDriver: 'Rajendran T.',
      assignedRoute: 'Route 6 (Vadavalli & Thondamuthur to Karunya)',
      insuranceExpiry: '2027-04-12',
      fitnessCertExpiry: '2027-04-01',
      lastServiceDate: '2026-10-10',
      nextServiceDate: '2027-01-10',
      gpsDeviceId: 'KRN-GPS-06',
      currentLat: 11.0180,
      currentLng: 76.9020,
      speedKmh: 45
    },
    {
      id: 'BUS-7',
      busNumber: 'Bus 7',
      regNumber: 'TN 37 BK 1007',
      model: 'Tata Marcopolo Starbus',
      capacity: 50,
      fuelType: 'Diesel / BS-VI',
      status: 'ACTIVE',
      assignedDriver: 'Anand Kumar',
      assignedRoute: 'Route 7 (Sundarapuram & Kovaipudur to Karunya)',
      insuranceExpiry: '2027-03-25',
      fitnessCertExpiry: '2027-03-15',
      lastServiceDate: '2026-08-14',
      nextServiceDate: '2026-11-14',
      gpsDeviceId: 'KRN-GPS-07',
      currentLat: 10.9520,
      currentLng: 76.9380,
      speedKmh: 40
    },
    {
      id: 'BUS-8',
      busNumber: 'Bus 8',
      regNumber: 'TN 37 BK 1008',
      model: 'Ashok Leyland Viking',
      capacity: 55,
      fuelType: 'Diesel / BS-VI',
      status: 'ACTIVE',
      assignedDriver: 'Saravanan S.',
      assignedRoute: 'Route 8 (Saravanampatti & Ganapathy to Karunya)',
      insuranceExpiry: '2027-02-14',
      fitnessCertExpiry: '2027-02-01',
      lastServiceDate: '2026-09-28',
      nextServiceDate: '2026-12-28',
      gpsDeviceId: 'KRN-GPS-08',
      currentLat: 11.0580,
      currentLng: 76.9940,
      speedKmh: 38
    },
    {
      id: 'BUS-9',
      busNumber: 'Bus 9',
      regNumber: 'TN 37 BK 1009',
      model: 'Eicher Skyline Pro',
      capacity: 48,
      fuelType: 'Diesel / BS-VI',
      status: 'STANDBY',
      assignedDriver: 'Ramesh Babu',
      assignedRoute: 'Reserve / Campus Shuttle Pool',
      insuranceExpiry: '2027-11-10',
      fitnessCertExpiry: '2027-11-01',
      lastServiceDate: '2026-10-15',
      nextServiceDate: '2027-01-15',
      gpsDeviceId: 'KRN-GPS-09',
      currentLat: 10.9360,
      currentLng: 76.7441,
      speedKmh: 0
    },
    {
      id: 'BUS-10',
      busNumber: 'Bus 10',
      regNumber: 'TN 37 BK 1010',
      model: 'Tata Ultra School Deluxe',
      capacity: 52,
      fuelType: 'Diesel / BS-VI',
      status: 'MAINTENANCE',
      assignedDriver: 'Unassigned',
      assignedRoute: 'Under Routine Workshop Inspection',
      insuranceExpiry: '2026-12-30',
      fitnessCertExpiry: '2026-12-15',
      lastServiceDate: '2026-10-24',
      nextServiceDate: '2026-11-05',
      gpsDeviceId: 'KRN-GPS-10',
      currentLat: 10.9375,
      currentLng: 76.7455,
      speedKmh: 0
    }
  ];
  await db.collection('buses').insertMany(buses);

  // 3. Real Routes from Coimbatore Hubs to Karunya Nagar (Karunya University)
  const routes = [
    {
      id: 'RT-1',
      routeNumber: 'Route 1',
      name: 'Gandhipuram to Karunya Nagar',
      startPoint: 'Gandhipuram Central Bus Stand',
      destination: 'Karunya University (Main Campus)',
      distanceKm: 29.5,
      estimatedMinutes: 55,
      assignedBusId: 'BUS-1',
      assignedDriver: 'Muthuswamy K.',
      departureTime: '07:15 AM',
      returnTime: '05:15 PM',
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      status: 'ACTIVE',
      stops: [
        { id: 'STP-1', name: 'Gandhipuram Central Bus Stand', lat: 11.0168, lng: 76.9558, sequence: 1, pickupTime: '07:15 AM' },
        { id: 'STP-2', name: 'Town Hall / Railway Station Road', lat: 10.9980, lng: 76.9630, sequence: 2, pickupTime: '07:25 AM' },
        { id: 'STP-3', name: 'Telungupalayam / Selvapuram', lat: 10.9850, lng: 76.9320, sequence: 3, pickupTime: '07:35 AM' },
        { id: 'STP-4', name: 'Perur Patteeswarar Temple Junction', lat: 10.9700, lng: 76.9050, sequence: 4, pickupTime: '07:45 AM' },
        { id: 'STP-5', name: 'Alandurai Town Centre', lat: 10.9420, lng: 76.8120, sequence: 5, pickupTime: '08:00 AM' },
        { id: 'STP-6', name: 'Karunya Nagar (University Main Gate)', lat: 10.9360, lng: 76.7441, sequence: 6, pickupTime: '08:15 AM' }
      ]
    },
    {
      id: 'RT-2',
      routeNumber: 'Route 2',
      name: 'Ukkadam to Karunya Nagar',
      startPoint: 'Ukkadam Bus Terminus',
      destination: 'Karunya University (Main Campus)',
      distanceKm: 27.0,
      estimatedMinutes: 50,
      assignedBusId: 'BUS-2',
      assignedDriver: 'Selvakumar R.',
      departureTime: '07:25 AM',
      returnTime: '05:15 PM',
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      status: 'ACTIVE',
      stops: [
        { id: 'STP-21', name: 'Ukkadam Bus Terminus', lat: 10.9880, lng: 76.9610, sequence: 1, pickupTime: '07:25 AM' },
        { id: 'STP-22', name: 'Kuniyamuthur Junction', lat: 10.9630, lng: 76.9520, sequence: 2, pickupTime: '07:35 AM' },
        { id: 'STP-23', name: 'Kovaipudur Pirivu', lat: 10.9520, lng: 76.9380, sequence: 3, pickupTime: '07:45 AM' },
        { id: 'STP-24', name: 'Madhampatti Junction', lat: 10.9480, lng: 76.8450, sequence: 4, pickupTime: '07:58 AM' },
        { id: 'STP-25', name: 'Karunya Nagar (University Main Gate)', lat: 10.9360, lng: 76.7441, sequence: 5, pickupTime: '08:15 AM' }
      ]
    },
    {
      id: 'RT-3',
      routeNumber: 'Route 3',
      name: 'Singanallur to Karunya Nagar',
      startPoint: 'Singanallur Bus Stand',
      destination: 'Karunya University (Main Campus)',
      distanceKm: 34.0,
      estimatedMinutes: 65,
      assignedBusId: 'BUS-3',
      assignedDriver: 'Palanisamy V.',
      departureTime: '07:05 AM',
      returnTime: '05:15 PM',
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      status: 'ACTIVE',
      stops: [
        { id: 'STP-31', name: 'Singanallur Bus Stand', lat: 10.9995, lng: 77.0250, sequence: 1, pickupTime: '07:05 AM' },
        { id: 'STP-32', name: 'Ramanathapuram 80 Feet Road', lat: 10.9985, lng: 76.9850, sequence: 2, pickupTime: '07:18 AM' },
        { id: 'STP-33', name: 'Sungam Junction Bypass', lat: 10.9940, lng: 76.9720, sequence: 3, pickupTime: '07:28 AM' },
        { id: 'STP-34', name: 'Perur Checkpost', lat: 10.9700, lng: 76.9050, sequence: 4, pickupTime: '07:45 AM' },
        { id: 'STP-35', name: 'Karunya Nagar (University Main Gate)', lat: 10.9360, lng: 76.7441, sequence: 5, pickupTime: '08:15 AM' }
      ]
    },
    {
      id: 'RT-4',
      routeNumber: 'Route 4',
      name: 'Vadavalli & Thondamuthur to Karunya',
      startPoint: 'Vadavalli Bus Terminus',
      destination: 'Karunya University (Main Campus)',
      distanceKm: 24.0,
      estimatedMinutes: 45,
      assignedBusId: 'BUS-6',
      assignedDriver: 'Rajendran T.',
      departureTime: '07:30 AM',
      returnTime: '05:15 PM',
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      status: 'ACTIVE',
      stops: [
        { id: 'STP-41', name: 'Vadavalli Bus Terminus', lat: 11.0180, lng: 76.9020, sequence: 1, pickupTime: '07:30 AM' },
        { id: 'STP-42', name: 'Thondamuthur Town Gate', lat: 10.9850, lng: 76.8290, sequence: 2, pickupTime: '07:48 AM' },
        { id: 'STP-43', name: 'Narasipuram Pirivu', lat: 10.9550, lng: 76.7820, sequence: 3, pickupTime: '08:02 AM' },
        { id: 'STP-44', name: 'Karunya Nagar (University Main Gate)', lat: 10.9360, lng: 76.7441, sequence: 4, pickupTime: '08:15 AM' }
      ]
    },
    {
      id: 'RT-5',
      routeNumber: 'Route 5',
      name: 'Saibaba Colony & RS Puram to Karunya',
      startPoint: 'Saibaba Colony Junction',
      destination: 'Karunya University (Main Campus)',
      distanceKm: 28.0,
      estimatedMinutes: 52,
      assignedBusId: 'BUS-5',
      assignedDriver: 'Murugan P.',
      departureTime: '07:20 AM',
      returnTime: '05:15 PM',
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      status: 'ACTIVE',
      stops: [
        { id: 'STP-51', name: 'Saibaba Colony Junction', lat: 11.0280, lng: 76.9400, sequence: 1, pickupTime: '07:20 AM' },
        { id: 'STP-52', name: 'RS Puram Head Post Office', lat: 11.0080, lng: 76.9480, sequence: 2, pickupTime: '07:32 AM' },
        { id: 'STP-53', name: 'Perur Patteeswarar Temple', lat: 10.9700, lng: 76.9050, sequence: 3, pickupTime: '07:48 AM' },
        { id: 'STP-54', name: 'Karunya Nagar (University Main Gate)', lat: 10.9360, lng: 76.7441, sequence: 4, pickupTime: '08:15 AM' }
      ]
    },
    {
      id: 'RT-6',
      routeNumber: 'Route 6',
      name: 'Peelamedu & Hopes to Karunya Nagar',
      startPoint: 'Hopes College Bus Stop',
      destination: 'Karunya University (Main Campus)',
      distanceKm: 32.5,
      estimatedMinutes: 60,
      assignedBusId: 'BUS-4',
      assignedDriver: 'Karthikeyan M.',
      departureTime: '07:10 AM',
      returnTime: '05:15 PM',
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      status: 'ACTIVE',
      stops: [
        { id: 'STP-61', name: 'Hopes College Bus Stop', lat: 11.0250, lng: 77.0120, sequence: 1, pickupTime: '07:10 AM' },
        { id: 'STP-62', name: 'Peelamedu PSG Tech Junction', lat: 11.0220, lng: 76.9980, sequence: 2, pickupTime: '07:20 AM' },
        { id: 'STP-63', name: 'Lakshmi Mills Junction', lat: 11.0120, lng: 76.9800, sequence: 3, pickupTime: '07:32 AM' },
        { id: 'STP-64', name: 'Karunya Nagar (University Main Gate)', lat: 10.9360, lng: 76.7441, sequence: 4, pickupTime: '08:15 AM' }
      ]
    },
    {
      id: 'RT-7',
      routeNumber: 'Route 7',
      name: 'Sundarapuram & Kovaipudur to Karunya',
      startPoint: 'Sundarapuram Junction',
      destination: 'Karunya University (Main Campus)',
      distanceKm: 26.0,
      estimatedMinutes: 48,
      assignedBusId: 'BUS-7',
      assignedDriver: 'Anand Kumar',
      departureTime: '07:25 AM',
      returnTime: '05:15 PM',
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      status: 'ACTIVE',
      stops: [
        { id: 'STP-71', name: 'Sundarapuram Junction', lat: 10.9520, lng: 76.9380, sequence: 1, pickupTime: '07:25 AM' },
        { id: 'STP-72', name: 'Kovaipudur Pirivu', lat: 10.9420, lng: 76.9200, sequence: 2, pickupTime: '07:38 AM' },
        { id: 'STP-73', name: 'Madhampatti Junction', lat: 10.9480, lng: 76.8450, sequence: 3, pickupTime: '07:55 AM' },
        { id: 'STP-74', name: 'Karunya Nagar (University Main Gate)', lat: 10.9360, lng: 76.7441, sequence: 4, pickupTime: '08:15 AM' }
      ]
    },
    {
      id: 'RT-8',
      routeNumber: 'Route 8',
      name: 'Saravanampatti & Ganapathy to Karunya',
      startPoint: 'Saravanampatti Checkpost',
      destination: 'Karunya University (Main Campus)',
      distanceKm: 36.0,
      estimatedMinutes: 70,
      assignedBusId: 'BUS-8',
      assignedDriver: 'Saravanan S.',
      departureTime: '07:00 AM',
      returnTime: '05:15 PM',
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      status: 'ACTIVE',
      stops: [
        { id: 'STP-81', name: 'Saravanampatti Checkpost', lat: 11.0580, lng: 76.9940, sequence: 1, pickupTime: '07:00 AM' },
        { id: 'STP-82', name: 'Ganapathy Bus Stop', lat: 11.0320, lng: 76.9750, sequence: 2, pickupTime: '07:15 AM' },
        { id: 'STP-83', name: 'Gandhipuram Cross Cut Road', lat: 11.0180, lng: 76.9600, sequence: 3, pickupTime: '07:30 AM' },
        { id: 'STP-84', name: 'Karunya Nagar (University Main Gate)', lat: 10.9360, lng: 76.7441, sequence: 4, pickupTime: '08:15 AM' }
      ]
    },
    {
      id: 'RT-9',
      routeNumber: 'Route 9',
      name: 'Thudiyalur & Kavundampalayam to Karunya',
      startPoint: 'Thudiyalur Junction',
      destination: 'Karunya University (Main Campus)',
      distanceKm: 31.0,
      estimatedMinutes: 58,
      assignedBusId: 'BUS-9',
      assignedDriver: 'Ramesh Babu',
      departureTime: '07:15 AM',
      returnTime: '05:15 PM',
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      status: 'ACTIVE',
      stops: [
        { id: 'STP-91', name: 'Thudiyalur Junction', lat: 11.0780, lng: 76.9360, sequence: 1, pickupTime: '07:15 AM' },
        { id: 'STP-92', name: 'Kavundampalayam Bypass', lat: 11.0450, lng: 76.9320, sequence: 2, pickupTime: '07:28 AM' },
        { id: 'STP-93', name: 'Vadavalli Road Link', lat: 11.0180, lng: 76.9020, sequence: 3, pickupTime: '07:42 AM' },
        { id: 'STP-94', name: 'Karunya Nagar (University Main Gate)', lat: 10.9360, lng: 76.7441, sequence: 4, pickupTime: '08:15 AM' }
      ]
    },
    {
      id: 'RT-10',
      routeNumber: 'Route 10',
      name: 'Sulur & Ondipudur to Karunya Nagar',
      startPoint: 'Sulur Aero Stand',
      destination: 'Karunya University (Main Campus)',
      distanceKm: 42.0,
      estimatedMinutes: 80,
      assignedBusId: 'BUS-10',
      assignedDriver: 'Unassigned',
      departureTime: '06:50 AM',
      returnTime: '05:15 PM',
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      status: 'ACTIVE',
      stops: [
        { id: 'STP-101', name: 'Sulur Aero Stand', lat: 11.0260, lng: 77.1250, sequence: 1, pickupTime: '06:50 AM' },
        { id: 'STP-102', name: 'Ondipudur Flyover Stop', lat: 11.0020, lng: 77.0600, sequence: 2, pickupTime: '07:08 AM' },
        { id: 'STP-103', name: 'Singanallur Trichy Road', lat: 10.9995, lng: 77.0250, sequence: 3, pickupTime: '07:22 AM' },
        { id: 'STP-104', name: 'Karunya Nagar (University Main Gate)', lat: 10.9360, lng: 76.7441, sequence: 4, pickupTime: '08:15 AM' }
      ]
    }
  ];
  await db.collection('routes').insertMany(routes);

  // 4. Enrolled Students
  const students = [
    {
      id: 'URK22CS1045',
      name: 'Rahul Krishnan',
      email: 'rahul.k@karunya.edu.in',
      phone: '+91 96291 55667',
      department: 'Computer Science & Engineering',
      courseYear: 'B.Tech CSE - 3rd Year',
      assignedRouteId: 'RT-1',
      assignedStopId: 'Gandhipuram Central Bus Stand',
      subscriptionStatus: 'ACTIVE',
      emergencyContact: 'Krishnan V. (+91 94421 88990)',
      createdAt: new Date().toISOString()
    },
    {
      id: 'URK23AI1012',
      name: 'Ananya S. Nair',
      email: 'ananya.s@karunya.edu.in',
      phone: '+91 98432 77889',
      department: 'Artificial Intelligence & Data Science',
      courseYear: 'B.Tech AI&DS - 2nd Year',
      assignedRouteId: 'RT-2',
      assignedStopId: 'Ukkadam Bus Terminus',
      subscriptionStatus: 'ACTIVE',
      emergencyContact: 'Suresh Nair (+91 98421 33221)',
      createdAt: new Date().toISOString()
    },
    {
      id: 'URK21EC1088',
      name: 'Dinesh Karthik',
      email: 'dinesh.k@karunya.edu.in',
      phone: '+91 99440 22334',
      department: 'Electronics & Communication',
      courseYear: 'B.Tech ECE - 4th Year',
      assignedRouteId: 'RT-3',
      assignedStopId: 'Singanallur Bus Stand',
      subscriptionStatus: 'ACTIVE',
      emergencyContact: 'Karthik P. (+91 94430 77112)',
      createdAt: new Date().toISOString()
    },
    {
      id: 'URK24BT1005',
      name: 'Keerthana R.',
      email: 'keerthana.r@karunya.edu.in',
      phone: '+91 97910 88991',
      department: 'Biotechnology',
      courseYear: 'B.Tech BT - 1st Year',
      assignedRouteId: 'RT-4',
      assignedStopId: 'Vadavalli Bus Terminus',
      subscriptionStatus: 'ACTIVE',
      emergencyContact: 'Ramesh G. (+91 98420 55443)',
      createdAt: new Date().toISOString()
    }
  ];
  await db.collection('students').insertMany(students);

  // 5. Active Trips
  const trips = [
    {
      id: 'TRP-101',
      routeId: 'RT-1',
      routeName: 'Route 1 (Gandhipuram to Karunya Nagar)',
      busId: 'BUS-1',
      busRegNumber: 'TN 37 BK 1001 (Bus 1)',
      driverId: 'USR-DRV-1',
      driverName: 'Muthuswamy K.',
      type: 'MORNING_PICKUP',
      scheduledDate: new Date().toISOString().split('T')[0],
      startTime: '07:15 AM',
      endTime: '08:15 AM',
      status: 'IN_PROGRESS',
      currentLocation: { lat: 10.9850, lng: 76.9320, stopName: 'Telungupalayam / Selvapuram', speed: 42 },
      totalAssignedStudents: 42,
      boardedCount: 38,
      createdAt: new Date().toISOString()
    },
    {
      id: 'TRP-102',
      routeId: 'RT-2',
      routeName: 'Route 2 (Ukkadam to Karunya Nagar)',
      busId: 'BUS-2',
      busRegNumber: 'TN 37 BK 1002 (Bus 2)',
      driverId: 'USR-DRV-2',
      driverName: 'Selvakumar R.',
      type: 'MORNING_PICKUP',
      scheduledDate: new Date().toISOString().split('T')[0],
      startTime: '07:25 AM',
      endTime: '08:15 AM',
      status: 'IN_PROGRESS',
      currentLocation: { lat: 10.9520, lng: 76.9380, stopName: 'Kovaipudur Pirivu', speed: 38 },
      totalAssignedStudents: 36,
      boardedCount: 32,
      createdAt: new Date().toISOString()
    }
  ];
  await db.collection('trips').insertMany(trips);

  // 6. Real Karunya Semester Fee Invoices
  const invoices = [
    {
      id: 'INV-2026-K01',
      studentId: 'URK22CS1045',
      studentName: 'Rahul Krishnan',
      planId: 'FEE-SEM-ODD',
      planTitle: 'Odd Semester Coimbatore City Bus Pass (2026-27)',
      amount: 14500.00,
      issueDate: '2026-07-01',
      dueDate: '2026-07-25',
      status: 'PAID',
      paymentMethod: 'Karunya Online Fee Portal (NetBanking)',
      paidAt: '2026-07-15T11:20:00Z',
      receiptNumber: 'KRN-RCPT-2026-9041'
    },
    {
      id: 'INV-2026-K02',
      studentId: 'URK23AI1012',
      studentName: 'Ananya S. Nair',
      planId: 'FEE-SEM-ODD',
      planTitle: 'Odd Semester Coimbatore City Bus Pass (2026-27)',
      amount: 14500.00,
      issueDate: '2026-07-01',
      dueDate: '2026-07-25',
      status: 'PAID',
      paymentMethod: 'UPI / Google Pay',
      paidAt: '2026-07-18T16:40:00Z',
      receiptNumber: 'KRN-RCPT-2026-9188'
    }
  ];
  await db.collection('invoices').insertMany(invoices);

  // 7. Real Maintenance Logs
  const maintenance = [
    {
      id: 'MNT-K10',
      busId: 'BUS-10',
      regNumber: 'TN 37 BK 1010 (Bus 10)',
      issueType: 'Clutch Plate & Brake Liner Overhaul',
      cost: 18500.00,
      status: 'UNDER_REPAIR',
      serviceStation: 'Ashok Leyland Authorized Service Centre, Mettupalayam Road',
      scheduledDate: '2026-10-24',
      completedDate: null,
      notes: 'Scheduled clutch replacement prior to university university-day transit operations.'
    }
  ];
  await db.collection('maintenance').insertMany(maintenance);

  // 8. Karunya Transport Announcements
  const announcements = [
    {
      id: 'ANN-K1',
      title: 'Evening Bus Departure Timings for End-Semester Lab Examinations',
      content: 'During the examination week, all Coimbatore city return buses (Buses 1 to 8) will depart from Karunya Nagar Terminal at 05:30 PM promptly.',
      category: 'EXAM_SPECIAL',
      priority: 'HIGH',
      targetRoles: ['STUDENT', 'DRIVER', 'TRANSPORT_ADMIN'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'ANN-K2',
      title: 'Road Maintenance Advisory: Perur - Telungupalayam Stretch',
      content: 'Drivers on Route 1 and Route 3 are advised to exercise caution near Selvapuram junction due to flyover construction work.',
      category: 'TRAFFIC_ALERT',
      priority: 'MEDIUM',
      targetRoles: ['DRIVER', 'TRANSPORT_ADMIN'],
      createdAt: new Date().toISOString()
    }
  ];
  await db.collection('announcements').insertMany(announcements);

  // Seed Second Database: karunya_transport_archive_db (Audit logs, historic trips, fuel logs)
  await secondaryDb.collection('audit_logs').deleteMany({});
  await secondaryDb.collection('fuel_logs').deleteMany({});
  await secondaryDb.collection('historical_analytics').deleteMany({});

  const auditLogs = [
    {
      id: 'AUD-001',
      action: 'FLEET_SYNC',
      performedBy: 'transportadmin (Transport Officer)',
      details: 'Daily fleet readiness audit completed for Buses 1 to 10.',
      timestamp: new Date().toISOString()
    },
    {
      id: 'AUD-002',
      action: 'SEMESTER_PASS_APPROVAL',
      performedBy: 'transportadmin',
      details: 'Approved Coimbatore Day-Scholar passes for Odd Semester 2026-27.',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    }
  ];
  await secondaryDb.collection('audit_logs').insertMany(auditLogs);

  const fuelLogs = [
    {
      busNumber: 'Bus 1',
      litres: 75,
      dispensedAt: 'Karunya Campus Fuel Station, Gate 2',
      costInr: 7200,
      timestamp: new Date().toISOString()
    },
    {
      busNumber: 'Bus 2',
      litres: 80,
      dispensedAt: 'Karunya Campus Fuel Station, Gate 2',
      costInr: 7680,
      timestamp: new Date().toISOString()
    }
  ];
  await secondaryDb.collection('fuel_logs').insertMany(fuelLogs);

  console.log('[Seed] Primary & Secondary MongoDB Databases initialized successfully.');
}
