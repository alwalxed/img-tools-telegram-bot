import {
  availableOperations,
  levelsOfCompression,
  supportedFormats,
} from "../constants";

export type CompressionLevel = (typeof levelsOfCompression)[number];
export type Format = (typeof supportedFormats)[number];
export type Operation = (typeof availableOperations)[number];

export type UserState = {
  step:
    | "startCommand"
    | "operationSelection"
    | "conversionFormatSelection"
    | "compressionLevelSelection"
    | "conversion"
    | "compression"
    | "successfulOperation";
  chosenFormat?: Format;
  chosenLevel?: CompressionLevel;
};
