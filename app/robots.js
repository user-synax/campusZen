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
      // Explicitly allow known AI crawlers/agents to reach the homepage and
      // public surface (defense-in-depth in case a WAF denies by default).
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'DeepSeekBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'ora-agent', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'AI2Bot', allow: '/' },
    ],
    sitemap: 'https://campuszen.tech/sitemap.xml',
    host: 'https://campuszen.tech',
  }
}
