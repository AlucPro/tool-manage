#!/usr/bin/env node

const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.includes("pnpm")) {
  console.error("This project only supports pnpm.");
  console.error("Please run `pnpm install` instead of npm or yarn.");
  process.exit(1);
}
