import { GraphsConfigs } from "./@types/graphConfigs"

export const DefaultGraphConfigs: GraphsConfigs = {
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