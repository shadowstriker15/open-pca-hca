import distanceMatrix from "ml-distance-matrix";
import { euclidean } from "ml-distance-euclidean";
import { Matrix } from "ml-matrix";
import { ImportMatrix } from "./importMatrix";
import { session } from "../@types/session";
import { Normalize } from "@/@types/graphConfigs";

export class ImportDF {
    session: session;
    withClasses: boolean;
    withDimensions: boolean;

    constructor(session: session, withClasses = false, withDimensions = false) {
        this.session = session;
        this.withClasses = withClasses;
        this.withDimensions = withDimensions;
    }

    /**
    * Request the worker process to read the imported dataframe
    * @author: Austin Pearce
    */
    readDF(): void {
        window.session.readImportDataframe(this.session, this.withClasses, this.withDimensions);
    }

    /**
    * Extract the classes from the passed matrix
    * @param matrix The matrix that contains the numbers and classes
    * @returns Array of labels
    * @author: Austin Pearce
    */
    getClasses(matrix: any[][]): any[] {
        if (!this.withClasses) throw ("Error - Matrix was requested without classes");
        return matrix.map((row) => row[matrix[0].length - 1]);
    }

    /**
    * Extract the numbers from the passed matrix
    * @param matrix The matrix that contains the numbers (and potentially classes)
    * @returns The matrix with only numbers
    * @author: Austin Pearce
    */
    getNumbers(matrix: any[][]): number[][] {
        return matrix.map(
            (row) => row.slice(0, matrix[0].length - (this.withClasses ? 1 : 0)) as number[]
        );
    }

    /**
    * Request the worker process to compute the distance matrix
    * @param matrix Matrix that only contains numbers
    * @param classes Array of classes
    * @param normalize_type How the passed matrix has been normalized
    * @author: Austin Pearce
    */
    computeDistanceMatrix(matrix: number[][], classes: string[], normalize_type: Normalize): void {
        window.session.readDistanceMatrix(this.session, matrix, classes, normalize_type);
    }

    /**
    * Normalize the passed matrix
    * @param data 2D matrix to be normalized
    * @param type The type of normalization
    * @returns The normalized matrix
    * @author: Austin Pearce
    */
    normalizeData(data: any[][], type: Normalize): Matrix {
        const refMatrix = new ImportMatrix(data);
        const newMatrix = new Matrix(data);

        switch (type) {
            case 'minMax':
                const newMin = 0;
                const newMax = 1;
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
            default: // Includes center
                return newMatrix
        }
    }
}