"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Check,
    ChevronRight,
    ChevronLeft,
    Upload,
    User,
    Bell,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import useUser from "@/hooks/useUser";

// List of interests
const INTERESTS = [
    "Technology",
    "Coding",
    "Art",
    "Music",
    "Sports",
    "Reading",
    "Gaming",
    "Photography",
    "Travel",
    "Cooking",
    "Science",
    "Mathematics",
    "Literature",
    "Business",
    "Entrepreneurship",
    "Design",
    "Film",
    "Politics",
    "Psychology",
    "History",
];

// Configurable recommended usernames (admins can edit this)
const RECOMMENDED_USERNAMES = ["campuszen"];

// College list with "Other" option
const COLLEGES = [
    "Indian Institute of Technology Bombay",
    "Indian Institute of Technology Delhi",
    "Indian Institute of Technology Madras",
    "Indian Institute of Technology Kanpur",
    "Indian Institute of Technology Kharagpur",
    "Indian Institute of Technology Roorkee",
    "Indian Institute of Technology Guwahati",
    "Indian Institute of Technology Hyderabad",
    "National Institute of Technology Trichy",
    "National Institute of Technology Surathkal",
    "Birla Institute of Technology and Science Pilani",
    "Manipal Institute of Technology",
    "Vellore Institute of Technology",
    "Other",
];

export default function OnboardingPage() {
    const router = useRouter();
    const { user, loading } = useUser();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        fullName: "",
        bio: "",
        avatar: "",
        college: "",
        otherCollege: "",
        course: "",
        branch: "",
        year: "",
        interests: [],
        following: [],
    });

    const [openCollege, setOpenCollege] = useState(false);
    const fileInputRef = useRef(null);

    // Recommended users state
    const [recommendedUsers, setRecommendedUsers] = useState([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);

    // Fetch current user and populate initial form data
    useEffect(() => {
        if (user) {
            setFormData((prev) => ({
                ...prev,
                fullName: user.name || "",
                avatar: user.avatar || "",
                college: user.college || "",
                course: user.course || "",
                year: user.year?.toString() || "",
            }));
        }
    }, [user]);

    // Fetch recommended users
    useEffect(() => {
        if (currentStep === 4) {
            fetchRecommendedUsers();
        }
    }, [currentStep]);

    const fetchRecommendedUsers = async () => {
        setLoadingRecommendations(true);
        try {
            const res = await fetch("/api/users/suggestions");
            if (res.ok) {
                const data = await res.json();
                const suggestions = data.suggestions || [];
                // Filter to include only our recommended usernames + any others
                const filtered = suggestions.filter(
                    (u) =>
                        u?.username &&
                        RECOMMENDED_USERNAMES.includes(u.username),
                );
                // If no users found with those usernames, just use the suggestions
                setRecommendedUsers(
                    filtered.length > 0 ? filtered : suggestions,
                );
            }
        } catch (err) {
            console.error("Failed to fetch recommendations:", err);
            setRecommendedUsers([]);
        } finally {
            setLoadingRecommendations(false);
        }
    };

    // Handle back/forward navigation
    const handleNext = () => {
        if (currentStep < 5) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    // Handle skip for skippable steps
    const handleSkip = () => {
        handleNext();
    };

    // Handle file upload for avatar
    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // For now, we'll just use a local preview
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData((prev) => ({
                    ...prev,
                    avatar: event.target.result,
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle interest selection
    const toggleInterest = (interest) => {
        setFormData((prev) => {
            if (prev.interests.includes(interest)) {
                return {
                    ...prev,
                    interests: prev.interests.filter((i) => i !== interest),
                };
            } else {
                return { ...prev, interests: [...prev.interests, interest] };
            }
        });
    };

    // Handle follow toggle
    const toggleFollow = (userId) => {
        setFormData((prev) => {
            if (prev.following.includes(userId)) {
                return {
                    ...prev,
                    following: prev.following.filter((id) => id !== userId),
                };
            } else {
                return { ...prev, following: [...prev.following, userId] };
            }
        });
    };

    // Handle form submission for step 1 (required)
    const validateStep1 = () => {
        if (!formData.fullName.trim()) {
            setError("Full name is required");
            return false;
        }
        setError("");
        return true;
    };

    // Handle final submission
    const handleSubmit = async () => {
        if (!validateStep1()) return;

        setIsSubmitting(true);
        setError("");

        try {
            const payload = {
                username: user?.username,
                fullName: formData.fullName,
                bio: formData.bio,
                avatar: formData.avatar,
                college:
                    formData.college === "Other"
                        ? formData.otherCollege
                        : formData.college,
                course: formData.course,
                branch: formData.branch,
                year: formData.year,
                interests: formData.interests,
                following: formData.following,
            };

            const res = await fetch("/api/auth/onboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to complete onboarding");
            }

            router.push("/feed");
            router.refresh();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render each step
    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                                Set up your profile
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Let's get to know you better
                            </p>
                        </div>

                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative group">
                                <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                                    <AvatarImage src={formData.avatar} />
                                    <AvatarFallback className="bg-primary/10">
                                        <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                                    </AvatarFallback>
                                </Avatar>
                                <button
                                    type="button"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    className="absolute bottom-0 right-0 bg-primary text-white p-1.5 sm:p-2 rounded-full shadow-lg hover:bg-primary/90 transition"
                                >
                                    <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    value={formData.fullName}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            fullName: e.target.value,
                                        }))
                                    }
                                    placeholder="Enter your full name"
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea
                                    id="bio"
                                    value={formData.bio}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            bio: e.target.value,
                                        }))
                                    }
                                    placeholder="Tell us a little about yourself"
                                    className="resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <Button
                            onClick={() => {
                                if (validateStep1()) handleNext();
                            }}
                            className="h-10 sm:h-11 w-full rounded-full text-sm sm:text-base"
                        >
                            Continue <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                                Education details
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Tell us about your college
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label>College</Label>
                                <Popover
                                    open={openCollege}
                                    onOpenChange={setOpenCollege}
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCollege}
                                            className="w-full justify-between h-11"
                                        >
                                            {formData.college ||
                                                "Select your college"}
                                            <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50 rotate-90" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search college..." />
                                            <CommandEmpty>
                                                No college found.
                                            </CommandEmpty>
                                            <CommandGroup className="max-h-64 overflow-auto">
                                                {COLLEGES.map((college) => (
                                                    <CommandItem
                                                        key={college}
                                                        value={college}
                                                        onSelect={(
                                                            currentValue,
                                                        ) => {
                                                            setFormData(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    college:
                                                                        currentValue,
                                                                    otherCollege:
                                                                        currentValue ===
                                                                        "Other"
                                                                            ? prev.otherCollege
                                                                            : "",
                                                                }),
                                                            );
                                                            setOpenCollege(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.college ===
                                                                    college
                                                                    ? "opacity-100"
                                                                    : "opacity-0",
                                                            )}
                                                        />
                                                        {college}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {formData.college === "Other" && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="otherCollege">
                                        Enter your college name
                                    </Label>
                                    <Input
                                        id="otherCollege"
                                        value={formData.otherCollege}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                otherCollege: e.target.value,
                                            }))
                                        }
                                        placeholder="College name"
                                        className="h-11"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="course">Course</Label>
                                <Input
                                    id="course"
                                    value={formData.course}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            course: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g., B.Tech, B.Sc, etc."
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="branch">Branch</Label>
                                <Input
                                    id="branch"
                                    value={formData.branch}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            branch: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g., Computer Science, Mechanical, etc."
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="year">Year</Label>
                                <Select
                                    value={formData.year}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            year: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6].map((year) => (
                                            <SelectItem
                                                key={year}
                                                value={year.toString()}
                                            >
                                                {year}
                                                {year === 1
                                                    ? "st"
                                                    : year === 2
                                                      ? "nd"
                                                      : year === 3
                                                        ? "rd"
                                                        : "th"}{" "}
                                                Year
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                className="h-10 sm:h-11 w-1/2 rounded-full text-sm sm:text-base"
                            >
                                <ChevronLeft className="h-4 w-4 mr-2" /> Back
                            </Button>
                            <Button
                                onClick={handleSkip}
                                variant="ghost"
                                className="h-10 sm:h-11 w-1/2 rounded-full text-sm sm:text-base"
                            >
                                Skip
                            </Button>
                        </div>
                        <Button
                            onClick={handleNext}
                            className="h-10 sm:h-11 w-full rounded-full text-sm sm:text-base"
                        >
                            Continue <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                                Your interests
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Select what you're interested in
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
                            {INTERESTS.map((interest) => (
                                <button
                                    key={interest}
                                    onClick={() => toggleInterest(interest)}
                                    className={cn(
                                        "px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm transition-all",
                                        formData.interests.includes(interest)
                                            ? "bg-primary text-white"
                                            : "bg-accent text-accent-foreground hover:bg-accent/80",
                                    )}
                                >
                                    {interest}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                className="h-10 sm:h-11 w-1/2 rounded-full text-sm sm:text-base"
                            >
                                <ChevronLeft className="h-4 w-4 mr-2" /> Back
                            </Button>
                            <Button
                                onClick={handleSkip}
                                variant="ghost"
                                className="h-10 sm:h-11 w-1/2 rounded-full text-sm sm:text-base"
                            >
                                Skip
                            </Button>
                        </div>
                        <Button
                            onClick={handleNext}
                            className="h-10 sm:h-11 w-full rounded-full text-sm sm:text-base"
                        >
                            Continue <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                                Follow people
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Here are some recommendations
                            </p>
                        </div>

                        <div className="space-y-3">
                            {loadingRecommendations ? (
                                [...Array(3)].map((_, i) => (
                                    <Card
                                        key={i}
                                        className="p-3 sm:p-4 flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
                                            <div className="space-y-1.5 sm:space-y-2">
                                                <Skeleton className="h-4 w-24 sm:w-32" />
                                                <Skeleton className="h-3 w-20 sm:w-24" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-8 sm:h-9 w-20 sm:w-24 rounded-full" />
                                    </Card>
                                ))
                            ) : recommendedUsers.length > 0 ? (
                                recommendedUsers.map((u) => (
                                    <Card
                                        key={u._id}
                                        className="p-3 sm:p-4 flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                                                <AvatarImage src={u.avatar} />
                                                <AvatarFallback>
                                                    {u.name?.charAt(0) ||
                                                        u.username?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="font-medium truncate text-sm sm:text-base">
                                                    {u.name}
                                                </p>
                                                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                                    @{u.username}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant={
                                                formData.following.includes(
                                                    u._id,
                                                )
                                                    ? "outline"
                                                    : "default"
                                            }
                                            size="sm"
                                            onClick={() => toggleFollow(u._id)}
                                            className="rounded-full shrink-0 text-xs sm:text-sm h-8 sm:h-9"
                                        >
                                            {formData.following.includes(u._id)
                                                ? "Following"
                                                : "Follow"}
                                        </Button>
                                    </Card>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    No recommendations available
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                className="h-10 sm:h-11 w-1/2 rounded-full text-sm sm:text-base"
                            >
                                <ChevronLeft className="h-4 w-4 mr-2" /> Back
                            </Button>
                            <Button
                                onClick={handleSkip}
                                variant="ghost"
                                className="h-10 sm:h-11 w-1/2 rounded-full text-sm sm:text-base"
                            >
                                Skip
                            </Button>
                        </div>
                        <Button
                            onClick={handleNext}
                            className="h-10 sm:h-11 w-full rounded-full text-sm sm:text-base"
                        >
                            Continue <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                );

            case 5:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                                Enable notifications
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Stay updated with what's happening on campus
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Card className="p-4 sm:p-6 text-center bg-accent/30">
                                <p className="text-sm text-muted-foreground">
                                    We'll send you notifications for likes,
                                    comments, follows, and important campus
                                    updates.
                                </p>
                            </Card>

                            <Button
                                onClick={async () => {
                                    // Request notification permission
                                    if ("Notification" in window) {
                                        const permission =
                                            await Notification.requestPermission();
                                        console.log(
                                            "Notification permission:",
                                            permission,
                                        );
                                    }
                                    handleSubmit();
                                }}
                                disabled={isSubmitting}
                                className="h-10 sm:h-11 w-full rounded-full text-sm sm:text-base"
                            >
                                {isSubmitting
                                    ? "Finishing up..."
                                    : "Enable Notifications & Finish"}
                                {!isSubmitting && (
                                    <CheckCircle2 className="h-4 w-4 ml-2" />
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="h-10 sm:h-11 w-full rounded-full text-sm sm:text-base text-muted-foreground"
                            >
                                Maybe later
                            </Button>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                className="h-10 sm:h-11 w-full rounded-full text-sm sm:text-base"
                            >
                                <ChevronLeft className="h-4 w-4 mr-2" /> Back
                            </Button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="space-y-4 text-center">
                    <Skeleton className="h-8 w-48 mx-auto" />
                    <Skeleton className="h-4 w-32 mx-auto" />
                </div>
            </div>
        );
    }

    // If user is already onboarded, redirect to feed
    if (user?.isOnboarded) {
        router.push("/feed");
        return null;
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4 md:p-6">
            <div className="w-full max-w-md space-y-6 sm:space-y-8">
                {/* Progress indicator */}
                <div className="flex justify-center items-center gap-1 sm:gap-2">
                    {[1, 2, 3, 4, 5].map((step) => (
                        <div key={step} className="flex items-center">
                            <div
                                className={cn(
                                    "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all",
                                    step < currentStep
                                        ? "bg-primary text-white"
                                        : step === currentStep
                                          ? "bg-primary/20 text-primary border-2 border-primary"
                                          : "bg-accent text-muted-foreground",
                                )}
                            >
                                {step < currentStep ? (
                                    <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                                ) : (
                                    step
                                )}
                            </div>
                            {step < 5 && (
                                <div
                                    className={cn(
                                        "w-6 sm:w-8 md:w-12 h-1 mx-0.5 sm:mx-1 transition-all",
                                        step < currentStep
                                            ? "bg-primary"
                                            : "bg-accent",
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <p className="text-center text-sm text-muted-foreground">
                    Step {currentStep} of 5
                </p>

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                {renderStep()}
            </div>
        </div>
    );
}
