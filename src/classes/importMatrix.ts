import { Matrix } from "ml-matrix";

export class ImportMatrix extends Matrix {

    getVariance(type: 'row' | 'column', index: number) {
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
                throw new Error(`invalid option: ${type}`);
        }
    }
}

function computeVariance(array: number[]) {
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