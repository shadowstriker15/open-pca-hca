import distanceMatrix from "ml-distance-matrix";
import { euclidean } from "ml-distance-euclidean";
import { Matrix } from "ml-matrix";
import { ImportMatrix } from "./importMatrix";
import { session } from "../@types/session";

export class ImportDF {
    session: session;
    withClasses: boolean;
    withDimensions: boolean;

    constructor(session: session, withClasses = false, withDimensions = false) {
        this.session = session;
        this.withClasses = withClasses;
        this.withDimensions = withDimensions;
    }

    readDF() {
        return window.session.readImportDataframe(this.session, this.withClasses, this.withDimensions);
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
        const refMatrix = new ImportMatrix(data);
        const newMatrix = new Matrix(data);

        switch (type) {
            case 'minMax':
                let newMin = 0;
                let newMax = 1;
                for (let j = 0; j < refMatrix.columns; j++) {
                    for (let i = 0; i < refMatrix.rows; i++) {
                        let fraction = (refMatrix.get(i, j) - refMatrix.minColumn(j)) / (refMatrix.maxColumn(j) - refMatrix.minColumn(j))
                        let newVal = fraction * (newMax - newMin) + newMin
                        newMatrix.set(i, j, newVal);
                    }
                }
                return newMatrix;
            case 'zScore':
                for (let j = 0; j < refMatrix.columns; j++) {
                    for (let i = 0; i < refMatrix.rows; i++) {
                        let mean = refMatrix.getColumn(j).mean();
                        let variance = refMatrix.getVariance("column", j);
                        let std = Math.sqrt(variance);

                        let fraction = (refMatrix.get(i, j) - mean) / std;
                        newMatrix.set(i, j, fraction);
                    }
                }
                return newMatrix;
            case 'center':
                return newMatrix.center("column")
            // .scale("column"); //TODO
            default:
                return newMatrix
        }
    }
}