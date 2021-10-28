import distanceMatrix from "ml-distance-matrix";
import { euclidean } from "ml-distance-euclidean";
import { Matrix } from "ml-matrix";

export class ImportDF {
    withClasses: boolean;
    withDimensions: boolean;

    constructor(withClasses = false, withDimensions = false) {
        this.withClasses = withClasses;
        this.withDimensions = withDimensions;
    }

    readDF() {
        return window.import.readImportDataframe(this.withClasses, this.withDimensions);
    }

    getClasses(matrix: any[][]) {
        if (!this.withClasses) throw ("Error - Matrix was requested without classes");
        return matrix.map((row) => row[matrix[0].length - 1]);
    }

    getNumbers(matrix: any[][]) {
        return matrix.map(
            (row) => row.slice(0, matrix[0].length - (this.withClasses ? 1 : 0)) as number[]
        );
    }

    computeDistanceMatrix(matrix: Matrix) {
        return distanceMatrix(matrix.to2DArray(), euclidean);
    }
}