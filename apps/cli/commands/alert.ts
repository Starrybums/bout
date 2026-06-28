import { sendTerminalAlert } from "../../../src/tools/notificationTool";

export function alertTestCommand(): void {
  sendTerminalAlert({
    title: "Test alert",
    message:
      "This is a test alert from BOUT. If you can read this, the terminal alert " +
      "channel is working. SMS/Telegram/Discord channels are planned for a future release.",
    severity: "info",
  });
}
