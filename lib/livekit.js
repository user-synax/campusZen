import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

function getCreds() {
    return {
        url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
        apiKey: process.env.LIVEKIT_API_KEY,
        apiSecret: process.env.LIVEKIT_API_SECRET,
    };
}

export const callRoomName = (groupId) => `group-${groupId}`;

export function getRoomService() {
    const { url, apiKey, apiSecret } = getCreds();
    if (!url || !apiKey || !apiSecret) {
        throw new Error("LiveKit env vars missing — check .env.local");
    }
    return new RoomServiceClient(url, apiKey, apiSecret);
}

export async function createCallToken({ identity, name, avatar, roomName }) {
    const { apiKey, apiSecret } = getCreds();
    if (!apiKey || !apiSecret) {
        throw new Error("LiveKit env vars missing — check .env.local");
    }
    const at = new AccessToken(apiKey, apiSecret, {
        identity: String(identity),
        name: name || undefined,
        metadata: JSON.stringify({ name: name || "", avatar: avatar || null }),
        ttl: 3600,
    });
    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
    });
    return await at.toJwt();
}
