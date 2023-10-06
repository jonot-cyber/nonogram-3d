import { BoxGeometry, Color, DirectionalLight, Mesh, MeshLambertMaterial, OctahedronGeometry, PerspectiveCamera, Raycaster, Scene, TextureLoader, Vector2, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { clamp, lerp } from 'three/src/math/MathUtils';
import { State, CoolMesh, XRay } from './types';
import { facingX, resetXHandle, resetZHandle, updateMaterial, updateVisibility } from './utilities';
import { Puzzle, createHints } from './puzzle';
import { removeHints } from './reduce';

// HTML elements that matter
const flagIndicator: HTMLDivElement | null = document.querySelector<HTMLDivElement>(".f");
const removeIndicator: HTMLDivElement | null = document.querySelector<HTMLDivElement>(".d");
const placeIndicator: HTMLDivElement | null = document.querySelector<HTMLDivElement>(".s");
const createPuzzleButton: HTMLButtonElement | null = document.querySelector<HTMLButtonElement>("#create-puzzle");
const dialog: HTMLDialogElement | null = document.querySelector<HTMLDialogElement>("#color-dialog");
const colorButton: HTMLButtonElement | null = document.querySelector<HTMLButtonElement>("#color-button");

colorButton?.addEventListener("click", function () {
    dialog?.show();
})

function createColorPicker() {
    function getHexDigit(n: number): string {
        switch (n) {
            case 0:
                return "0";
            case 1:
                return "5";
            case 2:
                return "a";
            default:
                return "f";
        }
    }
    for (let ir = 0; ir < 4; ir++) {
        for (let ig = 0; ig < 4; ig++) {
            for (let ib = 0; ib < 4; ib++) {
                let elem = document.createElement("button");
                elem.classList.add("color");
                elem.style.backgroundColor = `#${getHexDigit(ir)}${getHexDigit(ig)}${getHexDigit(ib)}`
                dialog?.insertAdjacentElement("afterbegin", elem);
                elem.addEventListener("click", function () {
                    if (!colorButton) {
                        return;
                    }
                    colorButton.style.backgroundColor = this.style.backgroundColor;
                    colorButton?.setAttribute("x-color", `${ir},${ig},${ib}`);
                    dialog?.close();
                })
            }
        }
    }
}
createColorPicker();

let state: State = "orbit";

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
        case "place":
            placeIndicator?.classList.remove("enabled");
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
        case "place":
            placeIndicator?.classList.add("enabled");
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
        case "end":
            xHandleMesh.visible = false;
            zHandleMesh.visible = false;
            xray.count = 0;
            updateVisibility(xray, cubes, puzzleSize);
            document.querySelector(".crop")?.setAttribute("style", "display:none");
        case "saveImage":
            console.log("webit");
            xHandleMesh.visible = false;
            zHandleMesh.visible = false;
            xray.count = 0;
            updateVisibility(xray, cubes, puzzleSize);
            frames = 0;
    }
    state = newState;
}

const loader = new TextureLoader();

let frames = 0;
let editing: string | null = null;
let click: boolean = false;
let lastChange: boolean = false;
let mistakeCount = 0;
let handleOriginalPosition: number = 0;
let xray: XRay = { direction: "right", count: 0 };

const pointer = new Vector2();
const startPosition = new Vector2();

const raycaster = new Raycaster();
const scene = new Scene();
scene.background = new Color(240, 240, 240);
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
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

async function createPuzzle(): Promise<{ puzzle: Puzzle, color: number[][][] }> {
    const urlParams = new URLSearchParams(window.location.search);
    const puzzleLocal = urlParams.get("local");
    if (puzzleLocal) {
        const json = JSON.parse(localStorage.getItem(puzzleLocal ?? "") ?? "");
        editing = puzzleLocal;
        if (createPuzzleButton) {
            createPuzzleButton.textContent = "Update Puzzle";
        }

        return { puzzle: json.puzzle, color: json.color };
    } else {
        return { puzzle: [[[true]]], color: [[[0xffffff]]] }
    }
}

const { puzzle, color } = await createPuzzle();
const puzzleSize = new Vector3(puzzle.length, puzzle[0].length, puzzle[0][0].length);
const distance = puzzleSize.length();
camera.position.z = distance;
const cubes: CoolMesh[] = [];

function createCubes(size: { x: number, y: number, z: number }, puzzle: Puzzle) {
    for (let x = 0; x < size.x; x++) {
        for (let y = 0; y < size.y; y++) {
            for (let z = 0; z < size.z; z++) {
                if (!puzzle[x][y][z]) {
                    continue;
                }
                const geometry = new BoxGeometry(1, 1, 1);
                const cube: CoolMesh = new Mesh(geometry);
                cube.position.set(x - puzzleSize.x / 2 + 0.5, y - puzzleSize.y / 2 + 0.5, z - puzzleSize.z / 2 + 0.5);
                cube.qPos = new Vector3(x, y, z);
                cube.qFlag = false;
                cube.qDestroy = false;
                cube.qColor = color[x][y][z];
                cube.material = new MeshLambertMaterial({ color: cube.qColor });
                cube.layers.enable(0);
                scene.add(cube);
                cubes.push(cube);
            }
        }
    }
}
createCubes(puzzleSize, puzzle);

// Minimum and maximum positions of X slider
let handleMinX = -puzzleSize.x / 2 - 1;
let handleMaxX = puzzleSize.x / 2 - 2;

// Minimum and maximum positions of inverted X slider
let handleMinNX = -puzzleSize.x / 2 + 2;
let handleMaxNX = puzzleSize.x / 2 + 1;

// Minimum and maximum positions of Z slider
let handleMinZ = -puzzleSize.z / 2 - 1;
let handleMaxZ = puzzleSize.z / 2 - 2;

// Minimum and maximum positions of inverted Z slider
let handleMinNZ = -puzzleSize.z / 2 + 2;
let handleMaxNZ = puzzleSize.z / 2 + 1;

const handleGeometry = new OctahedronGeometry(0.25);
const xHandleMesh = new Mesh(handleGeometry, new MeshLambertMaterial({ color: 0xff00ff, opacity: 0.5, transparent: true }));
scene.add(xHandleMesh);
xHandleMesh.position.set(handleMinX, -puzzleSize.y / 2, -puzzleSize.z / 2);
xHandleMesh.scale.set(2, 1, 1);

const zHandleMesh = new Mesh(handleGeometry, new MeshLambertMaterial({ color: 0xffff00, opacity: 0.5, transparent: true }));
scene.add(zHandleMesh);
zHandleMesh.position.set(-puzzleSize.x / 2, -puzzleSize.y / 2, handleMinZ);
zHandleMesh.scale.set(1, 1, 2);

function updateHandles() {
    handleMinX = -puzzleSize.x / 2 - 1;
    handleMaxX = puzzleSize.x / 2 - 2;

    handleMinNX = -puzzleSize.x / 2 + 2;
    handleMaxNX = puzzleSize.x / 2 + 1;

    handleMinZ = -puzzleSize.z / 2 - 1;
    handleMaxZ = puzzleSize.z / 2 - 2;

    handleMinNZ = -puzzleSize.z / 2 + 2;
    handleMaxNZ = puzzleSize.z / 2 + 1;

    resetXHandle(camera, xHandleMesh, handleMinX, handleMaxNX, puzzleSize);
    resetZHandle(camera, zHandleMesh, handleMinZ, handleMaxNZ, puzzleSize);
}

renderer.domElement.addEventListener("mousemove", function (ev: MouseEvent) {
    pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (ev.clientY / window.innerHeight) * 2 + 1;
});

renderer.domElement.addEventListener("mousedown", function (ev: MouseEvent) {
    click = true;
});

renderer.domElement.addEventListener("mouseup", function (ev: MouseEvent) {
    ev.preventDefault();
    if (state == "continueFlag") {
        setState("flag")
    } else if (state == "dragX" || state == "dragZ") {
        setState("orbit");
        xHandleMesh.material.opacity = 0.5;
        zHandleMesh.material.opacity = 0.5;
    }
});

window.addEventListener("keydown", function (ev: KeyboardEvent) {
    if (state != "orbit") {
        return;
    }
    if (ev.key == "f") {
        setState("flag");
    } else if (ev.key == "d") {
        setState("remove");
    } else if (ev.key == "s") {
        setState("place");
    }
});

window.addEventListener("keyup", function (ev: KeyboardEvent) {
    if (ev.key == "f" && state == "flag" || state == "continueFlag") {
        setState("orbit");
    } else if (ev.key == "d" && state == "remove") {
        setState("orbit");
    } else if (ev.key == "s" && state == "place") {
        setState("orbit");
    }
});

createPuzzleButton?.addEventListener("click", function () {
    setState("saveImage");
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
    const object: CoolMesh = intersects[0].object as CoolMesh;
    const color = colorButton?.getAttribute("x-color");
    const [r, g, b] = color?.split(",").map(i => Number.parseInt(i)) ?? [0, 0, 0];
    let c = 0x000000;
    c += [0x00, 0x55, 0xaa, 0xff][b];
    c += 0x100 * [0x00, 0x55, 0xaa, 0xff][g];
    c += 0x10000 * [0x00, 0x55, 0xaa, 0xff][r];
    object.material = new MeshLambertMaterial({ color: c });
    object.qColor = 36 * r + 4 * g + b;
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
    const object: CoolMesh = intersects[0].object as CoolMesh;
    const color = colorButton?.getAttribute("x-color");
    const [r, g, b] = color?.split(",").map(i => Number.parseInt(i)) ?? [0, 0, 0];
    let c = 0x000000;
    c += [0x00, 0x55, 0xaa, 0xff][b];
    c += 0x100 * [0x00, 0x55, 0xaa, 0xff][g];
    c += 0x10000 * [0x00, 0x55, 0xaa, 0xff][r];
    object.material = new MeshLambertMaterial({ color: c });
    object.qColor = c;
}

// Actions when deleting
function remove() {
    if (!click) {
        return;
    }
    click = false;
    if (puzzleSize.x == 1 && puzzleSize.y == 1 && puzzleSize.z == 1) { // Don't remove the last cube >:(
        return;
    }

    raycaster.setFromCamera(pointer, camera);
    raycaster.layers.set(0);

    const intersects = raycaster.intersectObjects(scene.children).filter(i => i.object != xHandleMesh && i.object != zHandleMesh);
    if (intersects.length == 0) {
        return;
    }

    let object: CoolMesh = intersects[0].object as CoolMesh;

    // Destroy the cube
    object.qDestroy = true;
    scene.remove(object);

    let minX = false;
    let minY = false;
    let minZ = false;
    let maxX = false;
    let maxY = false;
    let maxZ = false;

    while (!minX || !minY || !minZ || !maxX || !maxY || !maxZ) {
        minX = false;
        minY = false;
        minZ = false;
        maxX = false;
        maxY = false;
        maxZ = false;
        // Check if things need to be realigned
        for (const cube of cubes) {
            if (cube.qDestroy) {
                continue;
            }
            if (cube.qPos?.x == 0) {
                minX = true;
            }
            if (cube.qPos?.y == 0) {
                minY = true;
            }
            if (cube.qPos?.z == 0) {
                minZ = true;
            }
            if (cube.qPos?.x == puzzleSize.x - 1) {
                maxX = true;
            }
            if (cube.qPos?.y == puzzleSize.y - 1) {
                maxY = true;
            }
            if (cube.qPos?.z == puzzleSize.z - 1) {
                maxZ = true;
            }
        }
        if (!maxX) {
            puzzleSize.setX(puzzleSize.x - 1);
        }
        if (!maxY) {
            puzzleSize.setY(puzzleSize.y - 1);
        }
        if (!maxZ) {
            puzzleSize.setZ(puzzleSize.z - 1);
        }
        if (!minX) {
            for (const cube of cubes) {
                cube.qPos?.setX(cube.qPos.x - 1);
            }
            puzzleSize.setX(puzzleSize.x - 1);
        }
        if (!minY) {
            for (const cube of cubes) {
                cube.qPos?.setY(cube.qPos.y - 1);
            }
            puzzleSize.setY(puzzleSize.y - 1);
        }
        if (!minZ) {
            for (const cube of cubes) {
                cube.qPos?.setZ(cube.qPos.z - 1);
            }
            puzzleSize.setZ(puzzleSize.z - 1);
        }
    }

    // Fix the puzzle positions :)
    for (const cube of cubes) {
        if (!cube.qPos) {
            continue;
        }
        cube.position.set(cube.qPos.x - puzzleSize.x / 2 + 0.5, cube.qPos.y - puzzleSize.y / 2 + 0.5, cube.qPos.z - puzzleSize.z / 2 + 0.5);
    }
    camera.position.normalize().multiplyScalar(puzzleSize.length());
    updateHandles();
}

function place() {
    // This code decides not to work if you click on the edge of a block. I do not know why.
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
    if (!object.qPos) {
        return;
    }

    let normal = intersects[0].normal;
    if (!normal) {
        return;
    }
    const newCube: CoolMesh = new Mesh(new BoxGeometry(1, 1, 1));
    newCube.qPos = new Vector3(object.qPos.x, object.qPos.y, object.qPos.z);
    newCube.qDestroy = false;
    newCube.qFlag = false;
    newCube.qColor = 0xffffff;
    if (normal.x == 1) {
        if (puzzleSize.x == 12 && object.qPos.x == 11) {
            return;
        }
        newCube.qPos.setX(newCube.qPos.x + 1);
        if (newCube.qPos.x == puzzleSize.x) {
            puzzleSize.setX(puzzleSize.x + 1);
        }
    } else if (normal.x == -1) {
        if (puzzleSize.x == 12 && object.qPos.x == 0) {
            return;
        }
        if (newCube.qPos.x == 0) {
            puzzleSize.setX(puzzleSize.x + 1);
            for (const cube of cubes) {
                cube.qPos?.setX(cube.qPos.x + 1);
            }
        } else {
            newCube.qPos.setX(newCube.qPos.x - 1);
        }
    } else if (normal.y == 1) {
        if (puzzleSize.y == 12 && object.qPos.y == 11) {
            return;
        }
        newCube.qPos.setY(newCube.qPos.y + 1);
        if (newCube.qPos.y == puzzleSize.y) {
            puzzleSize.setY(puzzleSize.y + 1);
        }
    } else if (normal.y == -1) {
        if (puzzleSize.y == 12 && object.qPos.y == 0) {
            return;
        }
        if (newCube.qPos.y == 0) {
            puzzleSize.setY(puzzleSize.y + 1);
            for (const cube of cubes) {
                cube.qPos?.setY(cube.qPos.y + 1);
            }
        } else {
            newCube.qPos.setY(newCube.qPos.y - 1);
        }
    } else if (normal.z == 1) {
        if (puzzleSize.z == 12 && object.qPos.z == 11) {
            return;
        }
        newCube.qPos.setZ(newCube.qPos.z + 1);
        if (newCube.qPos.z == puzzleSize.z) {
            puzzleSize.setZ(puzzleSize.z + 1);
        }
    } else if (normal.z == -1) {
        if (puzzleSize.z == 12 && object.qPos.z == 0) {
            return;
        }
        if (newCube.qPos.z == 0) {
            puzzleSize.setZ(puzzleSize.z + 1);
            for (const cube of cubes) {
                cube.qPos?.setZ(cube.qPos.z + 1);
            }
        } else {
            newCube.qPos.setZ(newCube.qPos.z - 1);
        }
    }
    scene.add(newCube);
    cubes.push(newCube);
    updateMaterial(newCube, loader);

    // Fix the puzzle positions :)
    for (const cube of cubes) {
        if (!cube.qPos) {
            continue;
        }
        cube.position.set(cube.qPos.x - puzzleSize.x / 2 + 0.5, cube.qPos.y - puzzleSize.y / 2 + 0.5, cube.qPos.z - puzzleSize.z / 2 + 0.5);
    }
    camera.position.normalize().multiplyScalar(puzzleSize.length());
    updateHandles();
}

// All of these weird workarounds are needed because the handles need to be not shown when the thumbnail is taken, and we need at least one frame rendered for that to happen.
function saveImage() {
    if (frames == 0) {
        return;
    }
    const puzzle: boolean[][][] = [];
    const colors: number[][][] = [];
    for (let ix = 0; ix < puzzleSize.x; ix++) {
        const part1: boolean[][] = [];
        const cpart1: number[][] = [];
        for (let iy = 0; iy < puzzleSize.y; iy++) {
            const part2: boolean[] = []
            const cpart2: number[] = []
            for (let iz = 0; iz < puzzleSize.z; iz++) {
                part2.push(false);
                cpart2.push(0);
            }
            part1.push(part2);
            cpart1.push(cpart2);
        }
        puzzle.push(part1);
        colors.push(cpart1);
    }

    for (const cube of cubes) {
        if (cube.qDestroy) {
            continue;
        }
        if (!cube.qPos) {
            continue;
        }
        puzzle[cube.qPos.x][cube.qPos.y][cube.qPos.z] = true;
        colors[cube.qPos.x][cube.qPos.y][cube.qPos.z] = cube.qColor ?? 0xffffff;
    }

    const hints = createHints(puzzle);
    removeHints(puzzle, hints);
    // take the puzzle

    const name = editing ?? prompt("Enter a name for your puzzle") ?? "";
    if (!name) {
        return;
    }
    const image = renderer.domElement.toDataURL("image/png");
    localStorage.setItem(name, JSON.stringify({
        puzzle: puzzle,
        hints: hints,
        color: colors,
    }));
    localStorage.setItem(name + "-image", image);
    setState("end");
    document.querySelector<HTMLAnchorElement>("#back")?.click();
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
        case "place":
            place();
            break;
        case "saveImage":
            saveImage();
            break;
    }
    renderer.render(scene, camera);
    frames++;
}

animate();
