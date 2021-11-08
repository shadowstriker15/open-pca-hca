import distanceMatrix from "ml-distance-matrix";
import { euclidean } from "ml-distance-euclidean";
import { Matrix } from "ml-matrix";
import { ImportMatrix } from "./importMatrix";

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

    normalizeData(data: number[][], type: string) {
        const matrix = new ImportMatrix(data);

        switch (type) {
            case 'minMax':
                let newMin = 0;
                let newMax = 1;
                for (let i = 0; i < matrix.columns; i++) {
                    for (let j = 0; j < matrix.rows; j++) {
                        let fraction = (matrix.get(j, i) - matrix.minColumn(i)) / (matrix.maxColumn(i) - matrix.minColumn(i))
                        let newVal = fraction * (newMax - newMin) + newMin
                        matrix.set(j, i, newVal);
                        matrix.standardDeviation
                    }
                }
                return matrix;
            case 'zScore':
                for (let i = 0; i < matrix.columns; i++) {
                    for (let j = 0; j < matrix.rows; j++) {
                        let mean = matrix.getColumn(i).mean();
                        let variance = matrix.getVariance("column", i);
                        let std = Math.sqrt(variance);

                        let fraction = (matrix.get(j, i) - mean) / std;
                        matrix.set(j, i, fraction);
                    }
                }
                return matrix;
            case 'center':
                return matrix.center("column")
            // .scale("column");
            default:
                return matrix
        }
    }
}