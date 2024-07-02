import TelegramBot, { Message } from "node-telegram-bot-api";
import { Format, UserState } from "../types";
import { supportedFormats } from "../constants";
import { logger } from "../utils/logger";

export const handleConversionFormatSelection = async (
  bot: TelegramBot,
  msg: Message,
  userState: Map<number, UserState>,
  currentState: UserState,
  chatId: number
) => {
  const format = msg.text?.toLowerCase() as Format;
  const isValidFormat = supportedFormats.includes(format);
  if (isValidFormat) {
    await bot.sendMessage(chatId, "Send the picture", {
      reply_markup: { remove_keyboard: true },
    });
    userState.set(chatId, {
      ...currentState,
      step: "conversion",
      chosenFormat: format,
    });
  } else {
    await bot.sendMessage(chatId, `Choose a format, first`);
    logger("error", "Unsupported format", undefined, { chatId, format });
  }
};
