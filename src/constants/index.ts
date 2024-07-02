import { envGetValue } from "../utils/env";
import { UserState } from "../types";

export const PORT = parseInt(envGetValue("port"));
export const TOKEN = envGetValue("token");

export const userState: Map<number, UserState> = new Map();

export const supportedFormats = ["jpg", "png", "webp"] as const;

export const availableOperations = ["convert", "compress"] as const;

export const levelsOfCompression = ["low", "medium", "high"] as const;
