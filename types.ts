import { Mesh, Vector3 } from "three";

// Great type name
export type CoolMesh = Mesh & { qPos?: Vector3, qFlag?: boolean, qDestroy?: boolean };

export type State = "orbit" | "flag" | "continueFlag" | "remove" | "dragX" | "dragZ" | "end" | "place";

export interface XRay {
    direction: string;
    count: number;
}