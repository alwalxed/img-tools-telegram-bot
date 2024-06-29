import fs from "fs";
import { log } from "./log";
import { lastUpdateIdFile } from "../consts";

export const saveLastUpdateId = (updateId: number) => {
  fs.writeFileSync(lastUpdateIdFile, updateId.toString());
  log("Saved last update ID", { update_id: updateId });
};

export const loadLastUpdateId = (): number => {
  if (fs.existsSync(lastUpdateIdFile)) {
    const updateId = parseInt(fs.readFileSync(lastUpdateIdFile).toString(), 10);
    log("Loaded last update ID", { update_id: updateId });
    return updateId;
  }
  return 0;
};
