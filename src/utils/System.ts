import electron from 'electron';
import Path from 'path';
import fs from 'fs';

import csvParse from 'csv-parse';

const userDataPath = (electron.app || electron.remote.app).getPath('userData');

export class System {

    getAbsPath(path: string[]) {
        return Path.join(userDataPath, ...path);
    }

    createDir(directory: string[]): Promise<any> {
        let path = this.getAbsPath(directory)

        return new Promise(function (resolve, reject) {
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

    deleteDir(path: string) {
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

    createFile(fileName: string, data: any) {
        return new Promise((reject, resolve) => {
            return fs.writeFile(this.getAbsPath([fileName]), JSON.stringify(data), (err) => {
                if (err) {
                    reject(console.error(`Unable to create file ${fileName}`, err));
                }
                resolve(console.log(`File ${fileName} successfully created!`));
            })
        })
    }

    readFile(path: string): Promise<any> {
        return new Promise(function (resolve, reject) {
            fs.readFile(path, 'utf8', function (err: any, data: any) {
                if (err) {
                    reject(console.log(`Failed to read from ${path}`, err));
                } else {
                    const ext = path.substr(path.lastIndexOf('.') + 1);
                    switch (ext) {
                        case 'json': {
                            resolve(JSON.parse(data));
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

    exportFile(src: string, dest: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Check if file exists before attempting to export
            if (fs.existsSync(src)) {
                fs.copyFile(src, dest, (err) => {
                    if (err) {
                        console.error(`Failed to copy file ${src} to ${dest}`, err);
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