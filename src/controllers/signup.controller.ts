import { Request, Response } from "express";
import { MAIL_HTML_BODY } from "../constants/constants.js";
import { EmailSignup } from "../models/EmailSignup.js";
import { RateLimit } from "../models/RateLimit.js";
import { sendEmail } from "../utils/sendEmail.js";

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxAttempts: 5, // Maximum attempts per time window
  timeWindow: 900, // 15 minutes in seconds
  blockDuration: 3600, // 1 hour block in seconds
};

// Helper function to get client IP
function getClientIP(req: Request): string {
  return (
    req.ip || (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.connection.remoteAddress || "unknown"
  );
}

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check and update rate limiting
async function checkRateLimit(identifier: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);

  let rateLimit = await RateLimit.findOne({ identifier });

  if (!rateLimit) {
    // First attempt from this identifier
    rateLimit = new RateLimit({
      identifier,
      attempts: 1,
      lastAttempt: now,
    });
    await rateLimit.save();

    return true;
  }

  // Check if currently blocked
  if (rateLimit.blockedUntil && now < rateLimit.blockedUntil) {
    return false;
  }

  // Reset attempts if time window has passed
  const timeSinceLastAttempt = now - rateLimit.lastAttempt;
  if (timeSinceLastAttempt > RATE_LIMIT_CONFIG.timeWindow) {
    rateLimit.attempts = 1;
    rateLimit.lastAttempt = now;
    rateLimit.blockedUntil = undefined;
    await rateLimit.save();

    return true;
  }

  // Increment attempts
  rateLimit.attempts++;
  rateLimit.lastAttempt = now;

  if (rateLimit.attempts > RATE_LIMIT_CONFIG.maxAttempts) {
    // Block the identifier
    rateLimit.blockedUntil = now + RATE_LIMIT_CONFIG.blockDuration;
    await rateLimit.save();

    return false;
  }

  await rateLimit.save();

  return true;
}

// Main signup function
async function signup(req: Request, res: Response) {
  try {
    const { email, source } = req.body;

    // Validate input
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // Validate email format
    if (!isValidEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid email address",
      });
    }

    const clientIP = getClientIP(req);
    const userAgent = req.get("User-Agent") || "unknown";
    const normalizedEmail = email.trim().toLowerCase();

    // Check rate limiting
    const allowed = await checkRateLimit(clientIP);

    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: "Too many signup attempts. Please try again later.",
      });
    }

    // Check if email already exists
    const existingEmail = await EmailSignup.findOne({ email: normalizedEmail });

    if (existingEmail) {
      // Return success to prevent email enumeration
      return res.status(200).json({
        success: true,
      });
    }

    // Create new email signup
    const emailSignup = new EmailSignup({
      email: normalizedEmail,
      ip: clientIP,
      userAgent,
      source: source || "website",
    });

    await emailSignup.save();

    // TODO: Send confirmation email here
    try {
      const messageId = await sendEmail({
        from: "CiO <info@cio.football>",
        to: [email],
        subject: "Welcome to a new era of football!",
        htmlBody: MAIL_HTML_BODY,
      });

      console.log("Email sent with ID:", messageId);
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }

    res.status(201).json({
      success: true,
    });
  } catch (error: any) {
    console.error("Error in email signup:", error);

    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
      });
    }

    res.status(500).json({
      success: false,
      error: "An error occurred while processing your signup. Please try again later.",
    });
  }
}

// Get signup stats (optional admin endpoint)
async function getSignupStats(req: Request, res: Response) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const last24Hours = now - 24 * 60 * 60;
    const last7Days = now - 7 * 24 * 60 * 60;

    const [totalSignups, signupsLast24h, signupsLast7Days, verifiedSignups, unsubscribedCount] = await Promise.all([
      EmailSignup.countDocuments(),
      EmailSignup.countDocuments({ timestamp: { $gte: last24Hours } }),
      EmailSignup.countDocuments({ timestamp: { $gte: last7Days } }),
      EmailSignup.countDocuments({ verified: true }),
      EmailSignup.countDocuments({ unsubscribed: true }),
    ]);

    res.json({
      success: true,
      stats: {
        totalSignups,
        signupsLast24h,
        signupsLast7Days,
        verifiedSignups,
        unsubscribedCount,
        verificationRate: totalSignups > 0 ? ((verifiedSignups / totalSignups) * 100).toFixed(2) + "%" : "0%",
      },
    });
  } catch (error) {
    console.error("Error getting signup stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get signup statistics",
    });
  }
}

// Unsubscribe function
async function unsubscribe(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: "Valid email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await EmailSignup.findOneAndUpdate(
      { email: normalizedEmail },
      { unsubscribed: true },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Email not found in our system",
      });
    }

    res.json({
      success: true,
      message: "You have been successfully unsubscribed.",
    });
  } catch (error) {
    console.error("Error unsubscribing email:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while unsubscribing",
    });
  }
}

export default {
  signup,
  getSignupStats,
  unsubscribe,
};
