"use strict";

import { app, protocol, BrowserWindow, ipcMain, nativeTheme, Menu, dialog } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
import fs from "fs";
import path from "path";
// import DataFrame from 'dataframe-js';
import { Store } from '@/utils/Store';
import { DefaultConfigs } from "./defaultConfigs";

const isDevelopment = process.env.NODE_ENV !== "production";
const SECRET_PATH = '../secrets.json';

let win: BrowserWindow | null

const store = new Store({
  configName: 'user-preferences',
  defaults: {
    theme: 'system',
    graphConfigs: DefaultConfigs
  }
});

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
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

  nativeTheme.themeSource = store.get("theme");

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

app.whenReady().then(() => {
  createMenu();
});

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
  protocol.registerFileProtocol('open-protocol', (request, callback) => {
    const url = request.url.replace('open-protocol://', '')
    try {
      return callback(url)
    }
    catch (error) {
      console.error(error)
      return callback('404')
    }
  });
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

// Store handlers
ipcMain.handle('store:get', (event, key) => {
  return store.get(key);
})

ipcMain.handle('store:set', (event, key, value) => {
  store.set(key, value);
})

ipcMain.handle('store:getDirectory', (event, directory: string[]) => {
  return store.getDirectory(directory);
})

// Session
ipcMain.handle('session:createSessionDir', (event, session) => {
  return store.createSessionDir(session);
})

ipcMain.handle('session:saveSessionFile', (event, sessionObj, fileName) => {
  return store.saveSessionFile(sessionObj, fileName);
})

ipcMain.handle('session:deleteSession', (event, name) => {
  return store.deleteSession(name);
})

// Export handlers
ipcMain.handle('session:exportData', async (event, session) => {
  const result = await dialog.showOpenDialog(win as BrowserWindow, {
    properties: ['openDirectory']
  })
  if (result.filePaths.length) return store.exportData(session, result.filePaths[0]);

})


// Theme handlers
ipcMain.handle('theme:toggle', () => {
  const theme = nativeTheme.themeSource;
  if (theme === 'system') nativeTheme.themeSource = 'dark'
  else if (theme === 'dark') nativeTheme.themeSource = 'light'
  else if (theme === 'light') nativeTheme.themeSource = 'system'
  store.set('theme', nativeTheme.themeSource)
  return nativeTheme.themeSource;
})

ipcMain.handle('theme:is-dark', () => {
  return nativeTheme.shouldUseDarkColors
})

function createMenu() {
  const template = getTemplate();
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function getTemplate() {
  if (isDevelopment) {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New session',
            click() {
              win!.webContents.send("changeRouteTo", "/")
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            role: 'toggleDevTools'
          },
          {
            role: 'reload'
          },
          {
            type: 'separator'
          },
          {
            role: 'resetzoom'
          },
          {
            role: 'zoomin'
          },
          {
            role: 'zoomout'
          },
          {
            type: 'separator'
          },
          {
            role: 'togglefullscreen'
          }
        ]
      },

      {
        role: 'window',
        submenu: [
          {
            role: 'minimize'
          },
          {
            role: 'close'
          }
        ]
      }
    ]
    return template;
  } else {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New session',
            click() {
              win!.webContents.send("changeRouteTo", "/")
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            role: 'reload'
          },
          {
            type: 'separator'
          },
          {
            role: 'resetzoom'
          },
          {
            role: 'zoomin'
          },
          {
            role: 'zoomout'
          },
          {
            type: 'separator'
          },
          {
            role: 'togglefullscreen'
          }
        ]
      },

      {
        role: 'window',
        submenu: [
          {
            role: 'minimize'
          },
          {
            role: 'close'
          }
        ]
      },

      {
        role: 'help',
        submenu: [
          {
            label: 'Learn More',
            click() {
              // shell.openExternal(""); TODO
            }
          }
        ]
      }
    ]
    return template
  }
}
