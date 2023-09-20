import { Hint, Hints, Puzzle } from "./puzzle";
import { CoolMesh, XRay } from "./types";
import { TextureLoader, Shader, MeshLambertMaterial, Vector3, Scene, Camera, Mesh, Vector2 } from "three";

function getAssetURL(hint: Hint): string {
    if (hint.type == "none") {
        return "/assets/blank.png"
    }
    return `/assets/numbers/${hint.type}/${hint.count}.png`
}

export function updateMaterial(mesh: CoolMesh, loader: TextureLoader, hints: Hints) {
    const onBeforeCompile = (shader: Shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
            "#include <alphatest_fragment>",
            `float a = 1.0 - diffuseColor.a; diffuseColor = vec4(diffuse.r * a + diffuseColor.r * diffuseColor.a, diffuse.g * a + diffuseColor.g * diffuseColor.a, diffuse.b * a + diffuseColor.b * diffuseColor.a, 1.0);`);
    }
    const x = mesh.qX ?? 0;
    const y = mesh.qY ?? 0;
    const z = mesh.qZ ?? 0;
    const color: number = mesh.qFlag ? 0x00ffff : 0xffffff
    mesh.material = [
        new MeshLambertMaterial({ color: color, map: loader.load(getAssetURL(hints.x[y][z])), onBeforeCompile: onBeforeCompile }),
        new MeshLambertMaterial({ color: color, map: loader.load(getAssetURL(hints.x[y][z])), onBeforeCompile: onBeforeCompile }),
        new MeshLambertMaterial({ color: color, map: loader.load(getAssetURL(hints.y[x][z])), onBeforeCompile: onBeforeCompile }),
        new MeshLambertMaterial({ color: color, map: loader.load(getAssetURL(hints.y[x][z])), onBeforeCompile: onBeforeCompile }),
        new MeshLambertMaterial({ color: color, map: loader.load(getAssetURL(hints.z[x][y])), onBeforeCompile: onBeforeCompile }),
        new MeshLambertMaterial({ color: color, map: loader.load(getAssetURL(hints.z[x][y])), onBeforeCompile: onBeforeCompile }),
    ];
}

export function isVisible(xray: XRay, cube: CoolMesh, size: Vector3): boolean {
    if (xray.count == 0) {
        return true;
    }
    const x = cube.qX ?? 0;
    const y = cube.qY ?? 0;
    const z = cube.qZ ?? 0;
    switch (xray.direction) {
        case "up":
            return size.y - y > xray.count;
        case "down":
            return y >= xray.count;
        case "left":
            return x >= xray.count;
        case "right":
            return size.x - x > xray.count;
        case "front":
            return size.z - z > xray.count;
        case "back":
            return z >= xray.count;
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
        const x = cube.qX ?? -1;
        const y = cube.qY ?? -1;
        const z = cube.qZ ?? -1;
        if (hints.x[y][z].count == 0 && hints.x[y][z].type != "none" || hints.y[x][z].count == 0 && hints.y[x][z].type != "none" || hints.z[x][y].count == 0 && hints.z[x][y].type != "none") {
            return true;
        }
    }
    return false;
}

export function clearZeroes(cubes: CoolMesh[], hints: Hints, scene: Scene) {
    for (const cube of cubes) {
        const x = cube.qX ?? -1;
        const y = cube.qY ?? -1;
        const z = cube.qZ ?? -1;
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
        if (!puzzle[cube.qX ?? -1][cube.qY ?? -1][cube.qZ ?? -1]) {
            return false;
        }
    }
    return true;
}

export function colorCubes(cubes: CoolMesh[], puzzleColors: number[][][]) {
    const colors = [
        0x000000, /* 0: black */
        0xff0000, /* 1: red */
        0x80cfcf, /* 2: cyan */
        0x00ff00, /* 3: green */
        0x793f16, /* 4: brown */
        0xffffff, /* 5: white */
        0xfa9312, /* 6: dog1 */
        0xeee6a5, /* 7: dog2 */
        0xff9100, /* 8: hund orange */
        0x0000ff, /* 9: blue */
        0x9999ff, /* 10: light blue */
        0xff9999, /* 11: worm pink */
    ]
    for (const cube of cubes) {
        if (cube.qDestroy) {
            continue;
        }
        const color = puzzleColors[cube.qX ?? -1][cube.qY ?? -1][cube.qZ ?? -1];
        cube.material = new MeshLambertMaterial({ color: colors[color] });
    }
}

export function resetXHandle(camera: Camera, handle: Mesh, min: number, max: number) {
    if (camera.position.x > 0) {
        handle.position.setX(max);
    } else {
        handle.position.setX(min);
    }
}

export function resetZHandle(camera: Camera, handle: Mesh, min: number, max: number) {
    if (camera.position.z > 0) {
        handle.position.setZ(max);
    } else {
        handle.position.setZ(min);
    }
}

export function facingX(camera: Camera): number {
    let cameraVector: Vector2 = new Vector2(camera.position.x, camera.position.z);
    cameraVector.normalize();
    return Math.abs(cameraVector.dot(new Vector2(1, 0)));
}
