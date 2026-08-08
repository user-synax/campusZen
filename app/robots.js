export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/feed',
          '/admin',
          '/api',
          '/settings',
          '/chats',
          '/notifications',
          '/verify-student',
        ],
      },
    ],
    sitemap: 'https://campuszen.tech/sitemap.xml',
  }
}
