import { model, Schema, Types } from "mongoose";

type IEmailSignup = {
  _id: Types.ObjectId;
  email: string;
  ip: string;
  userAgent?: string;
  source?: string; // Where they signed up from (e.g., 'homepage', 'footer')
  timestamp: number;
  unsubscribed?: boolean;
};

const schema = new Schema<IEmailSignup>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"],
  },
  ip: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    default: "unknown",
  },
  source: {
    type: String,
    default: "website",
  },
  timestamp: {
    type: Number,
    required: true,
    default: () => Math.floor(Date.now() / 1000),
  },
  unsubscribed: {
    type: Boolean,
    default: false,
  },
});

// Indexes for performance
schema.index({ email: 1 });
schema.index({ ip: 1, timestamp: -1 });
schema.index({ timestamp: -1 });

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const { _id, ...rest } = ret;
    return rest;
  },
});

export const EmailSignup = model<IEmailSignup>("EmailSignup", schema);
