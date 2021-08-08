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
 * Validates files' extensions are consistent
 * @param paths File paths
 * @return Whether extensions are consistent or not
 */
function areFilesConsistent(paths: Array<string>) {
    let isConsistent = true;
    if (paths.length <= 1) return isConsistent;

    let regexPattern = /(?:\.([^.]+))?$/; // Regex pattern for file type
    let regexResult = regexPattern.exec(paths[0]);
    const ext = regexResult?.length ? regexResult[1] : null;

    if (ext) {
        for (let i = 1; i < paths.length; i++) {
            let regexResult = regexPattern.exec(paths[i]);
            let fileExt = regexResult?.length ? regexResult[1] : null;

            if (!fileExt || fileExt != ext) {
                isConsistent = false;
                break;
            }

        }
    }
    return isConsistent;
}

function readLabel() {

}

function extractFilename(path: string) {
    return path.substring(path.lastIndexOf('\\') + 1)
}

function getItemData(rowArray: Array<any>, item: string) {
    let array: Array<number> = [];
    rowArray.forEach((row) => {
        array.push(row[item]);
    })
    return array;
}

function parseXLSXFile(path: string, isLabel: boolean = false, label: Array<string> = []) {
    const workbook = XLSX.readFile(path);
    const parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
        raw: false,
        header: 1,
        dateNF: 'yyyy-mm-dd',
        blankrows: false,
    })
    return parsedData;
}

function parseCSVLabel(path: string) {
    return new Promise(function (resolve, reject) {
        fs.readFile(path, 'utf8', function (err: any, data: any) {
            if (err) return console.error('ERROR: ', err);
            parse(data, { columns: false, trim: true, bom: true }, function (err: any, rows: any) {
                if (err) return console.error('ERROR: ', err);
                resolve(rows[0]);
            })

            // TODO If file extension is TXT and row format
            // resolve(data.split(/[\n]/))
        })
    });
}

function parseCSVRun(path: string, dataFormat: string, labelArray: Array<string>) {
    return new Promise(function (resolve, reject) {
        fs.readFile(path, 'utf8', function (err: any, data: any) {
            if (err) {
                console.log(err);
                resolve("");
            } else {
                parse(data, { columns: dataFormat == 'column' ? labelArray : false, trim: true, bom: true }, function (err, rows) {
                    resolve(rows);
                    // TODO For TXT row format
                    // TODO MAKE SURE TO ACCOUNT FOR BLANK LINES AT BOTTOM
                    // let parsedRows = []
                    // rows.forEach(row => {
                    //     parsedRows.push(row[0].split(/[ ,	]+/))
                    // })
                    // resolve(parsedRows)
                })
            }
        });
    });
}

contextBridge.exposeInMainWorld(
    'import',
    {
        createDataframe: (label: string, runs: Array<string>) => {
            const dataFormat = 'column';
            const fileType = 'csv';
            // DataFrame.fromCSV('C:/Users/austi/Downloads/Measurement1.csv').then(df => df.show());

            // TODO areFilesConsistent(runs)

            let label_promise = new Promise(function (resolve, reject) {
                if (fileType == 'csv') resolve(parseCSVLabel(label));
                if (fileType == 'xlsx') resolve(parseXLSXFile(label, true))
                // TODO If file extension is TXT and row format
                // resolve(data.split(/[\n]/))
            });

            label_promise.then((response) => {
                let labelArray = response as Array<string>;

                let runPromises = runs.map(function (path) {
                    return new Promise(function (resolve, reject) {
                        if (fileType == 'csv') resolve(parseCSVRun(path, dataFormat, labelArray));
                        if (fileType == 'xlsx') resolve(parseXLSXFile(path, false, labelArray));

                    });
                });

                Promise.all(runPromises).then(function (res) {
                    let results = res as Array<Array<number>>
                    let importMatrix: ImportMatrix = { runs: {} };
                    let fileNames = runs.map(run => extractFilename(run))

                    for (let i = 0; i < results.length; i++) {
                        importMatrix.runs[fileNames[i]] = { items: {} };
                        for (let j = 0; j < labelArray.length; j++) {
                            importMatrix.runs[fileNames[i]].items[labelArray[j]] = getItemData(results[i], labelArray[j]);
                        }
                    }

                    console.log('IMPORT MATRIX: ', importMatrix)

                    // const df = new DataFrame(data, label);

                    // df.show();

                    // df.toCSV(true, 'C:/Users/austi/Downloads/test.csv');
                    // let df_array = df.toArray();

                    // console.log('df array:', df_array)

                    // console.log('df-array', df_array)

                    let matrices = [];
                    for (const run in importMatrix.runs) {
                        let runMatrix = [];
                        const items = importMatrix.runs[run].items;
                        for (const item in items) {
                            runMatrix.push(items[item]);
                        }
                        matrices.push(runMatrix);
                    }

                    let predictMatrix: PredictMatrix = { runs: {} };

                    for (let i = 0; i < matrices.length; i++) {
                        predictMatrix.runs[fileNames[i]] = { items: {} };

                        const pca = new PCA(matrices[i]);
                        let predict_matrix = pca.predict(matrices[i], { nComponents: 2 });

                        for (let j = 0; j < predict_matrix.data.length; j++) {
                            let point = predict_matrix.data[j];
                            predictMatrix.runs[fileNames[i]].items[labelArray[j]] = { 0: point[0], 1: point[1] };
                        }
                    }

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
            })
        },
        readPredictMatrix: () => {
            return new Promise(function (resolve, reject) {
                fs.readFile('C:/Users/austi/Downloads/pca.json', 'utf8', (err, data) => {
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
