import { GraphTypes } from "./graphs"
import { AgglomerationMethod } from "ml-hclust";

type Orientation = 'vertical' | 'horizontal';
type Size = 5 | 10; //todo
type Normalize = 'none' | 'center' | 'minMax' | 'zScore';
export type Clustering = AgglomerationMethod & ('ward' | 'complete' | 'single' | 'upgma' | 'wpgma' | 'upgmc')

type Property = 'orientation' | 'size' | 'xClusteringMethod' | 'yClusteringMethod' | 'clusteringMethod' | 'normalize'

export type GraphConfigs = {
    'orientation': Orientation,
    'size': Size,
    'xClusteringMethod': Clustering,
    'yClusteringMethod': Clustering,
    'clusteringMethod': Clustering,
    'normalize': Normalize
}

export type GraphsConfigs = {
    [key in GraphTypes]: Partial<GraphConfigs>
}