import { ExportRow } from "@/@types/import";

export interface ColumnFile {
    samples: {
        [key: string]: ExportRow
    }
}