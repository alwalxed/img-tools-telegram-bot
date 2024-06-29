import TelegramBot from "node-telegram-bot-api";
import { FORMATS } from "../consts";
import { __log__ } from "../utils/log";
import { send_message } from "./message";

export const send_convert_format_selection = async (
  bot: TelegramBot,
  chatId: number
): Promise<void> => {
  __log__("Sending format selection message", { chat_id: chatId });
  await send_message(bot, chatId, "To what format?", {
    reply_markup: {
      keyboard: FORMATS.map((format) => [{ text: format.toUpperCase() }]),
      resize_keyboard: true,
    },
  });
};
