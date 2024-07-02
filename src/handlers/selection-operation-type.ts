import TelegramBot, { Message } from "node-telegram-bot-api";
import { Operation, UserState } from "../types";
import {
  availableOperations,
  levelsOfCompression,
  supportedFormats,
} from "../constants";
import { logger } from "../utils/logger";

export const handleOperationSelectionType = async (
  bot: TelegramBot,
  msg: Message,
  userState: Map<number, UserState>,
  currentState: UserState,
  chatId: number
) => {
  const operation = msg.text?.toLowerCase() as Operation;
  const isValidOperation = availableOperations.includes(operation);
  if (isValidOperation) {
    if (operation === "convert") {
      await bot.sendMessage(chatId, "To what format?", {
        reply_markup: {
          keyboard: supportedFormats.map((format) => [
            { text: format.toUpperCase() },
          ]),
          resize_keyboard: true,
        },
      });
      userState.set(chatId, {
        ...currentState,
        step: "conversionFormatSelection",
      });
    } else if (operation === "compress") {
      await bot.sendMessage(chatId, "Level of compression?", {
        reply_markup: {
          keyboard: levelsOfCompression.map((level) => [
            { text: level.toUpperCase() },
          ]),
          resize_keyboard: true,
        },
      });
      userState.set(chatId, {
        ...currentState,
        step: "compressionLevelSelection",
      });
    }
  } else {
    await bot.sendMessage(chatId, `Choose an operation, first`);
    logger("error", "Unsupported operation", undefined, { chatId, operation });
  }
};
