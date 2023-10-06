import { Mesh, Vector3 } from "three";
import { Hints, Puzzle } from "./puzzle";

// Great type name
export type CoolMesh = Mesh & { qPos?: Vector3, qFlag?: boolean, qDestroy?: boolean, qColor?: number };

export type State = "orbit" | "flag" | "continueFlag" | "remove" | "dragX" | "dragZ" | "end" | "place" | "saveImage";

export interface XRay {
    direction: string;
    count: number;
}

export interface Level {
    puzzle: Puzzle,
    hints: Hints,
    color: number[][][],
    name: string,
    thumbnail: string,
}