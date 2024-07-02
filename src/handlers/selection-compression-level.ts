import TelegramBot, { Message } from "node-telegram-bot-api";
import { CompressionLevel, UserState } from "../types";
import { levelsOfCompression } from "../constants";
import { logger } from "../utils/logger";

export const handleCompressionLevelSelection = async (
  bot: TelegramBot,
  msg: Message,
  userState: Map<number, UserState>,
  currentState: UserState,
  chatId: number
) => {
  const level = msg.text?.toLowerCase() as CompressionLevel;
  const isValidLevel = levelsOfCompression.includes(level);
  if (isValidLevel) {
    await bot.sendMessage(chatId, "Send the picture", {
      reply_markup: { remove_keyboard: true },
    });
    userState.set(chatId, {
      ...currentState,
      step: "compression",
      chosenLevel: level,
    });
  } else {
    await bot.sendMessage(chatId, `Choose a compression-level, first`);
    logger("error", "Unsupported compression level", undefined, {
      chatId,
      level,
    });
  }
};
