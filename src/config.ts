import dotenv from "dotenv";
import unwrap from "ts-unwrap";

dotenv.config();

export const PORT = unwrap(process.env.PORT) ? parseInt(unwrap(process.env.PORT), 10) : 4000;

export const DATABASE_USERNAME = unwrap(process.env.DATABASE_USERNAME);
export const DATABASE_PASSWORD = unwrap(process.env.DATABASE_PASSWORD);
export const DATABASE_HOST = unwrap(process.env.DATABASE_HOST);
export const DATABASE_NAME = unwrap(process.env.DATABASE_NAME);
export const MONGODB_URI = `mongodb+srv://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}/${DATABASE_NAME}`;

export const AWS_REGION = unwrap(process.env.AWS_REGION);
export const AWS_ACCESS_KEY_ID = unwrap(process.env.AWS_ACCESS_KEY_ID);
export const AWS_SECRET_ACCESS_KEY = unwrap(process.env.AWS_SECRET_ACCESS_KEY);
