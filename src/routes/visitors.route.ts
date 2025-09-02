import MongoStore from "connect-mongo";
import express from "express";
import session from "express-session";
import { MONGODB_URI } from "../config.js";
import controller from "../controllers/visitors.controller.js";
import { PageView } from "../models/PageView.js";
import { SiteStats } from "../models/SiteStats.js";
import { Visitor } from "../models/Visitor.js";

// Configuration
export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

const router = express.Router();

// Session configuration with MongoDB store
router.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      ttl: SESSION_TIMEOUT / 1000,
      autoRemove: "native",
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: SESSION_TIMEOUT,
    },
  })
);

// Extend session type
declare module "express-session" {
  interface SessionData {
    visitorFingerprint?: string;
    firstVisit?: number;
    pageViews?: number;
  }
}

// Clean up old sessions and update statistics
async function performMaintenance(): Promise<void> {
  try {
    const cutoffTime = new Date(Date.now() - SESSION_TIMEOUT);

    // Update visitors with expired sessions
    await Visitor.updateMany(
      { lastActivity: { $lt: cutoffTime } },
      {
        $push: {
          "sessions.$[elem].endTime": new Date(),
        },
      },
      {
        arrayFilters: [{ "elem.endTime": { $exists: false } }],
      }
    );

    // Update daily statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Math.floor(today.getTime() / 1000);

    const [totalVisitors, uniqueVisitorsToday, totalPageViews] = await Promise.all([
      Visitor.countDocuments(),
      Visitor.countDocuments({ firstVisit: { $gte: todayTimestamp } }),
      PageView.countDocuments({ timestamp: { $gte: todayTimestamp } }),
    ]);

    await SiteStats.findOneAndUpdate(
      { date: todayTimestamp },
      {
        totalVisitors,
        uniqueVisitors: uniqueVisitorsToday,
        totalPageViews,
      },
      { upsert: true }
    );

    console.log("Maintenance completed:", { totalVisitors, uniqueVisitorsToday, totalPageViews });
  } catch (error) {
    console.error("Maintenance error:", error);
  }
}

// Start maintenance interval
setInterval(performMaintenance, CLEANUP_INTERVAL);

router.post("/track", controller.track);

export default router;
