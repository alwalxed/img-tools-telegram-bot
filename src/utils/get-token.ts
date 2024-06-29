import * as dotenv from "dotenv";

export function getToken(): string {
  dotenv.config();
  const token: string = process.env.TOKEN as string;

  if (!token) {
    throw new Error("Telegram bot token is missing.");
  }
  return token;
}
