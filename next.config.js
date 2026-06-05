/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Optimize for Docker - reduces image size by ~70%
  async rewrites() {
    return [
      { source: '/api/v1/version-control/:path*', destination: '/api/github/:path*' },
      { source: '/api/v1/ai/:path*',              destination: '/api/ai/:path*' },
      { source: '/api/v1/code-analysis/:path*',   destination: '/api/sonarqube/:path*' },
      { source: '/api/v1/analytics/:path*',       destination: '/api/analytics/:path*' },
    ];
  },
};

module.exports = nextConfig;
