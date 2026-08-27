"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { X, UploadCloud, AlertCircle } from "lucide-react";
import { createAppwriteClient, getAppwriteStorage } from "@/lib/appwrite";
import { ID, Permission, Role } from "appwrite";
import useUser from "@/hooks/useUser";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ["video/mp4", "video/webm"];

export default function ClipUploadModal({ open, onOpenChange }) {
    const { user } = useUser();
    const [selectedFile, setSelectedFile] = useState(null);
    const [description, setDescription] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [videoPreview, setVideoPreview] = useState(null);
    const [validationError, setValidationError] = useState("");
    const fileInputRef = useRef(null);

    const validateFile = (file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return "Only MP4 and WebM video files are allowed.";
        }
        if (file.size > MAX_FILE_SIZE) {
            return "File size must be less than 100MB.";
        }
        return "";
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const error = validateFile(file);
            if (error) {
                setValidationError(error);
                return;
            }
            setValidationError("");
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setVideoPreview(url);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !user) return;

        setIsUploading(true);
        try {
            // Upload using the authenticated Appwrite session (the browser sends
            // the a_session cookie). Do NOT upload as a guest — anonymous writes
            // are disallowed; the clips bucket must require authentication for
            // create (enforced in the Appwrite console) and the server validates
            // ownership in /api/clips/create.
            const client = createAppwriteClient();
            const storage = getAppwriteStorage(client);

            // File-level permissions: publicly readable (for playback) but only
            // writable by the uploader, so ownership can be verified server-side.
            const permissions = [Permission.read(Role.any())];
            if (user?.appwriteUserId) {
                permissions.push(Permission.write(Role.user(user.appwriteUserId)));
            }

            const uploadResult = await storage.createFile(
                process.env.NEXT_PUBLIC_APPWRITE_CLIPS_BUCKET_ID,
                ID.unique(),
                selectedFile,
                permissions,
            );

            // Save to MongoDB
            const response = await fetch("/api/clips/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videoFileId: uploadResult.$id,
                    description,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setSelectedFile(null);
                setDescription("");
                setVideoPreview(null);
                setValidationError("");
                onOpenChange(false);
                window.location.reload();
            }
        } catch (error) {
            console.error("Upload failed:", error);
            alert(
                "Upload failed! Make sure you are signed in and the clips bucket requires authentication to create files.",
            );
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setVideoPreview(null);
        setValidationError("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Upload Clip</DialogTitle>
                    <DialogDescription>
                        Share a short vertical video! (Max 100MB, MP4/WebM)
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {validationError && (
                        <div className="flex items-center gap-2 bg-red-500/10 text-red-500 p-3 rounded-xl">
                            <AlertCircle className="w-5 h-5" />
                            <p className="text-sm">{validationError}</p>
                        </div>
                    )}

                    {!selectedFile ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary transition-colors"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/mp4,video/webm"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                Click to select a video file
                            </p>
                        </div>
                    ) : (
                        <div className="relative">
                            <video
                                src={videoPreview}
                                controls
                                className="w-full rounded-xl max-h-[30vh] object-contain bg-black"
                            />
                            <button
                                onClick={handleRemoveFile}
                                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {selectedFile && (
                        <Textarea
                            placeholder="Write a description for your clip..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={300}
                            className="resize-none"
                        />
                    )}

                    {selectedFile && (
                        <Button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="w-full"
                        >
                            {isUploading ? "Uploading..." : "Upload Clip"}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
