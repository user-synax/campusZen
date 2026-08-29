import { z } from "zod";

export const ObjectIdSchema = z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

// clientId must match the frontend's optimistic id format: client-<digits>-<rand>
// `kind` distinguishes dm vs group; `type` is the message content type
// (text/image) which comes from the frontend's useChatRoom body.
export const messageSendSchema = z
    .object({
        kind: z.enum(["dm", "group"]),
        id: ObjectIdSchema,
        content: z.string().max(2000).optional().default(""),
        type: z.enum(["text", "image"]).default("text"),
        imageUrl: z.string().optional().default(""),
        clientId: z.string().min(1).optional(),
        replyTo: ObjectIdSchema.optional().nullable(),
    })
    .superRefine((val, ctx) => {
        if (val.type === "text") {
            if (!val.content || !val.content.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Message content required",
                    path: ["content"],
                });
            }
        } else if (val.type === "image") {
            if (!val.imageUrl || !val.imageUrl.startsWith("https://")) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Invalid image URL",
                    path: ["imageUrl"],
                });
            }
        }
    });

export const typingSchema = z.object({
    kind: z.enum(["dm", "group"]),
    id: ObjectIdSchema,
    isTyping: z.boolean(),
});

export const readSchema = z.object({
    kind: z.enum(["dm", "group"]),
    id: ObjectIdSchema,
});

export const historyQuerySchema = z.object({
    cursor: ObjectIdSchema.optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(30),
});
