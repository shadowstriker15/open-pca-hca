import Path from 'path';
import fs from 'fs';

// Library imports
import DataFrame from 'dataframe-js';
import { PCA } from 'ml-pca';
import distanceMatrix from "ml-distance-matrix";
import { euclidean } from "ml-distance-euclidean";
import { Matrix } from "ml-matrix";

// Custom classes/types imports
import { System } from './System';
import { session } from '../@types/session';
import { Normalize } from '@/@types/graphConfigs';
import { PCATrace, Row } from '@/@types/preload';
import { Import } from '@/@types/import';
import { ImportDF } from '@/classes/importDF';
import { DefaultGraphConfigs } from '@/defaultConfigs';

const CONST_COLUMNS = ['File name', 'Sample'];
const PREDICT_CSV = "predict.csv";
const DF_CSV = "dataframe.csv";
const DISTANCE_CSV = "distance_matrix.csv";
const INFO_JSON = 'info.json';

const pca_files = ['predict.csv', 'eigen_values.csv', 'eigen_vectors.csv', 'explained_variance.csv'] as const;
type PCAExports = (typeof pca_files)[number];

const hca_files = ['distance_matrix.csv']
type HCAExports = (typeof hca_files)[number];
const isPCAFile = (x: any): x is PCAExports => pca_files.includes(x);
const isHCAFile = (x: any): x is HCAExports => hca_files.includes(x);

type ExportFiles = HCAExports | PCAExports;

export class Session {
    session: session;
    System: System;

    constructor(session: session) {
        this.session = session;
        this.System = new System();
    }

    sessionDir(): string {
        return this.System.getAbsPath(['sessions', this.session.name]);
    }

    predictDir(): string {
        return Path.join(this.sessionDir(), PREDICT_CSV);
    }

    infoPath(): string {
        return Path.join(this.sessionDir(), INFO_JSON);
    }

    createSessionDir(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.System.createDir(['sessions']).then(() => {
                resolve(this.System.createDir(['sessions', this.session.name]));
            }).catch((err) => {
                reject(console.error(err));
            })
        })
    }

    saveInfo(key: string, value: any) {
        const path = this.infoPath();

        return new Promise((resolve, reject) => {
            if (this.System.fileExists(path)) {
                this.System.readFile(path).then((readInfo) => {
                    readInfo[key] = value;
                    resolve(this.System.createFile(path, readInfo));
                })
            } else {
                let info: { [key: string]: any } = { 'graphConfigs': DefaultGraphConfigs };
                info[key] = value;
                resolve(this.System.createFile(path, info));
            }
        })
    }

    getInfo(key: string): Promise<any | null> {
        const path = this.infoPath();

        return new Promise((resolve, reject) => {
            if (this.System.fileExists(path)) {
                this.System.readFile(path).then((info) => {
                    resolve(info[key]);
                }).catch((err) => {
                    console.error(`Failed to get '${key}' from session info file`);
                    reject(null);
                })
            } else {
                reject(null);
            }
        })
    }

    deleteSession() {
        return new Promise((resolve, reject) => {
            resolve(this.System.deleteDir(this.sessionDir()))
        })
    }

    exportData(dest: string): Promise<void> {
        //TODO not done with this function
        let newDir = Path.join(dest, this.session.name)
        return new Promise((resolve, reject) => {
            fs.mkdir(newDir, { recursive: true }, (err: any) => {
                if (err) {
                    console.error('Failed to export; Received error while creating directory for export:', err);
                    reject();
                } else {
                    //TODO still need indices
                    const filePrefix = `${this.session.name}_${createTimestamp()}`;

                    const exportFiles = {
                        PCA: {
                            files: ['predict.csv', 'eigen_values.csv', 'eigen_vectors.csv', 'explained_variance.csv'],
                            normalize_type: this.session.predict_normalize as Normalize
                        },
                        HCA: {
                            files: ['distance_matrix.csv'],
                            normalize_type: this.session.distance_normalize as Normalize
                        }
                    };

                    let exportPromises: Promise<void>[] = [
                        this.exportFile(Path.join(this.sessionDir(), DF_CSV), Path.join(newDir, [filePrefix, getExportName(DF_CSV)].join('_')))
                    ];

                    let type: keyof typeof exportFiles;
                    for (type in exportFiles) {
                        exportPromises = exportPromises.concat(exportFiles[type].files.map((file) => {
                            return this.exportFile(Path.join(this.sessionDir(), file), Path.join(newDir, [filePrefix, type, exportFiles[type].normalize_type, getExportName(file)].join('_')));
                        }));
                    }

                    Promise.all(exportPromises).then(() => {
                        console.log('Successfully exported session data');
                        resolve();
                    }).catch((err) => {
                        console.error('Failed to export session data', err);
                        reject();
                    })
                }
            });
        })
    }

    async requestFile(src: ExportFiles): Promise<any> {
        if (isPCAFile(src)) {
            return this.initCreatePredictMatrix(this.session.predict_normalize as Normalize, false);
        } else if (isHCAFile(src)) {
            const importDF = new ImportDF(this.session, true, false);
            const importObj = await this.readImportDataframe(true, false);
            const matrix = importDF.getNumbers(importObj.matrix);
            const classes = importDF.getClasses(importObj.matrix);
            return await this.createDistanceMatrix(matrix, classes);
        } else {
            return new Promise((resolve, reject) => reject(console.error(`Failed to request file ${src}`)));
        }
    }

    async exportFile(src: string, dst: string): Promise<void> {
        if (this.System.fileExists(src)) {
            return this.System.exportFile(src, dst);
        } else {
            await this.requestFile(extractFilename(src) as ExportFiles);
            return await this.System.exportFile(src, dst);
        }
    }

    readImportDataframe(withClasses: boolean = false, withDimensions: boolean = false): Promise<Import> {
        // TODO THIS FUNCTION IS CAUSING LARGE DATASET TO FREEZE
        let importObj: Import = { matrix: [] }

        return new Promise((resolve, reject) => {
            if (this.sessionDir()) {
                return this.System.readFile(Path.join(this.sessionDir(), DF_CSV)).then((data) => {
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

    createPredictMatrix(matrix: Matrix, pcaMethod: "SVD" | "NIPALS" | "covarianceMatrix" | undefined) {
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

                let dimensions = range(1, dim_count + 1) as string[];
                let dim_row = dimensions.map(dim => `PC${dim}`);
                let columns = CONST_COLUMNS.concat(dim_row);

                const df = new DataFrame(rows, columns);
                console.log('Creating PCA csv file');
                resolve(df.toCSV(true, this.predictDir()));
            }
            reject();
        })
    }

    readPredictMatrix(dimensions: number, normalize_type: Normalize) {
        return new Promise((resolve, reject) => {
            if (this.System.fileExists(this.predictDir()) && (!this.session.predict_normalize || this.session.predict_normalize == normalize_type)) {
                console.log('Predict file already exists');
                resolve(parsePredictFile(this, dimensions));
            } else {
                console.log('Creating predict file'); //TODO UP TO THIS POINT IT FREEZES UP (synchronous)
                resolve(this.initCreatePredictMatrix(normalize_type, true, dimensions));
            }
        });
    }

    initCreatePredictMatrix(normalize_type: Normalize, parseMatrix: boolean = false, dimensions?: number) {
        // Perform normalization and return new predict matrix
        return new Promise<PCATrace[]>(async (resolve, reject) => {
            const importObj = await this.readImportDataframe();
            // Normalize data
            console.log('Finished reading import dataframe');
            const importDF = new ImportDF(this.session, false, false);
            const matrix = importDF.normalizeData(importObj.matrix, normalize_type);
            const pcaMethod = "SVD"; // Others: "SVD", "covarianceMatrix", "NIPALS", undefined

            if (this.session.fileNames && this.session.labelNames && this.session.dimension_count) {
                console.log('About to read from newly created predict file');
                return this.createPredictMatrix(matrix, pcaMethod).then(() => {
                    //TODO JUST RETURN NEW MATRIX, DON'T READ FILE AGAIN
                    if (parseMatrix)
                        resolve(parsePredictFile(this, dimensions as number));
                    else
                        resolve([]);
                }).catch((err) => {
                    reject(err);
                });
            } else {
                reject('Cannot create and read predict file');
            }
        })
    }

    readDistanceMatrix(matrix: number[][], classes: string[], normalize_type: Normalize): Promise<number[][]> {
        const distance_path = Path.join(this.sessionDir(), DISTANCE_CSV);

        return new Promise((resolve, reject) => {
            // Check if distance matrix has already been computed
            if (this.System.fileExists(distance_path) && (!this.session.distance_normalize || this.session.distance_normalize == normalize_type)) {
                this.System.readFile(distance_path).then((data) => {
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
function range(start: number, end: number, type: 'string' | 'number' = 'string'): string[] | number[] {
    const length = end - start;
    if (type == 'string') return Array.from({ length }, (_, i) => (start + i).toString());
    return Array.from({ length }, (_, i) => (start + i));
}

function parsePredictFile(session: Session, dimensions: number): Promise<PCATrace[]> {
    let traces: PCATrace[] = []

    return new Promise((resolve, reject) => {
        session.System.readFile(session.predictDir()).then((data) => {
            let fileContent = data as string[][];
            let columns = fileContent.shift();
            const df = new DataFrame(data, columns);

            let labels: string[] = df.distinct('Sample').toArray('Sample')

            labels.forEach((label) => {
                let trace: PCATrace = { x: [], y: [], name: label, text: [] }
                if (dimensions == 3) trace.z = [];
                const matrix: Row[] = df.filter((row: any) => row.get('Sample') == label).toCollection();

                for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
                    let row = matrix[rowIndex];
                    trace.x.push(row.PC1);
                    trace.y.push(row.PC2);
                    trace.z?.push(row.PC3);
                    trace.text.push(row['File name'])
                }
                traces.push(trace);
            })
            resolve(traces)
        })
    })
}

function savePCAData(pca: PCA, dir: string, dim_count: number | undefined) {
    if (!dim_count) throw new Error('Unable to save PCA data, dimension count is undefined');
    const dim_array = range(1, dim_count + 1, 'number') as number[];
    const dim_row = dim_array.map(dim => `PC${dim}`)

    let pcaObj: { [key: string]: any } = {
        'eigen_vectors.csv': arrayToCSV([dim_array.map(dim => `ForPC${dim}`), ...pca.getEigenvectors().to2DArray()]),
        'eigen_values.csv': arrayToCSV([dim_row, pca.getEigenvalues()]),
        'explained_variance.csv': arrayToCSV([dim_row, pca.getExplainedVariance()])
    }
    for (let fileName in pcaObj) {
        fs.writeFileSync(Path.join(dir, fileName), pcaObj[fileName].toString());
    }
}

function arrayToCSV(array: any[][], delimiter = ',') {
    return array.map(row => row.join(delimiter)).join('\n');
}

function createTimestamp(): string {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth() + 1
        }-${date.getDate()}T${date.toLocaleTimeString("it-IT").replaceAll(':', '.')}`;
}

function getExportName(file: string): string {
    switch (file) {
        case 'predict.csv': {
            return 'PC_values.csv'
        }
        default:
            return file;
    }
}

function extractFilename(path: string) {
    return path.substring(path.lastIndexOf('\\') + 1)
}