import { expect, test } from "vitest";
import { Puzzle, getSliceX, getSliceY, getSliceZ } from "./puzzle";

let puzzle: Puzzle = [[[true, false, true], [false, true, false]], [[true, false, true], [false, true, false]], [[true, false, true], [false, true, false]], [[true, false, true], [false, true, false]]];

test("get an X slice from a puzzle", function () {
    expect(getSliceX(puzzle, 0, 0)).toStrictEqual([true, true, true, true]);
})

test("get an Y slice from a puzzle", function () {
    expect(getSliceY(puzzle, 0, 0)).toStrictEqual([true, false]);
})

test("get an Z slice from a puzzle", function () {
    expect(getSliceZ(puzzle, 0, 0)).toStrictEqual([true, false, true]);
})