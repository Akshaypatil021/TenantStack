/**
 * ==============================================================================
 * TenantStack — EC2 Master Host Automated Deployment Runner (Agent)
 * ==============================================================================
 * Runs on AWS EC2 on Port 3999 (inside open 3000-4000 range).
 * Automatically handles:
 *  - Git Clone / Pull
 *  - Monorepo subfolder navigation
 *  - Dependency installation (npm / pip)
 *  - Framework builds (React, Vite, Next.js, HTML)
 *  - PM2 process management on isolated ports (3000, 3001, 3002...)
 * ==============================================================================
 */

const http = require('http');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.RUNNER_PORT || 3999;
const APPS_DIR = path.join(process.env.HOME || '/home/ubuntu', 'tenantstack_apps');

// Ensure root apps directory exists
if (!fs.existsSync(APPS_DIR)) {
  fs.mkdirSync(APPS_DIR, { recursive: true });
}

// Helper: Run shell command as a Promise
const runCommand = (cmd, cwd = APPS_DIR) => {
  return new Promise((resolve) => {
    exec(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        code: error ? error.code : 0,
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim(),
      });
    });
  });
};

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Healthcheck endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'TenantStack Master EC2 Deployment Agent',
      port: PORT,
      appsDir: APPS_DIR,
      time: new Date().toISOString(),
    }));
    return;
  }

  // POST /api/deploy — Automated Deployment
  if (req.method === 'POST' && req.url === '/api/deploy') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const {
          appName,
          repoUrl,
          branch = 'main',
          rootDir = '',
          port = 3001,
          template = 'react',
          buildCommand = '',
          startCommand = '',
        } = payload;

        if (!appName || !repoUrl || !port) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'appName, repoUrl, and port are required.' }));
          return;
        }

        const safeAppName = appName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        const appTargetDir = path.join(APPS_DIR, safeAppName);
        const logs = [];

        logs.push(`[1/4] Preparing workspace in ${appTargetDir}...`);

        // 1. Clone or Pull Repo
        if (fs.existsSync(appTargetDir)) {
          logs.push(`[2/4] Updating existing repository from branch: ${branch}...`);
          await runCommand(`git fetch origin && git checkout ${branch} && git pull origin ${branch}`, appTargetDir);
        } else {
          logs.push(`[2/4] Cloning ${repoUrl} (branch: ${branch})...`);
          const cloneRes = await runCommand(`git clone --depth 1 -b ${branch} "${repoUrl}" "${safeAppName}"`, APPS_DIR);
          if (!cloneRes.success) {
            // Try clone without branch if branch failed
            logs.push(`Branch clone failed, attempting default clone...`);
            await runCommand(`git clone --depth 1 "${repoUrl}" "${safeAppName}"`, APPS_DIR);
          }
        }

        // Determine working directory (root or subfolder)
        let workDir = appTargetDir;
        if (rootDir && rootDir.trim()) {
          const subfolder = path.join(appTargetDir, rootDir.trim());
          if (fs.existsSync(subfolder)) {
            workDir = subfolder;
            logs.push(`Detected subfolder: ${rootDir.trim()}`);
          }
        }

        logs.push(`[3/4] Resolving dependencies and runtime in ${workDir}...`);

        // Check if package.json exists
        const hasPackageJson = fs.existsSync(path.join(workDir, 'package.json'));
        const hasIndexHtml = fs.existsSync(path.join(workDir, 'index.html'));
        const hasRequirementsTxt = fs.existsSync(path.join(workDir, 'requirements.txt'));

        let finalStartCmd = '';

        if (hasPackageJson) {
          // Node / React / Vite / Next.js app
          logs.push('Installing npm dependencies...');
          await runCommand('npm install --prefer-offline --no-audit', workDir);

          if (buildCommand && buildCommand.trim()) {
            logs.push(`Executing build: ${buildCommand}...`);
            await runCommand(buildCommand, workDir);
          }

          // Check for built output or start command
          if (startCommand && startCommand.trim()) {
            finalStartCmd = startCommand.replace(/3000/g, String(port));
          } else if (fs.existsSync(path.join(workDir, 'dist'))) {
            finalStartCmd = `npx serve -s dist -l ${port}`;
          } else if (fs.existsSync(path.join(workDir, 'build'))) {
            finalStartCmd = `npx serve -s build -l ${port}`;
          } else {
            finalStartCmd = `PORT=${port} npm start`;
          }
        } else if (hasRequirementsTxt) {
          // Python app
          logs.push('Installing Python dependencies...');
          await runCommand('pip3 install -r requirements.txt', workDir);
          finalStartCmd = `python3 main.py --port ${port}`;
        } else if (hasIndexHtml) {
          // Pure Static HTML website (like Todo-app!)
          logs.push('Detected static website. Serving on port ' + port + '...');
          finalStartCmd = `python3 -m http.server ${port} --bind 0.0.0.0`;
        } else {
          // Fallback static serve
          finalStartCmd = `python3 -m http.server ${port} --bind 0.0.0.0`;
        }

        logs.push(`[4/4] Starting application on Port :${port} via PM2...`);

        const pm2AppName = `ts-${safeAppName}`;

        // Stop existing instance with same name if any
        await runCommand(`pm2 delete "${pm2AppName}" || true`, workDir);

        // Start new PM2 process
        const startRes = await runCommand(
          `pm2 start "${finalStartCmd}" --name "${pm2AppName}" --update-env`,
          workDir
        );

        // Save PM2 state
        await runCommand('pm2 save', workDir);

        logs.push(`✅ Application "${safeAppName}" successfully launched on port :${port}!`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          appName: safeAppName,
          port,
          status: 'running',
          endpoint: `http://${req.headers.host?.split(':')[0]}:${port}`,
          logs,
        }));
      } catch (err) {
        console.error('Deployment error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Internal runner error' }));
      }
    });
    return;
  }

  // POST /api/action — Lifecycle (stop, restart, delete)
  if (req.method === 'POST' && req.url === '/api/action') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { appName, action } = JSON.parse(body || '{}');
        const safeAppName = (appName || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        const pm2AppName = `ts-${safeAppName}`;

        let pm2Cmd = 'status';
        if (action === 'stop') pm2Cmd = 'stop';
        if (action === 'start') pm2Cmd = 'restart';
        if (action === 'restart') pm2Cmd = 'restart';
        if (action === 'terminate') pm2Cmd = 'delete';

        const result = await runCommand(`pm2 ${pm2Cmd} "${pm2AppName}"`);
        await runCommand('pm2 save');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: result.success, action, appName }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================================`);
  console.log(`🚀 TenantStack EC2 Deployment Agent listening on :${PORT}`);
  console.log(`📂 Applications working directory: ${APPS_DIR}`);
  console.log(`========================================================`);
});
