import { GraphsConfigs } from "./@types/graphConfigs"

export const DefaultGraphConfigs: GraphsConfigs = {
    'pca-2d-scatter': {
        'normalize': 'center',
        'size': 7
    },
    'pca-3d-scatter': {
        'normalize': 'center',
        'size': 7
    },
    'hca-dendrogram': {
        'normalize': 'none',
        'clusteringMethod': 'ward',
        'orientation': 'horizontal'
    },
    'hca-heatmap-default': {
        'normalize': 'none',
        'xClusteringMethod': 'ward',
        'yClusteringMethod': 'ward'
    },
    'hca-heatmap-distance': {
        'normalize': 'none',
        'xClusteringMethod': 'ward',
        'yClusteringMethod': 'ward'
    }
}