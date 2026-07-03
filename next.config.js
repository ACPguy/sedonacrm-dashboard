/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@uiw/react-md-editor', '@uiw/react-markdown-preview'],
  generateBuildId: async () => require('crypto').randomBytes(8).toString('hex'),
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'query', key: 'view', value: 'morning-briefing' }],
        destination: '/home',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
