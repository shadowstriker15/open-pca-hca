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

import DataFrame from 'dataframe-js';

import { ColumnMatrix } from "@/interfaces/Column/Matrix";
import { ExportRow, ColumnImport, RowImport, PCATrace, Row } from "@/@types/preload";
import { Import } from './@types/import';

const CONST_COLUMNS = ['File name', 'Sample'];

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

function readImportDataframe(withClasses: boolean = false, getDimensions: boolean = false): Promise<Import> {
    let importObj: Import = { matrix: [] }

    return new Promise(function (resolve, reject) {
        DataFrame.fromCSV('open-protocol://C:/Users/austi/Downloads/dataframe.csv').then((df: any) => {
            const columns: string[] = df.listColumns();
            const dimensionLabels = columns.filter(col => !CONST_COLUMNS.includes(col));

            if (withClasses) df = df.withColumn('Sample', (row) => row.get('Sample') + ' ' + row.get('File name'))
            const excludeColumns = withClasses ? CONST_COLUMNS.filter(col => col != 'Sample') : CONST_COLUMNS
            // Cast dimension rows from string to number
            // todo castall?
            // dimensionLabels.forEach((column) => {
            //     df = df.cast(column, Number)
            // })
            const matrix = df.select(...columns.filter(col => !excludeColumns.includes(col))).toArray();
            importObj.matrix = matrix;

            if (getDimensions) importObj.dimensionLabels = dimensionLabels
            resolve(importObj)
        })
    });
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
function storeImport(data: RowImport | ColumnImport, labelArray: string[], fileNames: string[], dimension_count: number, dataFormat: 'column' | 'row'): void {
    if (dataFormat == 'row') storeRowImport(data as RowImport, labelArray, fileNames, dimension_count);
    else storeColumnImport(data as ColumnImport, labelArray, fileNames, dimension_count);
}

/**
* Store the row-formatted imported data
* @param data The row-formatted imported data to be stored
* @param labelArray An array of the imported labels
* @param fileNames An array of the file names imported
* @returns
* @author: Austin Pearce
*/
function storeRowImport(data: RowImport, labelArray: string[], fileNames: string[], dimension_count: number): void {
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

    let columns = CONST_COLUMNS.concat(range(0, dimension_count))

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
function storeColumnImport(data: ColumnImport, labelArray: string[], fileNames: string[], dimension_count: number): void {
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

    let columns = CONST_COLUMNS.concat(range(0, dimension_count))
    var newRows: ExportRow[] = [];

    for (let fileIndex = 0; fileIndex < fileNames.length; fileIndex++) {
        for (let sampleIndex = 0; sampleIndex < labelArray.length; sampleIndex++) { //TODO Can improve this
            newRows.push(columnMatrix.files[fileNames[fileIndex]].samples[labelArray[sampleIndex]]);
        }
    }

    // TODO
    const df = new DataFrame(newRows, columns)
    df.toCSV(true, 'C:/Users/austi/Downloads/dataframe.csv')
}

//TODO
function createPredictMatrix(original: number[][], fileNames: string[], labelArray: string[], pcaMethod: "SVD" | "NIPALS" | "covarianceMatrix" | undefined, dimension_count: number) {
    const pca = new PCA(original, { method: pcaMethod });
    let matrix = pca.predict(original, { nComponents: dimension_count });
    console.log('Creating PCA predict matrix');
    let rows = [];

    for (let i = 0; i < fileNames.length; i++) {
        for (let j = 0; j < labelArray.length; j++) {
            let pcaDimensions = Array.prototype.slice.call(matrix.data[j + i * labelArray.length]);
            let row = [fileNames[i], labelArray[j]].concat(pcaDimensions)
            rows.push(row)
        }
    }

    let columns = CONST_COLUMNS.concat(range(0, dimension_count));
    const df = new DataFrame(rows, columns);
    console.log('Creating PCA csv file');
    df.toCSV(true, 'C:/Users/austi/Downloads/pca.csv'); //TODO
}

function getDimensionCount(fileMatrix: string[][], dataFormat: 'row' | 'column') {
    let row = fileMatrix[0]
    if (dataFormat == 'row') return row.length
    else return fileMatrix.length; // Column length
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
        createDataframe: (label: string, runs: string[], dataFormat: 'column' | 'row') => {
            const pcaMethod = "SVD"; // Others: "SVD", "covarianceMatrix", "NIPALS", undefined
            const pcaComponents = 2; // Others: 3

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
                    const dimension_count = getDimensionCount(res[0], dataFormat)
                    storeImport(res, labelArray, fileNames, dimension_count, dataFormat);
                    console.log('Done storing import');
                    readImportDataframe().then((importObj) => {
                        console.log('Done reading stored dataframe');
                        createPredictMatrix(importObj.matrix, fileNames, labelArray, pcaMethod, dimension_count);

                    })

                    //TODO
                    // let tree = test(matrices[0]);
                    // console.log('TREE', tree)

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
        },
        readPredictMatrix: (dimensions: number = 2) => {
            let traces: PCATrace[] = []

            return new Promise(function (resolve, reject) {
                DataFrame.fromCSV('open-protocol://C:/Users/austi/Downloads/pca.csv').then((df: any) => { // TODO
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
                })
            });
        },
        readImportDataframe: (withClasses: boolean = false, getDimensions: boolean = false) => {
            return readImportDataframe(withClasses, getDimensions);
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

