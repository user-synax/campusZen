import { Client, Account, ID } from "appwrite";

export function createAppwriteClient() {
    const client = new Client();
    client
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
    return client;
}

export function getAppwriteAccount(client) {
    return new Account(client);
}

export { ID };
