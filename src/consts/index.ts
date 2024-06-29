import { UserState } from "../types";

export const FORMATS = ["jpg", "png", "webp"] as const;

export const OPERATIONS = ["convert", "compress"] as const;

export const port = 3000;

export const userState: Map<number, UserState> = new Map();

export const lastUpdateIdFile = "last_update_id.txt";
