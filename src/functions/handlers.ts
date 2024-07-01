import TelegramBot, { Message } from "node-telegram-bot-api";
import { extractSenderInfo } from "./extract-sender-info";
import { compress } from "./compress";
import { convert } from "./convert";
import {
  availableOperations,
  supportedFormats,
  levelsOfCompression,
  userState,
} from "../constants";
import { logger } from "./logger";
import { CompressionLevel, Format, Operation, UserState } from "../types";

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

  try {
    switch (currentState.step) {
      case "startCommand":
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
          userState.set(chatId, {
            ...currentState,
            step: "operationSelection",
          });
        } else {
          await bot.sendMessage(chatId, "You must use /start");
          logger(
            "error",
            "Unsupported message type received",
            userState.get(chatId),
            { chatId }
          );
        }
        break;

      case "operationSelection":
        await handleOperationSelection(
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
        if (msg.photo) {
          await handlePhotoProcessing(
            bot,
            msg,
            userState,
            chatId,
            "compression"
          );
        }
        break;

      case "conversion":
        if (msg.photo) {
          await handlePhotoProcessing(
            bot,
            msg,
            userState,
            chatId,
            "conversion"
          );
        }
        break;

      default:
        await bot.sendMessage(chatId, "Bad request, /start again");
        logger(
          "error",
          "Unsupported message type received",
          userState.get(chatId),
          { chatId }
        );
    }
  } catch (error) {
    logger("error", "Error handling message", undefined, { error });
  }
};

const handleOperationSelection = async (
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

const handleConversionFormatSelection = async (
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

const handleCompressionLevelSelection = async (
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

const handlePhotoProcessing = async (
  bot: TelegramBot,
  msg: Message,
  userState: Map<number, UserState>,
  chatId: number,
  operation: "compression" | "conversion"
) => {
  const fileId = msg.photo?.[msg.photo.length - 1]?.file_id as string;
  try {
    const file = await bot.getFile(fileId);
    const fileLink = await bot.getFileLink(fileId);

    // Fetch the file from Telegram server
    const response = await fetch(fileLink);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch the photo (${response.status} ${response.statusText})`
      );
    }

    // Convert ArrayBuffer to Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file type
    const filePath = file.file_path as string;
    const fileType = filePath.split(".").pop()?.toLowerCase() as Format;

    if (!fileType || !supportedFormats.includes(fileType)) {
      throw new Error("Unsupported or corrupted file");
    }

    let processedBuffer: Buffer;
    let caption: string;

    if (operation === "compression") {
      processedBuffer = await compress(
        buffer,
        fileType,
        userState.get(chatId)?.chosenLevel as CompressionLevel
      );
      const newSize = processedBuffer.byteLength;
      const reductionPercent = (
        ((buffer.byteLength - newSize) / buffer.byteLength) *
        100
      ).toFixed(2);
      caption = `${(buffer.byteLength / 1024).toFixed(2)}KB → ${(
        newSize / 1024
      ).toFixed(2)}KB → ${reductionPercent}%`;
    } else {
      const chosenFormat = userState.get(chatId)?.chosenFormat as Format;
      processedBuffer = await convert(buffer, fileType);
      caption = `${fileType.toUpperCase()} → ${chosenFormat.toUpperCase()}`;
    }

    await bot.sendDocument(
      chatId,
      processedBuffer,
      { caption },
      { filename: operation }
    );

    await bot.sendMessage(chatId, "New operation? /start");
    logger(
      "info",
      `${operation.charAt(0).toUpperCase() + operation.slice(1)} completed`,
      userState.get(chatId),
      { chatId, fileType }
    );
    userState.set(chatId, { ...userState.get(chatId), step: "startCommand" });
  } catch (error) {
    await bot.sendMessage(chatId, `Failed to process the photo: ${error}`);
    logger("error", `Failed to process the photo`, userState.get(chatId), {
      chatId,
      error,
    });
  }
};
