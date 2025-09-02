import { model, Schema, Types } from "mongoose";

type IPageView = {
  _id: Types.ObjectId;
  visitorFingerprint: string;
  sessionId: string;
  page: string;
  referrer?: string;
  ip?: string;
  userAgent?: string;
  timestamp: number;
};

const schema = new Schema<IPageView>({
  visitorFingerprint: {
    type: String,
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
  },
  page: {
    type: String,
    required: true,
  },
  referrer: String,
  ip: String,
  userAgent: String,
  timestamp: {
    type: Number,
    required: false,
    default: () => Math.floor(new Date().getTime() / 1000),
  },
});

schema.index({ visitorFingerprint: 1, timestamp: -1 });
schema.index({ sessionId: 1, timestamp: -1 });

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const { _id, ...rest } = ret;
    return rest;
  },
});

export const PageView = model<IPageView>("PageView", schema);
