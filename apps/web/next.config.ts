import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  agentRules: false,
  // Self-contained server bundle for the Docker image; traced from the monorepo root.
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

export default nextConfig;
