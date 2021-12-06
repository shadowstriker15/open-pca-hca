import { contextBridge, ipcRenderer } from 'electron';
import fs from 'fs';
import Path from 'path';
import { session } from './@types/session';
import { Normalize } from './@types/graphConfigs';

contextBridge.exposeInMainWorld(
    'import',
    {
        createDataframe: (session: session, label: string, runs: string[], dataFormat: 'column' | 'row') => ipcRenderer.invoke('import:createDataframe', session, label, runs, dataFormat),
    }
)

function getSessions(): Promise<JSON[]> {
    return new Promise(function (resolve, reject) {
        ipcRenderer.invoke('system:getDirectory', ['sessions']).then((dir) => {
            const sessionDirs = fs.readdirSync(dir);
            let sessions: JSON[] = [];

            sessionDirs.forEach((sessionDir) => {
                try {
                    const data = fs.readFileSync(Path.join(dir, sessionDir, 'info.json'), "utf8");
                    sessions.push(JSON.parse(data));
                } catch (err) {
                    console.error('Error - unable to get session', err);
                }
            })
            resolve(sessions);
        }).catch((err) => {
            reject(err);
        })
    })
}

contextBridge.exposeInMainWorld('store', {
    get: (key: any, defaultVal?: any) => ipcRenderer.invoke('store:get', key, defaultVal),
    set: (key: any, value: any) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: any) => ipcRenderer.invoke('store:delete', key)
})

contextBridge.exposeInMainWorld('session', {
    getSessions: () => getSessions(),
    createSessionDir: (session: session) => ipcRenderer.invoke('session:createSessionDir', session),
    saveSessionFile: (session: session, fileName: string) => ipcRenderer.invoke('session:saveSessionFile', session, fileName),
    deleteSession: (session: session) => ipcRenderer.invoke('session:deleteSession', session),
    readImportDataframe: (session: session, withClasses: boolean = false, withDimensions: boolean = false) => ipcRenderer.invoke('session:readImportDataframe', session, withClasses, withDimensions),
    exportData: (session: session) => ipcRenderer.invoke('session:exportData', session),
    readPredictMatrix: (session: session, dimensions: number, normalize_type: Normalize) => ipcRenderer.invoke('session:readPredictMatrix', session, dimensions, normalize_type),
    readDistanceMatrix: (session: session, matrix: number[][], classes: string[], normalize_type: Normalize) => ipcRenderer.invoke('session:readDistanceMatrix', session, matrix, classes, normalize_type)
})

contextBridge.exposeInMainWorld('system', {
    getDirectory: (directory: string[]) => ipcRenderer.invoke('system:getDirectory', directory),
    createFile: (fileName: string, data: any) => ipcRenderer.invoke('system:createFile', fileName, data)
})

contextBridge.exposeInMainWorld('theme', {
    toggle: () => ipcRenderer.invoke('theme:toggle'),
    isDark: () => ipcRenderer.invoke('theme:is-dark'),
})

contextBridge.exposeInMainWorld('main', {
    listen: (channel: string, func: any) => {
        ipcRenderer.on(channel, (event, ...args) => func(event, ...args))
    }
})

