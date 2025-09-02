import { model, Schema, Types } from "mongoose";

type IRateLimit = {
  _id: Types.ObjectId;
  identifier: string; // IP address or fingerprint
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
};

const schema = new Schema<IRateLimit>({
  identifier: {
    type: String,
    required: true,
    unique: true,
  },
  attempts: {
    type: Number,
    required: true,
    default: 0,
  },
  lastAttempt: {
    type: Number,
    required: true,
    default: () => Math.floor(Date.now() / 1000),
  },
  blockedUntil: {
    type: Number,
    required: false,
  },
});

// TTL index to automatically clean up old rate limit records
schema.index({ lastAttempt: 1 }, { expireAfterSeconds: 3600 }); // Clean up after 1 hour
schema.index({ identifier: 1 });

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const { _id, ...rest } = ret;
    return rest;
  },
});

export const RateLimit = model<IRateLimit>("RateLimit", schema);
