import { Hint, Hints, Puzzle } from "./puzzle";
import { solve } from "./solver";

interface HintContainer {
    hint: Hint,
    direction: "x" | "y" | "z",
    u: number,
    v: number,
}

function scoreHint(hint: Hint): number {
    return hint.count;
}

export function removeHints(puzzle: Puzzle, hints: Hints) {
    const xSize = puzzle.length;
    const ySize = puzzle[0].length;
    const zSize = puzzle[0][0].length;

    // Collect all the hints
    let hintCollection: HintContainer[] = [];

    for (let iy = 0; iy < ySize; iy++) {
        for (let iz = 0; iz < zSize; iz++) {
            hintCollection.push({
                hint: hints.x[iy][iz],
                direction: "x",
                u: iy,
                v: iz,
            });
        }
    }

    for (let ix = 0; ix < xSize; ix++) {
        for (let iz = 0; iz < zSize; iz++) {
            hintCollection.push({
                hint: hints.y[ix][iz],
                direction: "y",
                u: ix,
                v: iz,
            });
        }
    }

    for (let ix = 0; ix < xSize; ix++) {
        for (let iy = 0; iy < ySize; iy++) {
            hintCollection.push({
                hint: hints.z[ix][iy],
                direction: "z",
                u: ix,
                v: iy,
            });
        }
    }

    hintCollection.sort((a, b) => {
        return scoreHint(b.hint) - scoreHint(a.hint) 
    });

    for (let i = 0; i < Math.min(hintCollection.length, 128); i++) {
        const toRemove = hintCollection[i];
        (toRemove.direction == "x" ? hints.x : toRemove.direction == "y" ? hints.y : hints.z)[toRemove.u][toRemove.v] = {
            count: 0,
            type: "none",
        };
        const solvable = solve(hints).length != 0;
        if (!solvable) {
            (toRemove.direction == "x" ? hints.x : toRemove.direction == "y" ? hints.y : hints.z)[toRemove.u][toRemove.v] = toRemove.hint;
        }
    }

    return hints;
}