import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  designation: z.string().trim().min(1, "Designation is required").max(100),
  tagline: z.string().trim().min(1, "Tagline is required").max(300),
  location: z.string().trim().min(1, "Location is required").max(100),
  avatarUrl: z.string().trim().min(1, "Avatar URL is required").max(500),
  resumeUrl: z.string().trim().min(1, "Resume URL is required").max(500),
  email: z.email("Enter a valid email address"),
  phone: z.string().trim().min(1, "Phone is required").max(30),
  whatsapp: z.string().trim().min(1, "WhatsApp is required").max(30),
  bioJourney: z.string().trim().min(1, "This field is required").max(2000),
  bioEnjoy: z.string().trim().min(1, "This field is required").max(2000),
  bioHobbies: z.string().trim().min(1, "This field is required").max(2000),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
