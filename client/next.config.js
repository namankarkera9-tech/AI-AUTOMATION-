const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents double mounting during canvas node drag/drop operations
  transpilePackages: ['@xyflow/react'],
  outputFileTracingRoot: path.resolve(__dirname, '..'),
};

module.exports = nextConfig;
