import TelegramBot, { Message } from "node-telegram-bot-api";
import { userState } from "../consts";
import { log } from "../utils/log";
import { sendMessage } from "../actions/send-message";
import { sendFormatSelection } from "../actions/send-format-selection";
import sharp from "sharp";

export const handlePhotoUpload = async (
  bot: TelegramBot,
  msg: Message
): Promise<void> => {
  const chatId: number = msg.chat.id;
  const user = userState.get(chatId);

  log("Handling photo upload", { chat_id: chatId });

  if (!user || !user.chosenFormat) {
    await sendMessage(bot, chatId, "Please select a format first ❗️");
    await sendFormatSelection(bot, chatId);
    return;
  }

  await sendMessage(
    bot,
    chatId,
    `Working on converting your photo to ${user.chosenFormat.toUpperCase()} \nWait a little bit ⏳`
  );

  try {
    const fileId: string = msg.photo?.[msg.photo.length - 1]?.file_id as string;
    const fileLink = await bot.getFileLink(fileId);
    const response = await fetch(fileLink);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch the photo (${response.status} ${response.statusText})`
      );
    }

    const format = user.chosenFormat as keyof sharp.FormatEnum;

    const convertedBuffer = await sharp(await response.arrayBuffer())
      .toFormat(format, { quality: 100, compressionLevel: 0 })
      .toBuffer();

    await bot.sendDocument(chatId, convertedBuffer);
    log("Photo converted and sent", { chat_id: chatId, format });
    await sendFormatSelection(bot, chatId);
    userState.set(chatId, {});
  } catch (error) {
    console.error("Error while converting the photo: ", error);
    log("Error while converting the photo", { chat_id: chatId, error });
    await sendMessage(
      bot,
      chatId,
      "An error occurred while converting your photo. Please try again."
    );
  }
};
