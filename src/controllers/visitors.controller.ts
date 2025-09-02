import crypto from "crypto";
import { Request, Response } from "express";
import { PageView } from "../models/PageView.js";
import { Visitor } from "../models/Visitor.js";
import { SESSION_TIMEOUT } from "../routes/visitors.route.js";

interface VisitorData {
  timestamp: string;
  userAgent?: string;
  referrer?: string;
  ip: string;
  page?: string;
}

function generateVisitorFingerprint(req: Request): string {
  const ip = getClientIP(req);
  const userAgent = req.get("User-Agent") || "unknown";
  return crypto.createHash("sha256").update(`${ip}-${userAgent}`).digest("hex");
}

function getClientIP(req: Request): string {
  return (
    req.ip || (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.connection.remoteAddress || "unknown"
  );
}

// Add this at the top of your file
const recentRequests = new Map<string, number>();
const DEDUP_WINDOW = 2000; // 2 seconds

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentRequests.entries()) {
    if (now - timestamp > DEDUP_WINDOW) {
      recentRequests.delete(key);
    }
  }
}, 30000); // Clean every 30 seconds

async function track(req: Request, res: Response) {
  try {
    const visitorData: VisitorData = {
      timestamp: req.body.timestamp || new Date().toISOString(),
      userAgent: req.get("User-Agent"),
      referrer: req.get("Referer"),
      ip: getClientIP(req),
      page: req.body.page || "/",
    };

    const fingerprint = generateVisitorFingerprint(req);
    const now = Math.floor(Date.now() / 1000);

    // Create a deduplication key
    const dedupKey = `${fingerprint}-${visitorData.page}-${req.sessionID}`;
    const currentTime = Date.now();

    // Check if we've seen this exact request recently
    const lastRequestTime = recentRequests.get(dedupKey);
    if (lastRequestTime && currentTime - lastRequestTime < DEDUP_WINDOW) {
      return res.json({ success: true });
    }

    // Record this request
    recentRequests.set(dedupKey, currentTime);

    let isNewSession = false;

    // Initialize session page views counter
    if (!req.session.pageViews) {
      req.session.pageViews = 0;
    }

    // Check if this is a new session
    if (!req.session.visitorFingerprint) {
      req.session.visitorFingerprint = fingerprint;
      req.session.firstVisit = now;
      req.session.pageViews = 1;
      isNewSession = true;
    } else {
      req.session.pageViews++;
    }

    // Find existing visitor first
    let visitor = await Visitor.findOne({ fingerprint });

    if (!visitor) {
      // Use upsert to handle race conditions
      visitor = await Visitor.findOneAndUpdate(
        { fingerprint },
        {
          $setOnInsert: {
            fingerprint,
            firstVisit: now,
            lastActivity: now,
            visitCount: 1,
            ip: visitorData.ip,
            userAgent: visitorData.userAgent || "unknown",
            referrers: visitorData.referrer ? [visitorData.referrer] : [],
            pages: [visitorData.page || "/"],
            sessions: [
              {
                sessionId: req.sessionID,
                startTime: now,
                pageViews: 1,
              },
            ],
            timestamp: now,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    } else {
      // Existing visitor
      const timeSinceLastActivity = now - visitor.lastActivity;

      const updateOperations: any = {
        $set: {
          lastActivity: now,
        },
      };

      if (timeSinceLastActivity > Math.floor(SESSION_TIMEOUT / 1000) || isNewSession) {
        // New session for existing visitor
        updateOperations.$inc = { visitCount: 1 };
        updateOperations.$push = {
          sessions: {
            sessionId: req.sessionID,
            startTime: now,
            pageViews: 1,
          },
        };
      } else {
        // Same session - update page views for current session
        const sessionIndex = visitor.sessions.findIndex((s) => s.sessionId === req.sessionID);
        if (sessionIndex !== -1) {
          updateOperations.$set[`sessions.${sessionIndex}.pageViews`] = req.session.pageViews || 1;
        }
      }

      // Add new referrer if not already present
      if (visitorData.referrer && !visitor.referrers.includes(visitorData.referrer)) {
        updateOperations.$addToSet = updateOperations.$addToSet || {};
        updateOperations.$addToSet.referrers = visitorData.referrer;
      }

      // Add new page if not already present
      if (visitorData.page && !visitor.pages.includes(visitorData.page)) {
        updateOperations.$addToSet = updateOperations.$addToSet || {};
        updateOperations.$addToSet.pages = visitorData.page;
      }

      visitor = await Visitor.findOneAndUpdate({ fingerprint }, updateOperations, { new: true });
    }

    // Check for duplicate page view before creating
    const existingPageView = await PageView.findOne({
      visitorFingerprint: fingerprint,
      sessionId: req.sessionID,
      page: visitorData.page || "/",
      timestamp: { $gte: now - 5 }, // Within 5 seconds
    });

    if (!existingPageView) {
      // Record page view
      const pageView = new PageView({
        visitorFingerprint: fingerprint,
        sessionId: req.sessionID,
        page: visitorData.page || "/",
        referrer: visitorData.referrer,
        timestamp: now,
        ip: visitorData.ip,
        userAgent: visitorData.userAgent,
      });

      await pageView.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking visitor:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
export default { track };
