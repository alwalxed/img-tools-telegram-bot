"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_server_1 = require("@hono/node-server");
const hono_1 = require("hono");
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const dotenv = __importStar(require("dotenv"));
const sharp_1 = __importDefault(require("sharp"));
const constants_1 = require("./constants");
dotenv.config();
const port = 3000;
const token = process.env.TOKEN;
const app = new hono_1.Hono();
const bot = new node_telegram_bot_api_1.default(token, { polling: true });
let chosenFormat = "";
const sendFormatSelection = (chatId) => {
    bot.sendMessage(chatId, constants_1.arabicLanguage.chooseFormat, {
        reply_markup: {
            inline_keyboard: constants_1.supportedFormats.map((format) => [
                { text: format.toUpperCase(), callback_data: format },
            ]),
        },
    });
};
bot.on("text", (msg) => {
    const chatId = msg.chat.id;
    sendFormatSelection(chatId);
    chosenFormat = "";
});
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, constants_1.arabicLanguage.help);
});
bot.on("callback_query", (callbackQuery) => {
    const msg = callbackQuery.message;
    chosenFormat = callbackQuery.data;
    bot.sendMessage(msg.chat.id, `اخترت ${chosenFormat === null || chosenFormat === void 0 ? void 0 : chosenFormat.toUpperCase()} ✅\nارسل الصورة 📷`);
});
bot.on("photo", async (msg) => {
    var _a, _b;
    const chatId = msg.chat.id;
    if (!chosenFormat) {
        bot.sendMessage(chatId, "الرجاء اختيار الصيغة أولا ❗️");
        sendFormatSelection(chatId);
        return;
    }
    bot.sendMessage(chatId, `نعمل على تغيير صورتك إلى ${chosenFormat.toUpperCase()} \n انتظر قليلا ⏳`);
    const fileId = (_b = (_a = msg.photo) === null || _a === void 0 ? void 0 : _a[msg.photo.length - 1]) === null || _b === void 0 ? void 0 : _b.file_id;
    try {
        const fileLink = await bot.getFileLink(fileId);
        const response = await fetch(fileLink);
        if (!response.ok) {
            throw new Error(`Failed to fetch image (${response.status} ${response.statusText})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const format = chosenFormat;
        const convertedBuffer = await (0, sharp_1.default)(buffer)
            .toFormat(format, { quality: 100 })
            .toBuffer();
        bot.sendDocument(chatId, convertedBuffer);
        bot.sendMessage(chatId, `تفضل صورتك بصيغة ${chosenFormat.toUpperCase()} 🖼️\nلو احتجت شيئا آخر فأرسل نقطة\nللتواصل: x.com/alwalxed`);
        // Reset chosen format
        chosenFormat = "";
    }
    catch (error) {
        bot.sendMessage(chatId, "An error occurred while converting your image. Please try again.");
        console.error("Error converting image:", error);
    }
});
(0, node_server_1.serve)({
    fetch: app.fetch,
    port,
});
console.log(`Server is running on port ${port}`);
