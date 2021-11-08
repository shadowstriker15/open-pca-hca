import electron from 'electron';
import Path from 'path';
import fs from 'fs';

interface StoreOpts {
    configName: string
    defaults: any
}

const userDataPath = (electron.app || electron.remote.app).getPath('userData');

export class Store {
    data: any;
    path: string;

    constructor(opts: StoreOpts) {
        this.path = Path.join(userDataPath, opts.configName + '.json');
        this.data = parseDataFile(this.path, opts.defaults);
    }

    get(key: string) {
        return this.data[key];
    }

    set(key: string, value: any) {
        this.data[key] = value;
        try {
            fs.writeFileSync(this.path, JSON.stringify(this.data));
        } catch (error) {
            console.error(`Failed to save value '${value}' for '${key}' in user data`);
        }

    }

    createDir(directory: string[]): Promise<any> {
        let path = Path.join(userDataPath, ...directory);
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

    createSessionDir(session: string): Promise<any> {
        let that = this
        return new Promise(function (resolve, reject) {
            that.createDir(['sessions']).then(() => {
                resolve(that.createDir(['sessions', session]));
            }).catch((err) => {
                reject(console.error(err));
            })
        })
    }

    getDirectory(directory: string[]): string {
        return Path.join(userDataPath, ...directory);
    }

    saveSessionFile(sessionStr: string, fileName: string) {
        return new Promise(function (reject, resolve) {
            const sessionObj = JSON.parse(sessionStr);
            fs.writeFile(Path.join(userDataPath, 'sessions', sessionObj['name'], fileName), sessionStr, (err) => {
                if (err) {
                    reject(console.error(err));
                }
                resolve(console.log('Info file created successfully!'));
            })
        })
    }

    deleteSession(session: string) {
        const path = Path.join(userDataPath, 'sessions', session);
        return new Promise(function (resolve, reject) {
            resolve(removeDir(path))
        })
    }

    exportData(sessionStr: string, dest: string) {
        //TODO not done with this function
        let newDir = Path.join(dest, sessionStr)
        fs.mkdir(newDir, (err) => {
            if (err) {
                console.error(err);
            } else {
                fs.copyFile(this.getDirectory(['sessions', sessionStr, 'dataframe.csv']), Path.join(newDir, 'dataframe.csv'), (err) => {
                    if (err) {
                        console.error(err);
                    }
                })
            }
        });
    }
}

function parseDataFile(filePath: string, defaults: JSON): JSON {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return defaults;
    }
}

function removeDir(path: string) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (entry) {
            var entry_path = Path.join(path, entry);
            if (fs.lstatSync(entry_path).isDirectory()) {
                removeDir(entry_path);
            } else {
                fs.unlinkSync(entry_path);
            }
        });
        fs.rmdirSync(path);
    }
}