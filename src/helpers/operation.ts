import TelegramBot from "node-telegram-bot-api";
import { OPERATIONS } from "../consts";
import { __log__ } from "../utils/log";
import { send_message } from "./message";

export const send_operation_selection = async (
  bot: TelegramBot,
  chatId: number
): Promise<void> => {
  __log__("Sending operation selection message", { chat_id: chatId });
  await send_message(bot, chatId, "Choose an operation:", {
    reply_markup: {
      keyboard: OPERATIONS.map((operation) => [{ text: operation }]),
      force_reply: true,
      resize_keyboard: true,
    },
  });
};
