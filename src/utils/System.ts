import electron from 'electron';
import Path from 'path';
import fs from 'fs';

import csvParse from 'csv-parse';

const userDataPath = (electron.app || electron.remote.app).getPath('userData');

export class System {

    /**
    * Returns the absolute path for a session
    * @param path The session relative path
    * @returns The absolute path
    * @author: Austin Pearce
    */
    getAbsPath(path: string[]) {
        return Path.join(userDataPath, ...path);
    }

    /**
    * Creates a directory
    * @param directory An array of strings to represent a directory (relative to session)
    * @returns Promise of creation
    * @author: Austin Pearce
    */
    createDir(directory: string[]): Promise<any> {
        let path = this.getAbsPath(directory)

        return new Promise((resolve, reject) => {
            if (!fs.existsSync(path)) {
                fs.mkdir(path, { recursive: true }, (err) => {
                    if (err) {
                        reject(console.error(err));
                    }
                    console.log('Directory created successfully!')
                    resolve(path);
                });
            }
            resolve(path);
        })
    }

    /**
    * Deletes a directory
    * @param path The path to delete (recursively)
    * @author: Austin Pearce
    */
    deleteDir(path: string): void {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((entry) => {
                var entry_path = Path.join(path, entry);
                if (fs.lstatSync(entry_path).isDirectory()) {
                    this.deleteDir(entry_path);
                } else {
                    fs.unlinkSync(entry_path);
                }
            });
            fs.rmdirSync(path);
        }
    }

    /**
    * Creates a file
    * @param path The path to create the new file
    * @param data The data to add to the new file
    * @returns Promise of creation
    * @author: Austin Pearce
    */
    createFile(path: string, data: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(path, JSON.stringify(data), (err) => {
                if (err) {
                    console.error(`Unable to create/update file at ${path}`, err)
                    reject();
                }
                console.log(`File successfully created/updated at ${path}!`)
                resolve();
            })
        })
    }

    /**
    * Reads a given file
    * @param path The path to the file to read
    * @returns Promise of file's content
    * @author: Austin Pearce
    */
    readFile(path: string): Promise<any> {
        return new Promise(function (resolve, reject) {
            fs.readFile(path, 'utf8', function (err: any, data: any) {
                if (err) {
                    reject(console.log(`Failed to read from ${path}`, err));
                } else {
                    const ext = path.substr(path.lastIndexOf('.') + 1);
                    switch (ext) {
                        case 'json': {
                            if (data) resolve(JSON.parse(data));
                            break;
                        }
                        case 'csv': {
                            csvParse(data, { trim: true, bom: true }, function (err: any, rows: string[][]) {
                                if (err) {
                                    reject(console.error(err));
                                }
                                resolve(rows);
                            })
                            break;
                        }
                        default:
                            throw new Error(`Invalid file type attempted to parse: ${ext}`);
                    }
                }
            });
        });
    }

    /**
    * Checks to see if a given file exists
    * @param path The path to the file to check if exists
    * @returns Whether the file exists or not
    * @author: Austin Pearce
    */
    fileExists(path: string): boolean {
        return fs.existsSync(path);
    }

    /**
    * Saves a file to a given destination
    * @param src Whether the original file is located
    * @param dst Where to create the new file at
    * @returns Promise of creation
    * @author: Austin Pearce
    */
    exportFile(src: string, dst: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Check if file exists before attempting to export
            if (this.fileExists(src)) {
                fs.copyFile(src, dst, (err) => {
                    if (err) {
                        console.error(`Failed to copy file ${src} to ${dst}`, err);
                        reject();
                    } else {
                        resolve();
                    }
                })
            } else {
                console.warn(`WARNING: Can't export file ${src} as it doesn't exists`)
                resolve();
            }
        })
    }
}