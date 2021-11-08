import { Normalize } from "./graphConfigs";

export type session = {
    name: string,
    type: 'single' | 'separated' | null,
    fileNames?: string[],
    labelNames?: string[],
    dimension_count?: number,
    predict_normalize?: Normalize
    created_date: string
}