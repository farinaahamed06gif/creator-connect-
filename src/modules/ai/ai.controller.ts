import type { Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import {
  WeeklyPlanSchema,
  type WeeklyPlanOutput,
  MarketAnalysisSchema,
  type MarketAnalysisOutput
} from "./ai.schema.js";
import { supabaseAdmin } from "../../config/supabase.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Active Google Gemini models
async function generateWithFallback(config: any) {
  const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.8-flash"];
  let lastError: any = null;

  for (const model of models) {
    try {
      return await ai.models.generateContent({
        ...config,
        model
      });
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} failed, attempting next available fallback...`, err.message || err);
    }
  }
  throw lastError;
}

// Endpoint: AI Weekly Planner
export async function generateWeeklyPlan(req: Request, res: Response) {
  try {
    const { userId, availableHours, energyLevel, goals } = req.body;

    if (!userId || !availableHours || !energyLevel) {
      return res.status(400).json({
        error: "Missing required planner constraints (userId, availableHours, energyLevel)."
      });
    }

    const prompt = `
      Create a realistic 7-day content schedule for a creator.
      Constraints:
      - Max total hours for the entire week: ${availableHours} hours.
      - Energy capacity: ${energyLevel}.
      - Creator goals: "${goals || "Consistent content creation"}".
      - Allocate 1 to 2 complete rest days with 0 tasks.
      - Focus on sustainable habits to prevent creator burnout.
    `;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  title: { type: Type.STRING },
                  durationMinutes: { type: Type.INTEGER },
                  energyRequired: {
                    type: Type.STRING,
                    enum: ["LOW", "MEDIUM", "HIGH"]
                  },
                  reason: { type: Type.STRING }
                },
                required: ["day", "title", "durationMinutes", "energyRequired"]
              }
            }
          },
          required: ["summary", "tasks"]
        }
      }
    });

    const parsedPlan: WeeklyPlanOutput = WeeklyPlanSchema.parse(
      JSON.parse(response.text!)
    );

    const { data: plan, error: planError } = await supabaseAdmin
      .from("weekly_plans")
      .insert({
        user_id: userId,
        week_start: new Date().toISOString().split("T")[0],
        available_hrs: availableHours,
        energy_level: energyLevel,
        summary: parsedPlan.summary,
        status: "ACTIVE"
      })
      .select()
      .single();

    if (planError) throw planError;

    const taskInserts = parsedPlan.tasks.map(
      (t: WeeklyPlanOutput["tasks"][number]) => ({
        plan_id: plan.id,
        day: t.day,
        title: t.title,
        duration_minutes: t.durationMinutes,
        energy_required: t.energyRequired,
        is_completed: false
      })
    );

    const { error: tasksError } = await supabaseAdmin
      .from("plan_tasks")
      .insert(taskInserts);

    if (tasksError) throw tasksError;

    return res.status(201).json({ success: true, plan, tasks: taskInserts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate plan." });
  }
}

// Endpoint: AI Content Popularity & Market Competition Analytics
export async function analyzeContentOpportunity(req: Request, res: Response) {
  try {
    const { topic, niche, platform } = req.body;

    if (!topic || !niche) {
      return res.status(400).json({ error: "Missing required parameters: topic and niche." });
    }

    const prompt = `
      Analyze the market opportunity for a small creator producing content on the following topic:
      - Topic: "${topic}"
      - Niche: "${niche}"
      - Target Platform: "${platform || "YouTube/Instagram"}"

      Evaluate:
      1. Popularity/Audience Demand (1-100 scale)
      2. Competition/Market Saturation (1-100 scale)
      3. Opportunity Verdict: HIGH_POTENTIAL, BALANCED, OVERSATURATED, or NICHE_AUDIENCE
      4. 2-3 Actionable recommendations to gain reach
      5. 2-3 Differentiated angles to stand out from existing creators
    `;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            popularityScore: { type: Type.INTEGER },
            competitionScore: { type: Type.INTEGER },
            opportunityVerdict: {
              type: Type.STRING,
              enum: ["HIGH_POTENTIAL", "BALANCED", "OVERSATURATED", "NICHE_AUDIENCE"]
            },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            differentiatedAngles: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: [
            "topic",
            "popularityScore",
            "competitionScore",
            "opportunityVerdict",
            "recommendations",
            "differentiatedAngles"
          ]
        }
      }
    });

    const parsedResult: MarketAnalysisOutput = MarketAnalysisSchema.parse(
      JSON.parse(response.text!)
    );

    return res.status(200).json({ success: true, data: parsedResult });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate plan." });
  }
}