import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  listInstances,
  deployInstance,
  instanceAction,
  getInstance,
  getComputeQuota,
  getInstanceLogs,
  streamInstanceLogs,
  execInstanceCommand,
  getInstanceStatsHistory,
  deployFromGithub,
  redeployGithubInstance,
  getInstanceBuildLogs,
  getAdminEc2Host,
  updateAdminEc2Host,
  testAdminEc2Host,
  getAvailablePort,
  handleGithubWebhook,
  getWebhookConfig,
  updateWebhookConfig,
} from './compute.controller';

const router = Router();

// =============================================================================
// Webhook Routes (Public & Authenticated Management)
// =============================================================================
// POST /api/v1/compute/webhook/:instanceId — Public GitHub Webhook Auto-Deploy Trigger (NO Auth required)
router.post('/webhook/:instanceId', handleGithubWebhook);

// GET /api/v1/compute/:instanceId/webhook — Get Webhook URL & recent deployment logs
router.get('/:instanceId/webhook', authenticate, getWebhookConfig);

// PATCH /api/v1/compute/:instanceId/webhook — Toggle auto-deploy or regenerate secret
router.patch('/:instanceId/webhook', authenticate, updateWebhookConfig);

// GET /api/v1/compute/quota — Plan quota details
router.get('/quota', authenticate, getComputeQuota);

// GET /api/v1/compute/next-port — Calculate next collision-free port on Master EC2
router.get('/next-port', authenticate, getAvailablePort);

// GET /api/v1/compute — List all tenant compute instances
router.get('/', authenticate, listInstances);

// Super Admin: Master EC2 Node Settings
router.get('/admin/ec2-host', authenticate, getAdminEc2Host);
router.put('/admin/ec2-host', authenticate, updateAdminEc2Host);
router.post('/admin/ec2-host/test', authenticate, testAdminEc2Host);

// POST /api/v1/compute/deploy-github — Deploy website from GitHub onto master EC2
router.post('/deploy-github', authenticate, deployFromGithub);

// GET /api/v1/compute/:instanceId — Single instance details
router.get('/:instanceId', authenticate, getInstance);

// POST /api/v1/compute/deploy — Deploy a new compute instance
router.post('/deploy', authenticate, deployInstance);

// PATCH /api/v1/compute/:instanceId/action — Lifecycle action (start/stop/restart/terminate)
router.patch('/:instanceId/action', authenticate, instanceAction);

// POST /api/v1/compute/:instanceId/redeploy — Pull latest code from GitHub and redeploy
router.post('/:instanceId/redeploy', authenticate, redeployGithubInstance);

// GET /api/v1/compute/:instanceId/build-logs — Get GitHub deployment build logs
router.get('/:instanceId/build-logs', authenticate, getInstanceBuildLogs);

// GET /api/v1/compute/:instanceId/logs — Container logs (tail, filter)
router.get('/:instanceId/logs', authenticate, getInstanceLogs);

// GET /api/v1/compute/:instanceId/logs/stream — Real-time container logs SSE stream
router.get('/:instanceId/logs/stream', authenticate, streamInstanceLogs);

// POST /api/v1/compute/:instanceId/exec — Interactive Terminal CLI command execution
router.post('/:instanceId/exec', authenticate, execInstanceCommand);

// GET /api/v1/compute/:instanceId/stats/history — Telemetry stats history for real-time graphs
router.get('/:instanceId/stats/history', authenticate, getInstanceStatsHistory);

export default router;
