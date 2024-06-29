import TelegramBot, { Message } from "node-telegram-bot-api";
import { log } from "../utils/log";
import { sendFormatSelection } from "../actions/send-format-selection";
import { userState } from "../consts";

export const handleStartCommand = async (
  bot: TelegramBot,
  msg: Message
): Promise<void> => {
  const chatId: number = msg.chat.id;
  log("Handling /start command", { chat_id: chatId });
  await sendFormatSelection(bot, chatId);
  userState.set(chatId, {});
};
