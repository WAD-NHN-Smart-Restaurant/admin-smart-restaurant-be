import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('R2_ENDPOINT')!;
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID')!;
    const secretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    )!;
    this.bucketName = this.configService.get<string>(
      'R2_BUCKET_NAME',
      'menu_images',
    );

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; key: string }> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const key = `${folder}/${fileName}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      // Construct the public URL.
      const baseUrl = this.configService.get<string>('R2_ENDPOINT');
      const publicUrl = `${baseUrl}/${this.bucketName}/${key}`;

      return {
        url: publicUrl,
        key: key,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file to R2: ${error.message}`);
      this.logger.error(`Error details: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete file from R2: ${error.message}`);
      throw error;
    }
  }
}
