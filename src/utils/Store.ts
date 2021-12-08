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

    /**
    * Retrieve a key in the preferences files
    * @param key The key of the item to be retrieved
    * @param defaultVal The value that will be returned if the key is not found
    * @returns The value found in the preferences file
    * @author: Austin Pearce
    */
    get(key: string, defaultVal: any = null): any {
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

    /**
    * Updates a value in the preferences file
    * @param key The key to update
    * @param value The new value to update with
    * @author: Austin Pearce
    */
    set(key: string, value: any): void {
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

    /**
    * Deletes a value in the preferences file
    * @param key The key of the value to delete
    * @author: Austin Pearce
    */
    delete(key: string): void {
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

/**
* Parses the content of the preferences file
* @param filePath The path to the preference file
* @returns The parsed preferences file content
* @author: Austin Pearce
*/
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