import { Mesh } from "three";

// Great type name
export type CoolMesh = Mesh & { qX?: number, qY?: number, qZ?: number, qFlag?: boolean, qDestroy?: boolean };

export type State = "orbit" | "flag" | "continueFlag" | "remove" | "dragX" | "dragZ";

export interface XRay {
    direction: string;
    count: number;
}