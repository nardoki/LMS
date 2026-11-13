import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '@lms/supabase';

export interface UploadedMediaFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export const LESSON_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/markdown',
  'text/plain',
]);

export const SUBMISSION_MIME_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/markdown',
  'text/html',
  'text/css',
  'application/javascript',
  'text/javascript',
  'application/json',
  'image/png',
  'image/jpeg',
]);

@Injectable()
export class GatewayStorageService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async uploadObject(params: {
    bucket: string;
    objectPrefix: string;
    file: UploadedMediaFile;
    allowedMimeTypes: Set<string>;
  }): Promise<{ path: string; signedUrl: string | null }> {
    if (!params.file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!params.allowedMimeTypes.has(params.file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type '${params.file.mimetype}'`,
      );
    }

    const client = this.supabaseService.getClient('public');
    await this.ensureBucketExists(client, params.bucket);

    const safeName = params.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectPath = `${params.objectPrefix}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await client.storage
      .from(params.bucket)
      .upload(objectPath, params.file.buffer, {
        contentType: params.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new BadRequestException(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: signed } = await client.storage
      .from(params.bucket)
      .createSignedUrl(objectPath, 60 * 60 * 24 * 7);

    return {
      path: `${params.bucket}/${objectPath}`,
      signedUrl: signed?.signedUrl ?? null,
    };
  }

  private async ensureBucketExists(
    client: ReturnType<SupabaseService['getClient']>,
    bucket: string,
  ) {
    const { data: buckets } = await client.storage.listBuckets();
    if (!buckets?.some((b) => b.name === bucket)) {
      await client.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: 50 * 1024 * 1024,
      });
    }
  }
}
