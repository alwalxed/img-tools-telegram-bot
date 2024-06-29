import { serve } from "@hono/node-server";
import { Hono } from "hono";
import TelegramBot, { Message } from "node-telegram-bot-api";
import * as dotenv from "dotenv";
import sharp from "sharp";
import fs from "fs";
import { exec } from "child_process";

dotenv.config();

const port = 3001;
const token: string = process.env.TOKEN as string;

if (!token) {
  throw new Error("Telegram bot token is missing.");
}

const app = new Hono();
const bot = new TelegramBot(token, {
  webHook: { port: port },
});

type UserState = {
  chosenFormat?: AllowedFormat;
};

const userState: Map<number, UserState> = new Map();
const lastUpdateIdFile = "last_update_id.txt";
let lastUpdateId: number = 0;

export const FORMATS = ["jpg", "png", "webp"] as const;
type AllowedFormat = (typeof FORMATS)[number];

const log = (message: string, data?: any) => {
  const logMessage = data ? `${message}: ${JSON.stringify(data)}` : message;
  console.log(logMessage);
  fs.appendFileSync(
    "server.log",
    `${new Date().toISOString()} - ${logMessage}\n`
  );
};

const sendMessage = async (chatId: number, text: string, options = {}) => {
  try {
    log("Sending message", { chat_id: chatId, text });
    await bot.sendMessage(chatId, text, options);
  } catch (error) {
    console.error("Error sending message: ", error);
    log("Error sending message", { chat_id: chatId, error });
  }
};

const sendFormatSelection = async (chatId: number): Promise<void> => {
  log("Sending format selection message", { chat_id: chatId });
  await sendMessage(chatId, "Choose the format you want to convert it to 🖼️", {
    reply_markup: {
      keyboard: FORMATS.map((format) => [{ text: format.toUpperCase() }]),
      resize_keyboard: true,
    },
  });
};

const handleStartCommand = async (msg: Message): Promise<void> => {
  const chatId: number = msg.chat.id;
  log("Handling /start command", { chat_id: chatId });
  await sendFormatSelection(chatId);
  userState.set(chatId, {});
};

const handleFormatSelection = async (msg: Message): Promise<void> => {
  const chatId: number = msg.chat.id;
  const chosenFormat = (msg.text?.toLowerCase() as AllowedFormat) || undefined;
  log("Handling format selection", { chat_id: chatId, chosenFormat });

  if (!chosenFormat || !FORMATS.includes(chosenFormat)) {
    await sendMessage(
      chatId,
      "Please select a valid format: JPG, PNG, or WEBP."
    );
    await sendFormatSelection(chatId);
    return;
  }

  userState.set(chatId, { chosenFormat });
  await sendMessage(
    chatId,
    `You selected ${chosenFormat.toUpperCase()} ✅\nNow, send a photo 📷`,
    {
      reply_markup: { remove_keyboard: true },
    }
  );
};

const handlePhotoUpload = async (msg: Message): Promise<void> => {
  const chatId: number = msg.chat.id;
  const user = userState.get(chatId);

  log("Handling photo upload", { chat_id: chatId });

  if (!user || !user.chosenFormat) {
    await sendMessage(chatId, "Please select a format first ❗️");
    await sendFormatSelection(chatId);
    return;
  }

  try {
    const fileId: string = msg.photo?.[msg.photo.length - 1]?.file_id as string;
    const fileLink = await bot.getFileLink(fileId);
    const convertedBuffer = await convertPhotoToFormat(
      fileLink,
      user.chosenFormat
    );

    await sendConvertedPhoto(chatId, convertedBuffer);
    await sendFormatSelection(chatId);
    userState.set(chatId, {});
  } catch (error) {
    console.error("Error while converting the photo: ", error);
    log("Error while converting the photo", { chat_id: chatId, error });
    await sendMessage(
      chatId,
      "An error occurred while converting your photo. Please try again."
    );
    await handleCriticalServerError(error);
  }
};

const convertPhotoToFormat = async (
  fileLink: string,
  format: AllowedFormat
): Promise<Buffer> => {
  const response = await fetch(fileLink);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch the photo (${response.status} ${response.statusText})`
    );
  }

  return await sharp(await response.arrayBuffer())
    .toFormat(format, { quality: 100, compressionLevel: 0 })
    .toBuffer();
};

const sendConvertedPhoto = async (
  chatId: number,
  convertedBuffer: Buffer
): Promise<void> => {
  await bot.sendDocument(chatId, convertedBuffer);
  log("Photo converted and sent", { chat_id: chatId });
};

const saveLastUpdateId = (updateId: number) => {
  fs.writeFileSync(lastUpdateIdFile, updateId.toString());
  log("Saved last update ID", { update_id: updateId });
};

const loadLastUpdateId = (): number => {
  if (fs.existsSync(lastUpdateIdFile)) {
    const updateId = parseInt(fs.readFileSync(lastUpdateIdFile).toString(), 10);
    log("Loaded last update ID", { update_id: updateId });
    return updateId;
  }
  return 0;
};

const handleCriticalServerError = async (error: any) => {
  console.error("Critical server error occurred:", error);
  log("Critical server error occurred", { error });

  // Perform cleanup and recovery actions
  try {
    // Add your cleanup actions here (if needed)
  } catch (cleanupError) {
    console.error("Error during cleanup:", cleanupError);
    log("Error during cleanup", { cleanup_error: cleanupError });
  }

  // Restart server using PM2
  try {
    const restartServerCommand = "pm2 restart all";
    await executeShellCommand(restartServerCommand);

    log("Server restarted successfully");
  } catch (restartError) {
    console.error("Error restarting server:", restartError);
    log("Error restarting server", { error: restartError });
  }
};

const executeShellCommand = (command: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

// Define the /update endpoint
app.post("/update", async (c) => {
  try {
    // Handle updates here (e.g., process JSON payloads, update bot logic)
    const updateData = c.req.parseBody();
    console.log("Received update:", updateData);
    return c.status(200);
  } catch (error) {
    console.error("Error handling update:", error);
    return c.status(500);
  }
});

// Create server with error handling for EADDRINUSE
const server = serve({ fetch: app.fetch, port });
server.on("error", async (error: Error) => {
  console.error("Server error occurred:", error);
  log("Server error occurred", { error });
  // Handle critical server error
  await handleCriticalServerError(error);
});

lastUpdateId = loadLastUpdateId();

bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;

    log("Received message", { chat_id: chatId });

    if (msg.text?.startsWith("/start")) {
      await handleStartCommand(msg);
    } else if (FORMATS.includes(msg.text?.toLowerCase() as AllowedFormat)) {
      await handleFormatSelection(msg);
    } else if (msg.photo) {
      await handlePhotoUpload(msg);
    }

    saveLastUpdateId(msg.message_id); // Save last update ID after processing the message
  } catch (error) {
    console.error("Error handling message:", error);
    log("Error handling message", { chat_id: msg.chat.id, error });
    // Handle error gracefully, e.g., send a message to the user or log it
  }
});

bot.on("polling_error", async (error) => {
  console.log({ error });
  log("Polling error", { error });
  // Handle critical error to restart server
  await handleCriticalServerError(error);
});

bot.on("webhook_error", async (error) => {
  console.log({ error });
  log("Webhook error", { error });
  // Handle critical error to restart server
  await handleCriticalServerError(error);
});

console.log(`Server is running on port ${port}`);
log("Server started", { port });
