import { serve } from "@hono/node-server";
import { Hono } from "hono";
import TelegramBot, { Message, CallbackQuery } from "node-telegram-bot-api";
import * as dotenv from "dotenv";
import sharp from "sharp";
import { arabicLanguage, supportedFormats } from "./constants";

dotenv.config();

const port = Math.floor(Math.random() * 65535) + 10000;
const token: string = process.env.TOKEN as string;

const app = new Hono();
const bot = new TelegramBot(token, { polling: true });

const userState: Map<number, { chosenFormat?: string }> = new Map();

const sendFormatSelection = (chatId: number) => {
  bot.sendMessage(chatId, arabicLanguage.chooseFormat, {
    reply_markup: {
      keyboard: supportedFormats.map((format) => [
        { text: format.toUpperCase() },
      ]),
      resize_keyboard: true,
    },
  });
};

bot.onText(/\/start/, (msg: Message) => {
  const chatId: number = msg.chat.id;
  sendFormatSelection(chatId);
  userState.set(chatId, {});
});

bot.onText(/\b(jpeg|webp|png)\b/i, async (msg: Message) => {
  const chatId: number = msg.chat.id;
  const chosenFormat = msg.text;

  userState.set(chatId, { chosenFormat });

  await bot.sendMessage(
    chatId,
    `اخترت ${chosenFormat?.toUpperCase()} ✅\nأرسل الصورة 📷`,
    { reply_markup: { remove_keyboard: true } }
  );
});

bot.on("photo", async (msg: Message) => {
  const chatId: number = msg.chat.id;
  const user = userState.get(chatId);

  if (!user || !user.chosenFormat) {
    bot.sendMessage(chatId, "الرجاء اختيار الصيغة أولا ❗️");
    sendFormatSelection(chatId);
    return;
  }

  await bot.sendMessage(
    chatId,
    `نعمل على تغيير صورتك إلى ${user.chosenFormat.toUpperCase()} \n انتظر قليلا ⏳`
  );

  const fileId: string = msg.photo?.[msg.photo.length - 1]?.file_id as string;
  try {
    const fileLink = await bot.getFileLink(fileId);
    const response = await fetch(fileLink);
    if (!response.ok) {
      throw new Error(
        `فشل في جلب الصورة (${response.status} ${response.statusText})`
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const format = user.chosenFormat as keyof sharp.FormatEnum;

    const convertedBuffer = await sharp(buffer)
      .toFormat(format, { quality: 100, compressionLevel: 0 })
      .toBuffer();

    await bot.sendDocument(chatId, convertedBuffer);
    bot.sendMessage(chatId, arabicLanguage.chooseFormat, {
      reply_markup: {
        keyboard: supportedFormats.map((format) => [
          { text: format.toUpperCase() },
        ]),
        resize_keyboard: true,
      },
    });
    userState.set(chatId, {});
  } catch (error) {
    await bot.sendMessage(
      chatId,
      "حدث خطأ أثناء تحويل صورتك. الرجاء المحاولة مرة أخرى."
    );
    console.error("خطأ في تحويل الصورة:", error);
  }
});

serve({
  fetch: app.fetch,
  port,
});

console.log(`الخادم يعمل على المنفذ ${port}`);
