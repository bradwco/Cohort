import { app, BrowserWindow } from "electron";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { createMainWindow } from "./windows/main_window";
import { createOverlayWindow } from "./windows/overlay_window";
import { registerIpcHandlers, resolveAuthCallback } from "./ipc";
import { startAgentServer, stopAgentServer } from "./agent";
import { destroyMqtt, setDockedCallback, setOfflineCallback } from "./mqtt";
import { destroyHardwareSerial } from "./hardware_serial";

// Load .env into process.env for the main process
function loadEnv(): void {
  try {
    const envPath = resolve(__dirname, "../../.env");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex < 0) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const val = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    console.warn(
      "[env] failed to load .env:",
      e instanceof Error ? e.message : String(e),
    );
  }
}

loadEnv();

const PROTOCOL = "cohort";

// Register cohort:// as the default handler so email magic links and OAuth
// callbacks open back in the app instead of the system browser.
if (process.defaultApp) {
  // Dev: electron is launched as "electron .", so we need to pass the script path
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      resolve(process.argv[1]!),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Windows/Linux require a single-instance lock so deep links from a second
// launch are forwarded to the already-running window instead of opening a dupe.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const deepLink = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (deepLink) sendDeepLink(deepLink);

    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  let mainWin: BrowserWindow | null = null;
  let overlayWin: BrowserWindow | null = null;

  function showOverlay(): void {
    if (overlayWin && !overlayWin.isDestroyed()) {
      mainWin?.hide();
      overlayWin.show();
      overlayWin.focus();
      return;
    }
    mainWin?.hide();
    overlayWin = createOverlayWindow();
    overlayWin.on("closed", () => {
      overlayWin = null;
      mainWin?.show();
      mainWin?.focus();
    });
  }

  function closeOverlay(): void {
    if (overlayWin && !overlayWin.isDestroyed()) overlayWin.close();
  }

app.whenReady().then(() => {
  registerIpcHandlers({
    onResumeSession: showOverlay,
  });

  startAgentServer();

  mainWin = createMainWindow();

  setDockedCallback(() => {
    showOverlay();
  });

  setOfflineCallback(() => {
    closeOverlay();
  });

  app.on("activate", () => {
    if (!mainWin || mainWin.isDestroyed()) mainWin = createMainWindow();
    else {
      mainWin.show();
      mainWin.focus();
    }
  });
});

  app.on("window-all-closed", () => {
    destroyMqtt();
    destroyHardwareSerial();
    stopAgentServer();
    if (process.platform !== "darwin") app.quit();
  });
}

// macOS: deep links arrive via open-url while the app is already running
app.on("open-url", (event, url) => {
  event.preventDefault();
  sendDeepLink(url);
});

function sendDeepLink(url: string) {
  if (url.startsWith("cohort://")) {
    resolveAuthCallback(url);
  }
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("app:deep-link", url);
  }
}
