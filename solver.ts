import { Hint, Hints, Puzzle, createSliceHint, getSliceX } from "./puzzle";

// Too tired to come up with a good type name
type St = "yes" | "no" | "maybe";

/**
 * Take a slice, and find all solutions that would satisfy it.
 * @param slice A slice of blocks
 * @param hint The hint for that slice
 * @returns All of the solutions that are possible.
 */
function findSolutions(slice: St[], hint: Hint): St[][] {
    let rowSolutions: St[][] = []
    let rowSolution: St[] = Array(slice.length).fill("no");
    while (true) {
        // check solution
        let isValid: boolean = true;
        for (let j = 0; j < rowSolution.length; j++) {
            if (slice[j] == "maybe") {
                continue;
            }
            if (slice[j] != rowSolution[j]) {
                isValid = false;
                break;
            }
        }
        let solutionHint = createSliceHint(rowSolution.map(v => v == "yes"));
        if (solutionHint.count != hint.count || solutionHint.type != hint.type) {
            isValid = false;
        }
        if (isValid) {
            rowSolutions.push([...rowSolution]);
        }
        if (rowSolution.every(v => v == "yes")) {
            break;
        }
        let i = rowSolution.length - 1;
        while (rowSolution[i] == "yes") {
            rowSolution[i] = "no";
            i--;
        }
        rowSolution[i] = "yes";
    }
    return rowSolutions;
}

/**
 * Go through possible solutions and find overlap
 * @param solutions A list of solutions
 * @returns The overlap
 */
function findGuaranteedBlocks(solutions: St[][]): St[] {
    let guaranteed = solutions[0];
    for (let rowSolution of solutions) {
        for (let i = 0; i < guaranteed.length; i++) {
            if (guaranteed[i] == "maybe") {
                continue;
            }
            if (guaranteed[i] != rowSolution[i]) {
                guaranteed[i] = "maybe";
            }
        }
    }
    return guaranteed;
}

/**
 * Solve a picross-3d puzzle
 * 
 * The algorithm:
 * 
 * @param hints The hints for a puzzle 
 * @returns The solutions
 */
export function solve(hints: Hints): Puzzle {
    let xSize = hints.y.length;
    let ySize = hints.x.length;
    let zSize = hints.x[0].length;

    let solution: St[][][] = [];
    for (let ix = 0; ix < xSize; ix++) {
        let part: St[][] = [];
        for (let iy = 0; iy < ySize; iy++) {
            let part2: St[] = [];
            for (let iz = 0; iz < zSize; iz++) {
                part2.push("maybe");
            }
            part.push(part2);
        }
        solution.push(part);
    }

    while (true) {
        let clears = 0;
        // X hints
        for (let iy = 0; iy < ySize; iy++) {
            for (let iz = 0; iz < zSize; iz++) {
                const hint: Hint = hints.x[iy][iz];
                if (hint.type == "none") {
                    continue;
                }
                // Clear out zeroes
                if (hint.count == 0) {
                    for (let ix = 0; ix < xSize; ix++) {
                        if (solution[ix][iy][iz] == "no") {
                            continue;
                        }
                        solution[ix][iy][iz] = "no";
                        clears++;
                    }
                }

                let slice: St[] = [];
                for (let ix = 0; ix < xSize; ix++) {
                    slice.push(solution[ix][iy][iz]);
                }
                let rowSolutions: St[][] = findSolutions(slice, hint);

                // Check for guaranteed blocks
                let guaranteed = findGuaranteedBlocks(rowSolutions);

                // Apply guaranteed blocks
                for (let ix = 0; ix < guaranteed.length; ix++) {
                    if (guaranteed[ix] == "maybe") {
                        continue;
                    }
                    solution[ix][iy][iz] = guaranteed[ix];
                    clears++;
                }
            }
        }

        // Y hints
        for (let ix = 0; ix < xSize; ix++) {
            for (let iz = 0; iz < zSize; iz++) {
                const hint: Hint = hints.y[ix][iz];
                if (hint.type == "none") {
                    continue;
                }
                // Clear out zeroes
                if (hint.count == 0) {
                    for (let iy = 0; iy < ySize; iy++) {
                       if (solution[ix][iy][iz] == "no") {
                           continue;
                       }
                       solution[ix][iy][iz] = "no";
                       clears++;
                   }
                }

                let slice: St[] = [];
                for (let iy = 0; iy < ySize; iy++) {
                    slice.push(solution[ix][iy][iz]);
                }
                let rowSolutions: St[][] = findSolutions(slice, hint);

                // Check for guaranteed blocks
                let guaranteed = findGuaranteedBlocks(rowSolutions);

                // Apply guaranteed blocks
                for (let iy = 0; iy < guaranteed.length; iy++) {
                    if (guaranteed[iy] == "maybe") {
                        continue;
                    }
                    solution[ix][iy][iz] = guaranteed[iy];
                    clears++;
                }
            }
        }

        // Z hints
        for (let ix = 0; ix < xSize; ix++) {
            for (let iy = 0; iy < ySize; iy++) {
                const hint: Hint = hints.z[ix][iy];
                if (hint.type == "none") {
                    continue;
                }
                // Clear out zeroes
                if (hint.count == 0) {
                    for (let iz = 0; iz < zSize; iz++) {
                        if (solution[ix][iy][iz] == "no") {
                            continue;
                        }
                        solution[ix][iy][iz] = "no";
                        clears++
                    }
                }


                let slice: St[] = [];
                for (let iz = 0; iz < zSize; iz++) {
                    slice.push(solution[ix][iy][iz]);
                }
                let rowSolutions: St[][] = findSolutions(slice, hint);
                
                // Check for guaranteed blocks
                let guaranteed = findGuaranteedBlocks(rowSolutions);

                // Apply guaranteed blocks
                for (let iz = 0; iz < guaranteed.length; iz++) {
                    if (guaranteed[iz] == "maybe") {
                        continue;
                    }
                    solution[ix][iy][iz] = guaranteed[iz];
                    clears++;
                }
            }
        }

        if (clears > 0) {
            break;
        }
    }

    let ret: Puzzle = [];
    for (let ix = 0; ix < xSize; ix++) {
        let part: boolean[][] = [];
        for (let iy = 0; iy < ySize; iy++) {
            let part2: boolean[] = [];
            for (let iz = 0; iz < zSize; iz++) {
                if (solution[ix][iy][iz] == "maybe") {
                    return [];
                }
                part2.push(solution[ix][iy][iz] == "yes");
            }
            part.push(part2);
        }
        ret.push(part);
    }
    return ret;
}