/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure runtime settings to avoid Edge Runtime warnings
  serverExternalPackages: ['sqlite3', 'bcryptjs', 'jsonwebtoken'],
  
  // Configure webpack to handle Node.js modules properly (fallback for non-Turbopack builds)
  webpack: (config, { isServer }) => {
    // Add fallbacks for Node.js modules in client-side code
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        url: false,
        crypto: false,
      };
    }
    
    return config;
  },
  
  // Configure headers for CORS and security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',')[0] : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-API-Key',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
