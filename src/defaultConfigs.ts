import { Configs } from "./@types/graphConfigs"

export const DefaultConfigs: Configs = {
    'pca-2d-scatter': {
        'size': 5 //TODO
    },
    'pca-3d-scatter': {
        'size': 5 //TODO
    },
    'hca-dendrogram': {
        'orientation': 'horizontal'
    },
    'hca-heatmap-default': {
        'xClusteringMethod': 'complete',
        'yClusteringMethod': 'complete'
    },
    'hca-heatmap-distance': {
        'xClusteringMethod': 'complete',
        'yClusteringMethod': 'complete'
    }
}