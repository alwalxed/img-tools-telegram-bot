import sharp from "sharp";
import { Format } from "../types";

export const convert = async (
  arrayBuffer: ArrayBuffer,
  format: Format
): Promise<Buffer> => {
  try {
    return await sharp(arrayBuffer).toFormat(format).toBuffer();
  } catch (error) {
    console.error("Error while converting the photo: ", error);
    throw new Error(`Image conversion failed: ${error}`);
  }
};
