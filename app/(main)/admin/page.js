"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useUser from "@/hooks/useUser";
import { isAdmin } from "@/lib/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Loader2,
    Plus,
    Palette,
    Copy,
    Edit,
    Trash2,
    Check,
    X,
} from "lucide-react";
import AdminUsersTable from "@/components/admin/AdminUsersTable";
import AdminReportedContent from "@/components/admin/AdminReportedContent";
import AdminBlockedContent from "@/components/admin/AdminBlockedContent";
import AdminSecurityPanel from "@/components/admin/AdminSecurityPanel";
import AdminVerifications from "@/components/admin/AdminVerifications";
import AdminDMMessages from "@/components/admin/AdminDMMessages";
import { formatDistanceToNow } from "date-fns";
import { useTheme } from "@/context/ThemeContext";

export default function AdminDashboard() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const [stats, setStats] = useState({
        users: 0,
        banned: 0,
        reported: 0,
        pendingResources: 0,
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userLoading) {
            if (!user || !isAdmin(user)) {
                router.push("/feed");
            } else {
                fetchOverviewData();
            }
        }
    }, [user, userLoading, router]);

    const fetchOverviewData = async () => {
        try {
            setLoading(true);
            const [statsRes, logsRes] = await Promise.all([
                fetch("/api/admin/users?limit=1"),
                fetch("/api/admin/logs?page=1"),
            ]);

            const statsData = await statsRes.json();
            const logsData = await logsRes.json();

            const resourcesRes = await fetch(
                "/api/admin/resources?status=pending",
            ).catch(() => ({ json: () => ({ total: 0 }) }));
            const resourcesData = await resourcesRes.json();

            const reportedRes = await fetch(
                "/api/admin/content/reported",
            ).catch(() => ({ json: () => ({ posts: [] }) }));
            const reportedData = await reportedRes.json();

            setStats({
                users: statsData.total || 0,
                banned: statsData.bannedCount || 0,
                reported: reportedData.posts?.length || 0,
                pendingResources: resourcesData.total || 0,
            });
            setRecentLogs(logsData.logs?.slice(0, 5) || []);
        } catch (error) {
            console.error("Failed to fetch overview data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <div className="p-4 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                <h1 className="text-xl font-black tracking-tight text-primary">
                    Admin Dashboard (Live)
                </h1>
                <Button variant="ghost" size="sm" onClick={fetchOverviewData}>
                    Refresh
                </Button>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <div className="px-4 py-2 border-b border-border sticky top-14.25 bg-background z-10">
                    <TabsList className="bg-muted/50 p-1 w-full justify-start overflow-x-auto no-scrollbar">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="verifications">
                            Verify ID
                        </TabsTrigger>
                        <TabsTrigger value="content">Content</TabsTrigger>
                        <TabsTrigger value="blocked">
                            Blocked Attempts
                        </TabsTrigger>
                        <TabsTrigger value="dms">Direct Messages</TabsTrigger>
                        <TabsTrigger value="themes">Generate Theme</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                        <TabsTrigger value="logs">Logs</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
                        <AdminStatCard
                            title="Total Users"
                            value={stats.users}
                            icon="👤"
                        />
                        <AdminStatCard
                            title="Banned"
                            value={stats.banned}
                            icon="🚫"
                            color="red"
                        />
                        <AdminStatCard
                            title="Reported Posts"
                            value={stats.reported}
                            icon="🚨"
                            color="amber"
                        />
                        <AdminStatCard
                            title="Pending Resources"
                            value={stats.pendingResources}
                            icon="📚"
                            color="blue"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4">
                        <Link href="/admin/resources">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 h-14 bg-accent/30 hover:bg-accent/50 border-border/50"
                            >
                                <span className="text-2xl">📋</span>
                                <div className="text-left">
                                    <p className="font-semibold text-sm">
                                        Review Resources
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {stats.pendingResources} pending
                                    </p>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/analytics">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 h-14 bg-accent/30 hover:bg-accent/50 border-border/50"
                            >
                                <span className="text-2xl">📊</span>
                                <div className="text-left">
                                    <p className="font-semibold text-sm">
                                        Analytics
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        View platform stats
                                    </p>
                                </div>
                            </Button>
                        </Link>
                    </div>

                    <div className="px-4 mt-6">
                        <h3 className="font-bold text-sm mb-3 px-1">
                            Recent Actions
                        </h3>
                        <Card className="bg-accent/20 border-border/50 overflow-hidden">
                            <CardContent className="p-0">
                                {recentLogs.length > 0 ? (
                                    recentLogs.map((log, index) => (
                                        <div
                                            key={log._id}
                                            className={`flex items-center gap-3 px-4 py-3 ${index !== recentLogs.length - 1 ? "border-b border-border/50" : ""}`}
                                        >
                                            <span className="text-lg">
                                                {getActionEmoji(log.action)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate">
                                                    {log.summary}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {formatDistanceToNow(
                                                        new Date(log.createdAt),
                                                        { addSuffix: true },
                                                    )}{" "}
                                                    by @{log.adminId?.username}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-xs text-muted-foreground">
                                        No recent actions found
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="users">
                    <AdminUsersTable />
                </TabsContent>

                <TabsContent value="verifications">
                    <AdminVerifications />
                </TabsContent>

                <TabsContent value="content">
                    <AdminReportedContent />
                </TabsContent>

                <TabsContent value="blocked">
                    <AdminBlockedContent />
                </TabsContent>

                <TabsContent value="dms">
                    <AdminDMMessages />
                </TabsContent>

                <TabsContent value="themes">
                    <ThemeGenerator />
                </TabsContent>

                <TabsContent value="security">
                    <AdminSecurityPanel />
                </TabsContent>

                <TabsContent value="logs">
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        Use the Logs tab to view all audit entries.
                        <Link href="/admin/logs" className="block mt-4">
                            <Button variant="outline">
                                View Full Audit Trail
                            </Button>
                        </Link>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function AdminStatCard({ title, value, icon, color }) {
    const colors = {
        red: "text-red-400 bg-red-400/10 border-red-400/20",
        amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
        blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        default: "text-foreground bg-accent/50 border-border/50",
    };

    const colorClass = colors[color] || colors.default;

    return (
        <Card className={`border ${colorClass}`}>
            <CardHeader className="p-3 pb-0">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1 flex items-center justify-between">
                <span className="text-2xl font-black">{value}</span>
                <span className="text-xl opacity-80">{icon}</span>
            </CardContent>
        </Card>
    );
}

function getActionEmoji(action) {
    const emojis = {
        user_ban: "🚫",
        user_unban: "✅",
        user_verify: "✅",
        user_unverify: "❌",
        user_delete: "🗑️",
        user_make_admin: "⭐",
        user_remove_admin: "🛡️",
        user_award_coins: "💰",
        post_delete: "🗑️",
        post_hide: "🙈",
        post_unhide: "👁️",
        ip_ban: "🔒",
        ip_unban: "🔓",
    };
    return emojis[action] || "📝";
}

function ThemeGenerator() {
    const {
        addCustomTheme,
        customThemes = [],
        editCustomTheme,
        deleteCustomTheme,
    } = useTheme();
    const [editingThemeId, setEditingThemeId] = useState(null);
    const [themeName, setThemeName] = useState("");
    const [primaryColor, setPrimaryColor] = useState("#4ba9e1");
    const [bgColor, setBgColor] = useState("#ffffff");
    const [fgColor, setFgColor] = useState("#0f172a");
    const [cardColor, setCardColor] = useState("#f8fafc");
    const [cardFgColor, setCardFgColor] = useState("#0f172a");
    const [mutedColor, setMutedColor] = useState("#f1f5f9");
    const [mutedFgColor, setMutedFgColor] = useState("#475569");
    const [accentColor, setAccentColor] = useState("#e2e8f0");
    const [accentFgColor, setAccentFgColor] = useState("#0f172a");
    const [borderColor, setBorderColor] = useState("#e2e8f0");
    const [copied, setCopied] = useState(false);

    const resetForm = () => {
        setEditingThemeId(null);
        setThemeName("");
        setPrimaryColor("#4ba9e1");
        setBgColor("#ffffff");
        setFgColor("#0f172a");
        setCardColor("#f8fafc");
        setCardFgColor("#0f172a");
        setMutedColor("#f1f5f9");
        setMutedFgColor("#475569");
        setAccentColor("#e2e8f0");
        setAccentFgColor("#0f172a");
        setBorderColor("#e2e8f0");
    };

    const handleEditTheme = (themeToEdit) => {
        setEditingThemeId(themeToEdit.id);
        setThemeName(themeToEdit.name);
        setPrimaryColor(themeToEdit.colors.primary);
        setBgColor(themeToEdit.colors.background);
        setFgColor(themeToEdit.colors.foreground);
        setCardColor(themeToEdit.colors.card);
        setCardFgColor(themeToEdit.colors.cardForeground);
        setMutedColor(themeToEdit.colors.muted);
        setMutedFgColor(themeToEdit.colors.mutedForeground);
        setAccentColor(themeToEdit.colors.accent);
        setAccentFgColor(themeToEdit.colors.accentForeground);
        setBorderColor(themeToEdit.colors.border);
    };

    const copyThemeCode = (themeToCopy = null) => {
        const themeObj = themeToCopy || {
            id: Date.now().toString(),
            name: themeName || "My Custom Theme",
            colors: {
                primary: primaryColor,
                background: bgColor,
                foreground: fgColor,
                card: cardColor,
                cardForeground: cardFgColor,
                muted: mutedColor,
                mutedForeground: mutedFgColor,
                accent: accentColor,
                accentForeground: accentFgColor,
                border: borderColor,
            },
        };

        navigator.clipboard.writeText(JSON.stringify(themeObj, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!themeName) return;

        if (editingThemeId) {
            editCustomTheme({
                id: editingThemeId,
                name: themeName,
                colors: {
                    primary: primaryColor,
                    background: bgColor,
                    foreground: fgColor,
                    card: cardColor,
                    cardForeground: cardFgColor,
                    muted: mutedColor,
                    mutedForeground: mutedFgColor,
                    accent: accentColor,
                    accentForeground: accentFgColor,
                    border: borderColor,
                },
            });
        } else {
            addCustomTheme({
                id: Date.now().toString(),
                name: themeName,
                colors: {
                    primary: primaryColor,
                    background: bgColor,
                    foreground: fgColor,
                    card: cardColor,
                    cardForeground: cardFgColor,
                    muted: mutedColor,
                    mutedForeground: mutedFgColor,
                    accent: accentColor,
                    accentForeground: accentFgColor,
                    border: borderColor,
                },
            });
        }

        resetForm();
    };

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="w-5 h-5" />
                                {editingThemeId
                                    ? "Edit Theme"
                                    : "Theme Generator"}
                            </CardTitle>
                        </CardHeader>
                        {editingThemeId && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetForm}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="admin-theme-name">Theme Name</Label>
                            <Input
                                id="admin-theme-name"
                                value={themeName}
                                onChange={(e) => setThemeName(e.target.value)}
                                placeholder="e.g. Ocean Blue"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Primary Color</Label>
                                <Input
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) =>
                                        setPrimaryColor(e.target.value)
                                    }
                                    className="h-10 p-1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Background</Label>
                                <Input
                                    type="color"
                                    value={bgColor}
                                    onChange={(e) => setBgColor(e.target.value)}
                                    className="h-10 p-1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Foreground</Label>
                                <Input
                                    type="color"
                                    value={fgColor}
                                    onChange={(e) => setFgColor(e.target.value)}
                                    className="h-10 p-1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Card</Label>
                                <Input
                                    type="color"
                                    value={cardColor}
                                    onChange={(e) =>
                                        setCardColor(e.target.value)
                                    }
                                    className="h-10 p-1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Card Foreground</Label>
                                <Input
                                    type="color"
                                    value={cardFgColor}
                                    onChange={(e) =>
                                        setCardFgColor(e.target.value)
                                    }
                                    className="h-10 p-1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Muted</Label>
                                <Input
                                    type="color"
                                    value={mutedColor}
                                    onChange={(e) =>
                                        setMutedColor(e.target.value)
                                    }
                                    className="h-10 p-1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Muted Foreground</Label>
                                <Input
                                    type="color"
                                    value={mutedFgColor}
                                    onChange={(e) =>
                                        setMutedFgColor(e.target.value)
                                    }
                                    className="h-10 p-1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Accent</Label>
                                <Input
                                    type="color"
                                    value={accentColor}
                                    onChange={(e) =>
                                        setAccentColor(e.target.value)
                                    }
                                    className="h-10 p-1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Accent Foreground</Label>
                                <Input
                                    type="color"
                                    value={accentFgColor}
                                    onChange={(e) =>
                                        setAccentFgColor(e.target.value)
                                    }
                                    className="h-10 p-1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Border</Label>
                                <Input
                                    type="color"
                                    value={borderColor}
                                    onChange={(e) =>
                                        setBorderColor(e.target.value)
                                    }
                                    className="h-10 p-1"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button type="submit" className="flex-1">
                                {editingThemeId ? (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add to Custom Themes
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={copyThemeCode}
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                {copied ? "Copied!" : "Copy Code"}
                            </Button>
                        </div>
                    </form>
                </Card>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Custom Themes</h3>
                    <div className="space-y-3">
                        {customThemes.map((theme) => (
                            <Card key={theme.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg"
                                            style={{
                                                backgroundColor:
                                                    theme.colors.primary,
                                            }}
                                        />
                                        <div>
                                            <p className="font-medium">
                                                {theme.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {theme.colors.primary}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                handleEditTheme(theme)
                                            }
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyThemeCode(theme)}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                deleteCustomTheme(theme.id)
                                            }
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                        {customThemes.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground text-sm">
                                No custom themes yet. Create your first one!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
