/**
 * This code is for creating the hints for a puzzle
 */

// order: x, y, z
export type Puzzle = boolean[][][];
export type HintType = "normal" | "circle" | "square";

export interface Hint {
    type: HintType;
    count: number;
}

export interface Hints {
    x: boolean[][];
    y: boolean[][];
    z: boolean[][];
}

export function getSliceX(puzzle: Puzzle, y: number, z: number): boolean[] {
    let ret: Array<boolean> = [];
    for (let i = 0; i < puzzle.length; i++) {
        ret.push(puzzle[i][y][z]);
    }
    return ret;
}

export function getSliceY(puzzle: Puzzle, x: number, z: number): boolean[] {
    let ret: Array<boolean> = [];
    for (let i = 0; i < puzzle[0].length; i++) {
        ret.push(puzzle[x][i][z]);
    }
    return ret;
}

export function getSliceZ(puzzle: Puzzle, x: number, y: number): boolean[] {
    let ret: Array<boolean> = [];
    for (let i = 0; i < puzzle[0][0].length; i++) {
        ret.push(puzzle[x][y][i]);
    }
    return ret;
}