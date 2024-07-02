import TelegramBot, { Message } from "node-telegram-bot-api";
import { extractSenderInfo } from "../utils/extract-sender-info";
import { availableOperations, userState } from "../constants";
import { logger } from "../utils/logger";
import { handleOperationSelectionType } from "./selection-operation-type";
import { handleConversionFormatSelection } from "./selection-conversion-format";
import { handleCompressionLevelSelection } from "./selection-compression-level";
import { handlePhotoProcessing } from "./photo-processing";
import { handleStartCommand } from "./start-command";

export const onMessageHandler = async (
  bot: TelegramBot,
  msg: Message
): Promise<void> => {
  const { chatId, fullName, userId, username } = extractSenderInfo(msg);
  const currentState = userState.get(chatId) || { step: "startCommand" };
  logger("info", "Received message", currentState, {
    chatId,
    fullName,
    userId,
    username,
  });

  const logStateTransition = (previousState: string, newState: string) => {
    logger(
      "info",
      `State transition: ${previousState} -> ${newState}`,
      undefined,
      { chatId }
    );
  };

  try {
    if (msg.text && msg.text.startsWith("/start")) {
      await bot.sendMessage(chatId, "What do you want to do?", {
        reply_markup: {
          keyboard: availableOperations.map((operation) => [
            { text: operation },
          ]),
          force_reply: true,
          resize_keyboard: true,
        },
      });
      logStateTransition(currentState.step, "operationSelection");
      userState.set(chatId, { step: "operationSelection" });
      return;
    }

    switch (currentState.step) {
      case "operationSelection":
        await handleOperationSelectionType(
          bot,
          msg,
          userState,
          currentState,
          chatId
        );
        break;

      case "conversionFormatSelection":
        await handleConversionFormatSelection(
          bot,
          msg,
          userState,
          currentState,
          chatId
        );
        break;

      case "compressionLevelSelection":
        await handleCompressionLevelSelection(
          bot,
          msg,
          userState,
          currentState,
          chatId
        );
        break;

      case "compression":
      case "conversion":
        if (msg.photo) {
          await handlePhotoProcessing(
            bot,
            msg,
            userState,
            chatId,
            currentState.step as "compression" | "conversion"
          );
        }
        break;

      default:
        await handleStartCommand(bot, chatId, currentState);
    }
  } catch (error) {
    logger("error", "Error handling message", undefined, { error });
    await bot.sendMessage(chatId, "An error occurred. Please try again.");
  }
};
