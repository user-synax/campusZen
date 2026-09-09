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
import { Loader2, Camera, AlertCircle, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { MultiSelect } from "@/components/shared/MultiSelect";

const INTEREST_OPTIONS = [
    "Programming","Web Development","AI","Hackathons","Placements","Startups","Design","Photography","Gaming","Cricket","Music","Memes","Finance","Entrepreneurship","College Life","Events","Cybersecurity","Open Source","UI/UX","Blockchain/Web3","Content Creation","Freelancing","Sports","Fitness & Gym","Movies & TV","Anime","Travel","Fashion","Reading","Debate & Public Speaking","Volunteering","Robotics",
];

export default function EditProfileDrawer({ user, open, onOpenChange, onSave }) {
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
            setTwitter(user.socialLinks?.twitter || "");
            setInstagram(user.socialLinks?.instagram || "");
            setLinkedin(user.socialLinks?.linkedin || "");
            setGithub(user.socialLinks?.github || "");
            setWebsite(user.socialLinks?.website || "");
            setError(null);
        }
    }, [open, user]);

    const triggerFileInput = () => { if (!uploadingAvatar && !saving) fileInputRef.current?.click(); };
    const triggerBannerFileInput = () => { if (!uploadingBanner && !saving) bannerFileInputRef.current?.click(); };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const allowed = ["image/jpeg","image/jpg","image/png","image/webp"];
        if (!allowed.includes(file.type)) { toast.error("Only JPG, PNG and WebP allowed"); return; }
        if (file.size > 5*1024*1024) { toast.error("Image must be under 5MB"); return; }
        setAvatarPreview(URL.createObjectURL(file)); setUploadingAvatar(true);
        const formData = new FormData(); formData.append("avatar", file);
        try { const res = await fetch("/api/users/avatar",{method:"POST",body:formData}); const data=await res.json(); if(res.ok){ toast.success("Photo updated"); setAvatarPreview(data.avatarUrl);} else throw new Error(data.message);} catch(err){ setAvatarPreview(null); toast.error(err.message||"Failed to upload avatar"); } finally{ setUploadingAvatar(false); }
    };
    const handleBannerChange = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const allowed = ["image/jpeg","image/jpg","image/png","image/webp"];
        if (!allowed.includes(file.type)) { toast.error("Only JPG, PNG and WebP allowed"); return; }
        if (file.size > 5*1024*1024) { toast.error("Image must be under 5MB"); return; }
        setBannerPreview(URL.createObjectURL(file)); setUploadingBanner(true);
        const formData=new FormData(); formData.append("banner", file);
        try { const res=await fetch("/api/users/banner",{method:"POST",body:formData}); const data=await res.json(); if(res.ok){ toast.success("Banner updated"); setBannerPreview(data.bannerUrl);} else throw new Error(data.message);} catch(err){ setBannerPreview(null); toast.error(err.message||"Failed to upload banner"); } finally{ setUploadingBanner(false); }
    };
    const handleDeleteAvatar = async (e) => { e.stopPropagation(); setUploadingAvatar(true); try{ const res=await fetch("/api/users/avatar",{method:"DELETE"}); if(res.ok){ toast.success("Avatar deleted"); setAvatarPreview(null); onSave({...user, avatar:null}); } else throw new Error("Failed"); } catch(err){ toast.error(err.message);} finally{ setUploadingAvatar(false); } };
    const handleDeleteBanner = async (e) => { e.stopPropagation(); setUploadingBanner(true); try{ const res=await fetch("/api/users/banner",{method:"DELETE"}); if(res.ok){ toast.success("Banner deleted"); setBannerPreview(null); onSave({...user, banner:null}); } else throw new Error("Failed"); } catch(err){ toast.error(err.message);} finally{ setUploadingBanner(false); } };
    const handleSave = async () => {
        const trimmedName=name.trim(); if(trimmedName.length<2){ setError("Name must be at least 2 characters"); return; }
        setError(null); setSaving(true);
        try{
            const res=await fetch("/api/users/"+user.username,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:trimmedName,bio:bio.trim(),college:college.trim(),course:course.trim(),year:Number(year),interests,dmEnabled,socialLinks:{twitter:twitter.trim(),instagram:instagram.trim(),linkedin:linkedin.trim(),github:github.trim(),website:website.trim()}})});
            const data=await res.json(); if(res.ok){ toast.success("Profile updated"); onSave(data); onOpenChange(false);} else throw new Error(data.message||"Update failed");
        } catch(err){ setError(err.message||"Failed to save changes"); } finally{ setSaving(false); }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col bg-[#090909] border-l border-[#262626] overflow-hidden rounded-l-[20px] sm:rounded-l-[20px] max-sm:rounded-none data-[state=open]:animate-[panelIn_var(--duration-slow)_var(--ease-smooth-out)] data-[state=closed]:animate-[panelOut_var(--duration-medium)_var(--ease-smooth-out)]">
                {/* Header — Framer 56px top-nav */}
                <SheetHeader className="shrink-0 flex flex-row items-center justify-between px-5 h-14 border-b border-[#262626] bg-[#090909] sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={()=>onOpenChange(false)} className="w-8 h-8 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center hover:bg-[#1c1c1c] hover:cursor-pointer transition-colors duration-[var(--duration-fast)]">
                            <X className="w-4 h-4" />
                        </button>
                        <SheetTitle className="text-[15px] font-semibold tracking-tight">Edit profile</SheetTitle>
                    </div>
                    <Button onClick={handleSave} disabled={saving||uploadingAvatar||uploadingBanner} className="rounded-full bg-white text-black hover:bg-white/90 text-[13px] font-semibold px-5 h-8 hover:cursor-pointer disabled:opacity-40">
                        {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin"/>Saving</> : "Save"}
                    </Button>
                    <SheetDescription className="sr-only">Edit your profile</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Banner — 20px card, hairline, no gradient slop */}
                    <div className="relative group/banner mx-4 mt-4 rounded-[15px] overflow-hidden border border-[#262626] bg-[#141414] cursor-pointer" onClick={triggerBannerFileInput}>
                        <div className="w-full h-[140px] sm:h-[160px] relative overflow-hidden">
                            {bannerPreview || user?.banner ? (
                                <Image src={bannerPreview || user.banner} alt="Banner" fill className="object-cover" sizes="520px" />
                            ) : (
                                <div className="w-full h-full bg-[#141414] flex items-center justify-center">
                                    <div className="text-center">
                                        <Camera className="w-6 h-6 mx-auto mb-1.5 text-[#999]" />
                                        <p className="text-[13px] font-medium text-[#999]">Add banner</p>
                                        <p className="text-[11px] text-[#666]">1500×500 · 5MB max</p>
                                    </div>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover/banner:bg-black/40 flex items-center justify-center opacity-0 group-hover/banner:opacity-100 transition-all duration-[var(--duration-fast)] backdrop-blur-[1px]">
                                {uploadingBanner ? <Loader2 className="w-6 h-6 animate-spin text-white"/> : <span className="flex items-center gap-2 bg-white text-black rounded-full px-4 py-2 text-[13px] font-semibold"><Camera className="w-4 h-4"/>Change banner</span>}
                            </div>
                        </div>
                        {(bannerPreview || user?.banner) && (
                            <button onClick={handleDeleteBanner} disabled={uploadingBanner||saving} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur text-white border border-white/20 flex items-center justify-center hover:bg-black/80 hover:cursor-pointer transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <input ref={bannerFileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleBannerChange} disabled={uploadingBanner||saving} />
                    </div>

                    {/* Avatar — centered, surface-1 */}
                    <div className="flex flex-col items-center -mt-10 relative z-10 px-4">
                        <div className="relative group/avatar">
                            <button onClick={triggerFileInput} className="relative w-[96px] h-[96px] rounded-full overflow-hidden bg-[#141414] border-[3px] border-[#090909] shadow-[0_0_0_1px_#262626] flex items-center justify-center hover:cursor-pointer">
                                {avatarPreview || user?.avatar ? (
                                    <Image src={avatarPreview || user.avatar} alt="Avatar" width={96} height={96} className="object-cover w-full h-full" />
                                ) : (
                                    <span className="text-2xl font-bold text-[#999]">{user?.name?.[0]?.toUpperCase()}</span>
                                )}
                                <span className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-[var(--duration-fast)]">
                                    {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin text-white"/> : <Camera className="w-5 h-5 text-white"/>}
                                </span>
                            </button>
                            {(avatarPreview || user?.avatar) && (
                                <button onClick={handleDeleteAvatar} disabled={uploadingAvatar||saving} className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white text-black border border-[#262626] flex items-center justify-center hover:bg-[#f5f5f5] hover:cursor-pointer shadow-sm">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <p className="text-[11px] text-[#999] mt-2">Tap to change · 5MB max</p>
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar||saving} />
                    </div>

                    {/* Form — Framer surfaces, 10px inputs, stagger 40ms */}
                    <div className="px-4 py-5 space-y-4">
                        {/* Basic */}
                        <section className="rounded-[15px] border border-[#262626] bg-[#141414] p-4 space-y-4 animate-[staggerIn_var(--duration-slow)_var(--ease-smooth-out)]" style={{"--stagger-index":0}}>
                            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-[#999]">Basic</h3>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-white">Name</label>
                                    <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" maxLength={50} disabled={saving} className="bg-[#1c1c1c] border-[#262626] rounded-[10px] h-10 text-[14px] focus-visible:ring-1 focus-visible:ring-[#4ba9e1]/30 focus-visible:border-[#4ba9e1]/30 placeholder:text-[#999]" />
                                    <p className="text-[11px] text-[#666] text-right">{name.length}/50</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-white flex items-center justify-between">Username <span className="text-[11px] bg-[#1c1c1c] border border-[#262626] px-2 py-0.5 rounded-full text-[#999]">Cannot be changed</span></label>
                                    <Input value={"@" + (user?.username||"")} disabled className="opacity-60 bg-[#1c1c1c] border-[#262626] rounded-[10px] h-10 text-[14px]" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-white">Bio</label>
                                    <Textarea value={bio} onChange={(e)=>setBio(e.target.value)} placeholder="Tell people about yourself..." maxLength={160} rows={3} className="resize-none bg-[#1c1c1c] border-[#262626] rounded-[10px] text-[14px] placeholder:text-[#999] focus-visible:ring-1 focus-visible:ring-[#4ba9e1]/30" disabled={saving} />
                                    <p className={`text-[11px] text-right ${bio.length>140?"text-amber-400":"text-[#666]"}`}>{bio.length}/160</p>
                                </div>
                            </div>
                        </section>

                        {/* Social */}
                        <section className="rounded-[15px] border border-[#262626] bg-[#141414] p-4 space-y-3 animate-[staggerIn_var(--duration-slow)_var(--ease-smooth-out)]" style={{"--stagger-index":1, animationDelay:"40ms"}}>
                            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-[#999]">Social links</h3>
                            {[
                                ["Twitter", twitter, setTwitter, "https://twitter.com/username"],
                                ["Instagram", instagram, setInstagram, "https://instagram.com/username"],
                                ["LinkedIn", linkedin, setLinkedin, "https://linkedin.com/in/username"],
                                ["GitHub", github, setGithub, "https://github.com/username"],
                                ["Website", website, setWebsite, "https://yourwebsite.com"],
                            ].map(([label, val, setter, ph]) => (
                                <div key={label} className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-white">{label}</label>
                                    <Input value={val} onChange={(e)=>setter(e.target.value)} placeholder={ph} maxLength={100} disabled={saving} className="bg-[#1c1c1c] border-[#262626] rounded-[10px] h-10 text-[14px] placeholder:text-[#666] focus-visible:ring-1 focus-visible:ring-[#4ba9e1]/30" />
                                </div>
                            ))}
                        </section>

                        {/* Preferences */}
                        <section className="rounded-[15px] border border-[#262626] bg-[#141414] p-4 space-y-4 animate-[staggerIn_var(--duration-slow)_var(--ease-smooth-out)]" style={{animationDelay:"80ms"}}>
                            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-[#999]">Preferences</h3>
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-white">Interests</label>
                                <MultiSelect options={INTEREST_OPTIONS} selected={interests} onChange={setInterests} placeholder="Select your interests..." maxSelected={10} disabled={saving} />
                                <p className="text-[11px] text-[#666]">3–10 interests</p>
                            </div>
                            <div className="flex items-center justify-between py-3 border-y border-[#262626]/60">
                                <div>
                                    <p className="text-[13px] font-medium text-white">Direct messages</p>
                                    <p className="text-[11px] text-[#999]">Allow others to message you</p>
                                </div>
                                <Switch checked={dmEnabled} onCheckedChange={setDmEnabled} disabled={saving} className="data-[state=checked]:bg-white data-[state=checked]:text-black" />
                            </div>
                        </section>

                        {/* Academic */}
                        <section className="rounded-[15px] border border-[#262626] bg-[#141414] p-4 space-y-3 animate-[staggerIn_var(--duration-slow)_var(--ease-smooth-out)]" style={{animationDelay:"120ms"}}>
                            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-[#999]">Academic</h3>
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-white">College</label>
                                <Input value={college} onChange={(e)=>setCollege(e.target.value)} placeholder="e.g. IIT Delhi" maxLength={100} disabled={saving} className="bg-[#1c1c1c] border-[#262626] rounded-[10px] h-10 text-[14px] placeholder:text-[#666] focus-visible:ring-1 focus-visible:ring-[#4ba9e1]/30" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-white">Course</label>
                                    <Input value={course} onChange={(e)=>setCourse(e.target.value)} placeholder="B.Tech CSE" maxLength={50} disabled={saving} className="bg-[#1c1c1c] border-[#262626] rounded-[10px] h-10 text-[14px] placeholder:text-[#666]" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-white">Year</label>
                                    <select value={year} onChange={(e)=>setYear(Number(e.target.value))} className="w-full h-10 bg-[#1c1c1c] border border-[#262626] rounded-[10px] px-3 text-[14px] text-white focus:outline-none focus:ring-1 focus:ring-[#4ba9e1]/30 disabled:opacity-50 hover:cursor-pointer" disabled={saving}>
                                        {[1,2,3,4,5,6].map(y=> <option key={y} value={y}>Year {y}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {error && (
                            <div className="rounded-[10px] bg-red-500/10 border border-red-500/20 text-red-300 text-[13px] flex items-start gap-2 p-3 animate-[shake_var(--duration-micro)_var(--ease-smooth-out)]">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer — Framer pills */}
                <div className="shrink-0 flex gap-2.5 px-4 py-3 border-t border-[#262626] bg-[#090909] sticky bottom-0">
                    <Button variant="outline" className="flex-1 rounded-full bg-[#141414] border-[#262626] text-white hover:bg-[#1c1c1c] hover:text-white h-10 text-[13px] font-medium hover:cursor-pointer" onClick={()=>onOpenChange(false)} disabled={saving}>Cancel</Button>
                    <Button className="flex-1 rounded-full bg-white text-black hover:bg-white/90 h-10 text-[13px] font-semibold hover:cursor-pointer disabled:opacity-40" onClick={handleSave} disabled={saving||uploadingAvatar||uploadingBanner}>
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Saving...</> : "Save changes"}
                    </Button>
                </div>

                <style>{`
                    @keyframes panelIn { from { transform: translateX(8px) scale(var(--scale-medium)); opacity:0; filter: blur(var(--blur-small)); } to { transform: translateX(0) scale(1); opacity:1; filter: blur(0); } }
                    @keyframes panelOut { from { transform: translateX(0) scale(1); opacity:1; } to { transform: translateX(8px) scale(var(--scale-tiny)); opacity:0; filter: blur(var(--blur-small)); } }
                    @keyframes staggerIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
                    @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)} 40%{transform:translateX(4px)} 60%{transform:translateX(-2px)} 80%{transform:translateX(2px)} }
                `}</style>
            </SheetContent>
        </Sheet>
    );
}
