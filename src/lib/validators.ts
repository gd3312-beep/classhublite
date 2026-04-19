import { z } from "zod";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export const deadlineSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(100, "Max 100 chars"),
  description: z.string().trim().max(1000, "Max 1000 chars").optional().or(z.literal("")),
  due_date: z.string().min(1, "Date required"),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(100, "Max 100 chars"),
  body: z.string().trim().min(1, "Body required").max(2000, "Max 2000 chars"),
  pinned: z.boolean(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 chars").max(128),
});

export const emailSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
});

export const passwordResetSchema = z
  .object({
    password: z.string().min(8, "Min 8 chars").max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return "File exceeds 10 MB";
  if (!ALLOWED_MIME.includes(file.type)) return "File type not allowed";
  return null;
}
