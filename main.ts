import { BoxGeometry, Color, DirectionalLight, Mesh, MeshLambertMaterial, MixOperation, OctahedronGeometry, PerspectiveCamera, Raycaster, Scene, Shader, TextureLoader, Vector2, Vector3, Vector3Tuple, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Hint, Hints, Puzzle, createHints } from './puzzle';
import { removeHints } from './reduce';
import { puzzleTable } from './library/lookup';
import { clamp, lerp } from 'three/src/math/MathUtils';

const debug = {
    showShape: false,
    createHints: false,
    reduceHints: false,
};

// Great type name
type CoolMesh = Mesh & { qX?: number, qY?: number, qZ?: number, qFlag?: boolean, qDestroy?: boolean };

type State = "orbit" | "flag" | "continueFlag" | "remove" | "dragX" | "dragZ";

let state = "orbit";

function setState(newState: State) {
    if (newState == state) {
        return;
    }

    // Disable state
    switch (state) {
        case "orbit":
            controls.enableRotate = false;
            break;
        case "flag":
            document.querySelector<HTMLDivElement>("#f-indicator")?.classList.remove("enabled");
            break;
        case "continueFlag":
            document.querySelector<HTMLDivElement>("#f-indicator")?.classList.remove("enabled");
            break;
        case "remove":
            document.querySelector<HTMLDivElement>("#d-indicator")?.classList.remove("enabled");
            break;
        case "dragX":
            break;
        case "dragZ":
            break;
    }

    switch (newState) {
        case "flag":
            document.querySelector<HTMLDivElement>("#f-indicator")?.classList.add("enabled");
            break;
        case "continueFlag":
            document.querySelector<HTMLDivElement>("#f-indicator")?.classList.add("enabled");
            break;
        case "remove":
            document.querySelector<HTMLDivElement>("#d-indicator")?.classList.add("enabled");
            break;
        case "orbit":
            controls.enableRotate = true;
            break;
        case "dragX":
            handleOriginalPosition = xHandleMesh.position.x;
            startPosition.set(pointer.x, pointer.y);
            resetZHandle();
            break;
        case "dragZ":
            handleOriginalPosition = zHandleMesh.position.z;
            startPosition.set(pointer.x, pointer.y);
            resetXHandle();
            break;
    }
    state = newState;
}

interface XRay {
    direction: string;
    count: number;
}

const loader = new TextureLoader();

function updateMaterial(mesh: CoolMesh, loader: TextureLoader, hints: Hints) {
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

function isVisible(xray: XRay, cube: CoolMesh, maxX: number, maxY: number, maxZ: number): boolean {
    if (xray.count == 0) {
        return true;
    }
    const x = cube.qX ?? 0;
    const y = cube.qY ?? 0;
    const z = cube.qZ ?? 0;
    switch (xray.direction) {
        case "up":
            return maxY - y > xray.count;
        case "down":
            return y >= xray.count;
        case "left":
            return x >= xray.count;
        case "right":
            return maxX - x > xray.count;
        case "front":
            return maxZ - z > xray.count;
        case "back":
            return z >= xray.count;
    }
    return true;
}

function getAssetURL(hint: Hint): string {
    if (hint.type == "none") {
        return "/assets/blank.png"
    }
    return `/assets/numbers/${hint.type}/${hint.count}.png`
}

let click: boolean = false;
let lastChange: boolean = false;
let mistakeCount = 0;
let handleOriginalPosition: number = 0;

function addMistake() {
    mistakeCount++;
    const counter = document.querySelector<HTMLSpanElement>("#mistakes-count");
    if (counter) {
        counter.textContent = mistakeCount.toString();
    }
}

const pointer = new Vector2();
const startPosition = new Vector2();

const raycaster = new Raycaster();
const scene = new Scene();
scene.background = new Color(240, 240, 240);
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = false;

// I create two lights in opposite directions to make it so you can look at any angle, and it still looks good.
function createLights() {
    const directionalLight = new DirectionalLight(0xffffff, 2);
    scene.add(directionalLight);
    scene.add(directionalLight.target);
    directionalLight.target.position.setX(0.5);
    directionalLight.target.position.setY(0);
    directionalLight.target.position.setZ(-0.2);

    const directionalLight2 = new DirectionalLight(0xffffff, 2);
    scene.add(directionalLight2);
    scene.add(directionalLight2.target);
    directionalLight2.target.position.setX(-0.5);
    directionalLight2.target.position.setY(2);
    directionalLight2.target.position.setZ(0.2);
}
createLights();

const urlParams = new URLSearchParams(window.location.search);
let puzzleName = urlParams.get("puzzle");
let response = await fetch(puzzleTable[puzzleName ?? ""]);
let json = await response.json();
const puzzle: Puzzle = json.puzzle;
const puzzleSize = { x: puzzle.length, y: puzzle[0].length, z: puzzle[0][0].length };
const distance = Math.sqrt(puzzleSize.x * puzzleSize.x + puzzleSize.y * puzzleSize.y + puzzleSize.z * puzzleSize.z);
camera.position.z = distance;
const hints: Hints = debug.createHints ? createHints(puzzle) : json.hints;
if (debug.reduceHints) {
    removeHints(puzzle, hints);
    console.log(JSON.stringify(hints));
}
const cubes: CoolMesh[] = [];

function createCubes(size: { x: number, y: number, z: number }, puzzle: Puzzle) {
    for (let x = 0; x < size.x; x++) {
        for (let y = 0; y < size.y; y++) {
            for (let z = 0; z < size.z; z++) {
                if (!puzzle[x][y][z] && debug.showShape) {
                    continue;
                }
                const geometry = new BoxGeometry(1, 1, 1);
                const cube: CoolMesh = new Mesh(geometry);
                cube.position.set(x - puzzleSize.x / 2 + 0.5, y - puzzleSize.y / 2 + 0.5, z - puzzleSize.z / 2 + 0.5);
                cube.qX = x;
                cube.qY = y;
                cube.qZ = z;
                cube.qFlag = false;
                cube.qDestroy = false;
                cube.layers.enable(0);
                scene.add(cube);
                updateMaterial(cube, loader, hints);
                cubes.push(cube);
            }
        }
    }
    if (debug.showShape) {
        colorCubes();
    }
}
createCubes(puzzleSize, puzzle);

// Minimum and maximum positions of X slider
const handleMinX = -puzzleSize.x / 2 - 1;
const handleMaxX = puzzleSize.x / 2 - 2;

// Minimum and maximum positions of inverted X slider
const handleMinNX = -puzzleSize.x / 2 + 2;
const handleMaxNX = puzzleSize.x / 2 + 1;

// Minimum and maximum positions of Z slider
const handleMinZ = -puzzleSize.z / 2 - 1;
const handleMaxZ = puzzleSize.z / 2 - 2;

// Minimum and maximum positions of inverted Z slider
const handleMinNZ = -puzzleSize.z / 2 + 2;
const handleMazNZ = puzzleSize.z / 2 + 1;

const handleGeometry = new OctahedronGeometry(0.25);
const xHandleMesh = new Mesh(handleGeometry, new MeshLambertMaterial({ color: 0xff00ff, opacity: 0.5, transparent: true }));
scene.add(xHandleMesh);
xHandleMesh.position.set(handleMinX, -puzzleSize.y / 2, -puzzleSize.z / 2);
xHandleMesh.scale.set(2, 1, 1);

const zHandleMesh = new Mesh(handleGeometry, new MeshLambertMaterial({ color: 0xffff00, opacity: 0.5, transparent: true }));
scene.add(zHandleMesh);
zHandleMesh.position.set(-puzzleSize.x / 2, -puzzleSize.y / 2, handleMinZ);
zHandleMesh.scale.set(1, 1, 2);

renderer.domElement.addEventListener("mousemove", function (ev: MouseEvent) {
    pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (ev.clientY / window.innerHeight) * 2 + 1;
})

renderer.domElement.addEventListener("mousedown", function (ev: MouseEvent) {
    click = true;
})

renderer.domElement.addEventListener("mouseup", function (ev: MouseEvent) {
    ev.preventDefault();
    if (state == "continueFlag") {
        setState("flag")
    } else if (state == "dragX" || state == "dragZ") {
        setState("orbit");
        xHandleMesh.material.opacity = 0.5;
        zHandleMesh.material.opacity = 0.5;
    }
})

window.addEventListener("keydown", function (ev: KeyboardEvent) {
    if (ev.key == "f" && state == "orbit") {
        setState("flag");
    } else if (ev.key == "d" && state == "orbit") {
        setState("remove");
    }
})

window.addEventListener("keyup", function (ev: KeyboardEvent) {
    if (ev.key == "f" && state == "flag" || state == "continueFlag") {
        setState("orbit");
    } else if (ev.key == "d" && state == "remove") {
        setState("orbit");
    }
})

function updateVisibility(xray: XRay) {
    for (let cube of cubes) {
        if (isVisible(xray, cube, puzzleSize.x, puzzleSize.y, puzzleSize.z)) {
            cube.visible = true;
            cube.layers.enable(0);
        } else {
            cube.visible = false;
            cube.layers.disable(0);
        }
    }
}

function areZeroes() {
    for (const cube of cubes) {
        const x = cube.qX ?? -1;
        const y = cube.qY ?? -1;
        const z = cube.qZ ?? -1;
        if (hints.x[y][z].count == 0 && hints.x[y][z].type != "none" || hints.y[x][z].count == 0 && hints.y[x][z].type != "none" || hints.z[x][y].count == 0 && hints.z[x][y].type != "none") {
            return true;
        }
    }
    return false;
}

function clearZeroes() {
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

const clearZeroesButton: HTMLButtonElement | null = document.querySelector("#clear-zeroes");
if (clearZeroesButton) {
    clearZeroesButton.disabled = !areZeroes();
}
clearZeroesButton?.addEventListener("click", function (ev: MouseEvent) {
    clearZeroes();
    clearZeroesButton.disabled = true;
})

function checkDone() {
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

function colorCubes() {
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
        const color = json.color[cube.qX ?? -1][cube.qY ?? -1][cube.qZ ?? -1];
        cube.material = new MeshLambertMaterial({ color: colors[color] });
    }
}

function resetXHandle() {
    if (camera.position.x > 0) {
        xHandleMesh.position.setX(puzzleSize.x / 2 + 1);
    } else {
        xHandleMesh.position.setX(handleMinX);
    }
}

function resetZHandle() {
    if (camera.position.z > 0) {
        zHandleMesh.position.setZ(puzzleSize.z / 2 + 1);
    } else {
        zHandleMesh.position.setZ(handleMinZ);
    }
}

function facingX(): number {
    let cameraVector: Vector2 = new Vector2(camera.position.x, camera.position.z);
    cameraVector.normalize();
    return Math.abs(cameraVector.dot(new Vector2(1, 0)));
}

let xray: XRay = { direction: "right", count: 0 };

// Actions when in standard orbit mode
function orbit() {
    let intersectXHandle = false;
    let intersectZHandle = false;

    // If you aren't using xray, reset the handles. Needed because the positions can change
    if (xray.count == 0) {
        resetXHandle();
        resetZHandle();
    }

    // Do raycast
    raycaster.setFromCamera(pointer, camera);
    raycaster.layers.set(0);

    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        // Check if you are hovering over a handle to highlight that it can be acted on
        if (intersects[0].object == xHandleMesh) {
            intersectXHandle = true;
        } else if (intersects[0].object == zHandleMesh) {
            intersectZHandle = true;
        }

        let object: CoolMesh = intersects[0].object as CoolMesh;
        // If you click one of the handles, switch to a drag mode
        if (click) {
            if (object == xHandleMesh) {
                setState("dragX");
            } else if (object == zHandleMesh) {
                setState("dragZ");
            }
        }
    }
    xHandleMesh.material.opacity = intersectXHandle ? 1 : 0.5;
    zHandleMesh.material.opacity = intersectZHandle ? 1 : 0.5;
    click = false;
}

// Actions when dragging the X handle
function dragX() {
    // How much dragging affects the position
    const dragSpeed = 5;

    // The x and the Y motion
    const xDistance = pointer.x - startPosition.x;
    const yDistance = pointer.y - startPosition.y;

    // Modifications I don't really understand
    let localXDistance = xDistance;
    let localYDistance = yDistance;
    if (camera.position.x > 0) {
        localYDistance = -localYDistance;
    }
    if (camera.position.z < 0) {
        localXDistance = -localXDistance;
    }
    if (camera.position.y < 0) {
        localYDistance = -localYDistance;
    }

    // Make influence of distance proportional to direction facing
    const distance = dragSpeed * lerp(localXDistance, localYDistance, facingX())

    // Set new position to snapped distance
    const newPosition = handleOriginalPosition + Math.floor(distance);

    // Clamp the position based on variables and position.
    let clampedPosition = 0;
    if (camera.position.x > 0) {
        clampedPosition = clamp(newPosition, handleMinNX, handleMaxNX);

        if (clampedPosition != xHandleMesh.position.x) {
            xray = { direction: "right", count: handleMaxNX - clampedPosition };
            updateVisibility(xray);
        }
    } else {
        clampedPosition = clamp(newPosition, handleMinX, handleMaxX);

        if (clampedPosition != xHandleMesh.position.x) {
            xray = { direction: "left", count: clampedPosition - handleMinX };
            updateVisibility(xray);
        }
    }

    // Set the new position
    xHandleMesh.position.setX(clampedPosition);
}

// Actions when dragging the Z handle. see dragX() for explanations.
function dragZ() {
    const dragSpeed = 5
    const xDistance = pointer.x - startPosition.x;
    const yDistance = pointer.y - startPosition.y;

    let localXDistance = xDistance;
    let localYDistance = yDistance;
    if (camera.position.x > 0) {
        localXDistance = -localXDistance;
    }
    if (camera.position.z > 0) {
        localYDistance = -localYDistance;
    }
    if (camera.position.y < 0) {
        localYDistance = -localYDistance;
    }

    let distance = dragSpeed * lerp(localYDistance, localXDistance, facingX());
    const newPosition = handleOriginalPosition + Math.floor(distance);
    let clampedPosition = 0;
    if (camera.position.z > 0) {
        clampedPosition = clamp(newPosition, handleMinNZ, handleMazNZ);

        if (clampedPosition != zHandleMesh.position.z) {
            xray = { direction: "front", count: handleMazNZ - clampedPosition };
            updateVisibility(xray);
        }
    } else {
        clampedPosition = clamp(newPosition, handleMinZ, handleMaxZ)

        if (clampedPosition != zHandleMesh.position.z) {
            xray = { direction: "back", count: clampedPosition - handleMinZ };
            updateVisibility(xray);
        }
    }

    zHandleMesh.position.setZ(clampedPosition);
}

// Actions when in flagging mode
function flag() {
    // Nothing happens if not clicking
    if (!click) {
        return;
    }
    click = false;

    raycaster.setFromCamera(pointer, camera);
    raycaster.layers.set(0);

    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length == 0) {
        return;
    }

    // If you click on a cube, it switches its flag, and
    // switches to continueFlag state for click-drag
    let object: CoolMesh = intersects[0].object as CoolMesh;
    object.qFlag = !object.qFlag;
    updateMaterial(object, loader, hints);
    lastChange = object.qFlag;
    setState("continueFlag");
}

// Actions when flagging and dragging
function continueFlag() {
    raycaster.setFromCamera(pointer, camera);
    raycaster.layers.set(0);

    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length == 0) {
        return;
    }

    // Continue the flag
    let object: CoolMesh = intersects[0].object as CoolMesh;
    if (object.qFlag != lastChange) {
        object.qFlag = lastChange;
        updateMaterial(object, loader, hints);
    }
}

// Actions when deleting
function remove() {
    if (!click) {
        return;
    }
    click = false;

    raycaster.setFromCamera(pointer, camera);
    raycaster.layers.set(0);

    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length == 0) {
        return;
    }

    let object: CoolMesh = intersects[0].object as CoolMesh;
    let x: number = object.qX ?? 0;
    let y: number = object.qY ?? 0;
    let z: number = object.qZ ?? 0;

    // You can't delete a flagged cube
    if (object.qFlag) {
        return;
    }

    // If the cube is part of the solution, count it as a mistake.
    if (puzzle[x][y][z]) {
        addMistake();
        object.qFlag = true;
        updateMaterial(object, loader, hints);
    } else {
        // Destroy the cube
        object.qDestroy = true;
        scene.remove(object);

        // Check if the puzzle is complete
        let isDone = checkDone();
        if (isDone) {
            // Color the cubes and disable xray
            colorCubes();
            xray.count = 0;
            updateVisibility(xray);
        }
    }
}

// Main method
function animate() {
    requestAnimationFrame(animate);

    switch (state) {
        case "orbit":
            orbit();
            break;
        case "dragX":
            dragX();
            break;
        case "dragZ":
            dragZ();
            break;
        case "continueFlag":
            continueFlag();
            break;
        case "flag":
            flag();
            break;
        case "remove":
            remove();
            break;
    }
    renderer.render(scene, camera);
}


animate();