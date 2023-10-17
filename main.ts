import { BoxGeometry, Clock, Color, DirectionalLight, MaxEquation, Mesh, MeshLambertMaterial, OctahedronGeometry, PerspectiveCamera, Raycaster, Scene, TextureLoader, Vector2, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Hints, Puzzle, createHints } from './puzzle';
import { removeHints } from './reduce';
import { puzzleTable } from './library/lookup';
import { clamp, lerp } from 'three/src/math/MathUtils';
import { State, CoolMesh, XRay, Level } from './types';
import { areZeroes, checkDone, clearZeroes, colorCubes, facingX, getPuzzle, renderStars, resetXHandle, resetZHandle, secondsToTime, updateMaterial, updatePuzzleResults, updateVisibility } from './utilities';
import { enableClock } from './clock';

// HTML elements that matter
// @ts-ignore
const flagIndicator: HTMLDivElement = document.querySelector<HTMLDivElement>("#f-indicator");
// @ts-ignore
const removeIndicator: HTMLDivElement = document.querySelector<HTMLDivElement>("#d-indicator");
// @ts-ignore
const mistakeCounter: HTMLSpanElement = document.querySelector<HTMLSpanElement>("#mistakes-count");
// @ts-ignore
const clearZeroesButton: HTMLButtonElement = document.querySelector<HTMLButtonElement>("#clear-zeroes");
// @ts-ignore
const clock: HTMLParagraphElement = document.querySelector<HTMLParagraphElement>("#clock-digital");

// Results elements
// @ts-ignore
const resultsDialog: HTMLDialogElement = document.querySelector<HTMLDialogElement>("#results");
// @ts-ignore
const resultsName: HTMLHeadingElement = document.querySelector<HTMLHeadingElement>("#results-name");
// @ts-ignore
const resultsTime: HTMLSpanElement = document.querySelector<HTMLSpanElement>("#results-time");
// @ts-ignore
const resultsMistakes: HTMLSpanElement = document.querySelector<HTMLSpanElement>("#results-mistakes");
// @ts-ignore
const resultsStars: HTMLSpanElement = document.querySelector<HTMLSpanElement>("#results-stars");
// @ts-ignore
const resultsCustomBack: HTMLAnchorElement = document.querySelector<HTMLAnchorElement>("#results-custom-back");
// @ts-ignore
const resultsBuiltinBack: HTMLAnchorElement = document.querySelector<HTMLAnchorElement>("#results-builtin-back");


const debug = {
    showShape: false,
    createHints: false,
    reduceHints: false,
};

let state: State = "orbit";

// Whether a puzzle is built in or user created.
let isBuiltin = true;

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
            flagIndicator?.classList.remove("enabled");
            break;
        case "continueFlag":
            flagIndicator?.classList.remove("enabled");
            break;
        case "remove":
            removeIndicator?.classList.remove("enabled");
            break;
        case "dragX":
            break;
        case "dragZ":
            break;
        case "continueRemove":
            removeIndicator?.classList.remove("enabled");
            removeClock.stop();
            break;
    }

    switch (newState) {
        case "flag":
            flagIndicator?.classList.add("enabled");
            break;
        case "continueFlag":
            flagIndicator?.classList.add("enabled");
            break;
        case "remove":
            removeIndicator?.classList.add("enabled");
            break;
        case "orbit":
            controls.enableRotate = true;
            break;
        case "dragX":
            handleOriginalPosition = xHandleMesh.position.x;
            startPosition.set(pointer.x, pointer.y);
            resetZHandle(camera, zHandleMesh, handleMinZ, handleMaxNZ, puzzleSize);
            break;
        case "dragZ":
            handleOriginalPosition = zHandleMesh.position.z;
            startPosition.set(pointer.x, pointer.y);
            resetXHandle(camera, xHandleMesh, handleMinX, handleMaxNX, puzzleSize);
            break;
        case "continueRemove":
            removeIndicator?.classList.add("enabled");
            removeClock.start();
            continueDelay = false;
            break;
        case "end":
            solveClock.stop();
            xHandleMesh.visible = false;
            zHandleMesh.visible = false;
            xray.count = 0;
            updateVisibility(xray, cubes, puzzleSize);

            // Setup camera for spin
            camera.position.set(1, 1, 1).normalize().multiplyScalar(distance);
            camera.lookAt(new Vector3(0, 0, 0));
            controls.autoRotate = true;
            controls.autoRotateSpeed = 8;

            // Hide UI
            document.querySelector(".crop")?.setAttribute("style", "display:none");

            const seconds = solveClock.getElapsedTime();
            let stars = 1;
            if (mistakeCount == 0) {
                stars++;
            }
            if (seconds < 60 * 5) {
                stars++;
            }
            showResults(level.name, seconds, mistakeCount, stars);

            // save data
            saveResults(puzzleId, seconds, stars)
            break;
        case "fail":
            xHandleMesh.visible = false;
            zHandleMesh.visible = false;
            break;

    }
    state = newState;
}

function showResults(name: string, seconds: number, mistakes: number, stars: number) {
    resultsName.textContent = `"${name}"`;
    resultsTime.textContent = `${secondsToTime(seconds)}`;
    resultsMistakes.textContent = mistakes.toString();
    resultsStars.textContent = renderStars(stars);
    if (isBuiltin) {
        resultsCustomBack?.remove();
    } else {
        resultsBuiltinBack?.remove();
    }
    resultsDialog?.show();
}

function saveResults(puzzleId: string, seconds: number, stars: number) {
    updatePuzzleResults(puzzleId, function (e: Object): Object {
        return {
            seconds: Math.min(seconds, e["seconds"] ?? 9999),
            stars: Math.max(stars, e["stars"] ?? 0)
        };
    });
}

const loader = new TextureLoader();

let click: boolean = false;
let lastChange: boolean = false;
let removeDirection: Vector3 = new Vector3();
let continueDelay = false;
let removePos: Vector3 = new Vector3();
let mistakeCount = 0;
let handleOriginalPosition: number = 0;
let xray: XRay = { direction: "right", count: 0 };
const solveClock = new Clock();
let puzzleId = "";
solveClock.start();

// Returns whether the game is over
function addMistake(): boolean {
    mistakeCount++;
    if (mistakeCounter) {
        mistakeCounter.textContent = mistakeCount.toString();
    }
    if (mistakeCount == 5) {
        setState("fail");
        return true;
    }
    return false;
}

const pointer = new Vector2();
const startPosition = new Vector2();
const removeClock = new Clock();

const raycaster = new Raycaster();
const scene = new Scene();
scene.background = new Color(255, 255, 255);
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new WebGLRenderer();
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

async function createPuzzle(): Promise<Level> {
    const urlParams = new URLSearchParams(location.search);
    const puzzleName = urlParams.get("puzzle");
    const puzzleLocal = urlParams.get("local");
    if (puzzleName) {
        const response = await fetch(puzzleTable[puzzleName ?? ""]);
        const json = await response.json();
        const puzzle: Puzzle = json.puzzle;
        const hints: Hints = debug.createHints ? createHints(puzzle) : json.hints;
        puzzleId = puzzleName;
        return { puzzle, hints, color: json.color, name: json.name, thumbnail: "" };
    } else if (puzzleLocal) {
        isBuiltin = false;
        puzzleId = puzzleLocal;
        let res = getPuzzle(puzzleLocal);
        if (debug.createHints) {
            res.hints = createHints(res.puzzle);
        }
        return res;
    } else {
        throw "No puzzle provided";
    }
}

const level = await createPuzzle();
const { puzzle, hints, color } = level;
const puzzleSize = new Vector3(puzzle.length, puzzle[0].length, puzzle[0][0].length);
const distance = puzzleSize.length();
camera.position.z = distance;
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
                cube.qPos = new Vector3(x, y, z);
                cube.qFlag = false;
                cube.qDestroy = false;
                cube.qColor = color[x][y][z];
                cube.layers.enable(0);
                scene.add(cube);
                updateMaterial(cube, loader, hints);
                cubes.push(cube);
            }
        }
    }
    if (debug.showShape) {
        colorCubes(cubes, color);
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
const handleMaxNZ = puzzleSize.z / 2 + 1;

const handleGeometry = new OctahedronGeometry(0.25);
const xHandleMesh = new Mesh(handleGeometry, new MeshLambertMaterial({ color: 0xff00ff, opacity: 0.5, transparent: true }));
scene.add(xHandleMesh);
xHandleMesh.position.set(handleMinX, -puzzleSize.y / 2, -puzzleSize.z / 2);
xHandleMesh.scale.set(2, 1, 1);

const zHandleMesh = new Mesh(handleGeometry, new MeshLambertMaterial({ color: 0xffff00, opacity: 0.5, transparent: true }));
scene.add(zHandleMesh);
zHandleMesh.position.set(-puzzleSize.x / 2, -puzzleSize.y / 2, handleMinZ);
zHandleMesh.scale.set(1, 1, 2);

enableClock(10 * 60, function () {
    setState("fail");
});

renderer.domElement.addEventListener("mousemove", function (ev: MouseEvent) {
    pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (ev.clientY / window.innerHeight) * 2 + 1;
})

renderer.domElement.addEventListener("mousedown", function (ev: MouseEvent) {
    click = true;
})

function smallDistance(end: Vector2, start: Vector2): boolean {
    const xDistance = end.x - start.x;
    const yDistance = end.y - start.y;
    return Math.abs(xDistance) < 0.05 && Math.abs(yDistance) < 0.05;
}

renderer.domElement.addEventListener("mouseup", function (ev: MouseEvent) {
    ev.preventDefault();
    switch (state) {
        case "continueFlag":
            setState("flag");
            break;
        case "continueRemove":
            setState("remove");
            break;
        case "dragX":
        case "dragZ":
            if (smallDistance(pointer, startPosition)) {
                xray.count = 0;
                updateVisibility(xray, cubes, puzzleSize);
            }
            setState("orbit");
            break;
    }
})

window.addEventListener("keydown", function (ev: KeyboardEvent) {
    if (state != "orbit") {
        return;
    }
    if (ev.key == "f") {
        setState("flag");
    } else if (ev.key == "d") {
        setState("remove");
    }
})

window.addEventListener("keyup", function (ev: KeyboardEvent) {
    const stopFlag = ev.key == "f" && state == "flag" || state == "continueFlag";
    const stopRemove = ev.key == "d" && state == "remove" || state == "continueRemove";
    if (stopFlag || stopRemove) {
        setState("orbit");
    }
})

clearZeroesButton.disabled = !areZeroes(cubes, hints);
clearZeroesButton.addEventListener("click", function (ev: MouseEvent) {
    clearZeroes(cubes, hints, scene);
    clearZeroesButton.disabled = true;
})

// Actions when in standard orbit mode
function orbit() {
    let intersectXHandle = false;
    let intersectZHandle = false;

    // If you aren't using xray, reset the handles. Needed because the positions can change
    if (xray.count == 0) {
        resetXHandle(camera, xHandleMesh, handleMinX, handleMaxNX, puzzleSize);
        resetZHandle(camera, zHandleMesh, handleMinZ, handleMaxNZ, puzzleSize);
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
    if (xray.count != 0) {
        if (xray.direction == "left" || xray.direction == "right") {
            xHandleMesh.material.opacity = 1;
            zHandleMesh.material.opacity = 0.5;
        } else {
            xHandleMesh.material.opacity = 0.5;
            zHandleMesh.material.opacity = 1;
        }
    }
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
    const distance = dragSpeed * lerp(localXDistance, localYDistance, facingX(camera))

    // Set new position to snapped distance
    const newPosition = handleOriginalPosition + Math.floor(distance);

    // Clamp the position based on variables and position.
    let clampedPosition = 0;
    if (camera.position.x > 0) {
        clampedPosition = clamp(newPosition, handleMinNX, handleMaxNX);

        if (clampedPosition != xHandleMesh.position.x) {
            xray = { direction: "right", count: handleMaxNX - clampedPosition };
            updateVisibility(xray, cubes, puzzleSize);
        }
    } else {
        clampedPosition = clamp(newPosition, handleMinX, handleMaxX);

        if (clampedPosition != xHandleMesh.position.x) {
            xray = { direction: "left", count: clampedPosition - handleMinX };
            updateVisibility(xray, cubes, puzzleSize);
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

    let distance = dragSpeed * lerp(localYDistance, localXDistance, facingX(camera));
    const newPosition = handleOriginalPosition + Math.floor(distance);
    let clampedPosition = 0;
    if (camera.position.z > 0) {
        clampedPosition = clamp(newPosition, handleMinNZ, handleMaxNZ);

        if (clampedPosition != zHandleMesh.position.z) {
            xray = { direction: "front", count: handleMaxNZ - clampedPosition };
            updateVisibility(xray, cubes, puzzleSize);
        }
    } else {
        clampedPosition = clamp(newPosition, handleMinZ, handleMaxZ)

        if (clampedPosition != zHandleMesh.position.z) {
            xray = { direction: "back", count: clampedPosition - handleMinZ };
            updateVisibility(xray, cubes, puzzleSize);
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

    const intersects = raycaster.intersectObjects(scene.children).filter(i => i.object != xHandleMesh && i.object != zHandleMesh);
    if (intersects.length == 0) {
        return;
    }

    // If you click on a cube, it switches its flag, and
    // switches to continueFlag state for click-drag
    let object: CoolMesh = intersects[0].object as CoolMesh;
    if (!object.qBroken) {
        object.qFlag = !object.qFlag;
    }
    updateMaterial(object, loader, hints);
    lastChange = object.qFlag ?? true;
    setState("continueFlag");
}

// Actions when flagging and dragging
function continueFlag() {
    raycaster.setFromCamera(pointer, camera);
    raycaster.layers.set(0);

    const intersects = raycaster.intersectObjects(scene.children).filter(i => i.object != xHandleMesh && i.object != zHandleMesh);
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

    const intersects = raycaster.intersectObjects(scene.children).filter(i => i.object != xHandleMesh && i.object != zHandleMesh);
    if (intersects.length == 0) {
        return;
    }

    let object: CoolMesh = intersects[0].object as CoolMesh;
    let objectPosition: Vector3 = object.qPos ?? new Vector3();

    // You can't delete a flagged cube
    if (object.qFlag) {
        return;
    }

    // If the cube is part of the solution, count it as a mistake.
    if (puzzle[objectPosition.x][objectPosition.y][objectPosition.z]) {
        const result = addMistake();
        object.qFlag = true;
        object.qBroken = true;
        updateMaterial(object, loader, hints);
        if (result) {
            return;
        }
    } else {
        // Destroy the cube
        object.qDestroy = true;
        scene.remove(object);

        // Check for zeroes
        if (clearZeroesButton) {
            clearZeroesButton.disabled = !areZeroes(cubes, hints);
        }

        // Check if the puzzle is complete
        if (checkDone(cubes, puzzle)) {
            // Color the cubes and disable xray
            colorCubes(cubes, color);
            setState("end");
            return;
        }
    }
    removeDirection = intersects[0].normal ?? new Vector3();
    removePos = object.qPos ?? new Vector3();
    setState("continueRemove");
}

function continueRemove() {
    const neededDelay = continueDelay ? 0.1 : 0.5;
    if (removeClock.getElapsedTime() < neededDelay) {
        return;
    }
    raycaster.setFromCamera(pointer, camera);
    raycaster.layers.set(0);

    const intersects = raycaster.intersectObjects(scene.children).filter(i => i.object != xHandleMesh && i.object != zHandleMesh);
    if (intersects.length == 0) {
        return;
    }

    let object: CoolMesh = intersects[0].object as CoolMesh;
    let objectPosition: Vector3 = object.qPos ?? new Vector3();

    // You can't delete a flagged cube
    if (object.qFlag) {
        setState("remove");
        return;
    }

    if (!object.qPos) {
        return;
    }
    if (removeDirection.x == 1 || removeDirection.x == -1) {
        if (object.qPos.y != removePos.y || object.qPos.z != removePos.z) {
            setState("remove");
            return;
        }
    } else if (removeDirection.y == 1 || removeDirection.y == -1) {
        if (object.qPos.x != removePos.x || object.qPos.z != removePos.z) {
            setState("remove");
            return;
        }
    } else {
        if (object.qPos.x != removePos.x || object.qPos.y != removePos.y) {
            setState("remove");
            return;
        }
    }
    removeClock.start();
    continueDelay = true;

    // If the cube is part of the solution, count it as a mistake.
    if (puzzle[objectPosition.x][objectPosition.y][objectPosition.z]) {
        addMistake();
        object.qFlag = true;
        object.qBroken = true;
        updateMaterial(object, loader, hints);
    } else {
        // Destroy the cube
        object.qDestroy = true;
        scene.remove(object);

        // Check for zeroes
        if (clearZeroesButton) {
            clearZeroesButton.disabled = !areZeroes(cubes, hints);
        }

        // Check if the puzzle is complete
        if (checkDone(cubes, puzzle)) {
            // Color the cubes and disable xray
            colorCubes(cubes, color);
            setState("end");
        }
    }
}

function updateClock() {
    const seconds = 10 * 60 - solveClock.getElapsedTime();
    clock.textContent = `${secondsToTime(seconds)}`;
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
        case "continueRemove":
            continueRemove();
            break;
        case "end":
            controls.update();
            break;
    }

    updateClock();

    renderer.render(scene, camera);
}

animate();
