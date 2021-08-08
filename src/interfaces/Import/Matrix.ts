import { ImportFile } from "./File";

export interface ImportMatrix {
    runs: {
        [key: string]: ImportFile
    };
}