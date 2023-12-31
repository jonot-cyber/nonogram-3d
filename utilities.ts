import { Hint, Hints, Puzzle, createHints, createSliceHint } from "./puzzle";
import { CoolMesh, Level, XRay } from "./types";
import { TextureLoader, Shader, MeshLambertMaterial, Vector3, Scene, Camera, Mesh, Vector2, Color, ImageLoader, Loader } from "three";

function getAssetURL(hint: Hint, broken: boolean = false): string {
    if (hint.type == "none") {
        if (broken) {
            return "./assets/broken-border.png";
        }
        return "./assets/blank.png"
    }
    return `./assets/numbers/${hint.type}/${broken ? "broken/" : ""}${hint.count}.png`
}

function onBeforeCompile(shader: Shader) {
    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <alphatest_fragment>",
        `vec4 col1 = vec4(0.0, 0.33, 0.33, 1.0);
        vec4 col2 = vec4(diffuse.r, diffuse.g, diffuse.b, 1.0);
        diffuseColor = col1 * diffuseColor.a + col2 * (1.0 - diffuseColor.a);
        `);
}

function onBeforeCompile2(shader: Shader) {
    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <alphatest_fragment>",
        `
        vec4 textureColor = texture2D(map, vMapUv);
        diffuseColor.rgb = textureColor.rgb * diffuseColor.a + diffuse * (1.0 - diffuseColor.a);
        diffuseColor.a = 1.0;
        `);
}

function loadSticker(idx: number, stickers?: string[]): string {
    if (!stickers) {
        return "./assets/blank.png";
    }
    if (stickers[idx] == "") {
        return "./assets/blank.png";
    }
    return stickers[idx];
}

export function updateMaterial(mesh: CoolMesh, loader: TextureLoader, createMode: boolean, hints?: Hints) {
    if (createMode) {
        const color = mesh.qColor ?? 0xffffff;
        mesh.material = [
            new MeshLambertMaterial({ color: color, map: loader.load(loadSticker(0, mesh.qSticker)), onBeforeCompile: onBeforeCompile2 }),
            new MeshLambertMaterial({ color: color, map: loader.load(loadSticker(1, mesh.qSticker)), onBeforeCompile: onBeforeCompile2 }),
            new MeshLambertMaterial({ color: color, map: loader.load(loadSticker(2, mesh.qSticker)), onBeforeCompile: onBeforeCompile2 }),
            new MeshLambertMaterial({ color: color, map: loader.load(loadSticker(3, mesh.qSticker)), onBeforeCompile: onBeforeCompile2 }),
            new MeshLambertMaterial({ color: color, map: loader.load(loadSticker(4, mesh.qSticker)), onBeforeCompile: onBeforeCompile2 }),
            new MeshLambertMaterial({ color: color, map: loader.load(loadSticker(5, mesh.qSticker)), onBeforeCompile: onBeforeCompile2 }),
        ];

    } else {
        if (hints) {
            const meshPosition = mesh.qPos ?? new Vector3(0, 0, 0);
            const color: number = mesh.qFlag ? 0x00ffff : 0xffffff;
            if (!mesh.qCompleted) {
                return;
            }
            let hintCompletedX: boolean = mesh.qCompleted[0];
            let hintCompletedY: boolean = mesh.qCompleted[1];
            let hintCompletedZ: boolean = mesh.qCompleted[2];
            const xTexture = loader.load(getAssetURL(hints.x[meshPosition.y][meshPosition.z], mesh.qBroken));
            const yTexture = loader.load(getAssetURL(hints.y[meshPosition.x][meshPosition.z], mesh.qBroken));
            const zTexture = loader.load(getAssetURL(hints.z[meshPosition.x][meshPosition.y], mesh.qBroken));
            mesh.material = [
                new MeshLambertMaterial({ color: color, map: xTexture, onBeforeCompile: hintCompletedX ? onBeforeCompile : onBeforeCompile2 }),
                new MeshLambertMaterial({ color: color, map: xTexture, onBeforeCompile: hintCompletedX ? onBeforeCompile : onBeforeCompile2 }),
                new MeshLambertMaterial({ color: color, map: yTexture, onBeforeCompile: hintCompletedY ? onBeforeCompile : onBeforeCompile2 }),
                new MeshLambertMaterial({ color: color, map: yTexture, onBeforeCompile: hintCompletedY ? onBeforeCompile : onBeforeCompile2 }),
                new MeshLambertMaterial({ color: color, map: zTexture, onBeforeCompile: hintCompletedZ ? onBeforeCompile : onBeforeCompile2 }),
                new MeshLambertMaterial({ color: color, map: zTexture, onBeforeCompile: hintCompletedZ ? onBeforeCompile : onBeforeCompile2 }),
            ];
        } else {
            if (!mesh.qSticker) {
                mesh.material = new MeshLambertMaterial({ color: mesh.qColor });
                return;
            }
            mesh.material = [
                new MeshLambertMaterial({ color: mesh.qColor, map: loader.load(mesh.qSticker[0]), onBeforeCompile: onBeforeCompile2}),
                new MeshLambertMaterial({ color: mesh.qColor, map: loader.load(mesh.qSticker[1]), onBeforeCompile: onBeforeCompile2}),
                new MeshLambertMaterial({ color: mesh.qColor, map: loader.load(mesh.qSticker[2]), onBeforeCompile: onBeforeCompile2}),
                new MeshLambertMaterial({ color: mesh.qColor, map: loader.load(mesh.qSticker[3]), onBeforeCompile: onBeforeCompile2}),
                new MeshLambertMaterial({ color: mesh.qColor, map: loader.load(mesh.qSticker[4]), onBeforeCompile: onBeforeCompile2}),
                new MeshLambertMaterial({ color: mesh.qColor, map: loader.load(mesh.qSticker[5]), onBeforeCompile: onBeforeCompile2}),
            ]
        }
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

export function colorCubes(cubes: CoolMesh[], loader: TextureLoader) {
    for (const cube of cubes) {
        if (cube.qDestroy) {
            continue;
        }
        const color = cube.qColor;
        updateMaterial(cube, loader, false);
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


function pad(input: string, len: number): string {
    while (input.length < len) {
        input = "0" + input;
    }
    return input;
}

export function secondsToTime(seconds?: number): string {
    if (!seconds) {
        return "--:--";
    }
    const minutes = Math.floor(seconds / 60);
    const leftoverSeconds = Math.floor(seconds % 60);

    return `${pad(minutes.toString(), 2)}:${pad(leftoverSeconds.toString(), 2)}`
}

export function renderStars(stars: number): string {
    return "★".repeat(stars) + "☆".repeat(3 - stars);
}

export function getPuzzleResults(id: string): Object | undefined {
    const results: Object = JSON.parse(localStorage.getItem("nonogram-3d-results") ?? "{}");
    if (results.hasOwnProperty(id)) {
        return results[id];
    }
    return undefined;
}

export function updatePuzzleResults(id: string, fn: (e: Object) => Object): Object {
    let results: Object = JSON.parse(localStorage.getItem("nonogram-3d-results") ?? "{}");
    if (results[id]) {
        results[id] = fn(results[id]);
    } else {
        results[id] = fn({});
    }
    localStorage.setItem("nonogram-3d-results", JSON.stringify(results));
    return results[id];
}

export function getPuzzle(id: string): Level {
    const storage = JSON.parse(localStorage.getItem("nonogram-3d-puzzle") ?? "{}");
    const json = storage[id ?? ""];
    return { puzzle: json.puzzle, hints: json.hints, color: json.color, name: json.name, thumbnail: "", stickers: json.stickers };
}

export function removePuzzle(id: string) {
    const storage = JSON.parse(localStorage.getItem("nonogram-3d-puzzle") ?? "{}");
    delete storage[id];
    localStorage.setItem("nonogram-3d-puzzle", JSON.stringify(storage));
}

export function updatePuzzle(id: string, fn: (e: Object) => Object): Object {
    let puzzles: Object = JSON.parse(localStorage.getItem("nonogram-3d-puzzle") ?? "{}");
    if (puzzles[id]) {
        puzzles[id] = fn(puzzles[id]);
    } else {
        puzzles[id] = fn({});
    }
    localStorage.setItem("nonogram-3d-puzzle", JSON.stringify(puzzles));
    return puzzles[id];
}

export function getPuzzles(): Level[] {
    const storage = JSON.parse(localStorage.getItem("nonogram-3d-puzzle") ?? "{}");
    return Object.values(storage);
}

export function normalToStickerIndex(normal: Vector3): number {
    if (normal.x == 1) {
        return 0;
    } else if (normal.x == -1) {
        return 1;
    } else if (normal.y == 1) {
        return 2;
    } else if (normal.y == -1) {
        return 3;
    } else if (normal.z == 1) {
        return 4;
    } else {
        return 5;
    }
}

export function smallDistance(end: Vector2, start: Vector2): boolean {
    const xDistance = end.x - start.x;
    const yDistance = end.y - start.y;
    return Math.abs(xDistance) < 0.05 && Math.abs(yDistance) < 0.05;
}

export function isSliceCompleted(cubes: CoolMesh[], origin: CoolMesh, direction: string, hints: Hints): boolean {
    if (!origin.qPos) {
        return false;
    }
    let correctHint: Hint | undefined = undefined;
    let slice: CoolMesh[] = [];
    let newSlice: boolean[] = [];
    let hint: Hint | undefined = undefined;
    switch (direction) {
        case "x":
            correctHint = hints.x[origin.qPos?.y][origin.qPos?.z];
            for (const cube of cubes) {
                if (!cube.qPos) {
                    return false;
                }
                if (cube.qPos.y == origin.qPos.y && cube.qPos.z == origin.qPos.z) {
                    slice.push(cube);
                }
            }
            newSlice = slice.map(i => false);
            for (const cube of slice) {
                let idx = cube.qPos?.x ?? 0;
                if (cube.qDestroy) {
                    newSlice[idx] = false
                } else if (cube.qFlag) {
                    newSlice[idx] = true;
                } else {
                    return false;
                }
            }
            hint = createSliceHint(newSlice);
            break;
        case "y":
            correctHint = hints.y[origin.qPos?.x][origin.qPos?.z];
            for (const cube of cubes) {
                if (!cube.qPos) {
                    return false;
                }
                if (cube.qPos.x == origin.qPos.x && cube.qPos.z == origin.qPos.z) {
                    slice.push(cube);
                }
            }
            newSlice = slice.map(i => false);
            for (const cube of slice) {
                let idx = cube.qPos?.y ?? 0;
                if (cube.qDestroy) {
                    newSlice[idx] = false
                } else if (cube.qFlag) {
                    newSlice[idx] = true;
                } else {
                    return false;
                }
            }
            hint = createSliceHint(newSlice);
            break;
        case "z":
            correctHint = hints.z[origin.qPos?.x][origin.qPos?.y];
            for (const cube of cubes) {
                if (!cube.qPos) {
                    return false;
                }
                if (cube.qPos.x == origin.qPos.x && cube.qPos.y == origin.qPos.y) {
                    slice.push(cube);
                }
            }
            newSlice = slice.map(i => false);
            for (const cube of slice) {
                let idx = cube.qPos?.z ?? 0;
                if (cube.qDestroy) {
                    newSlice[idx] = false
                } else if (cube.qFlag) {
                    newSlice[idx] = true;
                } else {
                    return false;
                }
            }
            hint = createSliceHint(newSlice);
            break;
    }
    return hint?.count == correctHint?.count && hint?.type == correctHint?.type;
}