import TelegramBot, { Message } from "node-telegram-bot-api";
import { supportedFormats } from "../constants";
import { CompressionLevel, Format, UserState } from "../types";
import { compress } from "../utils/compress";
import { convert } from "../utils/convert";
import { logger } from "../utils/logger";

export const handlePhotoProcessing = async (
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
      ).toFixed(2)}KB | [${reductionPercent}%]`;
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
