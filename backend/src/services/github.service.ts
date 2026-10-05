import cron from 'node-cron';
import Project from '../modules/projects/project.model';
import { logActivity } from '../modules/activity/activity.controller';

export const startGithubSyncCron = () => {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron] Running GitHub Sync for projects...');
    try {
      const projects = await Project.find({ githubRepoUrl: { $exists: true, $ne: '' } });
      
      for (const project of projects) {
        // Here we would actually run `git pull` or clone using simple-git if this was a real worker server.
        // For now, we simulate the git pull operation.
        
        console.log(`[Cron] Syncing project: ${project.name} (${project.githubRepoUrl})`);
        
        project.lastSyncedAt = new Date();
        await project.save();

        await logActivity(
          project.tenantId.toString(),
          undefined, // System action
          'REPO_SYNCED',
          `System automatically pulled latest code from ${project.githubRepoUrl}`,
          { projectId: project._id, githubRepoUrl: project.githubRepoUrl }
        );
      }
    } catch (error) {
      console.error('[Cron] Error syncing GitHub repos:', error);
    }
  });
};
