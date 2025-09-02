import mongoose from "mongoose";
import { MONGODB_URI } from "../config.js";

export async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
  } catch (err) {
    console.error("Connection to MongoDB failed.", err);
  }
}

export async function checkMongoDBConnection() {
  if (mongoose.connection.readyState !== 1) {
    console.error("Connection to MongoDB is down, retrying...");
    await connectToMongoDB();
  }
}
