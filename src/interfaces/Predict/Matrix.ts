import { PredictFile } from "./File";

export interface PredictMatrix {
    runs: {
        [key: string]: PredictFile
    };
}