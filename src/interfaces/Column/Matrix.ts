import { ColumnFile } from "./File";

export interface ColumnMatrix {
    files: {
        [key: string]: ColumnFile
    };
}