import connectDB from '@/lib/db'
import Post from '@/models/Post'
import User from '@/models/User'
import { formatCollegeName } from '@/utils/formatters'
import { sanitizeMongoInput } from '@/lib/sanitize'

export async function generateMetadata({ params }) {
  const collegeSlug = decodeURIComponent(params.college)
  const formattedName = formatCollegeName(collegeSlug)
  // Escape regex metacharacters to prevent ReDoS from a crafted slug.
  const safeSlug = sanitizeMongoInput(collegeSlug)

  try {
    await connectDB()

    const [postCount, memberCount] = await Promise.all([
      Post.countDocuments({
        community: { $regex: safeSlug, $options: 'i' },
        isDeleted: false
      }).catch(() => 0),
      User.countDocuments({
        college: { $regex: safeSlug, $options: 'i' }
      }).catch(() => 0)
    ])

    const ogImage = `${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`
    const communityUrl = `${process.env.NEXT_PUBLIC_APP_URL}/community/${collegeSlug}`

    return {
      title: `${formattedName} Community — CampusZen`,
      description: `${postCount} posts from ${formattedName} students on CampusZen. Join the community!`,
      keywords: ['college community', formattedName, 'campus', 'students'],
      openGraph: {
        type: 'website',
        title: `${formattedName} on CampusZen`,
        description: `Join ${formattedName} community — ${postCount} posts and ${memberCount} members.`,
        url: communityUrl,
        siteName: 'CampusZen',
        images: [{
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${formattedName} Community`
        }]
      },
      twitter: {
        card: 'summary_large_image',
        title: `${formattedName} Community — CampusZen`,
        description: `${postCount} posts from ${formattedName} students.`,
        images: [ogImage]
      }
    }
  } catch (error) {
    console.error('[Community Metadata] Error:', error)
    return {
      title: `${formattedName} Community — CampusZen`,
      description: `Join the ${formattedName} community on CampusZen.`
    }
  }
}
