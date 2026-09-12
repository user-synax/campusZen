import { z } from 'zod'

const DISPOSABLE_DOMAINS = [
  'yopmail.com', 'temp-mail.org', 'guerrillamail.com', '10minutemail.com',
  'mailinator.com', 'dispostable.com', 'getnada.com', 'tempmail.com'
];

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email format').refine((email) => {
    const localPart = email.split('@')[0];
    return localPart.length >= 4;
  }, 'Email prefix must be at least 4 characters long'),
  password: z.string().min(1, 'Password is required')
})

export const signupSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .trim(),
  username: z.string()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, 'Username must be 3-20 characters, alphanumeric and underscores only')
    .toLowerCase(),
  email: z.string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .refine((email) => {
      const localPart = email.split('@')[0];
      return localPart.length >= 4;
    }, 'Email prefix must be at least 4 characters long')
    .refine((email) => {
      const domain = email.split('@')[1];
      return !DISPOSABLE_DOMAINS.includes(domain);
    }, 'Disposable email addresses are not allowed'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  college: z.string().max(100).optional().default(''),
  course: z.string().max(100).optional().default(''),
  year: z.coerce.number().int().min(1).max(6).optional().default(1),
  gender: z.enum(['male', 'female', 'other', 'unspecified']).optional().default('unspecified'),
  otp: z.coerce.string().trim().regex(/^\d{6}$/, 'OTP must be exactly 6 digits')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const objectIdSchema = z.string().refine(
  (val) => /^[a-f\d]{24}$/i.test(val),
  'Invalid ID format'
)

export const followSchema = z.object({
  targetUserId: objectIdSchema
})

export const postCreateSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(2000, 'Post cannot exceed 2000 characters'),
  community: z.string().optional().default(''),
  isAnonymous: z.boolean().optional().default(false),
  poll: z.array(z.string()).optional(),
  linkPreview: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    url: z.string().optional()
  }).optional(),
  images: z.array(z.string()).optional().default([]),
  isMarkdown: z.boolean().optional().default(false)
})

export const reactionSchema = z.object({
  postId: objectIdSchema,
  reactionType: z.enum(['like', 'funny', 'wow', 'sad', 'respect', 'fire'])
})

export const bookmarkSchema = z.object({
  postId: objectIdSchema
})

export const commentSchema = z.object({
  postId: objectIdSchema,
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(280, 'Comment cannot exceed 280 characters')
    .trim()
})

export const coinGiftSchema = z.object({
  toUserId: objectIdSchema,
  amount: z.number().int().min(1, 'Amount must be at least 1')
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
})

export const validateRequest = (schema) => {
  return async (request) => {
    try {
      let body
      const contentType = request.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        body = await request.json()
      } else {
        const formData = await request.formData()
        body = Object.fromEntries(formData)
      }

      const result = schema.safeParse(body)
      
      if (!result.success) {
        const zodIssues = result.error.issues || result.error.errors || []
        return {
          valid: false,
          errors: zodIssues.map(e => ({
            field: (e.path || []).join('.'),
            message: e.message
          }))
        }
      }

      return { valid: true, data: result.data }
    } catch (error) {
      return {
        valid: false,
        errors: [{ field: 'body', message: 'Invalid request body' }]
      }
    }
  }
}
