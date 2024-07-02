import * as dotenv from "dotenv";

export function envGetValue(key: "token" | "port"): string {
  dotenv.config();
  let value: string | undefined;

  switch (key) {
    case "token":
      value = process.env.TELEGRAM_BOT_TOKEN as string;
      if (!value) {
        throw new Error("AI token is missing.");
      }
      break;
    case "port":
      value = process.env.VM_PORT as string;
      if (!value) {
        throw new Error("Port is missing.");
      }
      break;
    default:
      throw new Error(`Unsupported key: ${key}`);
  }

  return value;
}
