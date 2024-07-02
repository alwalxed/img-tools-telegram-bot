import TelegramBot from "node-telegram-bot-api";
import { availableOperations, userState } from "../constants";
import { UserState } from "../types";

export const handleStartCommand = async (
  bot: TelegramBot,
  chatId: number,
  currentState: UserState
) => {
  await bot.sendMessage(chatId, "What do you want to do?", {
    reply_markup: {
      keyboard: availableOperations.map((operation) => [{ text: operation }]),
      force_reply: true,
      resize_keyboard: true,
    },
  });
  userState.set(chatId, {
    ...currentState,
    step: "operationSelection",
  });
};
