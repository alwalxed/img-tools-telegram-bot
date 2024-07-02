import { log } from "console";
import sharp from "sharp";
import { CompressionLevel, Format } from "../types";

export const compress = async (
  arrayBuffer: ArrayBuffer,
  format: Format,
  level: CompressionLevel
): Promise<Buffer> => {
  try {
    return await sharp(arrayBuffer)
      .toFormat(format, getOptions(level))
      .toBuffer();
  } catch (error) {
    log("Error while compressing the photo: ", error);
    throw new Error(`Image compression failed: ${error}`);
  }
};

function getOptions(level: CompressionLevel) {
  switch (level) {
    case "high":
      return { quality: 25, compressionLevel: 2.5 };
    case "medium":
      return { quality: 50, compressionLevel: 5 };
    case "low":
      return { quality: 80, compressionLevel: 8 };
    default:
      return { quality: 100, compressionLevel: 0 };
  }
}
