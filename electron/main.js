const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { exec } = require("child_process");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});
const { getAccessToken } = require("./services/auth-service");
const planesService = require("./services/plane-service");
const locationService = require("./services/location-service");

let win;

function createWindow() {
  // Create the browser window in kiosk mode
  win = new BrowserWindow({
    width: 800,
    height: 480,
    backgroundColor: "#ffffff",
    frame: false, // Remove window frame
    fullscreen: false, // Start out of fullscreen to allow for entering address
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load and run localhost:4200 in electron window
  win.loadURL("http://localhost:4200");

  // Handler to get OpenSky API token
  ipcMain.handle("auth:getToken", async () => {
    return await getAccessToken();
  });

  // Handler to get aircraft overhead using OpenSky API
  ipcMain.handle("planes:get", async (_, token, latitude, longitude) => {
    return planesService.getPlanesOverhead(token, latitude, longitude);
  });

  // Handler to call AeroAPI to get more details on an aircraft
  ipcMain.handle("planes:getInfo", async (_, callSign) => {
    return planesService.getFlightInfo(callSign);
  });

  // Handler to call MapBox API and return latitude/longitude coordinates for an address
  ipcMain.handle(
    "location:getCoordinates",
    async (_, number, street, city, zipCode) => {
      return locationService.getCoordinates(number, street, city, zipCode);
    },
  );

  /**
   * Method for toggling in/out of fullscreen. Needed bc Linux is annoying about
   * on-screen keyboards and it won't show up in fullscreen. There's prob a way
   * around this but I tried several and it didn't work and can't be bothered to
   * try more rn
   */
  ipcMain.on("toggle-fullscreen", () => {
    if (!win) return;

    if (win.isFullScreen()) {
      win.setFullScreen(false);
      win.setSize(800, 480);
      win.center();
    } else {
      win.setFullScreen(true);
    }
  });

  // Event when the window is closed
  win.on("closed", function () {
    win = null;
  });
}

// Create window on electron intialization
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function () {
  // On macOS specific close process
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (win === null) {
    createWindow();
  }
});
