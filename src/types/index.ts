import sharp from "sharp";
import { FORMATS } from "../consts";

export type AllowedFormat = (typeof FORMATS)[number];
export type UserState = {
  chosenFormat?: keyof sharp.FormatEnum;
};
