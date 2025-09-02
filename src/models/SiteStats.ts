import { model, Schema, Types } from "mongoose";

type ISiteStats = {
  _id: Types.ObjectId;
  date: number;
  totalVisitors: number;
  uniqueVisitors: number;
  totalPageViews: number;
  avgSessionDuration: number;
  timestamp: number;
};

const schema = new Schema<ISiteStats>({
  date: {
    type: Number,
    required: true,
    unique: true,
  },
  totalVisitors: {
    type: Number,
    default: 0,
  },
  uniqueVisitors: {
    type: Number,
    default: 0,
  },
  totalPageViews: {
    type: Number,
    default: 0,
  },
  avgSessionDuration: {
    type: Number,
    default: 0,
  },
  timestamp: {
    type: Number,
    required: true,
    default: () => Math.floor(new Date().getTime() / 1000),
  },
});

schema.index({ date: -1 });

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const { _id, ...rest } = ret;
    return rest;
  },
});

export const SiteStats = model<ISiteStats>("SiteStats", schema);
