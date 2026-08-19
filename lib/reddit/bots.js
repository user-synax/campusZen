import User from "../../models/User.js";
import bcrypt from "bcryptjs";

const botAvatars = {
    "Dev Daily":
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=150&h=150&fit=crop",
    "AI News":
        "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=150&h=150&fit=crop",
    "Placement Alerts":
        "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=150&h=150&fit=crop",
    "Study Hub":
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=150&h=150&fit=crop",
    "Meme Bot":
        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=150&fit=crop",
};

const botBios = {
    "Dev Daily": "Sharing the latest programming tips, tutorials, and news!",
    "AI News": "Your daily source for AI breakthroughs and tech trends!",
    "Placement Alerts":
        "Get the latest job openings and internship opportunities!",
    "Study Hub": "Study tips, resources, and exam strategies for students!",
    "Meme Bot": "Sharing the funniest memes to brighten your day!",
};

export async function getBotUser(botType) {
    let bot = await User.findOne({ isBot: true, botType: botType });

    if (bot) {
        // Update existing bot user with avatar and bio if missing
        let needsUpdate = false;
        if (!bot.avatar || bot.avatar !== botAvatars[botType]) {
            bot.avatar = botAvatars[botType];
            needsUpdate = true;
        }
        if (!bot.bio || bot.bio !== botBios[botType]) {
            bot.bio = botBios[botType];
            needsUpdate = true;
        }
        if (needsUpdate) {
            await bot.save();
        }
        return bot;
    }

    const username = botType.toLowerCase().replace(/\s+/g, "_");
    const email = `${username}@campuszen.bot`;
    const password = await bcrypt.hash(`bot-${username}-${Date.now()}`, 10);

    bot = new User({
        name: botType,
        username: username,
        email: email,
        password: password,
        isBot: true,
        botType: botType,
        isVerified: true,
        avatar: botAvatars[botType],
        bio: botBios[botType],
    });

    await bot.save();
    return bot;
}
