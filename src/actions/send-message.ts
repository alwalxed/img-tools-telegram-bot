import TelegramBot from "node-telegram-bot-api";
import { log } from "../utils/log";

export const sendMessage = async (
  bot: TelegramBot,
  chatId: number,
  text: string,
  options = {}
) => {
  try {
    log("Sending message", { chat_id: chatId, text });
    await bot.sendMessage(chatId, text, options);
  } catch (error) {
    console.error("Error sending message: ", error);
    log("Error sending message", { chat_id: chatId, error });
  }
};
