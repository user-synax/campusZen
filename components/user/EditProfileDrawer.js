"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Camera, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MultiSelect } from "@/components/shared/MultiSelect";

const INTEREST_OPTIONS = [
    "Programming",
    "Web Development",
    "AI",
    "Hackathons",
    "Placements",
    "Startups",
    "Design",
    "Photography",
    "Gaming",
    "Cricket",
    "Music",
    "Memes",
    "Finance",
    "Entrepreneurship",
    "College Life",
    "Events",
    "Cybersecurity",
    "Open Source",
    "UI/UX",
    "Blockchain/Web3",
    "Content Creation",
    "Freelancing",
    "Sports",
    "Fitness & Gym",
    "Movies & TV",
    "Anime",
    "Travel",
    "Fashion",
    "Reading",
    "Debate & Public Speaking",
    "Volunteering",
    "Robotics",
];

export default function EditProfileDrawer({
    user,
    open,
    onOpenChange,
    onSave,
}) {
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [college, setCollege] = useState("");
    const [course, setCourse] = useState("");
    const [year, setYear] = useState(1);
    const [interests, setInterests] = useState([]);
    const [dmEnabled, setDmEnabled] = useState(true);

    const [avatarPreview, setAvatarPreview] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [bannerPreview, setBannerPreview] = useState(null);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    // Social links state
    const [twitter, setTwitter] = useState("");
    const [instagram, setInstagram] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [github, setGithub] = useState("");
    const [website, setWebsite] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);
    const bannerFileInputRef = useRef(null);

    useEffect(() => {
        if (open && user) {
            setName(user.name || "");
            setBio(user.bio || "");
            setCollege(user.college || "");
            setCourse(user.course || "");
            setYear(user.year || 1);
            setInterests(user.interests || []);
            setDmEnabled(user.dmEnabled !== undefined ? user.dmEnabled : true);
            setAvatarPreview(null);
            setBannerPreview(null);

            // Initialize social links from user data
            setTwitter(user.socialLinks?.twitter || "");
            setInstagram(user.socialLinks?.instagram || "");
            setLinkedin(user.socialLinks?.linkedin || "");
            setGithub(user.socialLinks?.github || "");
            setWebsite(user.socialLinks?.website || "");

            setError(null);
        }
    }, [open, user]);

    const triggerFileInput = () => {
        if (!uploadingAvatar && !saving) fileInputRef.current?.click();
    };

    const triggerBannerFileInput = () => {
        if (!uploadingBanner && !saving) bannerFileInputRef.current?.click();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowed.includes(file.type)) {
            toast.error("Only JPG, PNG and WebP allowed");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be under 5MB");
            return;
        }

        setAvatarPreview(URL.createObjectURL(file));
        setUploadingAvatar(true);
        const formData = new FormData();
        formData.append("avatar", file);
        try {
            const res = await fetch("/api/users/avatar", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Photo updated! ✨");
                setAvatarPreview(data.avatarUrl);
            } else throw new Error(data.message || "Upload failed");
        } catch (err) {
            setAvatarPreview(null);
            toast.error(err.message || "Failed to upload avatar");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleBannerChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowed.includes(file.type)) {
            toast.error("Only JPG, PNG and WebP allowed");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be under 5MB");
            return;
        }

        setBannerPreview(URL.createObjectURL(file));
        setUploadingBanner(true);
        const formData = new FormData();
        formData.append("banner", file);
        try {
            const res = await fetch("/api/users/banner", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Banner updated! ✨");
                setBannerPreview(data.bannerUrl);
            } else throw new Error(data.message || "Upload failed");
        } catch (err) {
            setBannerPreview(null);
            toast.error(err.message || "Failed to upload banner");
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleDeleteAvatar = async (e) => {
        e.stopPropagation();
        setUploadingAvatar(true);
        try {
            const res = await fetch("/api/users/avatar", {
                method: "DELETE",
            });
            if (res.ok) {
                toast.success("Avatar deleted!");
                setAvatarPreview(null);
                // Let parent know about the change
                onSave({ ...user, avatar: null });
            } else throw new Error("Failed to delete avatar");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleDeleteBanner = async (e) => {
        e.stopPropagation();
        setUploadingBanner(true);
        try {
            const res = await fetch("/api/users/banner", {
                method: "DELETE",
            });
            if (res.ok) {
                toast.success("Banner deleted!");
                setBannerPreview(null);
                onSave({ ...user, banner: null });
            } else throw new Error("Failed to delete banner");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleSave = async () => {
        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
            setError("Name must be at least 2 characters");
            return;
        }
        setError(null);
        setSaving(true);
        try {
            const res = await fetch("/api/users/" + user.username, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: trimmedName,
                    bio: bio.trim(),
                    college: college.trim(),
                    course: course.trim(),
                    year: Number(year),
                    interests,
                    dmEnabled,
                    socialLinks: {
                        twitter: twitter.trim(),
                        instagram: instagram.trim(),
                        linkedin: linkedin.trim(),
                        github: github.trim(),
                        website: website.trim(),
                    },
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Profile updated! ✅");
                onSave(data);
                onOpenChange(false);
            } else {
                throw new Error(data.message || "Update failed");
            }
        } catch (err) {
            setError(err.message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md flex flex-col bg-background p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                    <SheetTitle>Edit Profile</SheetTitle>
                    <SheetDescription className="sr-only">
                        Edit your profile information
                    </SheetDescription>
                </SheetHeader>

                {/* Banner */}
                <div className="relative">
                    <div
                        className="relative group cursor-pointer"
                        onClick={triggerBannerFileInput}
                    >
                        <div className="w-full h-32 bg-accent border-b border-border relative overflow-hidden">
                            {bannerPreview || user?.banner ? (
                                <Image
                                    src={bannerPreview || user.banner}
                                    alt="Banner"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    quality={100}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-500/20 to-purple-500/20">
                                    <div className="text-center">
                                        <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">
                                            Add a banner
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {uploadingBanner ? (
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                            ) : (
                                <Camera className="w-6 h-6 text-white" />
                            )}
                        </div>
                    </div>
                    {(bannerPreview || user?.banner) && (
                        <button
                            onClick={handleDeleteBanner}
                            disabled={uploadingBanner || saving}
                            className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1 hover:opacity-80 transition-opacity"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <input
                        ref={bannerFileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={handleBannerChange}
                        disabled={uploadingBanner || saving}
                    />
                </div>
                <p className="text-[10px] text-muted-foreground px-6 pt-2 pb-3">
                    Click to change banner · JPG, PNG, WebP · 5MB max ·
                    Recommended: 1500x500px
                </p>

                {/* Avatar */}
                <div className="flex flex-col items-center py-5 border-b border-border">
                    <div className="relative">
                        <div
                            className="relative group cursor-pointer"
                            onClick={triggerFileInput}
                        >
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-accent border-2 border-border relative flex items-center justify-center">
                                {avatarPreview || user?.avatar ? (
                                    <Image
                                        src={avatarPreview || user.avatar}
                                        alt="Avatar"
                                        width={80}
                                        height={80}
                                        className="object-cover w-full h-full"
                                        quality={100}
                                    />
                                ) : (
                                    <span className="text-2xl font-bold text-muted-foreground">
                                        {user?.name?.[0]?.toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploadingAvatar ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                                ) : (
                                    <Camera className="w-5 h-5 text-white" />
                                )}
                            </div>
                        </div>
                        {(avatarPreview || user?.avatar) && (
                            <button
                                onClick={handleDeleteAvatar}
                                disabled={uploadingAvatar || saving}
                                className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-1 hover:opacity-80 transition-opacity"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                        Click to change · JPG, PNG, WebP · 5MB max
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                        disabled={uploadingAvatar || saving}
                    />
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            maxLength={50}
                            disabled={saving}
                        />
                        <p className="text-[10px] text-muted-foreground text-right">
                            {name.length}/50
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Username
                            <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded">
                                Cannot be changed
                            </span>
                        </label>
                        <Input
                            value={"@" + (user?.username || "")}
                            disabled
                            className="opacity-50 cursor-not-allowed bg-accent/30"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Bio</label>
                        <Textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell people about yourself..."
                            maxLength={160}
                            rows={3}
                            className="resize-none"
                            disabled={saving}
                        />
                        <p
                            className={`text-[10px] text-right ${bio.length > 140 ? "text-amber-500" : "text-muted-foreground"}`}
                        >
                            {bio.length}/160
                        </p>
                    </div>

                    {/* Social Links */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-muted-foreground">
                            Social Links
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Twitter
                                </label>
                                <Input
                                    value={twitter}
                                    onChange={(e) => setTwitter(e.target.value)}
                                    placeholder="https://twitter.com/username"
                                    maxLength={100}
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Instagram
                                </label>
                                <Input
                                    value={instagram}
                                    onChange={(e) =>
                                        setInstagram(e.target.value)
                                    }
                                    placeholder="https://instagram.com/username"
                                    maxLength={100}
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">
                                    LinkedIn
                                </label>
                                <Input
                                    value={linkedin}
                                    onChange={(e) =>
                                        setLinkedin(e.target.value)
                                    }
                                    placeholder="https://linkedin.com/in/username"
                                    maxLength={100}
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">
                                    GitHub
                                </label>
                                <Input
                                    value={github}
                                    onChange={(e) => setGithub(e.target.value)}
                                    placeholder="https://github.com/username"
                                    maxLength={100}
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Website
                                </label>
                                <Input
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    placeholder="https://yourwebsite.com"
                                    maxLength={100}
                                    disabled={saving}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Interests</label>
                        <MultiSelect
                            options={INTEREST_OPTIONS}
                            selected={interests}
                            onChange={setInterests}
                            placeholder="Select your interests..."
                            maxSelected={10}
                            disabled={saving}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Select 3-10 interests
                        </p>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">
                                Direct Messages
                            </label>
                            <p className="text-[10px] text-muted-foreground">
                                Allow others to send you direct messages
                            </p>
                        </div>
                        <Switch
                            checked={dmEnabled}
                            onCheckedChange={setDmEnabled}
                            disabled={saving}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">College</label>
                        <Input
                            value={college}
                            onChange={(e) => setCollege(e.target.value)}
                            placeholder="e.g. IIT Delhi"
                            maxLength={100}
                            disabled={saving}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                Course
                            </label>
                            <Input
                                value={course}
                                onChange={(e) => setCourse(e.target.value)}
                                placeholder="B.Tech CSE"
                                maxLength={50}
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Year</label>
                            <select
                                value={year}
                                onChange={(e) =>
                                    setYear(Number(e.target.value))
                                }
                                className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                disabled={saving}
                            >
                                {[1, 2, 3, 4, 5, 6].map((y) => (
                                    <option key={y} value={y}>
                                        Year {y}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-border bg-background">
                    <Button
                        variant="outline"
                        className="flex-1 rounded-full"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="flex-1 rounded-full"
                        onClick={handleSave}
                        disabled={saving || uploadingAvatar || uploadingBanner}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
