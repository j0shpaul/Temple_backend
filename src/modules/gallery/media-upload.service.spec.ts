import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { MediaUploadService } from "./media-upload.service";

describe("MediaUploadService", () => {
  let service: MediaUploadService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === "S3_BUCKET_NAME") return "temple-assets-prod";
      if (key === "S3_ENDPOINT") return "https://temple-assets-prod.s3.amazonaws.com";
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaUploadService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MediaUploadService>(MediaUploadService);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should generate S3-compatible pre-signed upload URL for authorized staff", async () => {
    const result = await service.generatePresignedUpload(
      {
        category: "gallery",
        fileName: "temple-festival.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 2 * 1024 * 1024,
        templeId: "temple-1",
      },
      "STAFF",
    );

    expect(result).toBeDefined();
    expect(result.provider).toBe("S3_COMPATIBLE");
    expect(result.uploadUrl).toContain("https://temple-assets-prod.s3.amazonaws.com/temples/temple-1/gallery/");
    expect(result.key).toMatch(/^temples\/temple-1\/gallery\/\d+_[a-f0-9]+\.jpg$/);
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.maxSizeBytes).toBe(10 * 1024 * 1024);
  });

  it("should reject unauthorized roles (e.g. DEVOTEE)", async () => {
    await expect(
      service.generatePresignedUpload(
        {
          category: "gallery",
          fileName: "malicious.jpg",
          mimeType: "image/jpeg",
        },
        "DEVOTEE",
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("should reject disallowed MIME types (e.g. text/html, application/x-msdownload)", async () => {
    await expect(
      service.generatePresignedUpload(
        {
          category: "gallery",
          fileName: "script.exe",
          mimeType: "application/x-msdownload",
        },
        "ADMIN",
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("should reject files exceeding maximum size limits", async () => {
    await expect(
      service.generatePresignedUpload(
        {
          category: "gallery",
          fileName: "huge-image.png",
          mimeType: "image/png",
          sizeBytes: 50 * 1024 * 1024, // 50MB > 10MB
        },
        "ADMIN",
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
