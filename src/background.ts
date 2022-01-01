"use strict";

import { app, protocol, BrowserWindow, ipcMain, nativeTheme, Menu, dialog, shell } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
import path from "path";
// import DataFrame from 'dataframe-js';

import { Store } from '@/utils/Store';
import { Session } from "@/utils/Session";
import { System } from "@/utils/System";
import { session } from "./@types/session";
import { Import } from "./utils/Import";

const isDevelopment = process.env.NODE_ENV !== "production";

let win: BrowserWindow | null;
let workerWin: BrowserWindow | null;

const store = new Store({
  configName: 'user-preferences'
});

const system = new System();

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 700,
    height: 500,
    minWidth: 700,
    minHeight: 500,
    title: 'Open PCA HCA',
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

  // Worker window to offload CPU-intensive tasks to
  workerWin = new BrowserWindow({
    show: isDevelopment,
    webPreferences: { contextIsolation: true, enableRemoteModule: true, preload: path.join(__dirname, 'workerPreload.js') }
  });
  if (isDevelopment) workerWin.webContents.openDevTools();

  nativeTheme.themeSource = store.get("theme");

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string);
    await workerWin.loadURL((process.env.WEBPACK_DEV_SERVER_URL as string) + '/worker.html');
    if (!process.env.IS_TEST) win.webContents.openDevTools();
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    win.loadURL("app://./index.html");
    workerWin.loadURL("app://./worker.html");
  }

  // Needed to close even when worker window is still open
  win.on("close", () => {
    app.quit();
  })
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
    } catch (e: any) {
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

  ipcMain.on('message-from-worker', (event, arg) => {
    sendWindowMessage(win, 'worker-response', arg);
  })

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

function sendWindowMessage(targetWindow: BrowserWindow | null, message: string, payload: any) {
  if (typeof targetWindow === 'undefined') {
    console.log('Target window does not exist');
    return;
  }

  if (targetWindow) targetWindow.webContents.send(message, payload);
}

// Import handlers
ipcMain.handle('import:createDataframe', async (event, passedSession, label, runs, dataFormat) => {
  const session = new Session(passedSession);
  const importInstance = new Import(session);
  try {
    const result = await importInstance.createDataframe(label, runs, dataFormat);
    return result;
  } catch {
    throw new Error("Failed to create import dataframe");
  }
})

// Store handlers
ipcMain.handle('store:get', (event, key, defaultVal) => {
  return store.get(key, defaultVal);
})

ipcMain.handle('store:set', (event, key, value) => {
  store.set(key, value);
})

ipcMain.handle('store:delete', (event, key) => {
  store.delete(key);
})

// System handlers
ipcMain.handle('system:getDirectory', (event, directory: string[]) => {
  return system.getAbsPath(directory);
})

ipcMain.handle('system:createFile', async (event, fileName: string, data: any) => {
  try {
    const result = await system.createFile(system.getAbsPath([fileName]), data);
    return result;
  } catch {
    throw new Error(`Failed to create file ${fileName}`);
  }
})

// Session handlers
ipcMain.handle('session:createSessionDir', (event, passedSession) => {
  const session = new Session(passedSession);
  return session.createSessionDir();
})

ipcMain.handle('session:saveInfo', async (event, passedSession, key, value) => {
  const session = new Session(passedSession);
  try {
    const result = await session.saveInfo(key, value);
    return result;
  } catch {
    throw new Error(`Failed to update session info file key:${key}, value:${value}`);
  }
})

ipcMain.handle('session:getInfo', (event, passedSession, key) => {
  const session = new Session(passedSession);
  return session.getInfo(key);
})

ipcMain.handle('session:deleteSession', (event, passedSession) => {
  const session = new Session(passedSession);
  return session.deleteSession();
})

ipcMain.handle('session:readPredictMatrix', (event, passedSession, dimensions, normalize_type) => {
  // Request worker process to process request
  if (workerWin) workerWin.webContents.send('message-from-main', { command: 'readPredictMatrix', payload: { passedSession, dimensions, normalize_type } });
})

ipcMain.handle('session:readDistanceMatrix', (event, passedSession, matrix, classes, normalize_type) => {
  if (workerWin) workerWin.webContents.send('message-from-main', { command: 'readDistanceMatrix', payload: { passedSession, matrix, classes, normalize_type } });
})

ipcMain.handle('session:readImportDataframe', (event, passedSession, withClasses, withDimensions) => {
  if (workerWin) workerWin.webContents.send('message-from-main', { command: 'readImportDataframe', payload: { passedSession, withClasses, withDimensions } });
})

// Export handlers
ipcMain.handle('session:exportData', async (event, passedSession) => {
  exportData(passedSession);
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

async function exportData(passedSession: session | null = null) {
  const result = await dialog.showOpenDialog(win as BrowserWindow, {
    properties: ['openDirectory']
  })
  if (result.filePaths.length) {
    if (passedSession) {
      const session = new Session(passedSession);
      session.exportData(result.filePaths[0]).then(() => {
        win!.webContents.send("showAlert", "success", "Successfully exported session data");
      }).catch(() => {
        win!.webContents.send("showAlert", "error", "Failed to export session data", -1);
      })
    } else {
      const currentPath = system.getAbsPath(['current.json']);
      system.readFile(currentPath).then((data) => {
        let currentSession = data as session;
        const session = new Session(currentSession);
        session.exportData(result.filePaths[0]);
      }).catch((err) => {
        console.error('Failed to read from current.json file during export process', err);
      })
    }
  }
}

function resetTour() {
  store.set('welcomeTour.lastStep', 0);
  store.set('welcomeTour.show', true);
  win!.webContents.send("showTour");
}

function createMenu() {
  const template = getTemplate();
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function getTemplate(): (Electron.MenuItemConstructorOptions | Electron.MenuItem)[] {
  var getViewSubmenu = function (): Electron.MenuItemConstructorOptions[] {
    return isDevelopment ? [
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
        role: 'resetZoom'
      },
      {
        role: 'zoomIn'
      },
      {
        role: 'zoomOut'
      },
      {
        type: 'separator'
      },
      {
        role: 'togglefullscreen'
      },
      {
        type: 'separator'
      },
      {
        label: 'Reset welcome tour',
        click() {
          resetTour();
        }
      }
    ] : [
      {
        role: 'reload'
      },
      {
        role: 'toggleDevTools'
      },
      {
        type: 'separator'
      },
      {
        role: 'resetZoom'
      },
      {
        role: 'zoomIn'
      },
      {
        role: 'zoomOut'
      },
      {
        type: 'separator'
      },
      {
        role: 'togglefullscreen'
      }
    ]
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Sessions',
          click() {
            win!.webContents.send("changeRouteTo", "/")
          }
        },
        {
          label: 'Export',
          click() {
            exportData();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: getViewSubmenu()
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
  ]

  if (!isDevelopment) template.push({
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click() {
          shell.openExternal("https://github.com/shadowstriker15/open-pca-hca/#user-guide");
        }
      },
      {
        label: 'Reset welcome tour',
        click() {
          resetTour();
        }
      }
    ]
  })
  return template;
}
