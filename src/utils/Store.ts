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
}

function parseDataFile(filePath: string, defaults: JSON): JSON {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return defaults;
    }
}