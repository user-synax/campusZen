import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { withCache, deleteCachePattern } from '@/lib/cache';
import Community from '@/models/Community';
import User from '@/models/User';
import { sanitizeMongoInput } from '@/lib/sanitize';
import { getCurrentUser } from '@/lib/auth';
import { errorResponse, APIError, BadRequestError, UnauthorizedError } from '@/lib/api-response';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const specificName = sanitizeMongoInput(searchParams.get('name'));
    const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 50);

    await connectDB();

    // Specific community stats — include verifiedMemberCount with on-the-fly fallback
    if (specificName) {
      const community = await Community.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${specificName}$`, 'i') } },
          { slug: specificName.toLowerCase() }
        ]
      })
      if (!community) {
        return NextResponse.json({ name: specificName, postCount: 0, memberCount: 0, verifiedMemberCount: 0, isCollege: false })
      }

      // Prefer stored field; compute on-the-fly if zero but members exist
      let verifiedMemberCount = community.verifiedMemberCount ?? 0
      if (verifiedMemberCount === 0 && community.members?.length > 0) {
        try {
          verifiedMemberCount = await User.countDocuments({ _id: { $in: community.members }, isVerified: true })
          // Fire-and-forget sync stored value if we found verified members
          if (verifiedMemberCount > 0) {
            Community.updateOne({ _id: community._id }, { $set: { verifiedMemberCount } }).catch(() => {})
          }
        } catch {
          verifiedMemberCount = community.verifiedMemberCount ?? 0
        }
      }

      // Optional isMember for current user (non-breaking — undefined if guest)
      let isMember = undefined
      try {
        const currentUser = await getCurrentUser(request)
        if (currentUser) {
          isMember = community.members.some((m) => m.toString() === currentUser._id.toString())
        }
      } catch {}

      return NextResponse.json({
        name: community.name,
        slug: community.slug,
        emoji: community.emoji,
        description: community.description,
        type: community.type,
        postCount: community.postCount,
        memberCount: community.members.length,
        verifiedMemberCount: verifiedMemberCount ?? 0,
        collegeDomain: community.collegeDomain || "",
        isCollege: community.type === "college",
        ...(isMember !== undefined ? { isMember } : {}),
      })
    }

    // All communities — sorted by verified first, include verifiedMemberCount
    const communities = await withCache('communities_list_v2', 60, async () => {
      const list = await Community.find()
        .sort({ verifiedMemberCount: -1, postCount: -1 })
        .limit(limit)
        .select("name slug emoji description type postCount members verifiedMemberCount collegeDomain updatedAt")
        .lean()

      return list.map(c => ({
        name: c.name,
        slug: c.slug,
        emoji: c.emoji,
        description: c.description,
        type: c.type,
        postCount: c.postCount,
        memberCount: c.members?.length || 0,
        verifiedMemberCount: c.verifiedMemberCount ?? 0,
        collegeDomain: c.collegeDomain || "",
        lastPost: c.updatedAt
      }))
    })

    return NextResponse.json(communities)
    } catch (error) {
      console.error('Communities API error:', error);
      return errorResponse(new APIError('Failed to load communities.', 500, 'INTERNAL_ERROR'));
    }
  }

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return errorResponse(new UnauthorizedError('You must be logged in to create a community.'));
    }

    const { name, emoji, description } = await request.json();

    if (!name || name.trim().length < 2) {
      return errorResponse(new BadRequestError('Community name is required and must be at least 2 characters.'));
    }

    await connectDB();

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const existing = await Community.findOne({ slug });
    if (existing) {
      return errorResponse(new BadRequestError('A community with this name already exists.'));
    }

    const community = await Community.create({
      name: name.trim(),
      slug,
      emoji: emoji || '🌐',
      description: description?.trim() || '',
      type: 'interest',
      createdBy: currentUser._id,
      members: [currentUser._id],
      postCount: 0
    });

    deleteCachePattern('communities_');

    return NextResponse.json(community);
  } catch (error) {
    console.error('Create Community API error:', error);
    return errorResponse(new APIError('Failed to create community.', 500, 'INTERNAL_ERROR'));
  }
}