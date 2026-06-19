const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

console.log("\n  ╔══════════════════════════════════════════════════╗");
console.log("  ║     SmartCampus AI — Launcher                    ║");
console.log("  ║     \"The Future of Intelligent Education\"        ║");
console.log("  ╚══════════════════════════════════════════════════╝\n");

const rootDir = path.resolve(__dirname);

// Helper function to check if a command exists
function commandExists(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// 1. Check if setup is needed
const isSetupNeeded = !fs.existsSync(path.join(rootDir, '.env')) || 
                      !fs.existsSync(path.join(rootDir, 'apps', 'api', 'node_modules')) ||
                      !fs.existsSync(path.join(rootDir, 'apps', 'web', 'node_modules'));

if (isSetupNeeded) {
  console.log("👉 First-time setup detected. Running setup script first...");
  try {
    execSync('node scripts/setup.js', { cwd: rootDir, stdio: 'inherit' });
    console.log("✅ Setup completed successfully!\n");
  } catch (error) {
    console.error("❌ Setup failed. Please check errors above.");
    process.exit(1);
  }
}

// 2. Start Docker infrastructure
if (commandExists('docker')) {
  console.log("🐳 Starting Docker infrastructure...");
  try {
    execSync('docker compose -f docker-compose.dev.yml up -d', { cwd: rootDir, stdio: 'inherit' });
    console.log("✅ Docker containers running and healthy.\n");
  } catch (dockerError) {
    console.warn("⚠️ Failed to start Docker services automatically. Ensure PostgreSQL and Redis are running locally.\n");
  }
} else {
  console.log("⚠️ Docker not found. Skipping docker-compose. Please start PostgreSQL and Redis locally.\n");
}

// 3. Ensure Prisma Client is generated
console.log("🗄️ Generating Prisma Client...");
try {
  execSync('npx prisma generate', { cwd: path.join(rootDir, 'apps', 'api'), stdio: 'inherit' });
  console.log("✅ Prisma Client generated.\n");
} catch (prismaError) {
  console.error("❌ Failed to generate Prisma Client:", prismaError.message);
}

// 4. Start API and Web servers concurrently
console.log("🚀 Starting development servers...");

const apiProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'start:dev'], {
  cwd: path.join(rootDir, 'apps', 'api'),
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: 'true' }
});

const webProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
  cwd: path.join(rootDir, 'apps', 'web'),
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: 'true' }
});

// Handle graceful shutdown
let isCleaningUp = false;
function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log("\nStopping all services...");
  try {
    apiProcess.kill();
  } catch (e) {}
  try {
    webProcess.kill();
  } catch (e) {}
  console.log("👋 Goodbye!");
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Keep the launcher process alive
apiProcess.on('exit', (code) => {
  if (!isCleaningUp) {
    console.log(`API process exited with code ${code}`);
    cleanup();
  }
});

webProcess.on('exit', (code) => {
  if (!isCleaningUp) {
    console.log(`Web process exited with code ${code}`);
    cleanup();
  }
});
