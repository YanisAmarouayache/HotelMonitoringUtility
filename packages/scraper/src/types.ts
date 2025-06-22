import { z } from 'zod';

export const ScrapedHotelDataSchema = z.object({
  hotelId: z.string().optional(),
  hotelName: z.string().optional(),
  location: z.string().optional(),
  currency: z.string().optional(),
  ratingOverall: z.number().optional(),
  ratingLocation: z.number().optional(),
  amenities: z.array(z.string()),
  availabilityDays: z.array(z.object({
    checkin: z.string(),
    price: z.number(),
    available: z.boolean(),
    minLengthOfStay: z.number().optional()
  }))
});

export type ScrapedHotelData = z.infer<typeof ScrapedHotelDataSchema>;

export const ScrapingOptionsSchema = z.object({
  months: z.number().default(2),
  headless: z.boolean().default(true),
  timeout: z.number().default(30000)
});

export type ScrapingOptions = z.infer<typeof ScrapingOptionsSchema>; 