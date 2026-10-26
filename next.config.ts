import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Local Workers bindings (D1/R2) for `next dev`, driven by the Freebuff-generated config.
// Next.js loads this file in every process (dev server, dev workers, build workers), so gate on
// the CLI phase: never initialize Miniflare for `next build` / `next start`, where the local
// workerd runtime isn't needed (and would otherwise be started during the build).
const argv = process.argv;
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  argv.includes("build") ||
  argv.includes("start");

if (!isBuildPhase) {
  initOpenNextCloudflareForDev({ configPath: "./freebuff.wrangler.jsonc" });
}

const nextConfig: NextConfig = {};

export default nextConfig;
