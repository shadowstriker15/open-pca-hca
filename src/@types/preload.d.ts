// import { api } from '../preload'

// declare global {
//     interface Window {
//         Main: typeof api
//     }
// }

export type ExportRow = { 'File name': string, 'Sample': string, [key: number]: string };
export type ColumnImport = { [key: string]: string }[][];
export type RowImport = string[][][];