import { BoxGeometry, Color, DirectionalLight, Mesh, MeshLambertMaterial, OctahedronGeometry, PerspectiveCamera, Raycaster, Scene, TextureLoader, Vector2, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Hints, Puzzle, createHints } from './puzzle';
import { removeHints } from './reduce';
import { puzzleTable } from './library/lookup';
import { clamp, lerp } from 'three/src/math/MathUtils';
import { State, CoolMesh, XRay } from './types';
import { areZeroes, checkDone, clearZeroes, colorCubes, facingX, resetXHandle, resetZHandle, updateMaterial, updateVisibility } from './utilities';
import { enableClock } from './clock';

// HTML elements that matter
const flagIndicator: HTMLDivElement | null = document.querySelector<HTMLDivElement>("#f-indicator");
const removeIndicator: HTMLDivElement | null = document.querySelector<HTMLDivElement>("#d-indicator");
const mistakeCounter: HTMLSpanElement | null = document.querySelector<HTMLSpanElement>("#mistakes-count");
const clearZeroesButton: HTMLButtonElement | null = document.querySelector("#clear-zeroes");

const debug = {
    showShape: false,
    createHints: false,
    reduceHints: false,
};

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
            resetZHandle(camera, zHandleMesh, handleMinZ, handleMaxNZ);
            break;
        case "dragZ":
            handleOriginalPosition = zHandleMesh.position.z;
            startPosition.set(pointer.x, pointer.y);
            resetXHandle(camera, xHandleMesh, handleMinX, handleMaxNX);
            break;
        case "end":
            xHandleMesh.visible = false;
            zHandleMesh.visible = false;
            xray.count = 0;
            updateVisibility(xray, cubes, puzzleSize);
            document.querySelector(".crop")?.setAttribute("style", "display:none")
    }
    state = newState;
}

const loader = new TextureLoader();

let click: boolean = false;
let lastChange: boolean = false;
let mistakeCount = 0;
let handleOriginalPosition: number = 0;
let xray: XRay = { direction: "right", count: 0 };

function addMistake() {
    mistakeCount++;
    if (mistakeCounter) {
        mistakeCounter.textContent = mistakeCount.toString();
    }
    if (mistakeCount == 5) {
        setState("end");
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

async function createPuzzle(): Promise<{puzzle: Puzzle, hints: Hints, color: number[][][]}> {
    console.log("TEST")
    const urlParams = new URLSearchParams(window.location.search);
    const puzzleName = urlParams.get("puzzle");
    if (puzzleName) {
        const response = await fetch(puzzleTable[puzzleName ?? ""]);
        const json = await response.json();
        const puzzle: Puzzle = json.puzzle;
        const hints: Hints = debug.createHints ? createHints(puzzle) : json.hints;
        return {puzzle, hints, color: []};
    } else {
        const puzzleData = urlParams.get("puzzleData");
        const json = JSON.parse(puzzleData ?? "");
        return {puzzle: json.puzzle, hints: json.hints, color: json.color};
    }
}

const {puzzle, hints, color} = await createPuzzle();
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

enableClock(10*60, function() {
    setState("end");
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
        resetXHandle(camera, xHandleMesh, handleMinX, handleMaxNX);
        resetZHandle(camera, zHandleMesh, handleMinZ, handleMaxNZ);
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
    }
    renderer.render(scene, camera);
}

animate();
