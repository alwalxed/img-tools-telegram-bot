import { serve } from "@hono/node-server";
import { Hono } from "hono";
import TelegramBot from "node-telegram-bot-api";
import { log } from "./utils/log";
import { getToken } from "./utils/get-token";
import { saveLastUpdateId } from "./utils/last-updated";
import { handleStartCommand } from "./handlers/handle-start-command";
import { FORMATS, port } from "./consts";
import { AllowedFormat } from "./types";
import { handleFormatSelection } from "./handlers/handle-format-selection";
import { handlePhotoUpload } from "./handlers/handle-photo-upload";

const app = new Hono();
const bot = new TelegramBot(getToken(), { polling: true, filepath: false });

app.get("/", (c) => c.text("OK"));

bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;

    log("Received message", { chat_id: chatId });

    //*** HANDLERS ***
    // Handle (start) command
    if (msg.text?.startsWith("/start")) {
      await handleStartCommand(bot, msg);
    }

    // Handle format selection
    else if (FORMATS.includes(msg.text?.toLowerCase() as AllowedFormat)) {
      await handleFormatSelection(bot, msg);
    }

    // Handle photo upload (only jpg, png, or webp)
    else if (msg.photo) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const file = await bot.getFile(fileId);
      const filePath = file.file_path;
      const fileType = filePath?.split(".").pop();

      log("Received photo type", { chat_id: chatId, file_type: fileType });

      if (fileType === "jpg" || fileType === "png" || fileType === "webp") {
        await handlePhotoUpload(bot, msg);
      } else {
        await bot.sendMessage(
          chatId,
          `Warning: Unsupported photo type. Please send a photo in jpg, png, or webp format.`
        );
        log("Warning: Unsupported photo type received", {
          chat_id: chatId,
          file_type: fileType,
        });
      }
    }

    // Handle unsupported message types
    else {
      await bot.sendMessage(
        chatId,
        "Warning: Unsupported message type. Please send a photo or a text message."
      );
      log("Warning: Unsupported message type received", {
        chat_id: chatId,
        message_type: msg.text,
      });
    }

    //*** END HANDLERS ***

    // Save last update ID
    saveLastUpdateId(msg.message_id);
  } catch (error) {
    console.error("Error handling message:", error);
    log("Error handling message", { chat_id: msg.chat.id, error });
  }
});

// *** ERROR HANDLERS ***
// Handle polling errors
bot.on("polling_error", (error) => {
  console.log({ error });
  log("Polling error", { error });
});

// Handle webhook errors
bot.on("webhook_error", (error) => {
  console.log({ error });
  log("Webhook error", { error });
});
//*** END ERROR HANDLERS ***

serve({ fetch: app.fetch, port: port });

console.log(`Server is running on port ${port}`);

log("Server started", { port });
