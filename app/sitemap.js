import connectDB from "@/lib/db";
import Community from "@/models/Community";

export default async function sitemap() {
  const baseUrl = 'https://campuszen.tech'
  
  // Static routes
  const staticRoutes = [
    '',
    '/login',
    '/signup',
    '/terms',
    '/privacy',
    '/markdown',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: route === '' ? 'daily' : 'monthly',
    priority: route === '' ?  1 : 0.8
  }))

  // Dynamic routes (Communities)
  let communityRoutes = []
  try {
    await connectDB()
    const communities = await Community.find({}).select('slug updatedAt').lean()
    communityRoutes = communities.map((community) => ({
      url: `${baseUrl}/community/${community.slug}`,
      lastModified: community.updatedAt ? new Date(community.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      changeFrequency: 'weekly',
      priority: 0.6,
    }))
  } catch (error) {
    console.error('Error generating sitemap for communities:', error)
  }

  return [...staticRoutes, ...communityRoutes]
}
