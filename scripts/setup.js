const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("\n  ╔══════════════════════════════════════════════════╗");
console.log("  ║     SmartCampus AI — Setup                      ║");
console.log("  ║     \"The Future of Intelligent Education\"        ║");
console.log("  ╚══════════════════════════════════════════════════╝\n");

// Helper function to check if a command exists
function commandExists(cmd) {
  try {
    const stdout = execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// 1. Check prerequisites
console.log("[1/5] Checking prerequisites...");
const hasNode = commandExists('node');
const hasNpm = commandExists('npm');
const hasDocker = commandExists('docker');

// Detect python or python3 or py
let pythonCmd = null;
if (commandExists('python3')) {
  pythonCmd = 'python3';
} else if (commandExists('python')) {
  pythonCmd = 'python';
} else if (commandExists('py')) {
  pythonCmd = 'py';
}

if (hasNode) console.log("  ✓ node found");
else console.log("  ✗ node not found");

if (hasNpm) console.log("  ✓ npm found");
else console.log("  ✗ npm not found");

if (pythonCmd) console.log(`  ✓ python found (${pythonCmd})`);
else console.log("  ⚠ python not found");

if (hasDocker) console.log("  ✓ docker found");
else console.log("  ⚠ docker not found");
console.log("");

// 2. Setup environment
console.log("[2/5] Setting up environment...");
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const envDevPath = path.join(rootDir, '.env.development');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envDevPath)) {
    fs.copyFileSync(envDevPath, envPath);
    console.log("  ✓ Created .env from .env.development template");
  } else {
    console.log("  ⚠ .env.development template not found");
  }
} else {
  console.log("  ✓ .env already exists");
}

const apiEnvPath = path.join(rootDir, 'apps', 'api', '.env');
if (!fs.existsSync(apiEnvPath)) {
  if (fs.existsSync(envDevPath)) {
    fs.copyFileSync(envDevPath, apiEnvPath);
    console.log("  ✓ Created api/.env from .env.development template");
  }
}
console.log("");

// 3. Install Root dependencies
console.log("[3/5] Installing Root dependencies...");
try {
  execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
  console.log("  ✓ Root dependencies installed");
} catch (error) {
  console.error("  ✗ Failed to install Root dependencies:", error.message);
}
console.log("");

// 4. Install API Dependencies & Generate Prisma Client
console.log("[4/5] Installing API dependencies and generating Prisma client...");
try {
  const apiDir = path.join(rootDir, 'apps', 'api');
  execSync('npm ci', { cwd: apiDir, stdio: 'inherit' });
  console.log("  ✓ API dependencies installed");
  try {
    execSync('npx prisma generate', { cwd: apiDir, stdio: 'inherit' });
    console.log("  ✓ Prisma client generated");
  } catch (prismaError) {
    console.warn("  ⚠ Failed to generate Prisma client:", prismaError.message);
  }
} catch (error) {
  console.error("  ✗ Failed to install API dependencies:", error.message);
}
console.log("");

// 5. Install Web Dependencies
console.log("[5/5] Installing Web dependencies...");
try {
  const webDir = path.join(rootDir, 'apps', 'web');
  try {
    execSync('npm ci --legacy-peer-deps', { cwd: webDir, stdio: 'inherit' });
  } catch (ciError) {
    console.log("  ⚠ npm ci failed. Trying npm install --legacy-peer-deps...");
    execSync('npm install --legacy-peer-deps', { cwd: webDir, stdio: 'inherit' });
  }
  console.log("  ✓ Web dependencies installed");
} catch (error) {
  console.error("  ✗ Failed to install Web dependencies:", error.message);
}
console.log("");

// 6. Install AI Service Dependencies (Python)
if (pythonCmd) {
  console.log("[6/5] Installing AI service dependencies...");
  const aiDir = path.join(rootDir, 'apps', 'ai-service');
  const reqPath = path.join(aiDir, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    try {
      execSync(`${pythonCmd} -m pip install -r requirements.txt --quiet`, { cwd: aiDir, stdio: 'inherit' });
      console.log("  ✓ AI service dependencies installed");
    } catch (error) {
      console.log("  ⚠ AI service dependencies installation failed or incomplete");
    }
  }
  console.log("");
}

console.log("  ╔══════════════════════════════════════════════════╗");
console.log("  ║     Setup Complete!                             ║");
console.log("  ║                                                 ║");
console.log("  ║     Run 'npm run dev:all' to launch dev servers ║");
console.log("  ║     Or run setup-specific launch scripts        ║");
console.log("  ╚══════════════════════════════════════════════════╝\n");
