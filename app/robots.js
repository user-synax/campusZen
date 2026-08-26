export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/feed',
          '/admin',
          '/settings',
          '/chats',
          '/notifications',
          '/verify-student',
        ],
      },
      {
        userAgent: '*',
        allow: ['/api', '/openapi.json', '/llms.txt', '/developers'],
        disallow: ['/api/admin', '/api/auth/logout', '/api/billing'],
      },
    ],
    sitemap: 'https://campuszen.tech/sitemap.xml',
    host: 'https://campuszen.tech',
  }
}
