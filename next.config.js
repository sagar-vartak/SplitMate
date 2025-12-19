/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure proper handling of Supabase client
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Resolve Supabase properly on client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig

