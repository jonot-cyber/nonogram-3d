import { Hint, Hints, Puzzle } from "./puzzle";
import { CoolMesh, XRay } from "./types";
import { TextureLoader, Shader, MeshLambertMaterial, Vector3, Scene, Camera, Mesh, Vector2, RGB_PVRTC_2BPPV1_Format } from "three";

function getAssetURL(hint: Hint): string {
    if (hint.type == "none") {
        return "./assets/blank.png"
    }
    return `./assets/numbers/${hint.type}/${hint.count}.png`
}

export function updateMaterial(mesh: CoolMesh, loader: TextureLoader, hints?: Hints) {
    const onBeforeCompile = (shader: Shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
            "#include <alphatest_fragment>",
            `float a = 1.0 - diffuseColor.a; diffuseColor = vec4(diffuse.r * a + diffuseColor.r * diffuseColor.a, diffuse.g * a + diffuseColor.g * diffuseColor.a, diffuse.b * a + diffuseColor.b * diffuseColor.a, 1.0);`);
    }
    const meshPosition = mesh.qPos ?? new Vector3(0, 0, 0);
    const color: number = mesh.qFlag ? 0x00ffff : 0xffffff;
    if (hints) {
        mesh.material = [
            new MeshLambertMaterial({ color: color, map: loader.load(getAssetURL(hints.x[meshPosition.y][meshPosition.z])), onBeforeCompile: onBeforeCompile }),
            new MeshLambertMaterial({ color: color, map: loader.load(getAssetURL(hints.x[meshPosition.y][meshPosition.z])), onBeforeCompile: onBeforeCompile }),
            new MeshLambertMaterial({ color: color, map: loader.load(getAssetURL(hints.y[meshPosition.x][meshPosition.z])), onBeforeCompile: onBeforeCompile }),
            new MeshLambertMaterial({ color: color, map: loader.load(getAssetURL(hints.y[meshPosition.x][meshPosition.z])), onBeforeCompile: onBeforeCompile }),
            new MeshLambertMaterial({ color: color, map: loader.load(getAssetURL(hints.z[meshPosition.x][meshPosition.y])), onBeforeCompile: onBeforeCompile }),
            new MeshLambertMaterial({ color: color, map: loader.load(getAssetURL(hints.z[meshPosition.x][meshPosition.y])), onBeforeCompile: onBeforeCompile }),
        ];
    } else {
        mesh.material = [
            new MeshLambertMaterial({ color: color }),
            new MeshLambertMaterial({ color: color }),
            new MeshLambertMaterial({ color: color }),
            new MeshLambertMaterial({ color: color }),
            new MeshLambertMaterial({ color: color }),
            new MeshLambertMaterial({ color: color }),
        ];

    }
}

export function isVisible(xray: XRay, cube: CoolMesh, size: Vector3): boolean {
    if (xray.count == 0) {
        return true;
    }
    const cubePosition = cube.qPos ?? new Vector3(0, 0, 0);
    switch (xray.direction) {
        case "up":
            return size.y - cubePosition.y > xray.count;
        case "down":
            return cubePosition.y >= xray.count;
        case "left":
            return cubePosition.x >= xray.count;
        case "right":
            return size.x - cubePosition.x > xray.count;
        case "front":
            return size.z - cubePosition.z > xray.count;
        case "back":
            return cubePosition.z >= xray.count;
    }
    return true;
}

export function updateVisibility(xray: XRay, cubes: CoolMesh[], size: Vector3) {
    for (let cube of cubes) {
        if (isVisible(xray, cube, size)) {
            cube.visible = true;
            cube.layers.enable(0);
        } else {
            cube.visible = false;
            cube.layers.disable(0);
        }
    }
}

export function areZeroes(cubes: CoolMesh[], hints: Hints): boolean {
    for (const cube of cubes) {
        if (cube.qDestroy) {
            continue;
        }
        const cubePosition = cube.qPos;
        const x = cubePosition?.x ?? -1;
        const y = cubePosition?.y ?? -1;
        const z = cubePosition?.z ?? -1;
        if (hints.x[y][z].count == 0 && hints.x[y][z].type != "none" || hints.y[x][z].count == 0 && hints.y[x][z].type != "none" || hints.z[x][y].count == 0 && hints.z[x][y].type != "none") {
            return true;
        }
    }
    return false;
}

export function clearZeroes(cubes: CoolMesh[], hints: Hints, scene: Scene) {
    for (const cube of cubes) {
        const cubePosition = cube.qPos;
        const x = cubePosition?.x ?? -1;
        const y = cubePosition?.y ?? -1;
        const z = cubePosition?.z ?? -1;
        if (hints.x[y][z] === undefined) {
            debugger;
        }
        if (hints.x[y][z].count == 0 && hints.x[y][z].type != "none" || hints.y[x][z].count == 0 && hints.y[x][z].type != "none" || hints.z[x][y].count == 0 && hints.z[x][y].type != "none") {
            scene.remove(cube);
            cube.qDestroy = true;
        }
    }
}

export function checkDone(cubes: CoolMesh[], puzzle: Puzzle): boolean {
    for (const cube of cubes) {
        if (cube.qDestroy) {
            continue;
        }
        if (!puzzle[cube.qPos?.x ?? -1][cube.qPos?.y ?? -1][cube.qPos?.z ?? -1]) {
            return false;
        }
    }
    return true;
}
/*
    */

export function colorCubes(cubes: CoolMesh[], puzzleColors: number[][][]) {
    for (const cube of cubes) {
        if (cube.qDestroy) {
            continue;
        }
        const color = cube.qColor;
        cube.material = new MeshLambertMaterial({ color: color });
    }
}

/*
xHandleMesh.position.set(handleMinX, -puzzleSize.y / 2, -puzzleSize.z / 2);
xHandleMesh.scale.set(2, 1, 1);

const zHandleMesh = new Mesh(handleGeometry, new MeshLambertMaterial({ color: 0xffff00, opacity: 0.5, transparent: true }));
scene.add(zHandleMesh);
zHandleMesh.position.set(-puzzleSize.x / 2, -puzzleSize.y / 2, handleMinZ);*/

export function resetXHandle(camera: Camera, handle: Mesh, min: number, max: number, size: Vector3) {
    if (camera.position.x > 0) {
        handle.position.set(max, -size.y / 2, -size.z / 2);
    } else {
        handle.position.set(min, -size.y / 2, -size.z / 2);
    }
}

export function resetZHandle(camera: Camera, handle: Mesh, min: number, max: number, size: Vector3) {
    if (camera.position.z > 0) {
        handle.position.set(-size.x / 2, -size.y / 2, max);
    } else {
        handle.position.set(-size.x / 2, -size.y / 2, min);
    }
}

export function facingX(camera: Camera): number {
    let cameraVector: Vector2 = new Vector2(camera.position.x, camera.position.z);
    cameraVector.normalize();
    return Math.abs(cameraVector.dot(new Vector2(1, 0)));
}
