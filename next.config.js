/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable PWA features for now
  pwa: {
    disable: true,
    dest: 'public'
  }
}

module.exports = nextConfig
