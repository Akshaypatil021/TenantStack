import fs from 'fs';
import path from 'path';

export class StorageService {
  private static uploadBaseDir = path.join(process.cwd(), 'uploads');

  /**
   * Returns isolated directory path for tenant project files:
   * uploads/tenants/{tenantId}/projects/{projectId}
   */
  public static getTenantDirectory(tenantId: string, projectId: string): string {
    const dir = path.join(this.uploadBaseDir, 'tenants', tenantId, 'projects', projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Deletes physical file from storage
   */
  public static deleteFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (err) {
      console.error('Failed to delete storage file:', err);
    }
    return false;
  }
}
