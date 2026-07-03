import Post from "../../models/Post.js";

export async function findDuplicatePosts(sourceIds) {
    if (!sourceIds.length) return new Set();

    const duplicates = await Post.find({
        sourceId: { $in: sourceIds },
        source: "reddit",
    }).select("sourceId");

    return new Set(duplicates.map((p) => p.sourceId));
}
