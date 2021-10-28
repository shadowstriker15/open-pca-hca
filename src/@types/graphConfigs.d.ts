import { GraphTypes } from "./graphs"
import { AgglomerationMethod } from "ml-hclust";

type Orientation = 'vertical' | 'horizontal';
type Size = 5 | 10; //todo
export type Clustering = AgglomerationMethod & ('ward' | 'complete' | 'single' | 'upgma' | 'wpgma' | 'upgmc')

type Property = 'orientation' | 'size' | 'xClusteringMethod' | 'yClusteringMethod'

export type GraphConfigs = {
    'orientation': Orientation,
    'size': Size,
    'xClusteringMethod': Clustering,
    'yClusteringMethod': Clustering
}

export type Configs = {
    [key in GraphTypes]: Partial<GraphConfigs>
}