import cors from "cors";
import express from "express";
// import fs from "fs";
// import https from "https";
import http from "http";
import { PORT } from "./config.js";
import signupRoutes from "./routes/signup.route.js";
import visitorRoutes from "./routes/visitors.route.js";

import { connectToMongoDB } from "./utils/mongoose.js";

const CORS_ORIGINS = ["https://cio.football"];

// const options = {
//   key: fs.readFileSync(SSL_KEY_FILE),
//   cert: fs.readFileSync(SSL_CERT_FILE),
// };

const app = express();

// const httpsServer = https.createServer(options, app);
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

// httpsServer.listen({ port: PORT });
httpServer.listen({ port: PORT });
console.log(`🚀 Server ready`);
