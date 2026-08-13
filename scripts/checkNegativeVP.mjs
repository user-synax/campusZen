// Diagnostic: find all User documents where vp < 0 (leftover from the
// spendVP read-then-write / findByIdAndUpdate-filter bug).
//
// This script REPORTS ONLY — it never modifies the database.
// Review the output; then manually decide whether to reset to 0.
//
// Run: node scripts/checkNegativeVP.mjs

import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config();

const userSchema = new mongoose.Schema({
    username: String,
    name: String,
    email: String,
    vp: { type: Number, default: 0 },
});

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI is not set");
        process.exit(1);
    }

    await mongoose.connect(uri);
    const User = mongoose.models.User || mongoose.model("User", userSchema);

    const negativeUsers = await User.find({ vp: { $lt: 0 } })
        .select("_id username name email vp")
        .sort({ vp: 1 })
        .lean();

    console.log("=== Negative VP Balance Report ===");
    console.log(`Total users with vp < 0: ${negativeUsers.length}`);
    console.log("");

    if (negativeUsers.length === 0) {
        console.log("No users found with negative balance. Database is clean.");
    } else {
        const totalDeficit = negativeUsers.reduce((sum, u) => sum + u.vp, 0);
        console.log(`Total VP deficit across all users: ${totalDeficit}`);
        console.log("");
        console.log(
            "user_id                              | username         | name                  | vp",
        );
        console.log(
            "-------------------------------------+------------------+-----------------------+---------",
        );
        for (const u of negativeUsers) {
            const id = String(u._id).padEnd(37);
            const uname = (u.username || "").padEnd(16);
            const nm = (u.name || "").padEnd(21);
            const bal = String(u.vp).padStart(8);
            console.log(`${id} | ${uname} | ${nm} | ${bal}`);
        }
    }

    console.log("");
    console.log("Report generated. No records were modified.");
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
