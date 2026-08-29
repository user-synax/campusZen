"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Logo from "@/components/shared/Logo";
import Link from "next/link";
import {
    Mail,
    Lock,
    ArrowRight,
    ArrowLeft,
    Loader2,
    AlertCircle,
    CheckCircle2,
    GraduationCap,
    ShieldCheck,
    Sparkles,
    KeyRound,
} from "lucide-react";

/* Small presentational helper — icon chip that sits inside an input.
   Same as the login/signup fields. Purely visual, no state, no behavior. */
function FieldIcon({ icon: Icon }) {
    return (
        <span className="pointer-events-none absolute left-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon className="h-3.5 w-3.5" />
        </span>
    );
}

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

function ForgotPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [step, setStep] = useState(1); // 1 email, 2 otp, 3 new password
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (searchParams.get("reset") === "success") {
            setDone(true);
        }
    }, [searchParams]);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError(null);
        setNotice(null);
        setLoading(true);
        try {
            await fetch("/api/auth/forgot-password/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            // Anti-enumeration: always advance and show a generic message
            // regardless of whether the email exists or the request failed.
            setStep(2);
        } catch {
            // Network-level failure — still advance to avoid leaking existence.
            setStep(2);
        } finally {
            setLoading(false);
        }
    };

    // Re-send a fresh code. NOTE: requesting a new code invalidates the
    // previously emailed one, so we make that explicit to the user.
    const handleResend = async () => {
        setError(null);
        setNotice(null);
        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 429) {
                setError(
                    data?.error?.message ||
                        data?.message ||
                        "Too many requests. Please wait before requesting another code.",
                );
            } else {
                setOtp("");
                setNotice(
                    `A new code was sent to ${email}. Your previous code no longer works — enter the latest one.`,
                );
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError(null);
        setNotice(null);
        if (otp.length !== 6) {
            setError("Please enter the 6-digit code.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            });
            const data = await res.json();
            // successResponse nests the payload under `data`, so the reset
            // token is at data.data.resetToken (fall back to flat for safety).
            const resetToken = data?.data?.resetToken || data?.resetToken;
            if (res.ok && resetToken) {
                setResetToken(resetToken);
                setStep(3);
            } else {
                setError(
                    data?.error?.message ||
                        data?.message ||
                        "Invalid or expired OTP. Please request a new one.",
                );
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const passwordValid = PASSWORD_REGEX.test(newPassword);
    const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

    const handleReset = async (e) => {
        e.preventDefault();
        setError(null);
        setNotice(null);
        if (!passwordValid) {
            setError(
                "Password must be at least 8 characters and include an uppercase letter and a number.",
            );
            return;
        }
        if (!passwordsMatch) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resetToken, newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setDone(true);
                setTimeout(() => {
                    router.push("/login?reset=success");
                }, 1600);
            } else {
                setError(
                    data?.error?.message ||
                        data?.message ||
                        "Unable to reset password. The link may have expired.",
                );
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dark flex min-h-screen w-full bg-background text-foreground">
            {/* Left branding panel — desktop only (mirrors login) */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#0a0a0b] px-10 py-10 text-white lg:flex xl:px-14 xl:py-12 2xl:px-20">
                <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl animate-pulse motion-reduce:animate-none" />
                <div className="pointer-events-none absolute bottom-28 -right-10 h-48 w-48 rounded-full bg-[#ff8a65]/20 blur-3xl animate-pulse delay-700 motion-reduce:animate-none" />
                <div className="pointer-events-none absolute right-10 top-[35%] h-32 w-32 rounded-full bg-[#5eead4]/15 blur-3xl animate-pulse delay-1000 motion-reduce:animate-none" />
                <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-30" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-10%,rgba(255,255,255,0.08),transparent_60%)]" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/[0.06]" />

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_2px_0_0_rgba(0,0,0,0.35)]">
                            <GraduationCap className="h-4 w-4" />
                        </div>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/70">
                        <Sparkles className="h-3 w-3" />
                        for students
                    </span>
                </div>

                <div className="relative z-10 mx-auto w-full max-w-sm space-y-10 2xl:max-w-md">
                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold leading-[1.15] tracking-tight xl:text-4xl">
                            Locked out?
                            <br />
                            <span className="relative inline-block">
                                We&apos;ve got you.
                                <svg
                                    className="absolute -bottom-1.5 left-0 h-2.5 w-full text-primary"
                                    viewBox="0 0 220 12"
                                    preserveAspectRatio="none"
                                    fill="none"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M2 8 Q 28 2, 55 7 T 110 6 T 165 7 T 218 5"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>
                        </h1>
                        <p className="text-sm leading-relaxed text-white/50 xl:text-base">
                            Reset your CampusZen password in a few quick steps.
                            We&apos;ll send a secure code to your email.
                        </p>
                    </div>

                    <div className="card-chunky bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                                How it works
                            </span>
                            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                                Secure
                            </span>
                        </div>
                        <div className="mt-1 space-y-3">
                            <div className="flex items-center gap-2.5 border-t border-white/[0.06] py-3">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                                    <Mail className="h-3.5 w-3.5" />
                                </span>
                                <span className="text-sm text-white/80">Request a code</span>
                            </div>
                            <div className="flex items-center gap-2.5 border-t border-white/[0.06] py-3">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                                    <KeyRound className="h-3.5 w-3.5" />
                                </span>
                                <span className="text-sm text-white/80">Verify the 6-digit code</span>
                            </div>
                            <div className="flex items-center gap-2.5 border-t border-white/[0.06] py-3">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                                    <Lock className="h-3.5 w-3.5" />
                                </span>
                                <span className="text-sm text-white/80">Set a new password</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 space-y-3 border-t border-white/[0.06] pt-5">
                    <div className="chip-chunky flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/70">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                        Encrypted reset, built for verified students only.
                    </div>
                    <p className="text-[11px] text-white/30">
                        © {new Date().getFullYear()} CampusZen
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
                        <h2 className="text-2xl font-bold tracking-tight">
                            {step === 1 && "Reset your password"}
                            {step === 2 && "Enter your code"}
                            {step === 3 && "Set a new password"}
                        </h2>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            {step === 1 &&
                                "Enter your account email and we'll send a reset code."}
                            {step === 2 &&
                                `We sent a 6-digit code to ${email || "your email"}.`}
                            {step === 3 &&
                                "Choose a strong new password to finish."}
                        </p>
                    </div>

                    {error && (
                        <Alert variant="destructive" className="mt-6 rounded-2xl">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {done && (
                        <Alert className="mt-6 rounded-2xl border-primary/50 bg-primary/10 text-primary">
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>
                                Password reset successful! Redirecting you to
                                login…
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Step 1 — email */}
                    {step === 1 && !done && (
                        <form onSubmit={handleSendOtp} className="mt-8 space-y-5">
                            <div className="card-chunky space-y-5 bg-card/60 p-4 sm:p-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <FieldIcon icon={Mail} />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="username@domain"
                                            value={email}
                                            onChange={(e) =>
                                                setEmail(e.target.value)
                                            }
                                            className="h-11 rounded-xl pl-10"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="group h-11 w-full rounded-full text-base font-semibold shadow-[0_3px_0_0_hsl(var(--primary)/0.45)] transition-transform active:translate-y-[2px] active:shadow-none hover:cursor-pointer"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Sending code...
                                    </>
                                ) : (
                                    <>
                                        Send reset code
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </>
                                )}
                            </Button>
                        </form>
                    )}

                    {/* Step 2 — OTP (reuses the same Input + styling as signup) */}
                    {step === 2 && !done && (
                        <form onSubmit={handleVerifyOtp} className="mt-8 space-y-5">
                            {notice && (
                                <Alert className="rounded-2xl border-primary/50 bg-primary/10 text-primary">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertDescription>{notice}</AlertDescription>
                                </Alert>
                            )}

                            <div className="card-chunky space-y-3 bg-card/60 p-5">
                                <Label
                                    htmlFor="otp"
                                    className="block text-center lg:text-left"
                                >
                                    One-Time Password (OTP)
                                </Label>
                                <Input
                                    id="otp"
                                    name="otp"
                                    value={otp}
                                    onChange={(e) =>
                                        setOtp(
                                            e.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 6),
                                        )
                                    }
                                    placeholder="••••••"
                                    className="h-16 rounded-2xl border-2 text-center text-2xl tracking-[0.5em] sm:text-3xl"
                                    autoComplete="one-time-code"
                                    autoFocus
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="group h-11 w-full rounded-full text-base font-semibold shadow-[0_3px_0_0_hsl(var(--primary)/0.45)] transition-transform active:translate-y-[2px] active:shadow-none hover:cursor-pointer"
                                disabled={loading || otp.length !== 6}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        Verify code
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </>
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Use a different email
                            </button>

                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-60"
                            >
                                Didn&apos;t get it? Resend code
                            </button>
                        </form>
                    )}

                    {/* Step 3 — new password */}
                    {step === 3 && !done && (
                        <form onSubmit={handleReset} className="mt-8 space-y-5">
                            <div className="card-chunky space-y-5 bg-card/60 p-4 sm:p-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="newPassword">New password</Label>
                                    <div className="relative">
                                        <FieldIcon icon={Lock} />
                                        <Input
                                            id="newPassword"
                                            name="newPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) =>
                                                setNewPassword(e.target.value)
                                            }
                                            className="h-11 rounded-xl pl-10"
                                            required
                                        />
                                    </div>
                                    {newPassword.length > 0 && !passwordValid && (
                                        <p className="flex items-center gap-1 text-xs text-destructive">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            At least 8 characters, one uppercase
                                            letter, and one number.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="confirmPassword">
                                        Confirm password
                                    </Label>
                                    <div className="relative">
                                        <FieldIcon icon={Lock} />
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) =>
                                                setConfirmPassword(e.target.value)
                                            }
                                            className="h-11 rounded-xl pl-10"
                                            required
                                        />
                                    </div>
                                    {confirmPassword.length > 0 &&
                                        !passwordsMatch && (
                                            <p className="flex items-center gap-1 text-xs text-destructive">
                                                <AlertCircle className="h-3 w-3 shrink-0" />
                                                Passwords do not match.
                                            </p>
                                        )}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="group h-11 w-full rounded-full text-base font-semibold shadow-[0_3px_0_0_hsl(var(--primary)/0.45)] transition-transform active:translate-y-[2px] active:shadow-none hover:cursor-pointer"
                                disabled={
                                    loading ||
                                    !passwordValid ||
                                    !passwordsMatch
                                }
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Resetting...
                                    </>
                                ) : (
                                    <>
                                        Reset password
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </>
                                )}
                            </Button>
                        </form>
                    )}

                    {!done && (
                        <div className="mt-6 text-center text-base">
                            <span className="text-muted-foreground">
                                Remembered it?{" "}
                            </span>
                            <Link
                                href="/login"
                                className="font-semibold text-primary underline-offset-4 hover:underline"
                            >
                                Back to login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="dark flex min-h-screen w-full bg-background text-foreground">
                    <div className="hidden w-1/2 bg-[#0a0a0b] lg:block" />
                    <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
                        <div className="mx-auto w-full max-w-sm space-y-8">
                            <div className="flex flex-col items-center gap-2 lg:items-start">
                                <div className="h-10 w-10 animate-pulse rounded-2xl bg-accent/50" />
                                <div className="h-4 w-40 animate-pulse rounded-full bg-accent/30" />
                            </div>
                            <div className="h-[360px] animate-pulse rounded-2xl border-2 border-border bg-accent/20" />
                        </div>
                    </div>
                </div>
            }
        >
            <ForgotPasswordContent />
        </Suspense>
    );
}
