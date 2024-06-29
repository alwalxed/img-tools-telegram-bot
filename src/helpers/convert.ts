import TelegramBot, { Message } from "node-telegram-bot-api";
import { FORMATS, userState } from "../consts";
import { __log__ } from "../utils/log";
import sharp from "sharp";
import { AllowedFormat } from "../types";
import { send_message } from "./message";

export const convertHandler = async (
  bot: TelegramBot,
  msg: Message
): Promise<void> => {
  const chatId: number = msg.chat.id;
  const user = userState.get(chatId);
  const format = user?.chosenFormat as AllowedFormat;
  const fileId: string = msg.photo?.[msg.photo.length - 1]?.file_id as string;

  if (!fileId) {
    await bot.sendMessage(chatId, "No photo found, send a photo to convert.");
    return;
  }

  try {
    const fileLink = await bot.getFileLink(fileId);
    const response = await fetch(fileLink);

    if (!response.ok) {
      await bot.sendMessage(chatId, "Failed to fetch the photo");
      __log__("Failed to fetch the photo", { chat_id: chatId });
      throw new Error(
        `Failed to fetch the photo (${response.status} ${response.statusText})`
      );
    }

    const file = await bot.getFile(fileId);
    const filePath = file.file_path;
    const fileType = filePath?.split(".").pop()?.toLowerCase() as AllowedFormat;

    __log__("Handling photo conversion", { chat_id: chatId });

    // Validate file type
    if (!fileType) {
      await handleInvalidFileType(bot, chatId);
      return;
    }

    if (format.toLowerCase() === fileType) {
      await handleSameFormat(bot, chatId, fileType);
      return;
    }

    if (!FORMATS.includes(fileType)) {
      await handleUnsupportedFileType(bot, chatId, fileType);
      return;
    }

    // Passed initial checks, send the conversion message
    await send_message(bot, chatId, `Converting to ${format.toUpperCase()}...`);

    // Convert and send the document
    const arrayBuffer = await response.arrayBuffer();
    const convertedBuffer = await sharp(arrayBuffer)
      .toFormat(format)
      .toBuffer();

    await bot.sendDocument(
      chatId,
      convertedBuffer,
      {},
      {
        filename: `converted`,
      }
    );

    await bot.sendMessage(chatId, "New operation? /start");
    __log__("Photo converted and sent", { chat_id: chatId, format });
    userState.set(chatId, {});
  } catch (error) {
    await handleConversionError(bot, chatId, error);
  }
};

const handleInvalidFileType = async (bot: TelegramBot, chatId: number) => {
  userState.set(chatId, {});
  await bot.sendMessage(chatId, "File is corrupted, send /start again");
  __log__("File type is empty", { chat_id: chatId });
};

const handleSameFormat = async (
  bot: TelegramBot,
  chatId: number,
  fileType: AllowedFormat
) => {
  userState.set(chatId, {});
  await bot.sendMessage(
    chatId,
    `Already ${fileType.toUpperCase()}, send /start for a new operation`
  );
  __log__("File type is the same as the format", {
    chat_id: chatId,
    file_type: fileType,
  });
};

const handleUnsupportedFileType = async (
  bot: TelegramBot,
  chatId: number,
  fileType: AllowedFormat
) => {
  userState.set(chatId, {});
  await bot.sendMessage(
    chatId,
    "Unsupported file type. Contact @alwalxed to add support!\nSend /start for a new operation"
  );
  __log__("File type is not supported", {
    chat_id: chatId,
    file_type: fileType,
  });
};

const handleConversionError = async (
  bot: TelegramBot,
  chatId: number,
  error: any
) => {
  console.error("Error while converting the photo: ", error);
  __log__("Error while converting the photo", { chat_id: chatId, error });
  await send_message(bot, chatId, "Failed conversion. Please /start again.");
  userState.set(chatId, {});
};
