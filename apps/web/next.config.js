/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true, // Игнорируем ошибки линтера при сборке
  },
  typescript: {
    ignoreBuildErrors: true, // Игнорируем ошибки типов при сборке
  },
};

module.exports = nextConfig;