/**
 * This code is for creating the hints for a puzzle
 */

// order: x, y, z
export type Puzzle = boolean[][][];
export type HintType = "normal" | "circle" | "square" | "none";

export interface Hint {
    type: HintType;
    count: number;
}

export interface Hints {
    x: Hint[][];
    y: Hint[][];
    z: Hint[][];
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

function isValid(puzzle: Puzzle): boolean {
    let xSize = puzzle.length;
    if (xSize == 0) {
        return false;
    }
    let ySize = puzzle[0].length;
    if (ySize == 0) {
        return false;
    }
    let zSize = puzzle[0][0].length;
    if (zSize == 0) {
        return false;
    }
    for (let ix = 0; ix < xSize; ix++) {
        if (puzzle[ix].length != ySize) {
            return false;
        }
        for (let iy = 0; iy < ySize; iy++) {
            if (puzzle[ix][iy].length != zSize) {
                return false;
            }
        }
    }
    return true;
}

function createSliceHints(puzzle: Puzzle, size1: number, size2: number, method: (p: Puzzle, i: number, j: number) => boolean[]): Hint[][] {
    let ret: Hint[][] = [];
    for (let i = 0; i < size1; i++) {
        let retPart: Hint[] = [];
        for (let j = 0; j < size2; j++) {
            let slice = method(puzzle, i, j);
            let count = slice.filter(x => x).length;
            let type: HintType;
            if (count == 0) {
                type = "normal"
            } else {
                /* Explanation of counting algorithm:
                First, a recap on how the rules work:
                If all the blocks in a row are continuous, then it is normal
                If there is 1 gap between the blocks, it is circle
                If there are more than one, it is a square.
                Instead of thinking about blocks, we can think about how many switches there are
                from blocks to empty space. We can imagine that the puzzle goes on infinitely with blank spaces
                Which means that if the slice starts or ends with a block, we add one switch.
                One thing that we can realize that the number of switches will always be even, since
                otherwise it would end on blocks, meaning infinite blocks.
                If the row is continuous, it will switch on once, and then switch off once, so 2
                If there is one gap, there will be two extra switches, so 4
                any greater number will be a square.
                */
                let switches = slice[0] ? 1 : 0;
                let last = slice[0];
                for (let i = 0; i < slice.length; i++) {
                    if (last != slice[i]) {
                        switches++;
                    }
                    last = slice[i];
                }
                if (last) {
                    switches++;
                }
                if (switches == 2) {
                    type = "normal";
                } else if (switches == 4) {
                    type = "circle";
                } else {
                    type = "square";
                }
            }
            retPart.push({
                count: count,
                type: type,
            });
        }
        ret.push(retPart);
    }
    return ret;
}

function createXHints(puzzle: Puzzle): Hint[][] {
    let ySize = puzzle[0].length;
    let zSize = puzzle[0][0].length;
    return createSliceHints(puzzle, ySize, zSize, getSliceX);
}

function createYHints(puzzle: Puzzle): Hint[][] {
    let xSize = puzzle.length;
    let zSize = puzzle[0][0].length;
    return createSliceHints(puzzle, xSize, zSize, getSliceY);
}

function createZHints(puzzle: Puzzle): Hint[][] {
    let xSize = puzzle.length;
    let ySize = puzzle[0].length;
    return createSliceHints(puzzle, xSize, ySize, getSliceZ);
}

export function createHints(puzzle: Puzzle): Hints {
    return {
        x: createXHints(puzzle),
        y: createYHints(puzzle),
        z: createZHints(puzzle)
    };
}