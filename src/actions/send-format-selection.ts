import TelegramBot from "node-telegram-bot-api";
import { FORMATS } from "../consts";
import { log } from "../utils/log";
import { sendMessage } from "./send-message";

export const sendFormatSelection = async (
  bot: TelegramBot,
  chatId: number
): Promise<void> => {
  log("Sending format selection message", { chat_id: chatId });
  await sendMessage(
    bot,
    chatId,
    "Choose the format you want to convert it to 🖼️",
    {
      reply_markup: {
        keyboard: FORMATS.map((format) => [{ text: format.toUpperCase() }]),
        resize_keyboard: true,
      },
    }
  );
};
