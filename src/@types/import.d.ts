export type Import = {
    matrix: string[][],
    dimensionLabels?: string[]
    filenames?: string[]
    labels?: string[]
}

export type ImportFormat = "column" | "row";
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
    [key: string]: string,
    'File name': string,
    'Sample': string
}