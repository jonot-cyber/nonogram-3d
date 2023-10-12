import { BoxGeometry, Clock, Color, DirectionalLight, Mesh, MeshLambertMaterial, OctahedronGeometry, PerspectiveCamera, Raycaster, Scene, TextureLoader, Vector2, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Hints, Puzzle, createHints } from './puzzle';
import { removeHints } from './reduce';
import { puzzleTable } from './library/lookup';
import { clamp, lerp } from 'three/src/math/MathUtils';
import { State, CoolMesh, XRay, Level } from './types';
import { areZeroes, checkDone, clearZeroes, colorCubes, facingX, resetXHandle, resetZHandle, updateMaterial, updateVisibility } from './utilities';
import { enableClock } from './clock';

// HTML elements that matter
const flagIndicator: HTMLDivElement | null = document.querySelector<HTMLDivElement>("#f-indicator");
const removeIndicator: HTMLDivElement | null = document.querySelector<HTMLDivElement>("#d-indicator");
const mistakeCounter: HTMLSpanElement | null = document.querySelector<HTMLSpanElement>("#mistakes-count");
const clearZeroesButton: HTMLButtonElement | null = document.querySelector("#clear-zeroes");

// Results elements
const resultsDialog: HTMLDialogElement | null = document.querySelector<HTMLDialogElement>("#results");
const resultsName: HTMLSpanElement | null = document.querySelector("#results-name");
const resultsTime: HTMLSpanElement | null = document.querySelector("#results-time");
const resultsMistakes = document.querySelector("#results-mistakes");
const resultsStars = document.querySelector("#results-stars");
const resultsCustomBack = document.querySelector("#results-custom-back");
const resultsBuiltinBack = document.querySelector("#results-builtin-back");

const debug = {
    showShape: false,
    createHints: false,
    reduceHints: false,
};

let state = "orbit";
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

            camera.position.set(1, 1, 1).normalize().multiplyScalar(distance);
            camera.lookAt(new Vector3(0, 0, 0));
            controls.autoRotate = true;
            controls.autoRotateSpeed = 8;

            document.querySelector(".crop")?.setAttribute("style", "display:none");
            if (!resultsName || !resultsTime || !resultsMistakes || !resultsStars) {
                return;
            }
            resultsName.textContent = `"${level.name}"`;
            const seconds = solveClock.getElapsedTime();
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            let secondsString = remainingSeconds.toString();
            let minutesString = minutes.toString();
            if (secondsString.length == 1) {
                secondsString = "0" + secondsString;
            }
            if (minutesString.length == 1) {
                minutesString = "0" + minutesString;
            }
            resultsTime.textContent = `${minutesString}:${secondsString}`;
            resultsMistakes.textContent = mistakeCount.toString();
            let stars = 1;
            if (mistakeCount == 0) {
                stars++;
            }
            if (/* time */ 0 == 0) {
                stars++;
            }
            resultsStars.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
            if (isBuiltin) {
                resultsCustomBack?.remove();
            } else {
                resultsBuiltinBack?.remove();
            }
            resultsDialog?.show();

            // save data
            let resultsData: Object = JSON.parse(localStorage.getItem("nonogram-3d-results") ?? "{}");
            if (resultsData.hasOwnProperty(puzzleId)) {
                if (seconds < resultsData[puzzleId].seconds) {
                    resultsData[puzzleId].seconds = seconds;
                }
                if (stars > resultsData[puzzleId].stars) {
                    resultsData[puzzleId].stars = stars;
                }
            } else {
                resultsData[puzzleId] = {
                    seconds: seconds,
                    stars: stars,
                };
            }
            localStorage.setItem("nonogram-3d-results", JSON.stringify(resultsData));
            break;
        case "fail":
            xHandleMesh.visible = false;
            zHandleMesh.visible = false;
            break;

    }
    state = newState;
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
    const urlParams = new URLSearchParams(window.location.search);
    const puzzleName = urlParams.get("puzzle");
    const puzzleData = urlParams.get("puzzleData");
    const puzzleLocal = urlParams.get("local");
    if (puzzleName) {
        const response = await fetch(puzzleTable[puzzleName ?? ""]);
        const json = await response.json();
        const puzzle: Puzzle = json.puzzle;
        const hints: Hints = debug.createHints ? createHints(puzzle) : json.hints;
        puzzleId = puzzleName ?? "";
        return { puzzle, hints, color: json.color, name: json.name, thumbnail: "" };
    } else if (puzzleData) {
        const json = JSON.parse(puzzleData);
        return { puzzle: json.puzzle, hints: debug.createHints ? createHints(json.puzzle) : json.hints, color: json.color, name: json.name, thumbnail: "" };
    } else {
        isBuiltin = false;
        const storage = JSON.parse(localStorage.getItem("nonogram-3d-puzzle") ?? "{}");
        const json = storage[puzzleLocal ?? ""];
        puzzleId = puzzleLocal ?? "";
        return { puzzle: json.puzzle, hints: debug.createHints ? createHints(json.puzzle) : json.hints, color: json.color, name: json.name, thumbnail: "" };
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

renderer.domElement.addEventListener("mouseup", function (ev: MouseEvent) {
    ev.preventDefault();
    if (state == "continueFlag") {
        setState("flag")
    } else if (state == "continueRemove") {
        setState("remove");
    } else if (state == "dragX" || state == "dragZ") {
        const xDistance = pointer.x - startPosition.x;
        const yDistance = pointer.y - startPosition.y;
        if (Math.abs(xDistance) < 0.05 && Math.abs(yDistance) < 0.05) { // Small drag
            xray.count = 0;
            updateVisibility(xray, cubes, puzzleSize);
        }
        setState("orbit");
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
    } else if (ev.key == "d" && state == "remove" || state == "continueRemove") {
        setState("orbit");
    }
})

if (clearZeroesButton) {
    clearZeroesButton.disabled = !areZeroes(cubes, hints);
}
clearZeroesButton?.addEventListener("click", function (ev: MouseEvent) {
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
    object.qFlag = !object.qFlag;
    updateMaterial(object, loader, hints);
    lastChange = object.qFlag;
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

    const clock = document.querySelector("#clock-digital");
    const seconds = 10 * 60 - solveClock.getElapsedTime();
    const minutes = Math.floor(seconds / 60);
    const leftSeconds = Math.floor(seconds % 60);
    if (!clock) {
        return;
    }
    let secondsString = leftSeconds.toString();
    if (secondsString.length == 1) {
        secondsString = "0" + secondsString;
    }
    let minutesString = minutes.toString();
    if (minutesString.length == 1) {
        minutesString = "0" + minutesString;
    }
    clock.textContent = `${minutesString}:${secondsString}`;

    renderer.render(scene, camera);
}

animate();
