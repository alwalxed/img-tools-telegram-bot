import { serve } from "@hono/node-server";
import { Hono } from "hono";
import TelegramBot, { Message, CallbackQuery } from "node-telegram-bot-api";
import dotenv from "dotenv";
import sharp from "sharp";
import fetch from "node-fetch";
import { arabicLanguage, supportedFormats } from "./constants";

dotenv.config();

const port: number = 3000;
const token: string = process.env.TOKEN as string;

const app = new Hono();
const bot = new TelegramBot(token, { polling: true });

let chosenFormat: string | undefined = "";

const sendFormatSelection = (chatId: number) => {
  bot.sendMessage(chatId, arabicLanguage.chooseFormat, {
    reply_markup: {
      inline_keyboard: supportedFormats.map((format) => [
        { text: format.toUpperCase(), callback_data: format },
      ]),
    },
  });
};

bot.on("text", (msg: Message) => {
  const chatId: number = msg.chat.id;
  sendFormatSelection(chatId);
  chosenFormat = "";
});

bot.onText(/\/help/, (msg: Message) => {
  const chatId: number = msg.chat.id;
  bot.sendMessage(chatId, arabicLanguage.help);
});

bot.on("callback_query", (callbackQuery: CallbackQuery) => {
  const msg: Message = callbackQuery.message as Message;
  chosenFormat = callbackQuery.data;
  bot.sendMessage(
    msg.chat.id,
    `اخترت ${chosenFormat?.toUpperCase()} ✅\nارسل الصورة 📷`
  );
});

bot.on("photo", async (msg: Message) => {
  const chatId: number = msg.chat.id;
  if (!chosenFormat) {
    bot.sendMessage(chatId, "الرجاء اختيار الصيغة أولا ❗️");
    sendFormatSelection(chatId);
    return;
  }

  bot.sendMessage(
    chatId,
    `نعمل على تغيير صورتك إلى ${chosenFormat.toUpperCase()} \n انتظر قليلا ⏳`
  );

  const fileId: string = msg.photo?.[msg.photo.length - 1]?.file_id as string;
  try {
    const fileLink = await bot.getFileLink(fileId);
    const response = await fetch(fileLink);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image (${response.status} ${response.statusText})`
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const format = chosenFormat as keyof sharp.FormatEnum;

    const convertedBuffer = await sharp(buffer)
      .toFormat(format, { quality: 100 })
      .toBuffer();

    bot.sendDocument(chatId, convertedBuffer);
    bot.sendMessage(
      chatId,
      `تفضل صورتك بصيغة ${chosenFormat.toUpperCase()} 🖼️\nلو احتجت شيئا آخر فأرسل نقطة\nللتواصل: x.com/alwalxed`
    );
    // Reset chosen format
    chosenFormat = "";
  } catch (error) {
    bot.sendMessage(
      chatId,
      "An error occurred while converting your image. Please try again."
    );
    console.error("Error converting image:", error);
  }
});

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server is running on port ${port}`);
