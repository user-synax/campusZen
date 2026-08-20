"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap } from "lucide-react";
import UserAvatar from "@/components/user/UserAvatar";
import { RANK_MAPPING } from "@/lib/ranks";

export default function RanksClient() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/ranks/me");
                const json = await res.json();
                setData(json);
            } catch (e) {
                console.error("Failed to fetch ranks data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-4 sm:p-6 max-w-4xl mx-auto">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                    <div className="h-40 bg-muted rounded-xl"></div>
                    <div className="h-20 bg-muted rounded-xl"></div>
                </div>
            </div>
        );
    }

    const { progress, user } = data || {};

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-extrabold mb-6 flex items-center gap-2">
                Your Journey
            </h1>

            {/* Current Level & Progress Section */}
            <Card className="mb-6 overflow-hidden border-accent/30 shadow-lg">
                <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative">
                            <UserAvatar
                                user={user}
                                size="xl"
                                customSize="w-24 h-24"
                            />
                            {user?.rank && (
                                <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-background border-2 border-accent flex items-center justify-center shadow-md overflow-hidden">
                                    <img
                                        src={user.rank.badge}
                                        alt={user.rank.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                                <h2 className="text-4xl font-black text-primary">
                                    Level {user?.level || 1}
                                </h2>
                                <Badge className="bg-linear-to-r from-primary to-accent text-white font-semibold px-4 py-1">
                                    {user?.rank?.name || "Rookie"}
                                </Badge>
                            </div>

                            <p className="text-muted-foreground mb-4">
                                <Zap className="w-4 h-4 inline mr-1 text-yellow-500" />
                                {user?.totalXP || 0} Total XP
                            </p>

                            {/* Progress bar */}
                            <div className="w-full">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-semibold">
                                        {progress?.xpInCurrentLevel || 0} XP
                                    </span>
                                    <span className="text-muted-foreground">
                                        {progress?.remainingXP || 0} XP to Level{" "}
                                        {progress?.nextLevel || 2}
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-3 overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-linear-to-r from-primary to-accent transition-all duration-700 ease-out"
                                        style={{
                                            width: `${progress?.progressPercentage || 0}%`,
                                        }}
                                    />
                                </div>
                                <p className="text-center text-xs text-muted-foreground mt-1">
                                    {progress?.progressPercentage || 0}%
                                    Complete
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Rank Roadmap */}
            <section>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Rank Roadmap
                </h3>
                <div className="space-y-3">
                    {Object.entries(RANK_MAPPING).map(([level, rank]) => {
                        const isCurrent = user?.level >= parseInt(level);
                        return (
                            <Card
                                key={level}
                                className={`flex items-center gap-4 p-4 ${isCurrent ? "border-primary/30 bg-accent/5" : "opacity-60"}`}
                            >
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                    <img
                                        src={rank.badge}
                                        alt={rank.name}
                                        className="w-8 h-8 object-contain"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold">{rank.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {isCurrent
                                            ? user?.level === parseInt(level)
                                                ? "Current Rank"
                                                : "Unlocked!"
                                            : `Reach Level ${level} to unlock`}
                                    </p>
                                </div>
                                {isCurrent ? (
                                    <Badge className="bg-primary/20 text-primary">
                                        {user?.level === parseInt(level)
                                            ? "Current"
                                            : "Unlocked"}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">Locked</Badge>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
