import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { withCache, deleteCachePattern } from '@/lib/cache';
import Community from '@/models/Community';
import { sanitizeMongoInput } from '@/lib/sanitize';
import { getCurrentUser } from '@/lib/auth';
import { errorResponse } from '@/lib/apiResponse';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const specificName = sanitizeMongoInput(searchParams.get('name'));
    const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 50);

    await connectDB();

    // Specific community stats
    if (specificName) {
      const community = await Community.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${specificName}$`, 'i') } },
          { slug: specificName.toLowerCase() }
        ]
      })
      if (!community) {
        return NextResponse.json({ name: specificName, postCount: 0, memberCount: 0 })
      }
      return NextResponse.json({
        name: community.name,
        slug: community.slug,
        emoji: community.emoji,
        description: community.description,
        type: community.type,
        postCount: community.postCount,
        memberCount: community.members.length
      })
    }

    // All communities
    const communities = await withCache('communities_list_v2', 60, async () => {
      const list = await Community.find()
        .sort({ postCount: -1 })
        .limit(limit)
        .lean()

      return list.map(c => ({
        name: c.name,
        slug: c.slug,
        emoji: c.emoji,
        description: c.description,
        type: c.type,
        postCount: c.postCount,
        memberCount: c.members?.length || 0,
        lastPost: c.updatedAt
      }))
    })

    return NextResponse.json(communities)
    } catch (error) {
      console.error('Communities API error:', error);
      return errorResponse(500, {
        code: 'internal_error',
        message: 'Failed to load communities.',
        hint: 'Please try again later.',
      });
    }
  }

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return errorResponse(401, {
        code: 'unauthorized',
        message: 'You must be logged in to create a community.',
        hint: 'Authenticate via /api/auth/login first.',
      });
    }

    const { name, emoji, description } = await request.json();

    if (!name || name.trim().length < 2) {
      return errorResponse(400, {
        code: 'validation_error',
        message: 'Community name is required and must be at least 2 characters.',
        hint: 'Provide a "name" field in the request body.',
      });
    }

    await connectDB();

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const existing = await Community.findOne({ slug });
    if (existing) {
      return errorResponse(400, {
        code: 'duplicate_community',
        message: 'A community with this name already exists.',
        hint: `Use the existing community "${existing.name}".`,
      });
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
    return errorResponse(500, {
      code: 'internal_error',
      message: 'Failed to create community.',
      hint: 'Please try again later.',
    });
  }
}