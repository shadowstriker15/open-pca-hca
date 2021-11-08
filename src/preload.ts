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
import { PCA } from 'ml-pca';

import DataFrame from 'dataframe-js';

import { ColumnMatrix } from "@/interfaces/Column/Matrix";
import { ExportRow, ColumnImport, RowImport, PCATrace, Row } from "@/@types/preload";
import { Import } from './@types/import';
import { session } from './@types/session';
import { Normalize } from './@types/graphConfigs';
import { ImportDF } from './classes/importDF';

const CONST_COLUMNS = ['File name', 'Sample'];
const DF_CSV = "dataframe.csv";
const PREDICT_CSV = "predict.csv";


function getCurrentSession(): session | null {
    let sessionStr = localStorage.getItem("session");
    if (sessionStr) return JSON.parse(sessionStr) as session;
    return null; //TODO read from file if not saved
}

function updateCurrentSession(sessionObj: session) {
    const sessionStr = JSON.stringify(sessionObj);
    localStorage.setItem("session", sessionStr);
    ipcRenderer.invoke('session:saveSessionFile', sessionStr, 'info.json')
}

function getSessionDir(): Promise<string> | null {
    let session = getCurrentSession();
    if (session) {
        return ipcRenderer.invoke('store:getDirectory', ['sessions', session.name]);
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

function parseXLSXFile(path: string, isLabel: boolean = false, labelNames: string[] = []): string[] | string[][] {
    const workbook = xlsxParse.readFile(path);
    const parsedData = xlsxParse.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
        raw: false,
        header: isLabel ? 1 : labelNames,
        dateNF: 'yyyy-mm-dd',
        blankrows: false,
    }) as string[][]
    return isLabel ? parsedData[0] : parsedData;
}

function parseCSVLabel(path: string, dataFormat: 'column' | 'row', isTxt: boolean = false) {
    return new Promise(function (resolve, reject) {
        fs.readFile(path, 'utf8', function (err: any, data: any) {
            if (err) return console.error('ERROR: ', err);

            if (isTxt && dataFormat == 'row') {
                resolve(data.split(/[\s]{2,}/));
            }
            csvParse(data, { columns: false, trim: true, bom: true }, function (err: any, rows: any) {
                if (err) return console.error('ERROR: ', err);
                resolve(rows[0]);
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
                csvParse(data, { columns: dataFormat == 'column' ? labelNames : false, trim: true, bom: true }, function (err: any, rows: string[][]) {
                    // TODO MAKE SURE TO ACCOUNT FOR BLANK LINES AT BOTTOM
                    if (isTxt && dataFormat == 'row') {
                        let parsedRows: string[][] = []
                        rows.forEach(row => {
                            parsedRows.push(row[0].split(/[ ,	]+/))
                        })
                        resolve(parsedRows)
                    }
                    resolve(rows);
                })
            }
        });
    });
}

function createRunPromises(runs: string[], labelNames: string[], dataFormat: 'column' | 'row') {

    let runPromises = runs.map(function (path) {
        return new Promise(function (resolve, reject) {
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
                    break;
            }
        });
    });
    return runPromises;
}

function readImportDataframe(withClasses: boolean = false, withDimensions: boolean = false): Promise<Import> {
    let importObj: Import = { matrix: [] }

    return new Promise(async function (resolve, reject) {
        const dir = await getSessionDir();
        if (dir) {
            DataFrame.fromCSV(`open-protocol://${Path.join(dir, DF_CSV)}`).then((df: any) => {
                const columns: string[] = df.listColumns();

                if (withClasses) df = df.withColumn('Sample', (row) => row.get('Sample') + ' ' + row.get('File name'))
                const excludeColumns = withClasses ? CONST_COLUMNS.filter(col => col != 'Sample') : CONST_COLUMNS
                // Cast dimension rows from string to number
                // todo castall?
                // dimensionLabels.forEach((column) => {
                //     df = df.cast(column, Number)
                // })
                const matrix = df.select(...columns.filter(col => !excludeColumns.includes(col))).toArray();
                importObj.matrix = matrix;

                if (withDimensions) importObj.dimensionLabels = columns.filter(col => !CONST_COLUMNS.includes(col));
                resolve(importObj)
            })
        }
    });
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
function storeRowImport(data: RowImport, labelNames: string[], fileNames: string[], dimension_count: number): Promise<void> {
    var newRows: ExportRow[] = []
    for (let fileIndex = 0; fileIndex < data.length; fileIndex++) { // Loop through files
        let fileRows = data[fileIndex];

        for (let rowIndex = 0; rowIndex < fileRows.length; rowIndex++) { // Loop through rows
            let sampleDims = fileRows[rowIndex];
            let newRow: ExportRow = { 'File name': fileNames[fileIndex], 'Sample': labelNames[rowIndex] }

            for (let sampleIndex = 0; sampleIndex < sampleDims.length; sampleIndex++) { // Loop through samples in row
                newRow[sampleIndex] = sampleDims[sampleIndex];
            }
            newRows.push(newRow)
        }
    }

    let columns = CONST_COLUMNS.concat(range(0, dimension_count))

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
                storedRow[rowIndex] = sampleRow[labelNames[sampleIndex]]
                columnMatrix.files[fileNames[fileIndex]].samples[labelNames[sampleIndex]] = storedRow
            }
        }
    }

    let columns = CONST_COLUMNS.concat(range(0, dimension_count))
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

function createPredictMatrix(matrix: number[][], fileNames: string[], labelNames: string[], pcaMethod: "SVD" | "NIPALS" | "covarianceMatrix" | undefined, dimension_count: number) {
    const pca = new PCA(matrix, { method: pcaMethod });
    let pcaMatrix = pca.predict(matrix, { nComponents: dimension_count }); // TODO large dataset breaks here
    console.log('Creating PCA predict matrix');
    let rows = [];

    for (let i = 0; i < fileNames.length; i++) {
        for (let j = 0; j < labelNames.length; j++) {
            let pcaDimensions = Array.prototype.slice.call(pcaMatrix.data[j + i * labelNames.length]);
            let row = [fileNames[i], labelNames[j]].concat(pcaDimensions)
            rows.push(row)
        }
    }

    let columns = CONST_COLUMNS.concat(range(0, dimension_count));
    const df = new DataFrame(rows, columns);
    console.log('Creating PCA csv file');
    return new Promise(async function (resolve, reject) {
        const dir = await getSessionDir();
        if (dir) resolve(df.toCSV(true, Path.join(dir, PREDICT_CSV)));
        reject();
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

    return new Promise(function (resolve, reject) {
        labelPromise.then((response) => {
            let labelNames = response as string[];
            const runPromises = createRunPromises(runs, labelNames, dataFormat);

            Promise.all(runPromises).then(function (res: any) {
                let fileNames = runs.map(run => extractFilename(run))
                const dimension_count = getDimensionCount(res[0], dataFormat)

                const sessionObj = getCurrentSession();
                if (sessionObj) {
                    // Update session info
                    sessionObj.dimension_count = dimension_count;
                    sessionObj.fileNames = fileNames;
                    sessionObj.labelNames = labelNames;

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
            });
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
        },
        readPredictMatrix: (dimensions: number, normalize_type: Normalize) => {
            return new Promise(async function (resolve, reject) {
                let session = getCurrentSession();
                const dir = await getSessionDir();

                if (session && dir) {
                    const predict_dir = Path.join(dir, PREDICT_CSV);

                    if (fs.existsSync(predict_dir) && (!session.predict_normalize || session.predict_normalize == normalize_type)) {
                        resolve(parsePredictFile(predict_dir, dimensions));
                    } else {
                        // Perform normalization and return new predict matrix
                        readImportDataframe().then((importObj) => {
                            // Normalize data
                            const importDF = new ImportDF(false, false);
                            const matrix = importDF.normalizeData(importObj.matrix, normalize_type);
                            const pcaMethod = "SVD"; // Others: "SVD", "covarianceMatrix", "NIPALS", undefined

                            const sessionObj = getCurrentSession();

                            if (sessionObj && sessionObj.fileNames && sessionObj.labelNames && sessionObj.dimension_count) {
                                createPredictMatrix(matrix.to2DArray(), sessionObj.fileNames, sessionObj.labelNames, pcaMethod, sessionObj.dimension_count).then(() => {
                                    resolve(parsePredictFile(predict_dir, dimensions));
                                })
                            }
                        })
                    }
                }
            });
        },
        readImportDataframe: (withClasses: boolean = false, withDimensions: boolean = false) => {
            return readImportDataframe(withClasses, withDimensions);
        }
    }
)

function parsePredictFile(predict_dir: string, dimensions: number): Promise<PCATrace> {
    let traces: PCATrace[] = []

    return new Promise(function (resolve, reject) {
        DataFrame.fromCSV(`open-protocol://${predict_dir}`).then((df: any) => {
            let labels: string[] = df.distinct('Sample').toArray('Sample')

            labels.forEach((label) => {
                let trace: PCATrace = { x: [], y: [], name: label, text: [] }
                if (dimensions == 3) trace.z = [];
                const matrix: Row[] = df.filter((row: any) => row.get('Sample') == label).toCollection();

                for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
                    let row = matrix[rowIndex]
                    trace.x.push(row[0])
                    trace.y.push(row[1])
                    trace.z?.push(row[2])
                    trace.text.push(row['File name'])
                }
                traces.push(trace);
            })
            resolve(traces)
        }).catch((err: any) => {
            reject(err);
        })
    })
}

function getSessions(): Promise<JSON[]> {
    return new Promise(function (resolve, reject) {
        ipcRenderer.invoke('store:getDirectory', ['sessions']).then((dir) => {
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
    set: (key: any, value: any) => ipcRenderer.invoke('store:set', key, value),
    getDirectory: (directory: string[]) => ipcRenderer.invoke('store:getDirectory', directory)
})

contextBridge.exposeInMainWorld('session', {
    createSessionDir: (session: string) => ipcRenderer.invoke('session:createSessionDir', session),
    saveSessionFile: (sessionObj: any, fileName: string) => ipcRenderer.invoke('session:saveSessionFile', sessionObj, fileName),
    getSessions: () => getSessions(),
    deleteSession: (name: string) => ipcRenderer.invoke('session:deleteSession', name),
    exportData: (session: string) => ipcRenderer.invoke('session:exportData', session)
})

contextBridge.exposeInMainWorld('theme', {
    toggle: () => ipcRenderer.invoke('theme:toggle'),
    isDark: () => ipcRenderer.invoke('theme:is-dark'),
})

contextBridge.exposeInMainWorld('main', {
    changeRoute: (channel: string, func: any) => {
        ipcRenderer.on(channel, (event, ...args) => func(event, ...args))

    }
})

