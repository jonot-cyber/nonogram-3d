import { expect, test } from "vitest";
import { solve } from "./solver";
import { Hints, Puzzle, createHints } from "./puzzle";

import hund from "./library/hund.json";
import mug from "./library/mug.json";
import shibaInu from "./library/shibaInu.json";

test("Solve hund", function () {
    let puzzle: Puzzle = hund.puzzle;
    let hints: Hints = createHints(puzzle);

    expect(solve(hints)).toStrictEqual(puzzle);
})

test("Solve mug", function () {
    let puzzle: Puzzle = mug.puzzle;
    let hints: Hints = createHints(puzzle);

    expect(solve(hints)).toStrictEqual(puzzle);
})

test("Solve shiba inu", function () {
    let puzzle: Puzzle = shibaInu.puzzle;
    let hints: Hints = createHints(puzzle);

    expect(solve(hints)).toStrictEqual(puzzle);
})