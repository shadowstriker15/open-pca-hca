

type HCAGraphs = "hca-dendrogram" | "hca-heatmap"
export type PCAGraphs = "pca-2d-scatter" | "pca-3d-scatter"

export type GraphViews = HCAGraphs | PCAGraphs
export type GraphTypes = PCAGraphs | (HCAGraphs & "hca-dendrogram") | "hca-heatmap-default" | "hca-heatmap-distance"