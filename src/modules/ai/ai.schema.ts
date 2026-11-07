import { z } from "zod";

// Schema for Weekly Schedule Planner
export const WeeklyPlanSchema = z.object({
  summary: z.string(),
  tasks: z.array(
    z.object({
      day: z.enum([
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ]),
      title: z.string(),
      durationMinutes: z.number().int().nonnegative(), // allows 0 for rest days
      energyRequired: z.enum(["LOW", "MEDIUM", "HIGH"]),
      reason: z.string()
    })
  )
});

export type WeeklyPlanOutput = z.infer<typeof WeeklyPlanSchema>;

// Schema for Content Popularity & Market Competition Analytics
export const MarketAnalysisSchema = z.object({
  topic: z.string(),
  popularityScore: z.number().min(1).max(100),
  competitionScore: z.number().min(1).max(100),
  opportunityVerdict: z.enum([
    "HIGH_POTENTIAL",
    "BALANCED",
    "OVERSATURATED",
    "NICHE_AUDIENCE"
  ]),
  recommendations: z.array(z.string()),
  differentiatedAngles: z.array(z.string())
});

export type MarketAnalysisOutput = z.infer<typeof MarketAnalysisSchema>;