/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            // Permite câmera/mic/fullscreen para a página e para iframes filhos (Daily.co).
            // Sem este header, alguns servidores/proxies restringem acesso à câmera em iframes,
            // causando o spinner infinito do Daily.co em produção.
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*, fullscreen=*, display-capture=*, autoplay=*',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
