"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Logo from "@/components/shared/Logo";
import Link from "next/link";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import {
    Mail,
    Phone,
    Lock,
    Check,
    GraduationCap,
    ShieldCheck,
    ArrowRight,
    ArrowLeft,
    Loader2,
    AlertCircle,
    CheckCircle2,
    RotateCw,
} from "lucide-react";

export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        college: "",
        course: "",
        year: "1",
        gender: "",
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const validateField = (name, value) => {
        let error = "";
        switch (name) {
            case "name":
                if (!value) error = "Full name is required";
                else if (value.length < 2)
                    error = "Name must be at least 2 characters";
                break;
            case "username":
                if (!value) error = "Username is required";
                else if (!/^[a-zA-Z0-9_]{3,20}$/.test(value))
                    error =
                        "3-20 characters, alphanumeric and underscores only";
                break;
            case "email":
                if (!value) error = "Email is required";
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                    error = "Invalid email format";
                else {
                    const localPart = value.split("@")[0];
                    if (localPart.length < 4) {
                        error = "Email prefix must be at least 4 characters";
                    } else {
                        const disposableDomains = [
                            "yopmail.com",
                            "temp-mail.org",
                            "guerrillamail.com",
                            "10minutemail.com",
                            "mailinator.com",
                            "dispostable.com",
                            "getnada.com",
                            "tempmail.com",
                        ];
                        const domain = value.split("@")[1];
                        if (disposableDomains.includes(domain))
                            error = "Disposable emails are not allowed";
                    }
                }
                break;
            case "password":
                if (!value) error = "Password is required";
                else if (value.length < 8) error = "Minimum 8 characters";
                else if (!/[a-z]/.test(value))
                    error = "Must contain a lowercase letter";
                else if (!/[A-Z]/.test(value))
                    error = "Must contain an uppercase letter";
                else if (!/[0-9]/.test(value)) error = "Must contain a number";
                else if (!/[^a-zA-Z0-9]/.test(value))
                    error = "Must contain a special character";
                break;
            case "confirmPassword":
                if (!value) error = "Please confirm your password";
                else if (value !== formData.password)
                    error = "Passwords do not match";
                break;
            case "phone":
                if (value && !/^\+?[1-9]\d{1,14}$/.test(value))
                    error = "Invalid phone number format";
                break;
            case "gender":
                if (!value) error = "Please select your gender";
                break;
            default:
                break;
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

    const handleYearChange = (value) => {
        setFormData({ ...formData, year: value });
    };

    const handleGenderChange = (value) => {
        setFormData({ ...formData, gender: value });
        setTouched({ ...touched, gender: true });
        setErrors({ ...errors, gender: validateField("gender", value) });
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
            setTouched(
                Object.keys(formData).reduce(
                    (acc, key) => ({ ...acc, [key]: true }),
                    {},
                ),
            );
            setError("Please fix the errors in the form before submitting.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (step === 1) {
                if (
                    !formData.name ||
                    !formData.username ||
                    !formData.email ||
                    !formData.password ||
                    !formData.gender
                ) {
                    throw new Error("Please fill in all required fields.");
                }

                const res = await fetch("/api/auth/send-otp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: formData.email,
                        username: formData.username,
                        purpose: "signup",
                    }),
                });

                const data = await res.json();
                if (!res.ok)
                    throw new Error(
                        data.error?.message ||
                            data.message ||
                            "Failed to send OTP",
                    );

                setStep(2);
            } else {
                if (!otp || otp.length !== 6) {
                    throw new Error("Please enter the 6-digit OTP code.");
                }

                const res = await fetch("/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...formData, otp }),
                });

                const data = await res.json();
                if (!res.ok)
                    throw new Error(
                        data.error?.message ||
                            data.message ||
                            "Something went wrong",
                    );

                window.location.href = "/feed";
            }
        } catch (err) {
            // Zod validation errors might come in an array
            if (
                err.message === "Validation failed" &&
                Array.isArray(err.errors)
            ) {
                setError(err.errors.map((e) => e.message).join(", "));
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    purpose: "signup",
                }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(
                    data.error?.message ||
                        data.message ||
                        "Failed to resend OTP",
                );
            // Optional: show a toast success here
            setError("A new OTP has been sent to your email.");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        {
            id: 1,
            title: "Your details",
            desc: "Name, username, and password",
            status: step === 1 ? "current" : "done",
        },
        {
            id: 2,
            title: "Verify email",
            desc: "Enter the 6-digit code",
            status: step === 2 ? "current" : "upcoming",
        },
        {
            id: 3,
            title: "You're in",
            desc: "Start exploring your campus",
            status: "upcoming",
        },
    ];

    return (
        <div className="flex min-h-screen w-full bg-background">
            {/* Left branding panel — desktop only */}
            <div className="relative hidden shrink-0 flex-col justify-between overflow-hidden bg-[#0a0a0b] px-10 py-10 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[380px] xl:w-[420px] xl:px-12">
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

                {/* Middle: headline + live progress */}
                <div className="relative z-10 space-y-10">
                    <div className="space-y-3">
                        <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight">
                            Create your
                            <br />
                            campus account.
                        </h1>
                        <p className="text-sm leading-relaxed text-white/50">
                            Set up your profile, verify your email, and
                            you&apos;re in — it takes about a minute.
                        </p>
                    </div>

                    {/* signature: real progress stepper, reflects actual step state */}
                    <div>
                        {steps.map((s, i) => (
                            <div
                                key={s.id}
                                className="relative flex gap-3 pb-5 last:pb-0"
                            >
                                {i !== steps.length - 1 && (
                                    <span className="absolute bottom-0 left-[11px] top-6 w-px bg-white/10" />
                                )}
                                <span
                                    className={
                                        "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium " +
                                        (s.status === "done"
                                            ? "border-white bg-white text-[#0a0a0b]"
                                            : s.status === "current"
                                              ? "border-white text-white"
                                              : "border-white/15 text-white/30")
                                    }
                                >
                                    {s.status === "done" ? (
                                        <Check className="h-3 w-3" />
                                    ) : (
                                        s.id
                                    )}
                                </span>
                                <div>
                                    <p
                                        className={
                                            "text-sm font-medium " +
                                            (s.status === "upcoming"
                                                ? "text-white/40"
                                                : "text-white")
                                        }
                                    >
                                        {s.title}
                                    </p>
                                    <p className="text-xs text-white/35">
                                        {s.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom: trust line + copyright */}
                <div className="relative z-10 space-y-3 border-t border-white/[0.06] pt-5">
                    <div className="flex items-center gap-2 text-xs text-white/45">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        Encrypted sign-up, verified with a one-time email code.
                    </div>
                    <p className="text-xs text-white/30">
                        © {new Date().getFullYear()} Campus Hub
                    </p>
                </div>
            </div>

            {/* Form panel */}
            <div className="flex w-full flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-16 2xl:px-20">
                <div className="mx-auto w-full max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex flex-col items-center lg:items-start">
                        <Logo size="lg" href="/signup" />
                    </div>

                    {/* mobile-only progress, desktop relies on the left panel */}
                    <div className="mt-6 flex items-center gap-2 lg:hidden">
                        <span
                            className={
                                "h-1.5 flex-1 rounded-full " +
                                (step >= 1 ? "bg-primary" : "bg-accent")
                            }
                        />
                        <span
                            className={
                                "h-1.5 flex-1 rounded-full " +
                                (step >= 2 ? "bg-primary" : "bg-accent")
                            }
                        />
                    </div>
                    <p className="mt-2 text-xs font-medium text-muted-foreground lg:hidden">
                        Step {step} of 2
                    </p>

                    {step === 1 ? (
                        <div className="mt-8 space-y-6">
                            <div className="text-center lg:text-left">
                                <h2 className="text-2xl font-semibold tracking-tight">
                                    Create your account
                                </h2>
                                <p className="mt-1.5 text-sm text-muted-foreground">
                                    Join your campus community in a couple of
                                    steps.
                                </p>
                            </div>

                            <GoogleSignInButton text="Sign up with Google" />

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-5">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Account details
                                    </p>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="name">
                                                Full Name
                                            </Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                className={
                                                    "h-11" +
                                                    (touched.name && errors.name
                                                        ? " border-destructive focus-visible:ring-destructive"
                                                        : "")
                                                }
                                                aria-invalid={
                                                    !!(
                                                        touched.name &&
                                                        errors.name
                                                    )
                                                }
                                                aria-describedby={
                                                    touched.name && errors.name
                                                        ? "name-error"
                                                        : undefined
                                                }
                                                required
                                            />
                                            {touched.name && errors.name && (
                                                <p
                                                    id="name-error"
                                                    className="flex items-center gap-1 text-xs text-destructive"
                                                >
                                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                                    {errors.name}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="username">
                                                Username
                                            </Label>
                                            <div className="relative">
                                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                    @
                                                </span>
                                                <Input
                                                    id="username"
                                                    name="username"
                                                    value={formData.username}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    placeholder="yourname"
                                                    className={
                                                        "h-11 pl-7" +
                                                        (touched.username &&
                                                        errors.username
                                                            ? " border-destructive focus-visible:ring-destructive"
                                                            : "")
                                                    }
                                                    aria-invalid={
                                                        !!(
                                                            touched.username &&
                                                            errors.username
                                                        )
                                                    }
                                                    aria-describedby={
                                                        touched.username &&
                                                        errors.username
                                                            ? "username-error"
                                                            : undefined
                                                    }
                                                    required
                                                />
                                            </div>
                                            {touched.username &&
                                                errors.username && (
                                                    <p
                                                        id="username-error"
                                                        className="flex items-center gap-1 text-xs text-destructive"
                                                    >
                                                        <AlertCircle className="h-3 w-3 shrink-0" />
                                                        {errors.username}
                                                    </p>
                                                )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="email">Email</Label>
                                            <div className="relative">
                                                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    className={
                                                        "h-11 pl-9" +
                                                        (touched.email &&
                                                        errors.email
                                                            ? " border-destructive focus-visible:ring-destructive"
                                                            : "")
                                                    }
                                                    aria-invalid={
                                                        !!(
                                                            touched.email &&
                                                            errors.email
                                                        )
                                                    }
                                                    aria-describedby={
                                                        touched.email &&
                                                        errors.email
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
                                            <Label htmlFor="phone">
                                                Phone Number (Optional)
                                            </Label>
                                            <div className="relative">
                                                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="phone"
                                                    name="phone"
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    placeholder="+1234567890"
                                                    className={
                                                        "h-11 pl-9" +
                                                        (touched.phone &&
                                                        errors.phone
                                                            ? " border-destructive focus-visible:ring-destructive"
                                                            : "")
                                                    }
                                                    aria-invalid={
                                                        !!(
                                                            touched.phone &&
                                                            errors.phone
                                                        )
                                                    }
                                                    aria-describedby={
                                                        touched.phone &&
                                                        errors.phone
                                                            ? "phone-error"
                                                            : undefined
                                                    }
                                                />
                                            </div>
                                            {touched.phone && errors.phone && (
                                                <p
                                                    id="phone-error"
                                                    className="flex items-center gap-1 text-xs text-destructive"
                                                >
                                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                                    {errors.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="password">
                                                Password
                                            </Label>
                                            <div className="relative">
                                                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="password"
                                                    name="password"
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    className={
                                                        "h-11 pl-9" +
                                                        (touched.password &&
                                                        errors.password
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
                                                        touched.password &&
                                                        errors.password
                                                            ? "password-error"
                                                            : undefined
                                                    }
                                                    required
                                                />
                                            </div>
                                            {touched.password &&
                                            errors.password ? (
                                                <p
                                                    id="password-error"
                                                    className="flex items-center gap-1 text-xs text-destructive"
                                                >
                                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                                    {errors.password}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    8+ characters, with
                                                    uppercase, lowercase, a
                                                    number &amp; a symbol.
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="confirmPassword">
                                                Confirm Password
                                            </Label>
                                            <div className="relative">
                                                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="confirmPassword"
                                                    name="confirmPassword"
                                                    type="password"
                                                    value={
                                                        formData.confirmPassword
                                                    }
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    className={
                                                        "h-11 pl-9" +
                                                        (touched.confirmPassword &&
                                                        errors.confirmPassword
                                                            ? " border-destructive focus-visible:ring-destructive"
                                                            : "")
                                                    }
                                                    aria-invalid={
                                                        !!(
                                                            touched.confirmPassword &&
                                                            errors.confirmPassword
                                                        )
                                                    }
                                                    aria-describedby={
                                                        touched.confirmPassword &&
                                                        errors.confirmPassword
                                                            ? "confirmPassword-error"
                                                            : undefined
                                                    }
                                                    required
                                                />
                                            </div>
                                            {touched.confirmPassword &&
                                                errors.confirmPassword && (
                                                    <p
                                                        id="confirmPassword-error"
                                                        className="flex items-center gap-1 text-xs text-destructive"
                                                    >
                                                        <AlertCircle className="h-3 w-3 shrink-0" />
                                                        {errors.confirmPassword}
                                                    </p>
                                                )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5 border-t border-border pt-5">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Campus info
                                    </p>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="college">
                                                College
                                            </Label>
                                            <Input
                                                id="college"
                                                name="college"
                                                value={formData.college}
                                                onChange={handleChange}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="course">
                                                Course
                                            </Label>
                                            <Input
                                                id="course"
                                                name="course"
                                                value={formData.course}
                                                onChange={handleChange}
                                                className="h-11"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="gender">
                                                I am a...
                                            </Label>
                                            <Select
                                                onValueChange={
                                                    handleGenderChange
                                                }
                                                value={formData.gender}
                                            >
                                                <SelectTrigger
                                                    className={
                                                        "h-11" +
                                                        (touched.gender &&
                                                        errors.gender
                                                            ? " border-destructive"
                                                            : "")
                                                    }
                                                >
                                                    <SelectValue placeholder="Select gender" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="male">
                                                        Male
                                                    </SelectItem>
                                                    <SelectItem value="female">
                                                        Female
                                                    </SelectItem>
                                                    <SelectItem value="other">
                                                        Other
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {touched.gender &&
                                                errors.gender && (
                                                    <p className="flex items-center gap-1 text-xs text-destructive">
                                                        <AlertCircle className="h-3 w-3 shrink-0" />
                                                        {errors.gender}
                                                    </p>
                                                )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="year">
                                                Year of Study
                                            </Label>
                                            <Select
                                                onValueChange={handleYearChange}
                                                defaultValue={formData.year}
                                            >
                                                <SelectTrigger className="h-11">
                                                    <SelectValue placeholder="Select year" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">
                                                        1st Year
                                                    </SelectItem>
                                                    <SelectItem value="2">
                                                        2nd Year
                                                    </SelectItem>
                                                    <SelectItem value="3">
                                                        3rd Year
                                                    </SelectItem>
                                                    <SelectItem value="4">
                                                        4th Year
                                                    </SelectItem>
                                                    <SelectItem value="5">
                                                        5th Year
                                                    </SelectItem>
                                                    <SelectItem value="6">
                                                        Postgraduate/Graduate
                                                    </SelectItem>
                                                    <SelectItem value="7">
                                                        Student/Researcher
                                                    </SelectItem>
                                                    <SelectItem value="8">
                                                        Other
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <Alert
                                        variant={
                                            error.includes("sent to your email")
                                                ? "default"
                                                : "destructive"
                                        }
                                        className={
                                            error.includes("sent to your email")
                                                ? "border-primary/50 text-primary"
                                                : ""
                                        }
                                    >
                                        {error.includes(
                                            "sent to your email",
                                        ) ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4" />
                                        )}
                                        <AlertTitle>
                                            {error.includes(
                                                "sent to your email",
                                            )
                                                ? "Success"
                                                : "Error"}
                                        </AlertTitle>
                                        <AlertDescription>
                                            {error}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-full text-base"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Sending code...
                                        </>
                                    ) : (
                                        <>
                                            Continue to Verification
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </Button>

                                <p className="px-4 text-center text-xs text-muted-foreground">
                                    By signing up, you agree to our{" "}
                                    <Link
                                        href="/terms"
                                        className="text-primary underline-offset-2 hover:underline"
                                    >
                                        Terms of Service
                                    </Link>{" "}
                                    and{" "}
                                    <Link
                                        href="/privacy"
                                        className="text-primary underline-offset-2 hover:underline"
                                    >
                                        Privacy Policy
                                    </Link>
                                    .
                                </p>
                            </form>
                        </div>
                    ) : (
                        <div className="mt-8 space-y-6">
                            <div className="space-y-1.5 text-center lg:text-left">
                                <h2 className="text-2xl font-semibold tracking-tight">
                                    Verify your email
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    We sent a 6-digit code to{" "}
                                    <strong className="font-medium text-foreground">
                                        {formData.email}
                                    </strong>
                                    . Enter it below to finish creating your
                                    account.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-1.5">
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
                                        className="text-center text-2xl tracking-[0.5em] h-14"
                                        autoComplete="one-time-code"
                                        required
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <Alert
                                        variant={
                                            error.includes("sent to your email")
                                                ? "default"
                                                : "destructive"
                                        }
                                        className={
                                            error.includes("sent to your email")
                                                ? "border-primary/50 bg-primary/10 text-primary"
                                                : ""
                                        }
                                    >
                                        {error.includes(
                                            "sent to your email",
                                        ) ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4" />
                                        )}
                                        <AlertDescription>
                                            {error}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="flex flex-col gap-3">
                                    <Button
                                        type="submit"
                                        className="w-full rounded-full h-12 text-base"
                                        disabled={loading || otp.length !== 6}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                Verify &amp; Create Account
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full rounded-full h-11"
                                        disabled={loading}
                                        onClick={handleResendOtp}
                                    >
                                        <RotateCw className="h-3.5 w-3.5" />
                                        Resend Code
                                    </Button>
                                </div>

                                <p className="text-xs text-center text-muted-foreground px-4">
                                    By verifying, you agree to our{" "}
                                    <Link
                                        href="/terms"
                                        className="text-primary hover:underline underline-offset-2"
                                    >
                                        Terms of Service
                                    </Link>{" "}
                                    and{" "}
                                    <Link
                                        href="/privacy"
                                        className="text-primary hover:underline underline-offset-2"
                                    >
                                        Privacy Policy
                                    </Link>
                                    .
                                </p>
                            </form>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep(1);
                                        setError(null);
                                        setOtp("");
                                    }}
                                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    Back to edit details
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="mt-6 text-center text-sm">
                            <span className="text-muted-foreground">
                                Already have an account?{" "}
                            </span>
                            <Link
                                href="/login"
                                className="text-primary font-semibold hover:underline"
                            >
                                Log in
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
