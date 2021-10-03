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
import csvParse from 'csv-parse';
import xlsxParse from 'xlsx';
import { PCA } from 'ml-pca';
import { agnes } from 'ml-hclust';

import { ImportMatrix } from "@/interfaces/Import/Matrix";
import { PredictMatrix } from '@/interfaces/Predict/Matrix';
import DataFrame from 'dataframe-js';

import { ColumnMatrix } from "@/interfaces/Column/Matrix";
import { ExportRow, ColumnImport, RowImport } from "@/@types/preload";

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

function getItemData(rowArray: Array<any>, item: string) {
    let array: Array<string> = [];
    rowArray.forEach((row) => {
        array.push(row[item]);
    })
    return array;
}

function parseXLSXFile(path: string, isLabel: boolean = false, labelArray: Array<string> = []): Array<string> | Array<Array<string>> {
    const workbook = xlsxParse.readFile(path);
    const parsedData = xlsxParse.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
        raw: false,
        header: isLabel ? 1 : labelArray,
        dateNF: 'yyyy-mm-dd',
        blankrows: false,
    })
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

function parseCSVRun(path: string, dataFormat: 'column' | 'row', labelArray: Array<string>, isTxt: boolean = false) {
    return new Promise(function (resolve, reject) {
        fs.readFile(path, 'utf8', function (err: any, data: any) {
            if (err) {
                console.log(err);
                resolve("");
            } else {
                csvParse(data, { columns: dataFormat == 'column' ? labelArray : false, trim: true, bom: true }, function (err: any, rows: Array<Array<string>>) {
                    // TODO MAKE SURE TO ACCOUNT FOR BLANK LINES AT BOTTOM
                    if (isTxt && dataFormat == 'row') {
                        let parsedRows: Array<Array<string>> = []
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

function createRunPromises(runs: Array<string>, labelArray: Array<string>, dataFormat: 'column' | 'row') {

    let runPromises = runs.map(function (path) {
        return new Promise(function (resolve, reject) {
            switch (extractExtension(path)) {
                case 'xlsx':
                    resolve(parseXLSXFile(path, false, labelArray));
                    break;
                case 'csv':
                    resolve(parseCSVRun(path, dataFormat, labelArray));
                    break;
                case 'txt':
                    resolve(parseCSVRun(path, dataFormat, labelArray, true));
                    break;
                default:
                    break;
            }
        });
    });
    return runPromises;
}

function createImportMatrices(results: any, labelArray: Array<string>, fileNames: Array<string>, dataFormat: 'column' | 'row') {
    let importMatrix: ImportMatrix = { runs: {} };

    for (let i = 0; i < results.length; i++) {
        importMatrix.runs[fileNames[i]] = { items: {} };
        for (let j = 0; j < labelArray.length; j++) {
            const itemData = dataFormat == 'row' ? results[i][j] : getItemData(results[i], labelArray[j]);
            importMatrix.runs[fileNames[i]].items[labelArray[j]] = itemData;
        }
    }

    let matrices = [];
    for (const run in importMatrix.runs) {
        let runMatrix = [];
        const items = importMatrix.runs[run].items;
        for (const item in items) {
            runMatrix.push(items[item]);
        }
        matrices.push(runMatrix);
    }
    return matrices;
}

/**
* Initiate the storing of the imported data
* @param data The imported data to be stored
* @param labelArray An array of the labels
* @param fileNames An array of the file names
* @param dataFormat How the imported data is formatted
* @returns
* @author: Austin Pearce
*/
function storeImport(data: RowImport | ColumnImport, labelArray: string[], fileNames: string[], dataFormat: 'column' | 'row'): void {
    if (dataFormat == 'row') storeRowImport(data as RowImport, labelArray, fileNames);
    else if (dataFormat == 'column') storeColumnImport(data as ColumnImport, labelArray, fileNames);
}

/**
* Store the row-formatted imported data
* @param data The row-formatted imported data to be stored
* @param labelArray An array of the imported labels
* @param fileNames An array of the file names imported
* @returns
* @author: Austin Pearce
*/
function storeRowImport(data: RowImport, labelArray: string[], fileNames: string[]): void {
    var newRows: ExportRow[] = []
    for (let fileIndex = 0; fileIndex < data.length; fileIndex++) { // Loop through files
        let fileRows = data[fileIndex];

        for (let rowIndex = 0; rowIndex < fileRows.length; rowIndex++) { // Loop through rows
            let sampleDims = fileRows[rowIndex];
            let newRow: ExportRow = { 'File name': fileNames[fileIndex], 'Sample': labelArray[rowIndex] }

            for (let sampleIndex = 0; sampleIndex < sampleDims.length; sampleIndex++) { // Loop through samples in row
                newRow[sampleIndex] = sampleDims[sampleIndex];
            }
            newRows.push(newRow)
        }
    }

    let columns = ['File name', 'Sample'].concat(range(0, data[0][0].length))

    // TODO
    const df = new DataFrame(newRows, columns)
    df.toCSV(true, 'C:/Users/austi/Downloads/dataframe.csv')
}

/**
* Store the column-formatted imported data
* @param data The column-formatted imported data to be stored
* @param labelArray An array of the imported labels
* @param fileNames An array of the file names imported
* @returns
* @author: Austin Pearce
*/
function storeColumnImport(data: ColumnImport, labelArray: string[], fileNames: string[]): void {
    var columnMatrix: ColumnMatrix = { files: {} };

    for (let fileIndex = 0; fileIndex < data.length; fileIndex++) { // Loop through files
        let fileRows = data[fileIndex];
        let storedFile = columnMatrix.files[fileNames[fileIndex]];

        if (!storedFile) storedFile = columnMatrix.files[fileNames[fileIndex]] = { samples: {} };

        for (let rowIndex = 0; rowIndex < fileRows.length; rowIndex++) { // Loop through rows
            let sampleRow = fileRows[rowIndex];

            for (let sampleIndex = 0; sampleIndex < labelArray.length; sampleIndex++) { // Loop through samples in row
                let storedRow = storedFile.samples[labelArray[sampleIndex]];
                if (!storedRow) storedRow = storedFile.samples[labelArray[sampleIndex]] = { 'File name': fileNames[fileIndex], 'Sample': labelArray[sampleIndex] };

                // Save dimension measurement to row
                storedRow[rowIndex] = sampleRow[labelArray[sampleIndex]]
                columnMatrix.files[fileNames[fileIndex]].samples[labelArray[sampleIndex]] = storedRow
            }
        }
    }

    let columns = ['File name', 'Sample'].concat(range(0, data[0].length))
    var newRows: ExportRow[] = [];

    for (let fileIndex = 0; fileIndex < fileNames.length; fileIndex++) {
        for (let sampleIndex = 0; sampleIndex < labelArray.length; sampleIndex++) {
            newRows.push(columnMatrix.files[fileNames[fileIndex]].samples[labelArray[sampleIndex]]);
        }
    }

    // TODO
    const df = new DataFrame(newRows, columns)
    df.toCSV(true, 'C:/Users/austi/Downloads/dataframe.csv')
}

function createPredictMatrix(matrices: number[][][], fileNames: string[], labelArray: string[], pcaMethod: "SVD" | "NIPALS" | "covarianceMatrix" | undefined, pcaComponents: number) {
    let predictMatrix: PredictMatrix = { runs: {} };

    for (let i = 0; i < matrices.length; i++) {
        predictMatrix.runs[fileNames[i]] = { items: {} };

        const pca = new PCA(matrices[i], { method: pcaMethod });
        let matrix = pca.predict(matrices[i], { nComponents: pcaComponents });

        for (let j = 0; j < matrix.data.length; j++) {
            let dimensions = matrix.data[j];
            predictMatrix.runs[fileNames[i]].items[labelArray[j]] = pcaComponents == 3 ? { 0: dimensions[0], 1: dimensions[1], 2: dimensions[2] } : { 0: dimensions[0], 1: dimensions[1] };
        }
    }
    return predictMatrix;
}

//TODO
function test(data: any) {
    const tree = agnes(data, {
        method: 'ward',
    });
    return tree;
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

contextBridge.exposeInMainWorld(
    'import',
    {
        createDataframe: (label: string, runs: Array<string>, dataFormat: 'column' | 'row') => {
            const pcaMethod = "SVD"; // Others: "SVD", "covarianceMatrix", "NIPALS", undefined
            const pcaComponents = 3; // Others: 3

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

            labelPromise.then((response) => {
                let labelArray = response as Array<string>;
                const runPromises = createRunPromises(runs, labelArray, dataFormat);

                Promise.all(runPromises).then(function (res: any) {
                    let fileNames = runs.map(run => extractFilename(run))
                    storeImport(res, labelArray, fileNames, dataFormat);

                    let matrices = createImportMatrices(res, labelArray, fileNames, dataFormat);
                    // console.error('MATRICES', matrices);
                    let predictMatrix = createPredictMatrix(matrices, fileNames, labelArray, pcaMethod, pcaComponents);

                    console.log('PREDICT MATRIX: ', predictMatrix)

                    //TODO
                    let tree = test(matrices[0]);
                    console.log('TREE', tree)

                    // const pca_json = pca.toJSON();
                    fs.writeFile('C:/Users/austi/Downloads/pca.json', JSON.stringify(predictMatrix, null, 2), 'utf8', (err: any) => {
                        if (err) {
                            console.log(`Error writing file: ${err}`);
                        } else {
                            console.log(`File is written successfully!`);
                        }

                    });

                    // console.log(pca.getExplainedVariance());

                    // const deviation_matrix = PCA.computeDeviationMatrix(df_array);
                    // const deviation_scores = PCA.computeDeviationScores(deviation_matrix);
                    // const SVD = PCA.computeSVD(deviation_scores);
                    // console.log('SVD:', SVD)
                });
            }).catch((err) => {
                console.error(err);
            })
        },
        readPredictMatrix: () => {
            return new Promise(function (resolve, reject) {
                fs.readFile('C:/Users/austi/Downloads/pca.json', 'utf8', (err: any, data: any) => {
                    if (err) {
                        console.log(`Error reading file from disk: ${err}`);
                    } else {
                        resolve(JSON.parse(data));
                    }
                });
            });
        }
    }
)

contextBridge.exposeInMainWorld('store', {
    get: (key: any) => ipcRenderer.invoke('store:get', key),
})

contextBridge.exposeInMainWorld('theme', {
    toggle: () => ipcRenderer.invoke('theme:toggle'),
    isDark: () => ipcRenderer.invoke('theme:is-dark'),
})

