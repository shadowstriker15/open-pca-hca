"use strict";

import { app, protocol, BrowserWindow, ipcMain } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
import fs from "fs";
import path from "path";
// import DataFrame from 'dataframe-js';

const isDevelopment = process.env.NODE_ENV !== "production";
const SECRET_PATH = '../secrets.json';

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 700,
    height: 500,
    // maximizable: false,
    webPreferences: {
      // webSecurity: false,
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION as unknown as boolean,
      contextIsolation: true,//!process.env.ELECTRON_NODE_INTEGRATION,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string);
    if (!process.env.IS_TEST) win.webContents.openDevTools();
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    win.loadURL("app://./index.html");
  }
}

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS);
    } catch (e) {
      console.error("Vue Devtools failed to install:", e.toString());
    }
  }
  createWindow();
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}

ipcMain.handle('getSecrets', async (event, args) => {
  if (fs.existsSync(path.resolve(__dirname, SECRET_PATH))) {
    let secrets = fs.readFileSync(path.resolve(__dirname, SECRET_PATH), 'utf8');
    return JSON.parse(secrets);
  } else return {};
})

// ipcMain.handle('getAlbumName', async (event, args) => {
//   var spotifyApi = new SpotifyWebApi();
//   return await spotifyApi.search(`artist: ${args.artist_name} track: ${args.song_title}`, ["track"])
// })

ipcMain.handle('updateSecrets', async (event, args) => {
  fs.writeFileSync(path.resolve(__dirname, SECRET_PATH), JSON.stringify(args.secrets));
})

ipcMain.handle('readFile', async (event, args) => {
  fs.readFile(args.label, 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }

    // const df = new DataFrame(args.runs[0], args.label);
    // df.show(3);
    // console.log('label: ', args.label)
    // DataFrame.fromCSV(args.label).then(df => {
    //   df.show();
    // }).catch((response) => {
    //   console.log('BAD!', response)
    // })
  });
})
