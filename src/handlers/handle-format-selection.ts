import TelegramBot, { Message } from "node-telegram-bot-api";
import { AllowedFormat } from "../types";
import { FORMATS, userState } from "../consts";
import { sendMessage } from "../actions/send-message";
import { sendFormatSelection } from "../actions/send-format-selection";
import { log } from "../utils/log";

export const handleFormatSelection = async (
  bot: TelegramBot,
  msg: Message
): Promise<void> => {
  const chatId: number = msg.chat.id;
  const chosenFormat = (msg.text?.toLowerCase() as AllowedFormat) || undefined;
  log("Handling format selection", { chat_id: chatId, chosenFormat });

  if (!chosenFormat || !FORMATS.includes(chosenFormat)) {
    await sendMessage(
      bot,
      chatId,
      "Please select a valid format: JPG, PNG, or WEBP."
    );
    await sendFormatSelection(bot, chatId);
    return;
  }

  userState.set(chatId, { chosenFormat });
  await sendMessage(
    bot,
    chatId,
    `You selected ${chosenFormat.toUpperCase()} ✅\nNow, send a photo 📷`,
    {
      reply_markup: { remove_keyboard: true },
    }
  );
};
