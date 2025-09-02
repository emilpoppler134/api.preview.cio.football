import cors from "cors";
import express from "express";
import http from "http";
import { PORT } from "./config.js";
import signupRoutes from "./routes/signup.route.js";
import visitorRoutes from "./routes/visitors.route.js";

import { connectToMongoDB } from "./utils/mongoose.js";

const CORS_ORIGINS = ["https://cio.football"];

const app = express();
const httpServer = http.createServer(app);

await connectToMongoDB();

app.use(express.json());
app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
  })
);

app.use("/visitors", visitorRoutes);
app.use("/email", signupRoutes);

httpServer.listen({ port: PORT });
console.log(`🚀 Server ready`);
