/**
 * MasteryLMS Production Multi-Service Process Supervisor
 * Boots internal gRPC microservices sequentially, then starts the API Gateway.
 * Perfectly suited for single-service deployments on Render, Railway, or VPS.
 */
const { spawn } = require('child_process');

console.log('======================================================');
console.log('  MasteryLMS Production Unified Backend Supervisor');
console.log('======================================================\n');

// 1. Attempt starting local embedded Redis if available and not configured remotely
const isLocalRedis =
  !process.env.REDIS_URL &&
  (!process.env.REDIS_HOST ||
    process.env.REDIS_HOST === 'localhost' ||
    process.env.REDIS_HOST === '127.0.0.1');

if (isLocalRedis) {
  try {
    const redis = spawn('redis-server', ['--daemonize', 'yes'], { stdio: 'ignore' });
    redis.on('error', () => {
      console.log('ℹ️ Local redis-server binary not found, using memory fallback');
    });
    console.log('✅ Local Redis daemon launched for BullMQ & cache');
  } catch {
    console.log('ℹ️ Operating with in-memory cache/fallback');
  }
}

// 2. Ordered backend microservices list
const services = [
  { name: 'course-svc', path: 'dist/apps/course-svc/main.js' },
  { name: 'assessment-svc', path: 'dist/apps/assessment-svc/main.js' },
  { name: 'mastery-svc', path: 'dist/apps/mastery-svc/main.js' },
  { name: 'notification-svc', path: 'dist/apps/notification-svc/main.js' },
  { name: 'gateway', path: 'dist/apps/gateway/main.js' },
];

const children = [];

// Stagger launch by 1.2s so gRPC services are listening before Gateway binds
services.forEach(({ name, path }, index) => {
  setTimeout(() => {
    console.log(`▶ Launching service: [${name}] from ${path}`);
    const child = spawn(process.execPath, [path], {
      stdio: 'inherit',
      env: {
        ...process.env,
        // Ensure microservices listen on all interfaces inside container
        COURSE_GRPC_URL: process.env.COURSE_GRPC_URL || '0.0.0.0:50051',
        ASSESSMENT_GRPC_URL: process.env.ASSESSMENT_GRPC_URL || '0.0.0.0:50052',
        MASTERY_GRPC_URL: process.env.MASTERY_GRPC_URL || '0.0.0.0:50053',
        NOTIFICATION_GRPC_URL: process.env.NOTIFICATION_GRPC_URL || '0.0.0.0:50054',
        // Gateway targets pointing to localhost inside the same container
        COURSE_SERVICE_TARGET: process.env.COURSE_SERVICE_TARGET || '127.0.0.1:50051',
        ASSESSMENT_SERVICE_TARGET: process.env.ASSESSMENT_SERVICE_TARGET || '127.0.0.1:50052',
        MASTERY_SERVICE_TARGET: process.env.MASTERY_SERVICE_TARGET || '127.0.0.1:50053',
      },
    });

    child.on('exit', (code) => {
      console.warn(`⚠️ Process [${name}] exited with code: ${code}`);
    });

    children.push(child);
  }, index * 1200);
});

// Graceful shutdown handling
function shutdown() {
  console.log('\n🛑 Gracefully shutting down all services...');
  children.forEach((child) => {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  });
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
