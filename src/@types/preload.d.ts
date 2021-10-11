// import { api } from '../preload'

// declare global {
//     interface Window {
//         Main: typeof api
//     }
// }

export type ExportRow = { 'File name': string, 'Sample': string, [key: number]: string };
export type ColumnImport = { [key: string]: string }[][];
export type RowImport = string[][][];

export type PCATrace = {
    x: string[],
    y: string[],
    z?: string[],
    name: string,
    text: string[]
}

export type Row = {
    [key: number]: string,
    'File name': string,
    'Sample': string
}