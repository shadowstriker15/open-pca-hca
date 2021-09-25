interface IChartUserDimensions {
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
    width: number;
    height: number;
}

interface IChartInternalDimensions {
    boundedHeight: number;
    boundedWidth: number;
    additionalMarginLeft: number;
    additionalMarginTop: number;
}

export type Line = {
    key: number;
    y1: number | undefined;
    y2: number | undefined;
    x1: number | undefined;
    x2: number | undefined;
    stroke: string;
}

export type ChartDimensionsConfig = Partial<IChartUserDimensions>;
export type ChartDimensions = IChartUserDimensions & IChartInternalDimensions;