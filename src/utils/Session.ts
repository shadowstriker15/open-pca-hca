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
import { PCATrace, Row } from '@/@types/import';
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

    /**
    * Get the session's directory
    * @returns The session's directory
    * @author: Austin Pearce
    */
    sessionDir(): string {
        return this.System.getAbsPath(['sessions', this.session.name]);
    }

    /**
    * Get the session's predict file's path
    * @returns The predict file's path
    * @author: Austin Pearce
    */
    predictDir(): string {
        return Path.join(this.sessionDir(), PREDICT_CSV);
    }

    /**
    * Get the session's info file's path
    * @returns The info file's path
    * @author: Austin Pearce
    */
    infoPath(): string {
        return Path.join(this.sessionDir(), INFO_JSON);
    }

    /**
    * Create the directory for the session
    * @returns Promise of creation
    * @author: Austin Pearce
    */
    createSessionDir(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.System.createDir(['sessions']).then(() => {
                resolve(this.System.createDir(['sessions', this.session.name]));
            }).catch((err) => {
                reject(console.error(err));
            })
        })
    }

    /**
    * Save info the the session's info file
    * @param key The key to save to
    * @param value The new value to save to the key
    * @returns Promise of saving
    * @author: Austin Pearce
    */
    saveInfo(key: string, value: any): Promise<unknown> {
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

    /**
    * Get a value from the session's info file
    * @param key The key to retrieve the value of
    * @returns Promise of the info data
    * @author: Austin Pearce
    */
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

    /**
    * Delete the current session
    * @returns Promise of deletion
    * @author: Austin Pearce
    */
    deleteSession() {
        return new Promise((resolve, reject) => {
            resolve(this.System.deleteDir(this.sessionDir()))
        })
    }

    /**
    * Export the session's data
    * @param dest The destination to export data to
    * @returns Promise of export
    * @author: Austin Pearce
    */
    exportData(dest: string): Promise<void> {
        let newDir = Path.join(dest, this.session.name);

        return new Promise((resolve, reject) => {
            fs.mkdir(newDir, { recursive: true }, (err: any) => {
                if (err) {
                    console.error('Failed to export; Received error while creating directory for export:', err);
                    reject();
                } else {
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

    /**
    * Creates the files that is requested
    * @param src The file to be requested
    * @returns Promise of the request
    * @author: Austin Pearce
    */
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

    /**
    * Exports a session file
    * @param src The source of the file to export
    * @param dst The destination to save the file to
    * @returns Promise of export
    * @author: Austin Pearce
    */
    async exportFile(src: string, dst: string): Promise<void> {
        if (this.System.fileExists(src)) {
            return this.System.copyFile(src, dst);
        } else {
            await this.requestFile(extractFilename(src) as ExportFiles);
            return await this.System.copyFile(src, dst);
        }
    }

    /**
    * Returns the session's import dataframe
    * @param withClasses Whether to return the classes in the matrix
    * @param withDimensions Whether to return an array of dimensions
    * @param withFilenames Whether to return an array of run filenames
    * @param withLabels Whether to return an array of the labels (samples)
    * @returns The session's import dataframe
    * @author: Austin Pearce
    */
    readImportDataframe(withClasses: boolean = false, withDimensions: boolean = false, withFilenames: boolean = false, withLabels: boolean = false): Promise<Import> {
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
                    const matrix = df.select(...columns.filter(col => !excludeColumns.includes(col))).toArray();
                    importObj.matrix = matrix;

                    if (withDimensions) importObj.dimensionLabels = columns.filter(col => !CONST_COLUMNS.includes(col));
                    if (withLabels) importObj.labels = df.distinct('Sample').toArray('Sample');
                    if (withFilenames) importObj.filenames = df.distinct('File name').toArray('File name');

                    resolve(importObj)
                }).catch((err) => {
                    reject(console.error(err));
                })
            }
        });
    }

    /**
    * Creates the predict matrix
    * @param matrix The Matrix class instance of the import
    * @param pcaMethod The PCA method to use
    * @returns Promise of saving predict matrix file
    * @author: Austin Pearce
    */
    createPredictMatrix(matrix: Matrix, pcaMethod: "SVD" | "NIPALS" | "covarianceMatrix" | undefined): Promise<unknown> {
        const labels = this.session.labelNames;
        const files = this.session.fileNames;
        //const dim_count = this.session.dimension_count; // TODO breaking for large datasets 
        const dim_count = 3;

        return new Promise((resolve, reject) => {
            if (labels && files && dim_count) {
                const pca = new PCA(matrix, { method: pcaMethod, center: true });
                savePCAData(pca, this.sessionDir(), this.session.dimension_count);

                let pcaMatrix = pca.predict(matrix, { nComponents: dim_count });
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

    /**
    * Read the predict matrix
    * @param dimensions The requested dimensions
    * @param normalize_type The type of normalization requested
    * @returns Promise of predict matrix
    * @author: Austin Pearce
    */
    readPredictMatrix(dimensions: number, normalize_type: Normalize): Promise<PCATrace[]> {
        return new Promise((resolve, reject) => {
            if (this.System.fileExists(this.predictDir()) && (!this.session.predict_normalize || this.session.predict_normalize == normalize_type)) {
                console.log('Predict file already exists');
                resolve(parsePredictFile(this, dimensions));
            } else {
                console.log('Creating predict file');
                resolve(this.initCreatePredictMatrix(normalize_type, true, dimensions));
            }
        });
    }

    /**
    * Initiate the creation of the predict matrix
    * @param normalize_type The type of normalization requested
    * @param parseMatrix Whether to parse the matrix
    * @param dimensions The requested dimensions 
    * @returns Promise of the traces
    * @author: Austin Pearce
    */
    initCreatePredictMatrix(normalize_type: Normalize, parseMatrix: boolean = false, dimensions?: number): Promise<PCATrace[]> {
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

    /**
    * Reads the session's distance matrix
    * @param matrix The session's matrix of data
    * @param classes The session's classes
    * @param normalize_type The type of normalization requested
    * @returns The distance matrix
    * @author: Austin Pearce
    */
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

    /**
    * Create the distance matrix for the session (using Euclidean)
    * @param matrix The matrix of numbers for the session
    * @param classes The classes of the session
    * @returns Promise of the distance matrix
    * @author: Austin Pearce
    */
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

/**
* Create a range of string numbers
* @param start
* @param end
* @returns An array of string numbers specified by range
* @author: Austin Pearce
*/
function range(start: number, end: number, type: 'string' | 'number' = 'string'): string[] | number[] {
    const length = end - start;
    if (type == 'string') return Array.from({ length }, (_, i) => (start + i).toString());
    return Array.from({ length }, (_, i) => (start + i));
}

/**
* Parses the PCA predict file
* @param session The session to parse predict file for
* @param dimensions The amount of dimensions to request for
* @returns Promise of the data formatted into traces
* @author: Austin Pearce
*/
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

/**
* Save additional PCA data
* @param pca The PCA class instance to get data from
* @param dir The directory to save the data to
* @param dim_count The dimension count for the session
* @author: Austin Pearce
*/
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

/**
* Converts an array to a CSV-friendly format
* @param array The array to convert
* @param delimiter How to format the data
* @returns The CSV formatted data
* @author: Austin Pearce
*/
function arrayToCSV(array: any[][], delimiter = ','): string {
    return array.map(row => row.join(delimiter)).join('\n');
}

/**
* Creates a timestamp for the current time
* @returns Newly created timestamp
* @author: Austin Pearce
*/
function createTimestamp(): string {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth() + 1
        }-${date.getDate()}T${date.toLocaleTimeString("it-IT").replaceAll(':', '.')}`;
}

/**
* Mapping for setting a name for an export file
* @param file The file to find the export name for
* @returns The name to use for the export
* @author: Austin Pearce
*/
function getExportName(file: string): string {
    switch (file) {
        case 'predict.csv': {
            return 'PC_values.csv'
        }
        default:
            return file;
    }
}

/**
 * Extract the filename from passed path
 * @param path The absolute path of a file
 * @returns Filename extracted from path
 * @author: Austin Pearce
 */
function extractFilename(path: string) {
    return path.substring(path.lastIndexOf('\\') + 1)
}