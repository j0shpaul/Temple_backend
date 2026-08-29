import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "crypto";
import { v4 as uuidv4 } from "uuid";

export interface PresignedUploadRequest {
  templeId?: string;
  category: "gallery" | "paath" | "gurukul" | "events" | "deities" | "general";
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  mimeType: string;
  maxSizeBytes: number;
  provider: "S3_COMPATIBLE" | "CLOUDINARY" | "LOCAL_MOCK";
  expiresAt: string;
  headers?: Record<string, string>;
  fields?: Record<string, string>;
}

@Injectable()
export class MediaUploadService {
  private readonly logger = new Logger(MediaUploadService.name);

  private readonly ALLOWED_MIME_TYPES: Record<
    string,
    { extensions: string[]; maxBytes: number }
  > = {
    "image/jpeg": { extensions: ["jpg", "jpeg"], maxBytes: 10 * 1024 * 1024 },
    "image/png": { extensions: ["png"], maxBytes: 10 * 1024 * 1024 },
    "image/webp": { extensions: ["webp"], maxBytes: 10 * 1024 * 1024 },
    "image/gif": { extensions: ["gif"], maxBytes: 5 * 1024 * 1024 },
    "image/svg+xml": { extensions: ["svg"], maxBytes: 2 * 1024 * 1024 },
    "audio/mpeg": { extensions: ["mp3"], maxBytes: 50 * 1024 * 1024 },
    "audio/mp3": { extensions: ["mp3"], maxBytes: 50 * 1024 * 1024 },
    "audio/wav": { extensions: ["wav"], maxBytes: 50 * 1024 * 1024 },
    "audio/ogg": { extensions: ["ogg"], maxBytes: 50 * 1024 * 1024 },
    "video/mp4": { extensions: ["mp4"], maxBytes: 100 * 1024 * 1024 },
    "video/webm": { extensions: ["webm"], maxBytes: 100 * 1024 * 1024 },
    "application/pdf": { extensions: ["pdf"], maxBytes: 20 * 1024 * 1024 },
  };

  constructor(private configService: ConfigService) {}

  async generatePresignedUpload(
    request: PresignedUploadRequest,
    userRole?: string,
  ): Promise<PresignedUploadResponse> {
    // 1. Authorization: Only Staff / Admin / Manager can request pre-signed upload URLs
    if (
      userRole &&
      !["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(userRole)
    ) {
      throw new ForbiddenException(
        "Insufficient permissions to generate media upload URLs",
      );
    }

    const { mimeType, fileName, category, templeId = "temple-main", sizeBytes } =
      request;

    // 2. Validate MIME type
    const mimeConfig = this.ALLOWED_MIME_TYPES[mimeType.toLowerCase()];
    if (!mimeConfig) {
      throw new BadRequestException(
        `Unsupported media type: ${mimeType}. Allowed formats: JPG, PNG, WEBP, GIF, SVG, MP3, WAV, MP4, PDF.`,
      );
    }

    // 3. Validate file size if provided
    if (sizeBytes && sizeBytes > mimeConfig.maxBytes) {
      const maxMb = Math.round(mimeConfig.maxBytes / (1024 * 1024));
      throw new BadRequestException(
        `File size exceeds maximum allowed limit of ${maxMb}MB for ${mimeType}.`,
      );
    }

    // 4. Extract and sanitize file extension
    const rawExt = fileName.split(".").pop()?.toLowerCase() || "";
    const sanitizedExt = mimeConfig.extensions.includes(rawExt)
      ? rawExt
      : mimeConfig.extensions[0];

    // 5. Generate secure, collision-resistant object key with strict path sanitization
    const sanitizedTempleId = templeId.replace(/[^a-zA-Z0-9_-]/g, "");
    const sanitizedCategory = category.replace(/[^a-zA-Z0-9_-]/g, "");
    const uniqueId = uuidv4().replace(/-/g, "").substring(0, 12);
    const timestamp = Date.now();
    const key = `temples/${sanitizedTempleId}/${sanitizedCategory}/${timestamp}_${uniqueId}.${sanitizedExt}`;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes validity

    // 6. Check Cloudinary or S3 configuration
    const cloudName = this.configService.get<string>("CLOUDINARY_CLOUD_NAME");
    const apiKey = this.configService.get<string>("CLOUDINARY_API_KEY");
    const apiSecret = this.configService.get<string>("CLOUDINARY_API_SECRET");
    const s3Bucket = this.configService.get<string>("S3_BUCKET_NAME");

    if (process.env.NODE_ENV === "production" && !cloudName && !s3Bucket) {
      throw new BadRequestException(
        "Media object storage (Cloudinary or AWS S3) is not configured for production uploads.",
      );
    }

    if (cloudName && apiKey && apiSecret) {
      const timestampSec = Math.round(Date.now() / 1000);
      const publicId = key.replace(/\.[^/.]+$/, ""); // Strip extension for Cloudinary public_id
      const signaturePayload = `public_id=${publicId}&timestamp=${timestampSec}${apiSecret}`;
      const signature = createHmac("sha1", apiSecret)
        .update(signaturePayload)
        .digest("hex");

      return {
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        publicUrl: `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}.${sanitizedExt}`,
        key,
        mimeType,
        maxSizeBytes: mimeConfig.maxBytes,
        provider: "CLOUDINARY",
        expiresAt,
        fields: {
          api_key: apiKey,
          timestamp: String(timestampSec),
          public_id: publicId,
          signature,
        },
      };
    }

    // S3-compatible pre-signed upload URL
    const s3Endpoint =
      this.configService.get<string>("S3_ENDPOINT") ||
      `https://${s3Bucket || "temple-assets"}.s3.amazonaws.com`;

    return {
      uploadUrl: `${s3Endpoint}/${key}`,
      publicUrl: `${s3Endpoint}/${key}`,
      key,
      mimeType,
      maxSizeBytes: mimeConfig.maxBytes,
      provider: "S3_COMPATIBLE",
      expiresAt,
      headers: {
        "Content-Type": mimeType,
        "x-amz-acl": "public-read",
      },
    };
  }
}
