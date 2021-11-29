// import { contextBridge, ipcRenderer } from 'electron'

// export const api = {
//     /**
//      * Here you can expose functions to the renderer process
//      * so they can interact with the main (electron) side
//      * without security problems.
//      *
//      * The function below can accessed using `window.Main.sayHello`
//      */

//     sendMessage: (message: string) => {
//         ipcRenderer.send('message', message)
//     },

//     /**
//      * Provide an easier way to listen to events
//      */
//     on: (channel: string, callback: Function) => {
//         ipcRenderer.on(channel, (_, data) => callback(data))
//     }
// }

import { contextBridge, ipcRenderer } from 'electron';
import fs from 'fs';
import Path from 'path';
import csvParse from 'csv-parse';
import xlsxParse from 'xlsx';
import DataFrame from 'dataframe-js';

import { ColumnMatrix } from "@/interfaces/Column/Matrix";
import { ExportRow, ColumnImport, RowImport, PCATrace, Row } from "@/@types/preload";
import { Import } from './@types/import';
import { session } from './@types/session';
import { Normalize } from './@types/graphConfigs';
import { ImportDF } from './classes/importDF';

const CONST_COLUMNS = ['File name', 'Sample'];
const DF_CSV = "dataframe.csv";


function getCurrentSession(): session | null {
    let sessionStr = localStorage.getItem("session");
    if (sessionStr) return JSON.parse(sessionStr) as session;
    return null; //TODO read from file if not saved
}

function updateCurrentSession(session: session) {
    localStorage.setItem("session", JSON.stringify(session));
    ipcRenderer.invoke('session:saveSessionFile', session, 'info.json')
}

function getSessionDir(): Promise<string> | null {
    let session = getCurrentSession();
    if (session) {
        return ipcRenderer.invoke('system:getDirectory', ['sessions', session.name]);
    }
    return null;
}

/**
 * Extract filename from given path
 * @param path File path
 * @return Extracted filename
 */
function extractFilename(path: string) {
    return path.substring(path.lastIndexOf('\\') + 1)
}

/**
 * Extract extension from given filename
 * @param filename Filename
 * @return Extracted file extension
 */
function extractExtension(filename: string) {
    return filename.substring(filename.indexOf('.') + 1);
}

function parseXLSXFile(path: string, isLabel: boolean = false, labelNames: string[] = []) {
    return new Promise((resolve, reject) => {
        const workbook = xlsxParse.readFile(path);
        const parsedData = xlsxParse.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
            raw: false,
            header: isLabel ? 1 : labelNames,
            dateNF: 'yyyy-mm-dd',
            blankrows: false,
        }) as string[][];
        if (isLabel) {
            resolve(([] as string[]).concat(...parsedData));
        } else if (isRunValid("column", labelNames.length, parsedData)) { // xlsx parse always return data in 'column' format (object)
            resolve(parsedData);
        } else {
            reject();
        }
    })
}

function parseCSVLabel(path: string, dataFormat: 'column' | 'row', isTxt: boolean = false) {
    return new Promise(function (resolve, reject) {
        fs.readFile(path, 'utf8', function (err: any, data: any) {
            if (err) return console.error('ERROR: ', err);

            csvParse(data, { columns: false, trim: true, bom: true, skipEmptyLines: true, ltrim: true }, function (err: any, rows: any) {
                if (err) return console.error('ERROR: ', err);
                resolve([].concat(...rows));
            })
        })
    });
}

function parseCSVRun(path: string, dataFormat: 'column' | 'row', labelNames: string[], isTxt: boolean = false) {
    return new Promise(function (resolve, reject) {
        fs.readFile(path, 'utf8', function (err: any, data: any) {
            if (err) {
                console.log(err);
                resolve("");
            } else {
                csvParse(data, { columns: dataFormat == 'column' ? labelNames : false, trim: true, bom: true, skipEmptyLines: true, ltrim: true }, function (err: any, rows: string[][]) {
                    // TODO MAKE SURE TO ACCOUNT FOR BLANK LINES AT BOTTOM
                    if (err) {
                        reject(console.error('Failed parsing run file', err));
                    } else {
                        if (isTxt && dataFormat == 'row') {
                            let parsedRows: string[][] = []
                            rows.forEach(row => {
                                parsedRows.push(row[0].split(/[ ,	]+/))
                            })
                            rows = parsedRows
                        }
                        if (isRunValid(dataFormat, labelNames.length, rows)) resolve(rows);
                        else reject();
                    }
                })
            }
        });
    });
}

function isRunValid(dataFormat: 'column' | 'row', labelLen: number, data: string[][]) {
    let dim_count = null;
    let session = {
        name: "",
        created_date: "",
        type: null,
    } as session;

    let sessionStr = localStorage.getItem("creating-session");
    if (sessionStr) {
        session = JSON.parse(sessionStr) as session;
        dim_count = session.dimension_count;
    }

    const computed_dim_count = getDimensionCount(data, dataFormat);

    if (!dim_count) {
        session.dimension_count = computed_dim_count
        localStorage.setItem("creating-session", JSON.stringify(session));
    }
    // Check if the run's dimension count is consistent
    if (dim_count && (computed_dim_count != dim_count)) return false;

    if (dataFormat == 'column') {
        return data.every(row => Object.keys(row).length == labelLen);
    } else if (dataFormat == "row") {
        return data.length == labelLen;
    }
    return false;
}

function createRunPromises(runs: string[], labelNames: string[], dataFormat: 'column' | 'row') {

    let runPromises = runs.map((path) => {
        return new Promise((resolve, reject) => {
            switch (extractExtension(path)) {
                case 'xlsx':
                    resolve(parseXLSXFile(path, false, labelNames));
                    break;
                case 'csv':
                    resolve(parseCSVRun(path, dataFormat, labelNames));
                    break;
                case 'txt':
                    resolve(parseCSVRun(path, dataFormat, labelNames, true));
                    break;
                default:
                    console.error('Read an unsupported extension');
                    reject();
            }
        });
    });
    return runPromises;
}

/**
* Initiate the storing of the imported data
* @param data The imported data to be stored
* @param labelNames An array of the labels
* @param fileNames An array of the file names
* @param dataFormat How the imported data is formatted
* @returns
* @author: Austin Pearce
*/
function storeImport(data: RowImport | ColumnImport, labelNames: string[], fileNames: string[], dimension_count: number, dataFormat: 'column' | 'row'): void {
    if (dataFormat == 'row') storeRowImport(data as RowImport, labelNames, fileNames, dimension_count);
    else storeColumnImport(data as ColumnImport, labelNames, fileNames, dimension_count);
}

/**
* Store the row-formatted imported data
* @param data The row-formatted imported data to be stored
* @param labelNames An array of the imported labels
* @param fileNames An array of the file names imported
* @returns
* @author: Austin Pearce
*/
function storeRowImport(data: RowImport, labelNames: string[], fileNames: string[], dimension_count: number) {
    var newRows: ExportRow[] = []
    for (let fileIndex = 0; fileIndex < data.length; fileIndex++) { // Loop through files
        let fileRows = data[fileIndex];

        for (let rowIndex = 0; rowIndex < fileRows.length; rowIndex++) { // Loop through rows
            let sampleDims = fileRows[rowIndex];
            let newRow: ExportRow = { 'File name': fileNames[fileIndex], 'Sample': labelNames[rowIndex] }

            for (let sampleIndex = 0; sampleIndex < sampleDims.length; sampleIndex++) { // Loop through samples in row
                newRow[sampleIndex + 1] = sampleDims[sampleIndex]; // Offset to start at 1 rather than 0
            }
            newRows.push(newRow)
        }
    }

    let columns = CONST_COLUMNS.concat(range(1, dimension_count + 1))

    const df = new DataFrame(newRows, columns)
    getSessionDir()?.then((dir) => {
        df.toCSV(true, Path.join(dir, DF_CSV))
    })
}

/**
* Store the column-formatted imported data
* @param data The column-formatted imported data to be stored
* @param labelNames An array of the imported labels
* @param fileNames An array of the file names imported
* @returns
* @author: Austin Pearce
*/
function storeColumnImport(data: ColumnImport, labelNames: string[], fileNames: string[], dimension_count: number): void {
    var columnMatrix: ColumnMatrix = { files: {} };

    for (let fileIndex = 0; fileIndex < data.length; fileIndex++) { // Loop through files
        let fileRows = data[fileIndex];
        let storedFile = columnMatrix.files[fileNames[fileIndex]];

        if (!storedFile) storedFile = columnMatrix.files[fileNames[fileIndex]] = { samples: {} };

        for (let rowIndex = 0; rowIndex < fileRows.length; rowIndex++) { // Loop through rows
            let sampleRow = fileRows[rowIndex];

            for (let sampleIndex = 0; sampleIndex < labelNames.length; sampleIndex++) { // Loop through samples in row
                let storedRow = storedFile.samples[labelNames[sampleIndex]];
                if (!storedRow) storedRow = storedFile.samples[labelNames[sampleIndex]] = { 'File name': fileNames[fileIndex], 'Sample': labelNames[sampleIndex] };

                // Save dimension measurement to row
                storedRow[rowIndex + 1] = sampleRow[labelNames[sampleIndex]] // Offset to start at 1 rather than 0
                columnMatrix.files[fileNames[fileIndex]].samples[labelNames[sampleIndex]] = storedRow
            }
        }
    }

    let columns = CONST_COLUMNS.concat(range(1, dimension_count + 1));
    var newRows: ExportRow[] = [];

    for (let fileIndex = 0; fileIndex < fileNames.length; fileIndex++) {
        for (let sampleIndex = 0; sampleIndex < labelNames.length; sampleIndex++) { //TODO Can improve this
            newRows.push(columnMatrix.files[fileNames[fileIndex]].samples[labelNames[sampleIndex]]);
        }
    }

    const df = new DataFrame(newRows, columns)
    getSessionDir()?.then((dir) => {
        df.toCSV(true, Path.join(dir, DF_CSV))
    })
}

function getDimensionCount(fileMatrix: string[][], dataFormat: 'row' | 'column') {
    let row = fileMatrix[0]
    if (dataFormat == 'row') return row.length
    else return fileMatrix.length; // Column length
}

/**
* Create a range of string numbers
* @param start
* @param end
* @returns An array of string numbers specified by range
* @author: Austin Pearce
*/
function range(start: number, end: number): string[] {
    const length = end - start;
    return Array.from({ length }, (_, i) => (start + i).toString());
}

function createDataframe(label: string, runs: string[], dataFormat: 'column' | 'row') {
    let labelPromise = new Promise(function (resolve, reject) {
        switch (extractExtension(label)) {
            case 'xlsx':
                resolve(parseXLSXFile(label, true));
                break;
            case 'csv':
                resolve(parseCSVLabel(label, dataFormat));
                break;
            case 'txt':
                resolve(parseCSVLabel(label, dataFormat, true));
                break;
            default:
                reject("ERROR - Unsupported file extension");
                break;
        }
    });

    return new Promise<void>((resolve, reject) => {
        labelPromise.then((response) => {
            let labelNames = response as string[];
            const runPromises = createRunPromises(runs, labelNames, dataFormat);

            Promise.all(runPromises).then((res: any) => {
                let fileNames = runs.map(run => extractFilename(run))
                const dimension_count = getDimensionCount(res[0], dataFormat)

                const sessionObj = getCurrentSession();
                if (sessionObj) {
                    // Update session info
                    sessionObj.dimension_count = dimension_count;
                    sessionObj.fileNames = fileNames;
                    sessionObj.labelNames = labelNames;

                    //TODO THIS INFO IS NOT BEING SAVED FOR LARGE DATASET(FOR SOME REASON...)
                    updateCurrentSession(sessionObj);
                }

                storeImport(res, labelNames, fileNames, dimension_count, dataFormat);
                console.log('Done storing import');
                resolve();

                //TODO
                // const pca_json = pca.toJSON();

                // console.log(pca.getExplainedVariance());

                // const deviation_matrix = PCA.computeDeviationMatrix(df_array);
                // const deviation_scores = PCA.computeDeviationScores(deviation_matrix);
                // const SVD = PCA.computeSVD(deviation_scores);
                // console.log('SVD:', SVD)
            }).catch((err) => {
                console.error('Failed parsing runs', err);
                reject();
            })
        }).catch((err) => {
            console.error(err);
        })
    })
}

contextBridge.exposeInMainWorld(
    'import',
    {
        createDataframe: (label: string, runs: string[], dataFormat: 'column' | 'row') => {
            return new Promise(function (resolve, reject) {
                resolve(createDataframe(label, runs, dataFormat))
            })
        }
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
    get: (key: any) => ipcRenderer.invoke('store:get', key),
    set: (key: any, value: any) => ipcRenderer.invoke('store:set', key, value)
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

