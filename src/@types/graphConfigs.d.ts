import { GraphTypes } from "./graphs"
import { AgglomerationMethod } from "ml-hclust";

type Orientation = 'vertical' | 'horizontal';
type Normalize = 'none' | 'center' | 'minMax' | 'zScore';
export type Clustering = AgglomerationMethod & ('ward' | 'complete' | 'single' | 'upgma' | 'wpgma' | 'upgmc')

export type Property = 'orientation' | 'size' | 'xClusteringMethod' | 'yClusteringMethod' | 'clusteringMethod' | 'normalize' | 'labelSize'

export type GraphConfigs = {
    'orientation': Orientation,
    'size': number,
    'xClusteringMethod': Clustering,
    'yClusteringMethod': Clustering,
    'clusteringMethod': Clustering,
    'normalize': Normalize,
    'labelSize': number
}

export type GraphsConfigs = {
    [key in GraphTypes]: Partial<GraphConfigs>
}