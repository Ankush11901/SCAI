import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || "proj_scai_article_generator",
  runtime: "node",
  logLevel: "log",
  // @ts-ignore maxDuration is required in v4 CLI but types may not include it
  maxDuration: 900, // 15 minutes - content + image generation
  tsconfig: "./tsconfig.json", // Enable path alias resolution (@/*)
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./lib/jobs"],
  build: {
    // External packages that shouldn't be bundled
    external: [
      // Keep @libsql/client external so it resolves the web driver at runtime
      "@libsql/client",
      // Native libsql bindings (platform-specific) - mark as external to prevent bundling errors
      "@libsql/linux-x64-gnu",
      "@libsql/linux-arm64-gnu",
      "@libsql/linux-x64-musl",
      "@libsql/linux-arm64-musl",
      "@libsql/win32-x64-msvc",
      "@libsql/darwin-x64",
      "@libsql/darwin-arm64",
      // Other native packages
      "better-sqlite3",
      "sharp",
    ],
  },
});
