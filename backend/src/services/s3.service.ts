import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export type StorageCategory = 'DOCUMENT' | 'DATASET' | 'IMAGE' | 'CODE' | 'ARCHIVE' | 'OTHER';
export type StorageProvider = 'AWS_S3' | 'LOCAL';

export interface UploadObjectResult {
  provider: StorageProvider;
  s3Key: string;
  s3Bucket: string;
  localPath?: string;
}

export interface ObjectStreamResult {
  stream: NodeJS.ReadableStream;
  contentType: string;
  contentLength?: number;
}

export class S3Service {
  private static s3Client: S3Client | null = null;
  private static cachedAccessKey: string | null = null;
  private static localBaseDir: string = path.join(process.cwd(), 'uploads', 'tenants');

  private static get bucketName(): string {
    return (process.env.S3_BUCKET_NAME || 'tenantstack-storage').trim();
  }

  private static get region(): string {
    return (process.env.AWS_REGION || 'ap-south-1').trim();
  }

  /**
   * Initializes or returns the AWS S3 client if valid credentials exist.
   * Returns null if AWS credentials are dummy/placeholder values or not set.
   */
  private static getClient(): S3Client | null {
    const accessKey = process.env.AWS_ACCESS_KEY_ID?.trim();
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

    // Check for placeholder/missing credentials
    const isPlaceholder =
      !accessKey ||
      !secretKey ||
      accessKey === 'your_access_key' ||
      secretKey === 'your_secret_key' ||
      accessKey.length < 8;

    if (isPlaceholder) {
      return null;
    }

    if (this.s3Client && this.cachedAccessKey === accessKey) {
      return this.s3Client;
    }

    try {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
      });
      this.cachedAccessKey = accessKey;
      return this.s3Client;
    } catch (err) {
      console.warn('[S3Service] Failed to initialize S3Client, falling back to local storage:', err);
      return null;
    }
  }

  /**
   * Check if AWS S3 is configured with real credentials
   */
  public static isS3Active(): boolean {
    return this.getClient() !== null;
  }

  /**
   * Get Bucket Name
   */
  public static getBucketName(): string {
    return this.bucketName;
  }

  /**
   * Get AWS Region
   */
  public static getRegion(): string {
    return this.region;
  }

  /**
   * Generates a tenant-isolated local storage directory
   */
  private static ensureLocalTenantDir(tenantId: string): string {
    const dir = path.join(this.localBaseDir, tenantId, 'storage');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Detects the category of a file for intuitive dashboard filtering
   */
  public static detectCategory(mimeType: string, fileName: string): StorageCategory {
    const ext = path.extname(fileName).toLowerCase();

    // Datasets / Tabular / Data files
    if (
      ['.csv', '.tsv', '.xlsx', '.xls', '.parquet', '.feather'].includes(ext) ||
      mimeType.includes('csv') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel')
    ) {
      return 'DATASET';
    }

    // Documents
    if (
      ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.ppt', '.pptx', '.md', '.log'].includes(ext) ||
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('word') ||
      mimeType.startsWith('text/')
    ) {
      return 'DOCUMENT';
    }

    // Images
    if (
      ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.ico'].includes(ext) ||
      mimeType.startsWith('image/')
    ) {
      return 'IMAGE';
    }

    // Source Code
    if (
      ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.html', '.css', '.json', '.sql', '.sh', '.yaml', '.yml'].includes(ext)
    ) {
      return 'CODE';
    }

    // Archives
    if (['.zip', '.tar', '.gz', '.7z', '.rar', '.bz2'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed')) {
      return 'ARCHIVE';
    }

    return 'OTHER';
  }

  /**
   * Upload an object to AWS S3, or gracefully fallback to isolated local tenant storage
   */
  public static async uploadObject(params: {
    tenantId: string;
    fileBuffer: Buffer;
    fileName: string;
    originalName: string;
    mimeType: string;
  }): Promise<UploadObjectResult> {
    const { tenantId, fileBuffer, fileName, mimeType } = params;
    const client = this.getClient();
    const s3Key = `${tenantId}/storage/${fileName}`;

    if (client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: mimeType,
          Metadata: {
            tenantId,
            originalName: encodeURIComponent(params.originalName),
          },
        });

        await client.send(command);

        return {
          provider: 'AWS_S3',
          s3Key,
          s3Bucket: this.bucketName,
        };
      } catch (error) {
        console.warn('[S3Service] Upload to S3 failed, falling back to local storage:', error);
      }
    }

    // Fallback: Resilient isolated local disk storage
    const targetDir = this.ensureLocalTenantDir(tenantId);
    const localFilePath = path.join(targetDir, fileName);
    fs.writeFileSync(localFilePath, fileBuffer);

    return {
      provider: 'LOCAL',
      s3Key,
      s3Bucket: this.bucketName,
      localPath: localFilePath,
    };
  }

  /**
   * Read file buffer (Used for Gemini data analysis & inspection)
   */
  public static async getObjectBuffer(params: {
    s3Key: string;
    provider: StorageProvider;
    localPath?: string;
  }): Promise<Buffer> {
    const { s3Key, provider, localPath } = params;

    if (provider === 'LOCAL' || !this.getClient()) {
      const filePath = localPath || path.join(process.cwd(), 'uploads', 'tenants', s3Key.replace('/storage/', path.sep + 'storage' + path.sep));
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
      throw new Error('Local file not found');
    }

    const client = this.getClient()!;
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    const response = await client.send(command);
    if (!response.Body) {
      throw new Error('Empty S3 object body');
    }

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Streams an object for download
   */
  public static async getObjectStream(params: {
    s3Key: string;
    provider: StorageProvider;
    localPath?: string;
    mimeType?: string;
  }): Promise<ObjectStreamResult> {
    const { s3Key, provider, localPath, mimeType = 'application/octet-stream' } = params;

    if (provider === 'LOCAL' || !this.getClient()) {
      const filePath = localPath || path.join(process.cwd(), 'uploads', 'tenants', s3Key.replace('/storage/', path.sep + 'storage' + path.sep));
      if (!fs.existsSync(filePath)) {
        throw new Error('Local file not found on disk');
      }
      const stat = fs.statSync(filePath);
      return {
        stream: fs.createReadStream(filePath),
        contentType: mimeType,
        contentLength: stat.size,
      };
    }

    const client = this.getClient()!;
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    const response = await client.send(command);
    return {
      stream: response.Body as NodeJS.ReadableStream,
      contentType: response.ContentType || mimeType,
      contentLength: response.ContentLength,
    };
  }

  /**
   * Generates a signed download URL (or direct API route if local)
   */
  public static async getSignedDownloadUrl(params: {
    s3Key: string;
    provider: StorageProvider;
    originalName: string;
    expiresInSeconds?: number;
  }): Promise<string | null> {
    const { s3Key, provider, originalName, expiresInSeconds = 3600 } = params;
    const client = this.getClient();

    if (provider === 'AWS_S3' && client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalName)}"`,
        });
        return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
      } catch (err) {
        console.warn('[S3Service] Failed to generate signed S3 URL:', err);
      }
    }

    return null;
  }

  /**
   * Deletes an object from S3 or local disk storage
   */
  public static async deleteObject(params: {
    s3Key: string;
    provider: StorageProvider;
    localPath?: string;
  }): Promise<boolean> {
    const { s3Key, provider, localPath } = params;
    let deleted = false;

    // Delete from AWS S3 if provider was AWS_S3
    if (provider === 'AWS_S3') {
      const client = this.getClient();
      if (client) {
        try {
          const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
          });
          await client.send(command);
          deleted = true;
        } catch (err) {
          console.warn('[S3Service] Error deleting from S3:', err);
        }
      }
    }

    // Delete from local disk if localPath exists
    if (localPath && fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
        deleted = true;
      } catch (err) {
        console.warn('[S3Service] Error deleting local file:', err);
      }
    }

    return deleted;
  }
}
