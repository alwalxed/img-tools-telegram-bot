import { AllowedFormat } from "../types/index";
import TelegramBot, { Message } from "node-telegram-bot-api";
import { FORMATS, userState } from "../consts";
import { __log__ } from "../utils/log";
import sharp from "sharp";
import { send_message } from "./message";

export const compressHandler = async (
  bot: TelegramBot,
  msg: Message
): Promise<void> => {
  const chatId: number = msg.chat.id;

  __log__("Handling photo compression", { chat_id: chatId });

  await send_message(bot, chatId, `Compressing...`);

  const fileId: string = msg.photo?.[msg.photo.length - 1]?.file_id as string;

  if (!fileId) {
    await bot.sendMessage(chatId, "No photo found, send a photo to compress.");
    return;
  }

  try {
    const fileLink = await bot.getFileLink(fileId);
    const response = await fetch(fileLink);

    if (!response.ok) {
      await handleError(
        bot,
        chatId,
        `Failed to fetch the photo (${response.status} ${response.statusText})`
      );
      return;
    }

    const file = await bot.getFile(fileId);
    const filePath = file.file_path;
    const fileType = filePath?.split(".").pop()?.toLowerCase() as AllowedFormat;

    if (!fileType) {
      await handleInvalidFileType(bot, chatId);
      return;
    }

    if (!FORMATS.includes(fileType)) {
      await handleUnsupportedFileType(bot, chatId, fileType);
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const compressedBuffer = await sharp(arrayBuffer)
      .toFormat(fileType, { quality: 60, compressionLevel: 6 })
      .toBuffer();

    await bot.sendDocument(
      chatId,
      compressedBuffer,
      {},
      { filename: `compressed` }
    );

    await bot.sendMessage(chatId, "New operation? /start");
    __log__("Photo compressed and sent", { chat_id: chatId, fileType });
    userState.set(chatId, {});
  } catch (error) {
    await handleCompressionError(bot, chatId, error);
  }
};

const handleInvalidFileType = async (bot: TelegramBot, chatId: number) => {
  userState.set(chatId, {});
  await bot.sendMessage(chatId, "Failed to get file type");
  __log__("File type is empty", { chat_id: chatId });
};

const handleUnsupportedFileType = async (
  bot: TelegramBot,
  chatId: number,
  fileType: AllowedFormat
) => {
  userState.set(chatId, {});
  await bot.sendMessage(
    chatId,
    "Unsupported file type. Contact the bot owner if you wish to support this file type."
  );
  __log__("File type is not supported", {
    chat_id: chatId,
    file_type: fileType,
  });
};

const handleCompressionError = async (
  bot: TelegramBot,
  chatId: number,
  error: any
) => {
  console.error("Error while compressing the photo: ", error);
  __log__("Error while compressing the photo", { chat_id: chatId, error });
  await send_message(
    bot,
    chatId,
    "An error occurred while compressing your photo. Please try again."
  );
  userState.set(chatId, {});
};

const handleError = async (
  bot: TelegramBot,
  chatId: number,
  errorMessage: string
) => {
  userState.set(chatId, {});
  await bot.sendMessage(chatId, errorMessage);
  __log__(errorMessage, { chat_id: chatId });
};
