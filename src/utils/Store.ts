import electron from 'electron';
import Path from 'path';
import fs from 'fs';
import { DefaultGraphConfigs } from '@/defaultConfigs';

interface StoreOpts {
    configName: string
}

const userDataPath = (electron.app || electron.remote.app).getPath('userData');

export class Store {
    data: any;
    path: string;

    constructor(opts?: StoreOpts) {
        let configName = opts?.configName || 'user-preferences';
        this.path = Path.join(userDataPath, configName + '.json');
        this.data = parseDataFile(this.path);
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
        return returnVal != undefined ? returnVal : defaultVal;
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

    delete(key: string) {
        if (this.data.hasOwnProperty(key)) {
            delete this.data[key];
            try {
                fs.writeFileSync(this.path, JSON.stringify(this.data));
            } catch (error) {
                console.error(`Failed to save user data after deleting '${key}'`);
            }
        }
    }
}

function parseDataFile(filePath: string) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        // Default values
        return {
            theme: 'system',
            graphConfigs: DefaultGraphConfigs,
            showSettings: true,
            welcomeTour: {
                show: true,
                lastStep: 0
            }
        }
    }
}