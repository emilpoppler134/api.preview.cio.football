import express from "express";
import controller from "../controllers/signup.controller.js";

const router = express.Router();

// Email signup endpoint
router.post("/signup", controller.signup);

// Unsubscribe endpoint
router.post("/unsubscribe", controller.unsubscribe);

export default router;
