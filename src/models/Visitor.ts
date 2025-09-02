import { model, Schema, Types } from "mongoose";

type IVisitor = {
  _id: Types.ObjectId;
  fingerprint: string;
  firstVisit: number;
  lastActivity: number;
  visitCount: number;
  sessions: {
    sessionId: string;
    startTime: number;
    endTime?: number;
    pageViews: number;
  }[];
  ip: string;
  userAgent: string;
  referrers: string[];
  pages: string[];
  timestamp: number;
};

const schema = new Schema<IVisitor>({
  fingerprint: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  firstVisit: {
    type: Number,
    required: true,
    default: () => Math.floor(new Date().getTime() / 1000),
  },
  lastActivity: {
    type: Number,
    required: true,
    default: () => Math.floor(new Date().getTime() / 1000),
  },
  visitCount: {
    type: Number,
    required: true,
    default: 1,
  },
  sessions: [
    {
      sessionId: String,
      startTime: Number,
      endTime: Number,
      pageViews: Number,
    },
  ],
  ip: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  referrers: [String],
  pages: [String],
  timestamp: {
    type: Number,
    required: false,
    default: () => Math.floor(new Date().getTime() / 1000),
  },
});

schema.index({ lastActivity: 1 });
schema.index({ fingerprint: 1, lastActivity: 1 });

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const { _id, ...rest } = ret;
    return rest;
  },
});

export const Visitor = model<IVisitor>("Visitor", schema);
