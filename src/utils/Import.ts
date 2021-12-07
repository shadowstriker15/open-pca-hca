import fs from 'fs';
import csvParse from 'csv-parse';
import xlsxParse from 'xlsx';
import DataFrame from 'dataframe-js';
import Path from 'path';

import { session } from "@/@types/session";
import { System } from "./System";
import { Session } from './Session';
import { Store } from '@/utils/Store';
import { ColumnImport, ExportRow, RowImport } from '@/@types/import';
import { ColumnMatrix } from '@/interfaces/Column/Matrix';

const DF_CSV = "dataframe.csv";
const CONST_COLUMNS = ['File name', 'Sample'];

export class Import {
    Session: Session;
    System: System;
    Store: Store

    constructor(session: Session) {
        this.Session = session;
        this.System = new System();
        this.Store = new Store();
    }

    parseXLSXFile(path: string, isLabel: boolean = false, labelNames: string[] = []) {
        return new Promise(async (resolve, reject) => {
            const workbook = xlsxParse.readFile(path);
            const parsedData = xlsxParse.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
                raw: false,
                header: isLabel ? 1 : labelNames,
                dateNF: 'yyyy-mm-dd',
                blankrows: false,
            }) as string[][];

            if (isLabel) {
                resolve(([] as string[]).concat(...parsedData));
            } else if (await this.isRunValid("column", labelNames.length, parsedData)) { // xlsx parse always return data in 'column' format (object)
                resolve(parsedData);
            } else {
                console.error('XLSX file is not valid');
                reject();
            }
        })
    }

    parseCSVLabel(path: string, dataFormat: 'column' | 'row', isTxt: boolean = false) {
        return new Promise(function (resolve, reject) {
            fs.readFile(path, 'utf8', function (err: any, data: any) {
                if (err) return console.error('ERROR: ', err);

                csvParse(data, { columns: false, trim: true, bom: true, skipEmptyLines: true, ltrim: true }, function (err: any, rows: any) {
                    if (err) return console.error('ERROR: ', err);
                    resolve([].concat(...rows));
                })
            })
        });
    }

    parseCSVRun(path: string, dataFormat: 'column' | 'row', labelNames: string[], isTxt: boolean = false) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, 'utf8', (err: any, data: any) => {
                if (err) {
                    console.log(err);
                    resolve("");
                } else {
                    csvParse(data, { columns: dataFormat == 'column' ? labelNames : false, trim: true, bom: true, skipEmptyLines: true, ltrim: true }, (err: any, rows: string[][]) => {
                        // TODO MAKE SURE TO ACCOUNT FOR BLANK LINES AT BOTTOM
                        if (err) {
                            reject(console.error('Failed parsing run file', err));
                        } else {
                            if (isTxt && dataFormat == 'row') {
                                let parsedRows: string[][] = []
                                rows.forEach(row => {
                                    parsedRows.push(row[0].split(/[ ,	]+/))
                                })
                                rows = parsedRows
                            }
                            if (this.isRunValid(dataFormat, labelNames.length, rows)) resolve(rows);
                            else reject();
                        }
                    })
                }
            });
        });
    }

    isRunValid(dataFormat: 'column' | 'row', labelLen: number, data: string[][]) {
        let dim_count = null;
        let session = {
            name: "",
            created_date: "",
            type: null,
        } as session;

        // let sessionStr = localStorage.getItem("creatingSession");
        let creatingSession = this.Store.get("creatingSession");
        if (creatingSession) {
            dim_count = creatingSession.dimension_count;
        }

        const computed_dim_count = getDimensionCount(data, dataFormat);

        if (!dim_count) {
            creatingSession.dimension_count = computed_dim_count
            // localStorage.setItem("creatingSession", JSON.stringify(session));
            this.Store.set("creatingSession", creatingSession);
        }
        // Check if the run's dimension count is consistent
        if (dim_count && (computed_dim_count != dim_count)) return false;

        if (dataFormat == 'column') {
            return data.every(row => Object.keys(row).length == labelLen);
        } else if (dataFormat == "row") {
            return data.length == labelLen;
        }
        return false;
    }

    createRunPromises(runs: string[], labelNames: string[], dataFormat: 'column' | 'row') {
        let runPromises = runs.map((path) => {
            return new Promise((resolve, reject) => {
                switch (extractExtension(path)) {
                    case 'xlsx':
                        resolve(this.parseXLSXFile(path, false, labelNames));
                        break;
                    case 'csv':
                        resolve(this.parseCSVRun(path, dataFormat, labelNames));
                        break;
                    case 'txt':
                        resolve(this.parseCSVRun(path, dataFormat, labelNames, true));
                        break;
                    default:
                        console.error('Read an unsupported extension');
                        reject();
                }
            });
        });
        return runPromises;
    }

    /**
    * Store the row-formatted imported data
    * @param data The row-formatted imported data to be stored
    * @param labelNames An array of the imported labels
    * @param fileNames An array of the file names imported
    * @returns
    * @author: Austin Pearce
    */
    storeRowImport(data: RowImport, labelNames: string[], fileNames: string[], dimension_count: number) {
        var newRows: ExportRow[] = []
        for (let fileIndex = 0; fileIndex < data.length; fileIndex++) { // Loop through files
            let fileRows = data[fileIndex];

            for (let rowIndex = 0; rowIndex < fileRows.length; rowIndex++) { // Loop through rows
                let sampleDims = fileRows[rowIndex];
                let newRow: ExportRow = { 'File name': fileNames[fileIndex], 'Sample': labelNames[rowIndex] }

                for (let sampleIndex = 0; sampleIndex < sampleDims.length; sampleIndex++) { // Loop through samples in row
                    newRow[sampleIndex + 1] = sampleDims[sampleIndex]; // Offset to start at 1 rather than 0
                }
                newRows.push(newRow)
            }
        }

        let columns = CONST_COLUMNS.concat(range(1, dimension_count + 1))

        const df = new DataFrame(newRows, columns)
        const sessionDir = this.Session.sessionDir();
        df.toCSV(true, Path.join(sessionDir, DF_CSV))
    }

    /**
    * Store the column-formatted imported data
    * @param data The column-formatted imported data to be stored
    * @param labelNames An array of the imported labels
    * @param fileNames An array of the file names imported
    * @returns
    * @author: Austin Pearce
    */
    storeColumnImport(data: ColumnImport, labelNames: string[], fileNames: string[], dimension_count: number): void {
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
                    storedRow[rowIndex + 1] = sampleRow[labelNames[sampleIndex]] // Offset to start at 1 rather than 0
                    columnMatrix.files[fileNames[fileIndex]].samples[labelNames[sampleIndex]] = storedRow
                }
            }
        }

        let columns = CONST_COLUMNS.concat(range(1, dimension_count + 1));
        var newRows: ExportRow[] = [];

        for (let fileIndex = 0; fileIndex < fileNames.length; fileIndex++) {
            for (let sampleIndex = 0; sampleIndex < labelNames.length; sampleIndex++) { //TODO Can improve this
                newRows.push(columnMatrix.files[fileNames[fileIndex]].samples[labelNames[sampleIndex]]);
            }
        }

        const df = new DataFrame(newRows, columns)
        const sessionDir = this.Session.sessionDir();
        df.toCSV(true, Path.join(sessionDir, DF_CSV))
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
    storeImport(data: RowImport | ColumnImport, labelNames: string[], fileNames: string[], dimension_count: number, dataFormat: 'column' | 'row'): void {
        if (dataFormat == 'row') this.storeRowImport(data as RowImport, labelNames, fileNames, dimension_count);
        else this.storeColumnImport(data as ColumnImport, labelNames, fileNames, dimension_count);
    }

    createDataframe(label: string, runs: string[], dataFormat: 'column' | 'row') {
        let labelPromise = new Promise((resolve, reject) => {
            switch (extractExtension(label)) {
                case 'xlsx':
                    resolve(this.parseXLSXFile(label, true));
                    break;
                case 'csv':
                    resolve(this.parseCSVLabel(label, dataFormat));
                    break;
                case 'txt':
                    resolve(this.parseCSVLabel(label, dataFormat, true));
                    break;
                default:
                    reject("ERROR - Unsupported file extension");
                    break;
            }
        });

        return new Promise<session>((resolve, reject) => {
            labelPromise.then((response) => {
                let labelNames = response as string[];
                const runPromises = this.createRunPromises(runs, labelNames, dataFormat);

                return Promise.all(runPromises).then((res: any) => {
                    let fileNames = runs.map(run => extractFilename(run))
                    const dimension_count = getDimensionCount(res[0], dataFormat)

                    // Update session info
                    this.Session.session.dimension_count = dimension_count;
                    this.Session.session.fileNames = fileNames;
                    this.Session.session.labelNames = labelNames;

                    this.Session.saveInfo('session', this.Session.session);

                    this.storeImport(res, labelNames, fileNames, dimension_count, dataFormat);
                    console.log('Done storing import');
                    resolve(this.Session.session);
                }).catch((err) => {
                    console.error('Failed parsing runs', err);
                    reject();
                })
            }).catch((err) => {
                console.error(err);
            })
        })
    }
}

/**
 * Extract extension from given filename
 * @param filename Filename
 * @return Extracted file extension
 */
function extractExtension(filename: string) {
    return filename.substring(filename.indexOf('.') + 1);
}

/**
 * Extract filename from given path
 * @param path File path
 * @return Extracted filename
 */
function extractFilename(path: string) {
    return path.substring(path.lastIndexOf('\\') + 1)
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