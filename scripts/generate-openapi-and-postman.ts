import { Test } from "@nestjs/testing";
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from "@nestjs/swagger";
import * as fs from "fs";
import * as path from "path";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/modules/prisma/prisma.service";
import { RedisService } from "../src/modules/redis/redis.service";

// Mock PrismaService to prevent PostgreSQL database connection attempt
class MockPrismaService {
  async onModuleInit() {
    // No-op for offline spec generation
  }
}

// Mock RedisService to prevent Redis connection attempt
class MockRedisService {
  async onModuleInit() {
    // No-op for offline spec generation
  }
  async onModuleDestroy() {
    // No-op
  }
  async healthCheck() {
    return true;
  }
}

async function generateSpecAndPostman() {
  console.log("🛠️  Initializing offline NestJS application context...");

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useClass(MockPrismaService)
    .overrideProvider(RedisService)
    .useClass(MockRedisService)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api/v1");
  await app.init();

  console.log("📚 Building OpenAPI 3.0 document...");

  const config = new DocumentBuilder()
    .setTitle("Temple Digital Platform API")
    .setDescription(
      "Comprehensive RESTful Backend API for Temple Digital Platform (Devotee & Admin Panel)",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("Pages", "Page-level read aggregations (BFF layer)")
    .addTag("Auth", "OTP authentication & JWT token management")
    .addTag("Users", "User profile & address management")
    .addTag("Temples", "Temple metadata & information")
    .addTag("Deities", "Temple deities management")
    .addTag("Gallery", "Media & photo gallery")
    .addTag("Darshan", "Darshan schedules & real-time slot availability")
    .addTag("Aarti", "Daily aarti schedules & timings")
    .addTag("Puja", "Puja ceremonies & slot booking")
    .addTag("Seva", "Temple seva offerings & reservations")
    .addTag("Bookings", "Unified booking engine for Puja, Seva & Darshan")
    .addTag("Payments", "Cashfree payment integration & webhooks")
    .addTag("Donations", "Causes, online donations & receipts")
    .addTag("Prasad", "Prasad catalog, inventory & delivery orders")
    .addTag("Accommodation", "Guest house room inventory & booking management")
    .addTag("Events", "Temple festivals, events & registrations")
    .addTag("Notifications", "User notifications & announcements")
    .addTag("QR Verification", "Cryptographic QR check-in & verification")
    .addTag("Paath", "Nitya Paath Shrawan: Vedic Mantras & Shlokas")
    .addTag("Gurukul", "Shree Neelkantheshwar Mahadev Gurukulam")
    .addTag("Mahaprasad", "Mahaprasad dining slot management & seat booking")
    .addTag("Jigyasa Samadhan", "Spiritual inquiry & Sanatan Dharma Q&A")
    .addTag("Admin", "Admin dashboard, crowd analytics & audit logs")
    .addTag("Health", "System health & liveness probes")
    .build();

  const document: OpenAPIObject = SwaggerModule.createDocument(app, config);

  const docsDir = path.join(__dirname, "../docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // 1. Save OpenAPI JSON file
  const openApiFilePath = path.join(docsDir, "openapi.json");
  fs.writeFileSync(openApiFilePath, JSON.stringify(document, null, 2), "utf8");
  console.log(`✅ Saved OpenAPI JSON to: ${openApiFilePath}`);

  // 2. Convert to Postman v2.1 Collection
  console.log("📦 Converting OpenAPI spec to Postman Collection v2.1...");
  const postmanCollection = convertOpenApiToPostman(document);

  const postmanFilePath = path.join(
    docsDir,
    "temple_api_postman_collection.json",
  );
  fs.writeFileSync(
    postmanFilePath,
    JSON.stringify(postmanCollection, null, 2),
    "utf8",
  );
  console.log(`✅ Saved Postman Collection to: ${postmanFilePath}`);

  await app.close();
  console.log("🎉 Spec generation completed successfully.");
}

function convertOpenApiToPostman(doc: OpenAPIObject) {
  const collection: any = {
    info: {
      name: doc.info.title || "Temple Digital Platform API Collection",
      description: doc.info.description || "API Collection for Temple Digital Platform",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      {
        key: "baseUrl",
        value: "http://localhost:3000/api/v1",
        type: "string",
      },
      {
        key: "accessToken",
        value: "",
        type: "string",
      },
    ],
    item: [],
  };

  const tagFolderMap = new Map<string, any[]>();

  const httpMethods = ["get", "post", "put", "patch", "delete", "options", "head"] as const;

  for (const pathKey of Object.keys(doc.paths)) {
    const pathObj = doc.paths[pathKey] as Record<string, any>;
    for (const method of httpMethods) {
      if (!pathObj[method]) continue;
      const op = pathObj[method];

      const tag = op.tags && op.tags.length > 0 ? op.tags[0] : "General";
      if (!tagFolderMap.has(tag)) {
        tagFolderMap.set(tag, []);
      }

      // Format URL for Postman
      // e.g. /api/v1/users/:id or /users/{id} -> {{baseUrl}}/users/:id
      const formattedPath = pathKey.replace(/\{([^}]+)\}/g, ":$1");
      const urlString = `{{baseUrl}}${formattedPath}`;

      const requestItem: any = {
        name: op.summary || `${method.toUpperCase()} ${pathKey}`,
        request: {
          method: method.toUpperCase(),
          header: [
            {
              key: "Content-Type",
              value: "application/json",
            },
          ],
          url: {
            raw: urlString,
            host: ["{{baseUrl}}"],
            path: formattedPath.split("/").filter(Boolean),
          },
          description: op.description || "",
        },
      };

      // Handle query parameters
      if (op.parameters) {
        const queryParams = op.parameters
          .filter((p: any) => p.in === "query")
          .map((p: any) => ({
            key: p.name,
            value: "",
            description: p.description || "",
            disabled: !p.required,
          }));
        if (queryParams.length > 0) {
          requestItem.request.url.query = queryParams;
        }
      }

      // Handle authentication (Bearer JWT)
      const requiresSecurity = op.security && op.security.length > 0;
      if (requiresSecurity) {
        requestItem.request.auth = {
          type: "bearer",
          bearer: [
            {
              key: "token",
              value: "{{accessToken}}",
              type: "string",
            },
          ],
        };
      }

      // Handle body if present
      if (op.requestBody && op.requestBody.content) {
        const jsonContent = op.requestBody.content["application/json"];
        if (jsonContent) {
          requestItem.request.body = {
            mode: "raw",
            raw: JSON.stringify(jsonContent.schema || {}, null, 2),
            options: {
              raw: {
                language: "json",
              },
            },
          };
        }
      }

      tagFolderMap.get(tag)!.push(requestItem);
    }
  }

  for (const [tagName, items] of tagFolderMap.entries()) {
    collection.item.push({
      name: tagName,
      item: items,
    });
  }

  return collection;
}

generateSpecAndPostman().catch((err) => {
  console.error("❌ Error generating spec and Postman collection:", err);
  process.exit(1);
});
