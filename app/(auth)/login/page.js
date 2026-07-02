"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Logo from "@/components/shared/Logo";
import Link from "next/link";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import {
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    GraduationCap,
    Users,
    CalendarClock,
    ShieldCheck,
    AlertCircle,
} from "lucide-react";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    useEffect(() => {
        const oauthError = searchParams.get("error");
        if (oauthError) {
            const errorMessages = {
                oauth_init_failed: "Google sign-in is not configured properly.",
                oauth_cancelled: "Google sign-in was cancelled.",
                missing_code: "Invalid authentication response from Google.",
                oauth_failed: "Google sign-in failed. Please try again.",
            };
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setError(
                errorMessages[oauthError] ||
                    "An error occurred during sign-in.",
            );
        }
    }, [searchParams]);

    const validateField = (name, value) => {
        let error = "";
        if (name === "email") {
            if (!value) error = "Email is required";
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                error = "Invalid email format";
            else if (value.split("@")[0].length < 4)
                error = "Email prefix must be at least 4 characters";
        } else if (name === "password") {
            if (!value) error = "Password is required";
        }
        return error;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (touched[name]) {
            setErrors({ ...errors, [name]: validateField(name, value) });
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched({ ...touched, [name]: true });
        setErrors({ ...errors, [name]: validateField(name, value) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all fields
        const newErrors = {};
        Object.keys(formData).forEach((key) => {
            const error = validateField(key, formData[key]);
            if (error) newErrors[key] = error;
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setTouched({ email: true, password: true });
            setError("Please fill in all required fields.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            // Use window.location.href for a full refresh to ensure cookies are
            // correctly picked up by the middleware on the next request.
            // This solves the common "login twice" issue in production.
            window.location.href = "/feed";
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-background">
            {/* Left branding panel — desktop only */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#0a0a0b] px-10 py-10 text-white lg:flex xl:px-14 xl:py-12 2xl:px-20">
                {/* soft top-down vignette, no color, no glow */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%)]" />
                {/* hairline edge */}
                <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/[0.06]" />

                {/* Top: brand mark */}
                <div className="relative z-10 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
                        <GraduationCap className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium tracking-wide text-white/90">
                        Campus Hub
                    </span>
                </div>

                {/* Middle: headline + signature card */}
                <div className="relative z-10 mx-auto w-full max-w-sm space-y-10 2xl:max-w-md">
                    <div className="space-y-3">
                        <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight xl:text-4xl">
                            Your campus,
                            <br />
                            all in one place.
                        </h1>
                        <p className="text-sm leading-relaxed text-white/50 xl:text-base">
                            Study groups, dorm events, and everything happening
                            around you — log back in and catch up.
                        </p>
                    </div>

                    {/* signature: minimal product preview, not a gimmick */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                                Today on campus
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] text-white/40">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                                Live
                            </span>
                        </div>
                        <div className="mt-1">
                            <div className="flex items-center justify-between border-t border-white/[0.06] py-3">
                                <div className="flex items-center gap-2.5">
                                    <Users className="h-3.5 w-3.5 text-white/40" />
                                    <span className="text-sm text-white/80">
                                        CS Study Group
                                    </span>
                                </div>
                                <span className="text-xs text-white/45">
                                    6:00 PM
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/[0.06] py-3">
                                <div className="flex items-center gap-2.5">
                                    <CalendarClock className="h-3.5 w-3.5 text-white/40" />
                                    <span className="text-sm text-white/80">
                                        Spring Mixer — Quad
                                    </span>
                                </div>
                                <span className="text-xs text-white/45">
                                    8:00 PM
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom: trust line + copyright */}
                <div className="relative z-10 space-y-3 border-t border-white/[0.06] pt-5">
                    <div className="flex items-center gap-2 text-xs text-white/45">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        Encrypted login, built for verified students only.
                    </div>
                    <p className="text-xs text-white/30">
                        © {new Date().getFullYear()} Campus Hub
                    </p>
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20 xl:px-28">
                <div className="mx-auto w-full max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="flex flex-col items-center lg:items-start">
                        <Logo size="lg" href="/login" />
                    </div>

                    <div className="mt-8 text-center lg:text-left">
                        <h2 className="text-2xl font-semibold tracking-tight">
                            Welcome back
                        </h2>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            Log in to keep up with what&apos;s happening on
                            campus.
                        </p>
                    </div>

                    <div className="mt-8 space-y-5">
                        <GoogleSignInButton />
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="you@university.edu"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        className={
                                            "h-11 pl-9" +
                                            (touched.email && errors.email
                                                ? " border-destructive focus-visible:ring-destructive"
                                                : "")
                                        }
                                        aria-invalid={
                                            !!(touched.email && errors.email)
                                        }
                                        aria-describedby={
                                            touched.email && errors.email
                                                ? "email-error"
                                                : undefined
                                        }
                                        required
                                    />
                                </div>
                                {touched.email && errors.email && (
                                    <p
                                        id="email-error"
                                        className="flex items-center gap-1 text-xs text-destructive"
                                    >
                                        <AlertCircle className="h-3 w-3 shrink-0" />
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                </div>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        className={
                                            "h-11 pl-9" +
                                            (touched.password && errors.password
                                                ? " border-destructive focus-visible:ring-destructive"
                                                : "")
                                        }
                                        aria-invalid={
                                            !!(
                                                touched.password &&
                                                errors.password
                                            )
                                        }
                                        aria-describedby={
                                            touched.password && errors.password
                                                ? "password-error"
                                                : undefined
                                        }
                                        required
                                    />
                                </div>
                                {touched.password && errors.password && (
                                    <p
                                        id="password-error"
                                        className="flex items-center gap-1 text-xs text-destructive"
                                    >
                                        <AlertCircle className="h-3 w-3 shrink-0" />
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                className="group h-11 w-full rounded-full text-base"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Logging in...
                                    </>
                                ) : (
                                    <>
                                        Log in
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="text-center text-base">
                            <span className="text-muted-foreground">
                                Don&apos;t have an account?{" "}
                            </span>
                            <Link
                                href="/signup"
                                className="font-semibold text-primary underline-offset-4 hover:underline"
                            >
                                Sign up
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen w-full bg-background">
                    <div className="hidden w-1/2 bg-[#0a0a0b] lg:block" />
                    <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
                        <div className="mx-auto w-full max-w-sm space-y-8">
                            <div className="flex flex-col items-center gap-2 lg:items-start">
                                <div className="h-10 w-10 animate-pulse rounded-xl bg-accent/50" />
                                <div className="h-4 w-40 animate-pulse rounded bg-accent/30" />
                            </div>
                            <div className="h-[360px] animate-pulse rounded-2xl bg-accent/20" />
                        </div>
                    </div>
                </div>
            }
        >
            <LoginContent />
        </Suspense>
    );
}
