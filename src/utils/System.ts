import electron from 'electron';
import Path from 'path';
import fs from 'fs';

const userDataPath = (electron.app || electron.remote.app).getPath('userData');

export class System {

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

    getDirectory(directory: string[]): string {
        return Path.join(userDataPath, ...directory);
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


}