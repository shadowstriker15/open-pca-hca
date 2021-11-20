import electron from 'electron';
import Path from 'path';
import fs from 'fs';

// Library imports
import DataFrame from 'dataframe-js';
import { PCA } from 'ml-pca';
import csvParse from 'csv-parse';
import distanceMatrix from "ml-distance-matrix";
import { euclidean } from "ml-distance-euclidean";

// Custom classes/types imports
import { System } from './System';
import { session } from '../@types/session';
import { Normalize } from '@/@types/graphConfigs';
import { PCATrace, Row } from '@/@types/preload';
import { Import } from '@/@types/import';
import { ImportDF } from '@/classes/importDF';

const userDataPath = (electron.app || electron.remote.app).getPath('userData');
const CONST_COLUMNS = ['File name', 'Sample'];
const PREDICT_CSV = "predict.csv";
const DF_CSV = "dataframe.csv";
const DISTANCE_CSV = "distance_matrix.csv";

export class Session {
    session: session;
    system: System;

    constructor(session: session) {
        this.session = session;
        this.system = new System();
    }

    sessionDir(): string {
        return Path.join(userDataPath, 'sessions', this.session.name);
    }

    predictDir(): string {
        return Path.join(this.sessionDir(), PREDICT_CSV);
    }


    createSessionDir(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.system.createDir(['sessions']).then(() => {
                resolve(this.system.createDir(['sessions', this.session.name]));
            }).catch((err) => {
                reject(console.error(err));
            })
        })
    }

    saveSessionFile(fileName: string) {
        return new Promise((reject, resolve) => {
            return fs.writeFile(Path.join(this.sessionDir(), fileName), JSON.stringify(this.session), (err) => {
                if (err) {
                    reject(console.error(`Error - unable to save session file ${fileName}`, err));
                }
                resolve(console.log(`Info file ${fileName} successfully created!`));
            })
        })
    }

    deleteSession() {
        return new Promise((resolve, reject) => {
            resolve(this.system.deleteDir(this.sessionDir()))
        })
    }

    exportData(dest: string) {
        //TODO not done with this function
        let newDir = Path.join(dest, this.session.name)
        fs.mkdir(newDir, (err) => {
            if (err) {
                console.error(err);
            } else {
                const pcaFiles = ['predict.csv', 'eigen_values.csv', 'eigen_vectors.csv', 'explained_variance.csv', 'loadings.csv'];
                const hcaFiles = ['distance_matrix.csv']// 'indices.csv']; //TODO
                const filePrefix = `${this.session.name}_${createTimestamp()}`;

                //TODO meta file
                pcaFiles.forEach((file) => {
                    exportFile(Path.join(this.sessionDir(), file), Path.join(newDir, `${filePrefix}_PCA_${this.session.predict_normalize}_${file}`))
                })

                hcaFiles.forEach((file) => {
                    exportFile(Path.join(this.sessionDir(), file), Path.join(newDir, `${filePrefix}_HCA_${this.session.distance_normalize}_${file}`))
                })
            }
        });
    }

    readImportDataframe(withClasses: boolean = false, withDimensions: boolean = false): Promise<Import> {
        // TODO THIS FUNCTION IS CAUSING LARGE DATASET TO FREEZE
        let importObj: Import = { matrix: [] }

        return new Promise((resolve, reject) => {
            if (this.sessionDir()) {
                return readFile(Path.join(this.sessionDir(), DF_CSV)).then((data) => {
                    let fileContent = data as string[][];

                    if (!fileContent.length) throw new Error("Session dataframe is empty");
                    let columns = fileContent.shift() as string[];
                    let df = new DataFrame(data, columns);

                    if (withClasses) df = df.withColumn('Sample', (row: any) => row.get('Sample') + ' ' + row.get('File name'))
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
                }).catch((err) => {
                    reject(console.error(err));
                })
            }
        });
    }

    createPredictMatrix(matrix: number[][], pcaMethod: "SVD" | "NIPALS" | "covarianceMatrix" | undefined) {
        const labels = this.session.labelNames;
        const files = this.session.fileNames;
        // TODO const dim_count = this.session.dimension_count;
        const dim_count = 3;

        return new Promise((resolve, reject) => {
            if (labels && files && dim_count) {
                const pca = new PCA(matrix, { method: pcaMethod, center: true });
                savePCAData(pca, this.sessionDir(), this.session.dimension_count);
                let pcaMatrix = pca.predict(matrix, { nComponents: dim_count }); // TODO large dataset breaks here
                console.log('Creating PCA predict matrix');
                let rows = [];

                for (let i = 0; i < files.length; i++) {
                    for (let j = 0; j < labels.length; j++) {
                        let pcaDimensions = Array.prototype.slice.call(pcaMatrix.to2DArray()[j + i * labels.length]);
                        let row = [files[i], labels[j]].concat(pcaDimensions)
                        rows.push(row)
                    }
                }

                let columns = CONST_COLUMNS.concat(range(0, dim_count));
                const df = new DataFrame(rows, columns);
                console.log('Creating PCA csv file');
                resolve(df.toCSV(true, this.predictDir()));
            }
            reject();
        })
    }

    readPredictMatrix(dimensions: number, normalize_type: Normalize) {
        return new Promise((resolve, reject) => {
            console.log('SESSION EXISTS, IN READPREDICTMATRIX');
            const predict_dir = this.predictDir();

            if (fs.existsSync(predict_dir) && (!this.session.predict_normalize || this.session.predict_normalize == normalize_type)) {
                console.log('JUST RETURNING FILE');
                resolve(parsePredictFile(dimensions, predict_dir));
            } else {
                console.log('NEED TO CREATE PREDICT FILE'); //TODO UP TO THIS POINT IT FREEZES UP (synchronous)

                // Perform normalization and return new predict matrix
                return this.readImportDataframe().then((importObj) => {
                    // Normalize data
                    console.log('READ IMPORT DF');

                    const importDF = new ImportDF(this.session, false, false);
                    const matrix = importDF.normalizeData(importObj.matrix, normalize_type);
                    const pcaMethod = "SVD"; // Others: "SVD", "covarianceMatrix", "NIPALS", undefined

                    if (this.session.fileNames && this.session.labelNames && this.session.dimension_count) {
                        console.log('GONNA READ FROM NEWLY CREATED PREDICT FILE');

                        //TODO changing dimensions for large dataset

                        return this.createPredictMatrix(matrix.to2DArray(), pcaMethod).then(() => {
                            //TODO JUST RETURN NEW MATRIX, DON'T READ FILE AGAIN
                            resolve(parsePredictFile(dimensions, predict_dir));
                        }).catch((err) => {
                            reject(err);
                        })
                    } else {
                        reject('Cannot create and read predict file');
                    }
                })
            }
        });
    }

    readDistanceMatrix(matrix: number[][], classes: string[], normalize_type: Normalize): Promise<number[][]> {
        const distance_path = Path.join(this.sessionDir(), DISTANCE_CSV);

        return new Promise((resolve, reject) => {
            // Check if distance matrix has already been computed
            if (fs.existsSync(distance_path) && (!this.session.distance_normalize || this.session.distance_normalize == normalize_type)) {
                readFile(distance_path).then((data) => {
                    // Parse previously saved distance matrix
                    let distMatrix = data as any[][];
                    distMatrix.shift() // Remove columns
                    distMatrix.forEach((row) => {
                        row.splice(0, 1) // Remove class label from each row
                    })
                    resolve(distMatrix);
                }).catch((err) => {
                    console.error('Failed to read distance matrix file', err);
                    reject();
                })
            } else {
                this.createDistanceMatrix(matrix, classes).then((distMatrix) => {
                    resolve(distMatrix);
                })
            }
        })
    }

    createDistanceMatrix(matrix: number[][], classes: string[]): Promise<number[][]> {
        const distMatrix = distanceMatrix(matrix, euclidean);

        var exportMatrix: any[] = [[' ', ...classes]];
        for (let i = 0; i < distMatrix.length; i++) {
            let row = distMatrix[i];
            exportMatrix.push([classes[i], ...row]);
        }

        return new Promise((resolve, reject) => {
            return fs.writeFile(Path.join(this.sessionDir(), DISTANCE_CSV), arrayToCSV(exportMatrix), (err) => {
                if (err) console.error('Unable to save distance matrix file', err);
                else console.log('Distance matrix file successfully created!');
                resolve(distMatrix);
            })
        })
    }
}

//TODO
function range(start: number, end: number): string[] {
    const length = end - start;
    return Array.from({ length }, (_, i) => (start + i).toString());
}

function parsePredictFile(dimensions: number, dir: string): Promise<PCATrace[]> {
    let traces: PCATrace[] = []

    return new Promise((resolve, reject) => {
        readFile(dir).then((data) => {
            let fileContent = data as string[][];
            let columns = fileContent.shift();
            const df = new DataFrame(data, columns);

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
    })
}

function readFile(path: string) {
    return new Promise(function (resolve, reject) {
        fs.readFile(path, 'utf8', function (err: any, data: any) {
            if (err) {
                console.log(err);
                resolve("");
            } else {
                csvParse(data, { trim: true, bom: true }, function (err: any, rows: string[][]) {
                    resolve(rows);
                })
            }
        });
    });
}

function savePCAData(pca: PCA, dir: string, dim_count: number | undefined) {
    if (!dim_count) throw new Error('Unable to save PCA data, dimension count is undefined');
    const dim_array = range(0, dim_count)

    let pcaObj: { [key: string]: any } = {
        'eigen_vectors.csv': arrayToCSV([dim_array, ...pca.getEigenvectors().to2DArray()]),
        'eigen_values.csv': arrayToCSV([dim_array, pca.getEigenvalues()]),
        'explained_variance.csv': arrayToCSV([dim_array, pca.getExplainedVariance()]),
        'loadings.csv': arrayToCSV([dim_array, ...pca.getLoadings().to2DArray()])
    }
    for (let fileName in pcaObj) {
        fs.writeFileSync(Path.join(dir, fileName), pcaObj[fileName].toString());
    }
}

function arrayToCSV(array: any[][], delimiter = ',') {
    return array.map(row => row.join(delimiter)).join('\n');
}

//TODO probably move to system
function exportFile(src: string, dest: string) {
    fs.copyFile(src, dest, (err) => {
        if (err) {
            console.error(err);
        }
    })
}

function createTimestamp(): string {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth() + 1
        }-${date.getDate()}T${date.toLocaleTimeString("it-IT").replaceAll(':', '.')}`;
}