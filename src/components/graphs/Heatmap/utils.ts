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

export type ChartDimensionsConfig = Partial<IChartUserDimensions>;
export type ChartDimensions = IChartUserDimensions & IChartInternalDimensions;