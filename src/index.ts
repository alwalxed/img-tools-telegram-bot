import { serve } from "@hono/node-server";
import { Hono } from "hono";
import TelegramBot, { Message } from "node-telegram-bot-api";
import { _get_token } from "./utils/get-token";
import { __log__ } from "./utils/log";
import { startCommandHandler } from "./helpers/start-command";
import { convertHandler } from "./helpers/convert";
import { compressHandler } from "./helpers/compress";
import { AllowedFormat } from "./types";
import { FORMATS, port, userState } from "./consts";
import { send_convert_format_selection } from "./helpers/format";
import { _save_last_update_id } from "./utils/last-updated";
import { get_message_info } from "./utils/get-msg-info";

const app = new Hono();
const bot = new TelegramBot(_get_token(), { polling: true, filepath: false });

// Handle incoming messages
bot.on("message", async (msg) => {
  try {
    __log__("Received message", get_message_info(msg));

    if (msg.text?.startsWith("/start")) {
      await handleStartCommand(bot, msg);
    } else if (msg.text?.startsWith("compress")) {
      await handleCompressCommand(bot, msg);
    } else if (msg.text?.startsWith("convert")) {
      await handleConvertCommand(bot, msg);
    } else if (FORMATS.includes(msg.text?.toLowerCase() as AllowedFormat)) {
      await handleFormatSelection(bot, msg);
    } else if (msg.photo) {
      await handlePhoto(bot, msg);
    } else {
      await handleUnsupportedMessage(bot, msg);
    }

    _save_last_update_id(msg.message_id);
  } catch (error) {
    console.error("Error handling message:", error);
    __log__("Error handling message", { chat_id: msg.chat.id, error });
  }
});

// Handle /start command
async function handleStartCommand(bot: TelegramBot, msg: Message) {
  userState.set(msg.chat.id, {});
  await startCommandHandler(bot, msg);
}

// Handle compress command
async function handleCompressCommand(bot: TelegramBot, msg: Message) {
  userState.set(msg.chat.id, { chosenOperation: "compress" });
  await bot.sendMessage(msg.chat.id, "Send the picture", {
    reply_markup: { remove_keyboard: true },
  });
}

// Handle convert command
async function handleConvertCommand(bot: TelegramBot, msg: Message) {
  userState.set(msg.chat.id, { chosenOperation: "convert" });
  await send_convert_format_selection(bot, msg.chat.id);
}

// Handle format selection
async function handleFormatSelection(bot: TelegramBot, msg: Message) {
  const chatId = msg.chat.id;
  userState.set(chatId, {
    chosenFormat: msg.text?.toLowerCase() as AllowedFormat,
    chosenOperation: "convert",
  });
  await bot.sendMessage(chatId, `Send the picture`, {
    reply_markup: { remove_keyboard: true },
  });
}

// Handle photo message
async function handlePhoto(bot: TelegramBot, msg: Message) {
  const chatId = msg.chat.id;
  switch (userState.get(chatId)?.chosenOperation) {
    case "compress":
      await compressHandler(bot, msg);
      break;
    case "convert":
      await convertHandler(bot, msg);
      break;
  }
}

// Handle unsupported message types
async function handleUnsupportedMessage(bot: TelegramBot, msg: Message) {
  userState.set(msg.chat.id, {});
  await bot.sendMessage(msg.chat.id, "Bad request, /start again");
  __log__("Warning: Unsupported message type received", {
    chat_id: msg.chat.id,
    message_type: msg.text,
  });
}

// Handle polling errors
bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
  __log__("Polling error", { error });
});

// Handle webhook errors
bot.on("webhook_error", (error) => {
  console.error("Webhook error:", error);
  __log__("Webhook error", { error });
});

// Start serving the bot
serve({ fetch: app.fetch, port: port });
console.log(`Server is running on port ${port}`);
__log__("Server started", { port });
