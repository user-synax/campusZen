import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
    applyDateFilter,
    getRangeDuration,
    getRangeStartDate,
    computeGrowth,
    buildTimeSeries,
} from "@/lib/analytics";

import User from "@/models/User";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import Resource from "@/models/Resource";
import GroupChat from "@/models/GroupChat";
import Event from "@/models/Event";
import UserBan from "@/models/UserBan";
import IPBan from "@/models/IPBan";
import AdminLog from "@/models/AdminLog";

const VALID_RANGES = ["7d", "30d", "90d", "all"];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION: USERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getUserAnalytics(range) {
    const dateFilter = applyDateFilter(range);
    const startDate = getRangeStartDate(range);
    const duration = getRangeDuration(range);
    const now = new Date();

    const prevStart = duration ? new Date(now - duration * 2) : null;
    const prevEnd = startDate;

    const [
        total,
        newInRange,
        newInPrev,
        banned,
        verified,
        byCollegeRaw,
        timeSeriesRaw,
    ] = await Promise.all([
        User.countDocuments({ isDeleted: false }),
        startDate
            ? User.countDocuments({
                  isDeleted: false,
                  createdAt: { $gte: startDate },
              })
            : User.countDocuments({ isDeleted: false }),
        prevStart && prevEnd
            ? User.countDocuments({
                  isDeleted: false,
                  createdAt: { $gte: prevStart, $lt: prevEnd },
              })
            : Promise.resolve(0),
        User.countDocuments({ isBanned: true }),
        User.countDocuments({ isVerified: true }),
        User.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: "$college", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, college: "$_id", count: 1 } },
        ]),
        startDate
            ? User.aggregate([
                  {
                      $match: {
                          isDeleted: false,
                          createdAt: { $gte: startDate },
                      },
                  },
                  {
                      $group: {
                          _id: {
                              $dateToString: {
                                  format: "%Y-%m-%d",
                                  date: "$createdAt",
                              },
                          },
                          count: { $sum: 1 },
                      },
                  },
                  { $sort: { _id: 1 } },
                  { $project: { _id: 0, date: "$_id", count: 1 } },
              ])
            : Promise.resolve([]),
    ]);

    return {
        total,
        newInRange,
        growth: computeGrowth(newInRange, newInPrev),
        banned,
        verified,
        byCollege: byCollegeRaw,
        timeSeries: startDate
            ? buildTimeSeries(timeSeriesRaw, startDate, now)
            : timeSeriesRaw,
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION: CONTENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getContentAnalytics(range) {
    const startDate = getRangeStartDate(range);
    const duration = getRangeDuration(range);
    const now = new Date();
    const prevStart = duration ? new Date(now - duration * 2) : null;
    const prevEnd = startDate;

    const rangeMatch = startDate ? { createdAt: { $gte: startDate } } : {};

    const [
        totalPosts,
        postsInRange,
        postsInPrev,
        commentsInRange,
        reactionsInRange,
        anonymousPosts,
        pollPosts,
        imagePosts,
        hiddenPosts,
        reportedPosts,
        topHashtagsRaw,
        timeSeriesRaw,
    ] = await Promise.all([
        Post.countDocuments({ isDeleted: false }),
        Post.countDocuments({ isDeleted: false, ...rangeMatch }),
        prevStart && prevEnd
            ? Post.countDocuments({
                  isDeleted: false,
                  createdAt: { $gte: prevStart, $lt: prevEnd },
              })
            : Promise.resolve(0),
        Comment.countDocuments(rangeMatch),
        // reactions count via aggregation (using likes field)
        Post.aggregate([
            { $match: { isDeleted: false, ...rangeMatch } },
            {
                $project: {
                    reactionCount: {
                        $cond: {
                            if: { $isArray: "$likes" },
                            then: { $size: "$likes" },
                            else: 0,
                        },
                    },
                },
            },
            { $group: { _id: null, total: { $sum: "$reactionCount" } } },
        ]),
        Post.countDocuments({
            isAnonymous: true,
            isDeleted: false,
            ...rangeMatch,
        }),
        Post.countDocuments({
            "poll.options.0": { $exists: true },
            isDeleted: false,
            ...rangeMatch,
        }),
        Post.countDocuments({
            "images.0": { $exists: true },
            isDeleted: false,
            ...rangeMatch,
        }),
        Post.countDocuments({ isHidden: true, isDeleted: false }),
        Post.countDocuments({ reportCount: { $gt: 0 }, isDeleted: false }),
        Post.aggregate([
            {
                $match: {
                    isDeleted: false,
                    ...rangeMatch,
                    "hashtags.0": { $exists: true },
                },
            },
            { $unwind: "$hashtags" },
            { $group: { _id: "$hashtags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, tag: "$_id", count: 1 } },
        ]),
        startDate
            ? Post.aggregate([
                  {
                      $match: {
                          isDeleted: false,
                          createdAt: { $gte: startDate },
                      },
                  },
                  {
                      $group: {
                          _id: {
                              $dateToString: {
                                  format: "%Y-%m-%d",
                                  date: "$createdAt",
                              },
                          },
                          count: { $sum: 1 },
                      },
                  },
                  { $sort: { _id: 1 } },
                  { $project: { _id: 0, date: "$_id", count: 1 } },
              ])
            : Promise.resolve([]),
    ]);

    const totalReactions = reactionsInRange[0]?.total ?? 0;
    const engagementRate =
        postsInRange === 0
            ? 0
            : Math.round(
                  ((totalReactions + commentsInRange) / postsInRange) *
                      100 *
                      10,
              ) / 10;

    return {
        totalPosts,
        postsInRange,
        postGrowth: computeGrowth(postsInRange, postsInPrev),
        commentsInRange,
        engagementRate,
        anonymousPosts,
        pollPosts,
        imagePosts,
        hiddenPosts,
        reportedPosts,
        topHashtags: topHashtagsRaw,
        timeSeries: startDate
            ? buildTimeSeries(timeSeriesRaw, startDate, now)
            : timeSeriesRaw,
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION: RESOURCES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getResourceAnalytics(range) {
    const startDate = getRangeStartDate(range);
    const rangeMatch = startDate ? { createdAt: { $gte: startDate } } : {};

    const [
        approved,
        pending,
        rejected,
        uploadedInRange,
        engagementTotals,
        byCategory,
        topDownloaded,
        copyrightFlagged,
    ] = await Promise.all([
        Resource.countDocuments({ status: "approved" }),
        Resource.countDocuments({ status: "pending" }),
        Resource.countDocuments({ status: "rejected" }),
        Resource.countDocuments(rangeMatch),
        Resource.aggregate([
            { $match: { status: "approved" } },
            {
                $group: {
                    _id: null,
                    downloads: { $sum: "$downloadCount" },
                    views: { $sum: "$viewCount" },
                },
            },
        ]),
        Resource.aggregate([
            { $match: { status: "approved" } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, category: "$_id", count: 1 } },
        ]),
        Resource.find({ status: "approved" })
            .sort({ downloadCount: -1 })
            .limit(5)
            .select("title category downloadCount")
            .lean(),
        Resource.countDocuments({ copyrightFlag: true, status: "pending" }),
    ]);

    const eng = engagementTotals[0] ?? { downloads: 0, views: 0 };

    return {
        approved,
        pending,
        rejected,
        uploadedInRange,
        totalDownloads: eng.downloads,
        totalViews: eng.views,
        byCategory,
        topDownloaded: topDownloaded.map((r) => ({
            title: r.title,
            category: r.category,
            downloadCount: r.downloadCount,
        })),
        copyrightFlagged,
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION: CHATS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getChatAnalytics(range) {
    const startDate = getRangeStartDate(range);
    const rangeMatch = startDate
        ? { createdAt: { $gte: startDate }, isActive: true }
        : { isActive: true };

    const [activeGroups, newInRange, messageTotals, avgMemberRaw, topGroups] =
        await Promise.all([
            GroupChat.countDocuments({ isActive: true }),
            GroupChat.countDocuments(rangeMatch),
            GroupChat.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: null, total: { $sum: "$messageCount" } } },
            ]),
            GroupChat.aggregate([
                { $match: { isActive: true } },
                {
                    $project: {
                        memberCount: {
                            $cond: {
                                if: { $isArray: "$members" },
                                then: { $size: "$members" },
                                else: 0,
                            },
                        },
                    },
                },
                { $group: { _id: null, avg: { $avg: "$memberCount" } } },
            ]),
            GroupChat.find({ isActive: true })
                .sort({ messageCount: -1 })
                .limit(5)
                .select("name messageCount")
                .lean(),
        ]);

    return {
        activeGroups,
        newInRange,
        totalMessages: messageTotals[0]?.total ?? 0,
        avgMemberCount: Math.round((avgMemberRaw[0]?.avg ?? 0) * 10) / 10,
        topGroups: topGroups.map((g) => ({
            name: g.name,
            messageCount: g.messageCount,
        })),
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION: EVENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getEventAnalytics(range) {
    const startDate = getRangeStartDate(range);
    const now = new Date();
    const rangeMatch = startDate ? { createdAt: { $gte: startDate } } : {};

    const [
        active,
        upcoming,
        past,
        createdInRange,
        rsvpTotals,
        topEvents,
        byCollege,
    ] = await Promise.all([
        Event.countDocuments({ isActive: true }),
        Event.countDocuments({ isActive: true, eventDate: { $gt: now } }),
        Event.countDocuments({ isActive: true, eventDate: { $lte: now } }),
        Event.countDocuments({ isActive: true, ...rangeMatch }),
        Event.aggregate([
            { $match: { isActive: true } },
            {
                $project: {
                    rsvpCount: {
                        $cond: {
                            if: { $isArray: "$rsvps" },
                            then: { $size: "$rsvps" },
                            else: 0,
                        },
                    },
                },
            },
            { $group: { _id: null, total: { $sum: "$rsvpCount" } } },
        ]),
        Event.aggregate([
            { $match: { isActive: true } },
            {
                $project: {
                    title: 1,
                    college: 1,
                    rsvpCount: {
                        $cond: {
                            if: { $isArray: "$rsvps" },
                            then: { $size: "$rsvps" },
                            else: 0,
                        },
                    },
                },
            },
            { $sort: { rsvpCount: -1 } },
            { $limit: 5 },
        ]),
        Event.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: "$college", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, college: "$_id", count: 1 } },
        ]),
    ]);

    return {
        active,
        upcoming,
        past,
        createdInRange,
        totalRsvps: rsvpTotals[0]?.total ?? 0,
        topEvents: topEvents.map((e) => ({
            title: e.title,
            college: e.college,
            rsvpCount: e.rsvpCount,
        })),
        byCollege,
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION: MODERATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getModerationAnalytics(range) {
    const startDate = getRangeStartDate(range);
    const rangeMatch = startDate ? { createdAt: { $gte: startDate } } : {};

    const [
        activeUserBans,
        activeIpBans,
        actionsInRange,
        byAction,
        activeReports,
        flaggedResources,
        topAdmins,
    ] = await Promise.all([
        UserBan.countDocuments({ isActive: true }),
        IPBan.countDocuments({ isActive: true }),
        AdminLog.countDocuments(rangeMatch),
        AdminLog.aggregate([
            { $match: rangeMatch },
            { $group: { _id: "$action", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, action: "$_id", count: 1 } },
        ]),
        Post.countDocuments({ reportCount: { $gt: 0 }, isDeleted: false }),
        Resource.countDocuments({ copyrightFlag: true, status: "pending" }),
        AdminLog.aggregate([
            { $match: rangeMatch },
            { $group: { _id: "$adminId", actionCount: { $sum: 1 } } },
            { $sort: { actionCount: -1 } },
            { $limit: 3 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            {
                $project: {
                    _id: 0,
                    username: { $arrayElemAt: ["$user.username", 0] },
                    actionCount: 1,
                },
            },
        ]),
    ]);

    return {
        activeUserBans,
        activeIpBans,
        actionsInRange,
        byAction,
        activeReports,
        flaggedResources,
        topAdmins,
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION: COINS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getCoinAnalytics(range) {
    const startDate = getRangeStartDate(range);
    const now = new Date();

    return {
        totalCirculation: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        volumeInRange: 0,
        adminAdjustCount: 0,
        timeSeries: startDate ? buildTimeSeries([], startDate, now) : [],
        byReason: [],
        topEarners: [],
        topSpenders: [],
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function GET(request) {
    try {
        // ── Auth guard ──
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }
        if (!isAdmin(currentUser)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();

        // ── Validate range param ──
        const { searchParams } = new URL(request.url);
        const rawRange = searchParams.get("range") ?? "30d";
        const range = VALID_RANGES.includes(rawRange) ? rawRange : "30d";

          // ── Run all sections in parallel ──
        const [users, content, resources, chats, events, moderation, coins] =
            await Promise.all([
                getUserAnalytics(range),
                getContentAnalytics(range),
                getResourceAnalytics(range),
                getChatAnalytics(range),
                getEventAnalytics(range),
                getModerationAnalytics(range),
                getCoinAnalytics(range),
            ]);

        return NextResponse.json({
            fetchedAt: new Date().toISOString(),
            range,
            users,
            content,
            resources,
            chats,
            events,
            moderation,
            coins,
        });
    } catch (err) {
        console.error("[Analytics API]", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
