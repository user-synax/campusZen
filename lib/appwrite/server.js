import { Client, Account, Users } from "node-appwrite";
import { cookies } from "next/headers";

export function createAppwriteServerClient() {
    const client = new Client();
    client
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
    return client;
}

export function createAppwriteAdminClient() {
    const client = new Client();
    client
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    return client;
}

export function getAppwriteAdminAccount() {
    const client = createAppwriteAdminClient();
    return new Account(client);
}

export function getAppwriteUsers() {
    const client = createAppwriteAdminClient();
    return new Users(client);
}

export async function getServerSession() {
    try {
        const cookieStore = await cookies();
        const sessionSecret = cookieStore.get(
            "a_session_" + process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
        )?.value;

        if (!sessionSecret) {
            return null;
        }

        const client = new Client();
        client
            .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
            .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
            .setSession(sessionSecret);

        const account = new Account(client);
        const user = await account.get();
        return user;
    } catch (error) {
        console.error("Error getting server session:", error);
        return null;
    }
}
