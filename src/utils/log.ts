import fs from "fs";

export const log = (message: string, data?: any) => {
  const logMessage = data ? `${message}: ${JSON.stringify(data)}` : message;
  console.log(logMessage);
  fs.appendFileSync(
    "server.log",
    `${new Date().toISOString()} - ${logMessage}\n`
  );
};
