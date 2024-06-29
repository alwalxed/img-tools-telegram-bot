import { serve } from "@hono/node-server";
import { Hono } from "hono";
import TelegramBot from "node-telegram-bot-api";
import { log } from "./utils/log";
import { getToken } from "./utils/get-token";
import { loadLastUpdateId, saveLastUpdateId } from "./utils/last-updated";
import { handleStartCommand } from "./handlers/handle-start-command";
import { FORMATS, port } from "./consts";
import { AllowedFormat } from "./types";
import { handleFormatSelection } from "./handlers/handle-format-selection";
import { handlePhotoUpload } from "./handlers/handle-photo-upload";

const app = new Hono();
const bot = new TelegramBot(getToken(), { polling: true, filepath: false });

let lastUpdateId: number = 0;
lastUpdateId = loadLastUpdateId();

app.get("/", (c) => c.text("OK"));

bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;

    log("Received message", { chat_id: chatId });

    if (msg.text?.startsWith("/start")) {
      await handleStartCommand(bot, msg);
    } else if (FORMATS.includes(msg.text?.toLowerCase() as AllowedFormat)) {
      await handleFormatSelection(bot, msg);
    } else if (msg.photo) {
      await handlePhotoUpload(bot, msg);
    }

    saveLastUpdateId(msg.message_id);
  } catch (error) {
    console.error("Error handling message:", error);
    log("Error handling message", { chat_id: msg.chat.id, error });
  }
});

bot.on("polling_error", (error) => {
  console.log({ error });
  log("Polling error", { error });
});

bot.on("webhook_error", (error) => {
  console.log({ error });
  log("Webhook error", { error });
});

serve({ fetch: app.fetch, port: port });

console.log(`Server is running on port ${port}`);
log("Server started", { port });
