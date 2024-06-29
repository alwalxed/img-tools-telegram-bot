import sharp from "sharp";
import { FORMATS, OPERATIONS } from "../consts";

export type AllowedFormat = (typeof FORMATS)[number];
type AllowedOperation = (typeof OPERATIONS)[number];
export type UserState = {
  chosenOperation?: AllowedOperation;
  chosenFormat?: keyof sharp.FormatEnum;
};
