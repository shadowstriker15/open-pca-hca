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

const { contextBridge } = require('electron')
const fs = require('fs');
const parse = require('csv-parse')
const XLSX = require('xlsx');
import DataFrame from 'dataframe-js';
import { PCA } from 'ml-pca';
import { ImportMatrix } from "@/interfaces/Import/Matrix";
import { PredictMatrix } from './interfaces/Predict/Matrix';
// TODO DELETE LIBRARY? var PCA = require('pca-js')

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

function parseXLSXFile(path: string, isLabel: boolean = false, labelArray: Array<string> = []) {
    const workbook = XLSX.readFile(path);
    const parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
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
            parse(data, { columns: false, trim: true, bom: true }, function (err: any, rows: any) {
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
                parse(data, { columns: dataFormat == 'column' ? labelArray : false, trim: true, bom: true }, function (err: any, rows: Array<Array<string>>) {
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

function createPredictMatrix(matrices: Array<Array<Array<number>>>, fileNames: Array<string>, labelArray: Array<string>, pcaMethod: "SVD" | "NIPALS" | "covarianceMatrix" | undefined, pcaComponents: number) {
    let predictMatrix: PredictMatrix = { runs: {} };

    for (let i = 0; i < matrices.length; i++) {
        predictMatrix.runs[fileNames[i]] = { items: {} };

        const pca = new PCA(matrices[i], { method: pcaMethod });
        let matrix = pca.predict(matrices[i], { nComponents: pcaComponents });

        for (let j = 0; j < matrix.data.length; j++) {
            let point = matrix.data[j];
            predictMatrix.runs[fileNames[i]].items[labelArray[j]] = pcaComponents == 3 ? { 0: point[0], 1: point[1], 2: point[2] } : { 0: point[0], 1: point[1] };
        }
    }
    return predictMatrix;
}

contextBridge.exposeInMainWorld(
    'import',
    {
        createDataframe: (label: string, runs: Array<string>, dataFormat: 'column' | 'row') => {
            const pcaMethod = "SVD"; // Others: "SVD", "covarianceMatrix", "NIPALS", undefined
            const pcaComponents = 2; // Others: 3
            // DataFrame.fromCSV('C:/Users/austi/Downloads/Measurement1.csv').then(df => df.show());

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

                Promise.all(runPromises).then(function (res) {
                    let fileNames = runs.map(run => extractFilename(run))
                    let matrices = createImportMatrices(res, labelArray, fileNames, dataFormat);
                    let predictMatrix = createPredictMatrix(matrices, fileNames, labelArray, pcaMethod, pcaComponents);

                    console.log('PREDICT MATRIX: ', predictMatrix)

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
