import electron from 'electron';
import Path from 'path';
import fs from 'fs';

import DataFrame from 'dataframe-js';
import { PCA } from 'ml-pca';
import csvParse from 'csv-parse';

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
            fs.writeFile(Path.join(this.sessionDir(), fileName), JSON.stringify(this.session), (err) => {
                if (err) {
                    reject(console.error(err));
                }
                resolve(console.log('Info file created successfully!'));
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
                fs.copyFile(this.system.getDirectory(['sessions', this.session.name, 'dataframe.csv']), Path.join(newDir, 'dataframe.csv'), (err) => {
                    if (err) {
                        console.error(err);
                    }
                })
            }
        });
    }

    readImportDataframe(withClasses: boolean = false, withDimensions: boolean = false): Promise<Import> {
        let importObj: Import = { matrix: [] }

        return new Promise(async (resolve, reject) => {
            if (this.sessionDir()) {
                readFile(Path.join(this.sessionDir(), DF_CSV)).then((data) => {
                    let fileContent = data as string[][];
                    let columns = fileContent.shift();
                    let df = new DataFrame(data, columns);

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

    createPredictMatrix(matrix: number[][], pcaMethod: "SVD" | "NIPALS" | "covarianceMatrix" | undefined) {
        const labels = this.session.labelNames;
        const files = this.session.fileNames;
        const dim_count = this.session.dimension_count;

        if (labels && files && dim_count) {
            const pca = new PCA(matrix, { method: pcaMethod });
            let pcaMatrix = pca.predict(matrix, { nComponents: dim_count }); // TODO large dataset breaks here
            console.log('Creating PCA predict matrix');
            let rows = [];

            for (let i = 0; i < files.length; i++) {
                for (let j = 0; j < labels.length; j++) {
                    let pcaDimensions = Array.prototype.slice.call(pcaMatrix.data[j + i * labels.length]);
                    let row = [files[i], labels[j]].concat(pcaDimensions)
                    rows.push(row)
                }
            }

            let columns = CONST_COLUMNS.concat(range(0, dim_count));
            const df = new DataFrame(rows, columns);
            console.log('Creating PCA csv file');
            return new Promise((resolve, reject) => {
                resolve(df.toCSV(true, this.predictDir()));
                reject();
            })
        }
    }

    readPredictMatrix(dimensions: number, normalize_type: Normalize) {
        return new Promise(async (resolve, reject) => {
            console.log('SESSION EXISTS, IN READPREDICTMATRIX');

            const predict_dir = this.predictDir();

            if (fs.existsSync(predict_dir) && (!this.session.predict_normalize || this.session.predict_normalize == normalize_type)) {
                console.log('JUST RETURNING FILE');
                resolve(parsePredictFile(dimensions, predict_dir));
            } else {
                console.log('NEED TO CREATE PREDICT FILE'); //TODO UP TO THIS POINT IT FREEZES UP (synchronous)

                // Perform normalization and return new predict matrix
                this.readImportDataframe().then((importObj) => {
                    // Normalize data
                    console.log('READ IMPORT DF');

                    const importDF = new ImportDF(this.session, false, false);
                    const matrix = importDF.normalizeData(importObj.matrix, normalize_type);
                    const pcaMethod = "SVD"; // Others: "SVD", "covarianceMatrix", "NIPALS", undefined

                    if (this.session.fileNames && this.session.labelNames && this.session.dimension_count) {
                        console.log('GONNA READ FROM NEWLY CREATED PREDICT FILE');

                        //TODO changing dimensions for large dataset

                        this.createPredictMatrix(matrix.to2DArray(), pcaMethod)?.then(() => {
                            //TODO JUST RETURN NEW MATRIX, DON'T READ FILE AGAIN
                            resolve(parsePredictFile(dimensions, predict_dir));
                        })
                    } else {
                        throw new Error(`Cannot create and read predict file`);
                    }
                })
            }
        });
    }
}

//TODO
function range(start: number, end: number): string[] {
    const length = end - start;
    return Array.from({ length }, (_, i) => (start + i).toString());
}

function parsePredictFile(dimensions: number, dir: string): Promise<PCATrace> {
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