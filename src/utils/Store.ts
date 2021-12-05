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

    get(key: string, defaultVal: any = null) {
        let keys = key.split('.');
        let returnVal;

        if (keys.length > 1) {
            // Just supporting first nesting now
            if (this.data.hasOwnProperty(keys[0])) {
                returnVal = this.data[keys[0]][keys[1]];
            }
        } else {
            returnVal = this.data[key];
        }
        return returnVal ? returnVal : defaultVal;
    }

    set(key: string, value: any) {
        let keys = key.split('.');
        if (keys.length > 1) {
            // Just supporting first nesting now
            if (this.data.hasOwnProperty(keys[0])) {
                this.data[keys[0]][keys[1]] = value;
            } else {
                this.data[keys[0]] = { [keys[1]]: value };
            }
        } else {
            this.data[key] = value;
        }

        try {
            fs.writeFileSync(this.path, JSON.stringify(this.data));
        } catch (error) {
            console.error(`Failed to save value '${value}' for '${key}' in user data`);
        }
    }
}

function parseDataFile(filePath: string, defaults: JSON): JSON {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return defaults;
    }
}