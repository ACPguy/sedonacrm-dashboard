/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@uiw/react-md-editor', '@uiw/react-markdown-preview'],
  generateBuildId: async () => require('crypto').randomBytes(8).toString('hex'),
};

module.exports = nextConfig;
