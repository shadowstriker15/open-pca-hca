import { Configs } from "./@types/graphConfigs"

export const DefaultConfigs: Configs = {
    'pca-2d-scatter': {
        'normalize': 'center',
        'size': 5 //TODO
    },
    'pca-3d-scatter': {
        'normalize': 'center',
        'size': 5 //TODO
    },
    'hca-dendrogram': {
        'normalize': 'none',
        'clusteringMethod': 'complete',
        'orientation': 'horizontal'
    },
    'hca-heatmap-default': {
        'normalize': 'none',
        'xClusteringMethod': 'complete',
        'yClusteringMethod': 'complete'
    },
    'hca-heatmap-distance': {
        'normalize': 'none',
        'xClusteringMethod': 'complete',
        'yClusteringMethod': 'complete'
    }
}