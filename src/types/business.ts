import { z } from 'zod';

export const businessFaqSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1, 'Cada FAQ debe tener al menos una palabra clave'),
  answer: z.string().min(1, 'La respuesta no puede estar vacía'),
  quickReplies: z.array(z.string()).optional(),
});

export const businessScheduleDaySchema = z.object({
  day: z.string().min(1),
  hours: z.string().min(1),
});

export const businessOfferItemSchema = z.object({
  name: z.string().min(1),
  price: z.string().min(1),
  description: z.string().optional(),
  highlight: z.boolean().optional(),
});

export const businessSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().optional(),
  industry: z.string().min(1),
  language: z.enum(['es', 'en']).default('es'),
  timezone: z.string().default('America/Bogota'),
  currency: z.string().default('COP'),
  branding: z.object({
    logoUrl: z.string().optional(),
    primaryColor: z.string().default('#00F59B'),
    secondaryColor: z.string().optional(),
  }),
  contact: z.object({
    phone: z.string().min(1),
    whatsapp: z.string().min(1),
    email: z.string().email().optional(),
    address: z.string().optional(),
    mapsUrl: z.string().url().optional(),
    socialMedia: z
      .object({
        instagram: z.string().optional(),
        facebook: z.string().optional(),
        website: z.string().optional(),
      })
      .optional(),
  }),
  bot: z.object({
    welcomeMessage: z.string().min(1),
    fallbackMessage: z.string().min(1),
    advisorPrompt: z.string().min(1),
    advisorFollowUpMessage: z.string().min(1),
    advisorKeywords: z.array(z.string().min(1)).min(1),
    greetingKeywords: z.array(z.string().min(1)).min(1),
  }),
  faqs: z.array(businessFaqSchema).min(1, 'El negocio debe tener al menos una FAQ'),
  schedule: z.array(businessScheduleDaySchema).optional(),
  offers: z.array(businessOfferItemSchema).optional(),
});

export type BusinessFAQ = z.infer<typeof businessFaqSchema>;
export type BusinessScheduleDay = z.infer<typeof businessScheduleDaySchema>;
export type BusinessOfferItem = z.infer<typeof businessOfferItemSchema>;
export type BusinessConfig = z.infer<typeof businessSchema>;
