import User from "../../models/User.js";
import bcrypt from "bcryptjs";

export async function getBotUser(botType) {
    let bot = await User.findOne({ isBot: true, botType: botType });
    if (bot) return bot;

    const username = botType.toLowerCase().replace(/\s+/g, "_");
    const email = `${username}@campuszen.bot`;
    const password = await bcrypt.hash(`bot_${username}_${Date.now()}`, 10);

    bot = new User({
        name: botType,
        username: username,
        email: email,
        password: password,
        isBot: true,
        botType: botType,
        isOnboarded: true,
        isVerified: true,
    });

    await bot.save();
    return bot;
}
