import { GraphViews, GraphNames, HeatmapType } from "@/@types/graphs";

export class Graph {

    type: GraphViews;
    name: GraphNames;

    constructor(type: GraphViews, heatmapType: HeatmapType | null = null) {
        this.type = type;
        this.name = this.getGraphName(heatmapType);
    }

    private getGraphName(heatmapType: HeatmapType | null = null): GraphNames {
        switch (this.type) {
            case 'pca-2d-scatter': {
                return 'PCA 2D Scatter';
            }
            case 'pca-3d-scatter': {
                return 'PCA 3D Scatter';
            }
            case 'hca-dendrogram': {
                return 'HCA Dendrogram';
            }
            case 'hca-heatmap': {
                if (heatmapType && heatmapType == 'default') {
                    return 'Samples_Dimensions Heatmap';
                } else if (heatmapType && heatmapType == 'distance') {
                    return 'Sample Distances Heatmap';
                }
            }
            default:
                throw new Error(`Failed to get graph's name, invalid type ${this.type}`);
        }
    }

    createScreenshotLink(svgId: string): string | null {
        let svgGraph = document.getElementById(svgId);
        if (svgGraph) {
            var serializer = new XMLSerializer();
            var source = serializer.serializeToString(svgGraph);

            if (
                !source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)
            ) {
                source = source.replace(
                    /^<svg/,
                    '<svg xmlns="http://www.w3.org/2000/svg"'
                );
            }
            if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
                source = source.replace(
                    /^<svg/,
                    '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'
                );
            }
            source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

            // Convert svg source to URI data scheme.
            let url =
                "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
            return url;
        }
        return null;
    }
}