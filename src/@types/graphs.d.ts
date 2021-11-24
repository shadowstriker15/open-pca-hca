

type HCAGraphs = "hca-dendrogram" | "hca-heatmap"
export type PCAGraphs = "pca-2d-scatter" | "pca-3d-scatter"
type HCAHeatmaps = "hca-heatmap-default" | "hca-heatmap-distance";

export type GraphViews = HCAGraphs | PCAGraphs
export type GraphTypes = PCAGraphs | (HCAGraphs & "hca-dendrogram") | HCAHeatmaps

export type HeatmapType = "default" | "distance";

export type GraphNames = "PCA 2D Scatter" | "PCA 3D Scatter" | "HCA Dendrogram" | "Samples_Dimensions Heatmap" | "Sample Distances Heatmap";