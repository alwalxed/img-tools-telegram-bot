import { serve } from "@hono/node-server";
import { Hono } from "hono";
import TelegramBot from "node-telegram-bot-api";
import { TOKEN, PORT } from "./constants";
import { logger } from "./utils/logger";
import { onMessageHandler } from "./handlers";

const app = new Hono();
const bot = new TelegramBot(TOKEN, { polling: true, filepath: false });

bot.on("message", (msg) => onMessageHandler(bot, msg));

bot.on("polling_error", async (error) => {
  logger("error", "polling_error", undefined, { error });
});

bot.on("webhook_error", (error) => {
  logger("error", "webhook_error", undefined, { error });
});

serve({ fetch: app.fetch, port: PORT });

console.log(`Server is running on port ${PORT}`);
logger("info", `Server is running on port ${PORT}`, undefined, {});
