import { Matrix } from "ml-matrix";

export class ImportMatrix extends Matrix {

    /**
    * Get the variance of a given row or column
    * @param type Whether to get a row or column
    * @param index The index of the row or column
    * @returns The row or column variance
    * @author: Austin Pearce
    */
    getVariance(type: 'row' | 'column', index: number): number {
        switch (type) {
            case 'row': {
                let row = this.getRow(index);
                return computeVariance(row);
            }
            case 'column': {
                let column = this.getColumn(index);
                return computeVariance(column);
            }
            default:
                throw new Error(`Invalid option '${type}' for getting variance`);
        }
    }
}

/**
* Compute the variance of a given array
* @param array Array to find the variance for
* @returns The variance of given array
* @author: Austin Pearce
*/
function computeVariance(array: number[]): number {
    let mean = array.mean();
    let sumOfSquares = 0;
    for (let i = 0; i < array.length; i++) {
        sumOfSquares += Math.pow((array[i] - mean), 2)
    }
    return sumOfSquares / (array.length - 1)
}

declare global {
    interface Array<T> {
        sum(): number;
        mean(): number;
    }
}

if (!Array.prototype.sum) {
    Array.prototype.sum = function <T>(): number {
        return this.reduce(function (a, b) { return a + b; });
    }
}

if (!Array.prototype.mean) {
    Array.prototype.mean = function <T>(): number {
        return this.sum() / this.length
    }
}