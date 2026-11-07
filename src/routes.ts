import { Router } from "express";
import {
  generateWeeklyPlan,
  analyzeContentOpportunity
} from "./modules/ai/ai.controller.js";
import { supabaseAdmin } from "./config/supabase.js";

export const router = Router();

// ==========================================
// 1. Health Check
// ==========================================
router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==========================================
// 2. Creator Discovery
// ==========================================
router.get("/creators", async (req, res) => {
  try {
    const { niche, audienceSize } = req.query;
    let query = supabaseAdmin.from("profiles").select("*");

    if (niche) query = query.ilike("niche", `%${niche}%`);
    if (audienceSize) query = query.eq("audience_size", String(audienceSize));

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch creators." });
  }
});

// ==========================================
// 3. Direct Collaboration Requests (1-on-1)
// ==========================================

// Create a 1-on-1 collaboration request
router.post("/collaborations", async (req, res) => {
  try {
    const { senderId, recipientId, brief, projectTitle, proposedPlatform } = req.body;
    if (!senderId || !recipientId || !brief) {
      return res.status(400).json({ error: "Missing senderId, recipientId, or brief." });
    }

    const { data, error } = await supabaseAdmin
      .from("collaboration_requests")
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        brief,
        status: "PENDING"
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create collaboration request." });
  }
});

// Fetch direct collaborations (supports both /collaborations and /collaborations/:userId)
const handleGetCollaborations = async (req: any, res: any) => {
  try {
    const userId = req.params.userId || req.query.userId;
    let query = supabaseAdmin.from("collaboration_requests").select(`
      *,
      sender:profiles!collaboration_requests_sender_id_fkey(display_name, niche, audience_size),
      recipient:profiles!collaboration_requests_recipient_id_fkey(display_name, niche, audience_size)
    `);

    if (userId) {
      query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch collaborations." });
  }
};

router.get("/collaborations", handleGetCollaborations);
router.get("/collaborations/:userId", handleGetCollaborations);

// Update status of a direct collaboration request (ACCEPTED / DECLINED)
router.patch("/collaborations/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["ACCEPTED", "DECLINED", "PENDING"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const { data, error } = await supabaseAdmin
      .from("collaboration_requests")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update collaboration status." });
  }
});

// ==========================================
// 4. Open Collaboration Board (Broadcast Listings)
// ==========================================

// Create an open broadcast listing
router.post("/listings", async (req, res) => {
  try {
    const { creatorId, title, description, targetNiche, targetAudienceSize, platform } = req.body;

    if (!creatorId || !title || !description || !targetNiche) {
      return res.status(400).json({ error: "Missing required fields (creatorId, title, description, targetNiche)." });
    }

    const { data, error } = await supabaseAdmin
      .from("collab_listings")
      .insert({
        creator_id: creatorId,
        title,
        description,
        target_niche: targetNiche,
        target_audience_size: targetAudienceSize || null,
        platform: platform || "YouTube",
        status: "OPEN"
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create listing." });
  }
});

// Fetch open listings matching creator criteria (e.g., ?niche=Tech&audienceSize=1k-10k)
router.get("/listings/matched", async (req, res) => {
  try {
    const { niche, audienceSize } = req.query;

    let query = supabaseAdmin
      .from("collab_listings")
      .select(`
        *,
        creator:profiles!collab_listings_creator_id_fkey(display_name, niche, audience_size)
      `)
      .eq("status", "OPEN");

    if (niche) {
      query = query.ilike("target_niche", `%${niche}%`);
    }

    if (audienceSize) {
      query = query.or(`target_audience_size.is.null,target_audience_size.eq.${audienceSize}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch matched listings." });
  }
});

// Apply to an open listing
router.post("/listings/:id/apply", async (req, res) => {
  try {
    const { id: listingId } = req.params;
    const { applicantId, pitch } = req.body;

    if (!applicantId) {
      return res.status(400).json({ error: "Missing applicantId." });
    }

    const { data, error } = await supabaseAdmin
      .from("collab_applications")
      .insert({
        listing_id: listingId,
        applicant_id: applicantId,
        pitch: pitch || "I would love to collaborate on this!",
        status: "PENDING"
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to apply to listing." });
  }
});

// ==========================================
// 5. AI Analytics & Scheduler
// ==========================================

// AI Burnout-proof Weekly Plan Generator
router.post("/ai/weekly-plan", generateWeeklyPlan);

// AI Market Popularity & Competition Opportunity Analytics
router.post("/ai/content-analysis", analyzeContentOpportunity);

export default router;