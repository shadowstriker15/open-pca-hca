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
import DataFrame from 'dataframe-js';
import { PCA } from 'ml-pca';
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

contextBridge.exposeInMainWorld(
    'import',
    {
        createDataframe: (label: string, runs: Array<string>) => {
            // DataFrame.fromCSV('C:/Users/austi/Downloads/Measurement1.csv').then(df => df.show());

            // TODO areFilesConsistent(runs)

            let label_promise = new Promise(function (resolve, reject) {
                fs.readFile(label, 'utf8', function (err, data) {
                    // parse(data, { columns: false, trim: true, bom: true }, function (err, rows) {
                    //     resolve(rows[0])
                    // })
                    // TODO If file extension is TXT and row format
                    resolve(data.split(/[\n]/))
                })
            });

            label_promise.then((label) => {
                label as Array<string>
                let promises = runs.map(function (path) {
                    return new Promise(function (resolve, reject) {
                        fs.readFile(path, 'utf8', function (err, data) {
                            if (err) {
                                console.log(err);
                                resolve("");
                            } else {
                                parse(data, { columns: false, trim: true, bom: true }, function (err, rows) {
                                    // resolve(rows)
                                    // TODO For TXT row format
                                    // TODO MAKE SURE TO ACCOUNT FOR BLANK LINES AT BOTTOM
                                    let parsedRows = []
                                    rows.forEach(row => {
                                        parsedRows.push(row[0].split(/[ ,	]+/))
                                    })
                                    resolve(parsedRows)
                                })
                            }
                            // }.bind(this, path));
                        });
                    });
                });

                Promise.all(promises).then(function (results) {
                    //Put your callback logic here
                    // results.forEach(function (content) { response.write(content) });
                    // response.end();
                    let data = results.map(page => [].concat(page))
                    data = [].concat(...data);

                    const df = new DataFrame(data, label);

                    df.show();

                    // df.toCSV(true, 'C:/Users/austi/Downloads/test.csv');
                    let df_array = df.toArray();

                    console.log('df array:', df_array)

                    // console.log('df-array', df_array)



                    // const test = [[168, 163, 165, 185, 187, 167, 11],
                    // [166, 161, 167, 183, 186, 167, 10],
                    // [168, 160, 165, 184, 185, 165, 11],
                    // [170, 164, 169, 187, 189, 169, 11]]

                    const pca = new PCA(df_array);
                    // TODO:
                    // Once imported, break up into multiple measurement matrices and
                    // run each through the prediction algorithm
                    const predict_matrix = pca.predict(df_array, { nComponents: 2 });
                    console.log('Predict', predict_matrix)
                    // const pca_json = pca.toJSON();
                    fs.writeFile('C:/Users/austi/Downloads/pca.json', JSON.stringify(predict_matrix, null, 2), 'utf8', (err: any) => {

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
        }
    }
)
