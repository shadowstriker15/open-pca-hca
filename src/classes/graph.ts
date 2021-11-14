import { GraphViews } from "@/@types/graphs";

export class Graph {

    type: GraphViews

    constructor(type: GraphViews) {
        this.type = type;
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