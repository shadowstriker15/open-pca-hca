import electron from 'electron';
import path from 'path';
import fs from 'fs';

interface StoreOpts {
    configName: string
    defaults: any
}

export class Store {
    data: any;
    path: string;

    constructor(opts: StoreOpts) {
        const userDataPath = (electron.app || electron.remote.app).getPath('userData');
        this.path = path.join(userDataPath, opts.configName + '.json');
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