import { ExportRow } from "@/@types/preload";

export interface ColumnFile {
    samples: {
        [key: string]: ExportRow
    }
}