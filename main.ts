import { BoxGeometry, Color, DirectionalLight, Mesh, MeshLambertMaterial, OctahedronGeometry, PerspectiveCamera, Raycaster, Scene, TextureLoader, Vector2, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Hint, Hints, Puzzle, createHints } from './puzzle';
import { removeHints } from './reduce';

const debug = {
    showShape: false,
    createHints: false,
    reduceHints: false,
};

// Great type name
type CoolMesh = Mesh & { qX?: number, qY?: number, qZ?: number, qFlag?: boolean };

interface XRay {
    direction: string;
    count: number;
}

let xray: XRay = {
    direction: "up",
    count: 0,
};

function updateMaterial(mesh: CoolMesh) {
    let x = mesh.qX ?? 0;
    let y = mesh.qY ?? 0;
    let z = mesh.qZ ?? 0;
    mesh.material = [
        new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.x[y][z], mesh.qFlag)) }),
        new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.x[y][z], mesh.qFlag)) }),
        new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.y[x][z], mesh.qFlag)) }),
        new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.y[x][z], mesh.qFlag)) }),
        new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.z[x][y], mesh.qFlag)) }),
        new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.z[x][y], mesh.qFlag)) }),
    ];

}

function isVisible(xray: XRay, x: number, y: number, z: number, maxX: number, maxY: number, maxZ: number): boolean {
    if (xray.count == 0) {
        return true;
    }
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

function getAssetURL(hint: Hint, painted: boolean = false): string {
    if (hint.type == "none") {
        if (painted) {
            return "/assets/cyan.png";
        } else {
            return "/assets/blank.png";
        }
    }
    return `/assets/${painted ? "cyan" : "white"}/${hint.type}/${hint.count}.png`
}

let click = false;
let flag = false;
let remove = false;
let mouseOnHandle: "x" | "z" | null = null;
let mistakeCount = 0;

const pointer = new Vector2();
const startPosition = new Vector2();

const raycaster = new Raycaster();
const scene = new Scene();
scene.background = new Color(240, 240, 240);
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);


const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = false;

// I create two lights in opposite directions to make it so you can look at any angle, and it still looks good.
const directionalLight = new DirectionalLight(0xffffff, 1);
scene.add(directionalLight);
scene.add(directionalLight.target);
directionalLight.target.position.setX(0.5);
directionalLight.target.position.setY(0);
directionalLight.target.position.setZ(-0.2);

const directionalLight2 = new DirectionalLight(0xffffff, 1);
scene.add(directionalLight2);
scene.add(directionalLight2.target);
directionalLight2.target.position.setX(-0.5);
directionalLight2.target.position.setY(2);
directionalLight2.target.position.setZ(0.2);

const urlParams = new URLSearchParams(window.location.search);
let puzzleName = urlParams.get("puzzle");
const puzzleTable = {
    "mug": "/library/mug.json",
    "hund": "/library/hund.json",
    "shibainu": "/library/shibaInu.json",
    "note": "/library/note.json",
    "flag": "/library/flag.json",
    "palmTree": "/library/palmTree.json",
    "hand": "/library/hand.json",
    "youtube": "/library/youtube.json",
    "j": "/library/j.json",
    "o": "/library/o.json",
    "e": "/library/e.json",
    "t": "/library/t.json",
    "worm": "/library/worm.json",
}
let response = await fetch(puzzleTable[puzzleName ?? ""]);
let json = await response.json();
const puzzle: Puzzle = json.puzzle;
const loader = new TextureLoader();
const puzzleSize = { x: puzzle.length, y: puzzle[0].length, z: puzzle[0][0].length };
const distance = Math.sqrt(puzzleSize.x * puzzleSize.x + puzzleSize.y * puzzleSize.y + puzzleSize.z * puzzleSize.z);
camera.position.z = distance;
const hints: Hints = debug.createHints ? createHints(puzzle) : json.hints;
if (debug.reduceHints) {
    removeHints(puzzle, hints);
    console.log(JSON.stringify(hints));
}
const cubes: Mesh[] = [];
for (let x = 0; x < puzzleSize.x; x++) {
    for (let y = 0; y < puzzleSize.y; y++) {
        for (let z = 0; z < puzzleSize.z; z++) {
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
            cube.layers.enable(0);
            scene.add(cube);
            updateMaterial(cube);
            cubes.push(cube);
        }
    }
}

const handleGeometry = new OctahedronGeometry(0.25);
const xHandleMesh = new Mesh(handleGeometry, new MeshLambertMaterial({ color: 0xff00ff, opacity: 0.5, transparent: true }));
scene.add(xHandleMesh);
xHandleMesh.position.set(-puzzleSize.x / 2 - 1, -puzzleSize.y / 2, -puzzleSize.z / 2);
xHandleMesh.scale.set(2, 1, 1);
let xOriginalPosition: Vector3 = new Vector3(xHandleMesh.position.x, xHandleMesh.position.y, xHandleMesh.position.z);

const zHandleMesh = new Mesh(handleGeometry, new MeshLambertMaterial({ color: 0xffff00, opacity: 0.5, transparent: true }));
scene.add(zHandleMesh);
zHandleMesh.position.set(-puzzleSize.x / 2, -puzzleSize.y / 2, -puzzleSize.z / 2 - 1);
zHandleMesh.scale.set(1, 1, 2);
let zOriginalPosition: Vector3 = new Vector3(zHandleMesh.position.x, zHandleMesh.position.y, zHandleMesh.position.z);

renderer.domElement.addEventListener("mousemove", function (ev: MouseEvent) {
    pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (ev.clientY / window.innerHeight) * 2 + 1;
})

renderer.domElement.addEventListener("mousedown", function (ev: MouseEvent) {
    click = true;
})

renderer.domElement.addEventListener("mouseup", function (ev: MouseEvent) {
    if (mouseOnHandle != null) {
        controls.enableRotate = true;
        xHandleMesh.material.opacity = 0.5;
        zHandleMesh.material.opacity = 0.5;
    }
    mouseOnHandle = null;
    ev.preventDefault();
})

window.addEventListener("keydown", function (ev: KeyboardEvent) {
    if (mouseOnHandle) {
        return;
    }
    if (ev.key == "f") {
        flag = true;
        controls.enableRotate = false;
    } else if (ev.key == "d") {
        remove = true;
        controls.enableRotate = false;
    }
})

window.addEventListener("keyup", function (ev: KeyboardEvent) {
    if (mouseOnHandle) {
        return;
    }
    if (ev.key == "f") {
        flag = false;
        controls.enableRotate = true;
    } else if (ev.key == "d") {
        remove = false;
        controls.enableRotate = true;
    }
})

const cropDir = document.querySelector<HTMLSelectElement>("#crop-dir");
const cropCount = document.querySelector<HTMLInputElement>("#crop-count");

function changeHandle(e: Event) {
    if (cropCount == null || cropDir == null) {
        return;
    }
    xray.direction = cropDir.value;
    let count = Number.parseInt(cropCount.value);
    if (count < 0) {
        count = 0;
        cropCount.value = "0";
    }
    switch (xray.direction) {
        case "up":
        case "down":
            if (count >= puzzleSize.y) {
                count = puzzleSize.y - 1;
                cropCount.value = count.toString();
            }
            break;
        case "left":
        case "right":
            if (count >= puzzleSize.x) {
                count = puzzleSize.x - 1;
                cropCount.value = count.toString();
            }
            break;
        case "front":
        case "back":
            if (count >= puzzleSize.z) {
                count = puzzleSize.z - 1;
                cropCount.value = count.toString();
            }
            break;
    }
    xray.count = count;

    // Update visibility
    updateVisibility();
}

function updateVisibility() {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let cube of cubes) {
        if (isVisible(xray, x, y, z, puzzleSize.x, puzzleSize.y, puzzleSize.z)) {
            cube.visible = true;
            cube.layers.enable(0);
        } else {
            cube.visible = false;
            cube.layers.disable(0);
        }
        z++;
        if (z == puzzleSize.z) {
            y++;
            z = 0;
            if (y == puzzleSize.y) {
                x++;
                y = 0;
            }
        }
    }
}

cropDir?.addEventListener("change", changeHandle);

cropCount?.addEventListener("change", changeHandle);

function animate() {
    requestAnimationFrame(animate);

    if (mouseOnHandle == "x") {
        const minX = -puzzleSize.x / 2 - 1;
        const maxX = minX + puzzleSize.x - 1;
        const distance = 10 * (pointer.x - startPosition.x);
        const newPosition = xOriginalPosition.x + distance - (distance % 1);
        const clampedPosition = Math.max(minX, Math.min(newPosition, maxX));
        
        if (clampedPosition != xHandleMesh.position.x) {
            xray.direction = "left";
            xray.count = clampedPosition - xOriginalPosition.x;
            updateVisibility();
        }
        xHandleMesh.position.setX(clampedPosition);
    } else if (mouseOnHandle == "z") {
        const minZ = -puzzleSize.z / 2 - 1;
        const maxZ = minZ + puzzleSize.z - 1;
        const distance = 10 * (pointer.x - startPosition.x);
        const newPosition = zOriginalPosition.z + distance - (distance % 1);
        const clampedPosition = Math.max(minZ, Math.min(newPosition, maxZ));
        
        if (clampedPosition != zHandleMesh.position.z) {
            xray.direction = "back";
            xray.count = clampedPosition - zOriginalPosition.z;
            updateVisibility();
        }
        
        zHandleMesh.position.setZ(clampedPosition);
    } else {
        raycaster.setFromCamera(pointer, camera);
        raycaster.layers.set(0);

        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
            if (intersects[0].object == xHandleMesh) {
                xHandleMesh.material.opacity = 1;
            } else if (intersects[0].object == zHandleMesh) {
                zHandleMesh.material.opacity = 1;
            }
            if (click) {
                let object: CoolMesh = intersects[0].object as CoolMesh;
                if (!flag && !remove && (object == xHandleMesh || object == zHandleMesh)) {
                    mouseOnHandle = object == xHandleMesh ? "x" : "z";
                    xOriginalPosition.set(xHandleMesh.position.x, xHandleMesh.position.y, xHandleMesh.position.z);
                    zOriginalPosition.set(zHandleMesh.position.x, zHandleMesh.position.y, zHandleMesh.position.z);
                    startPosition.set(pointer.x, pointer.y);
                    controls.enableRotate = false;
                }
                let x: number = object.qX ?? 0;
                let y: number = object.qY ?? 0;
                let z: number = object.qZ ?? 0;
                click = false;
                if (flag) {
                    object.qFlag = !object.qFlag;
                    updateMaterial(object);
                } else if (remove) {
                    if (!object?.qFlag) {
                        if (puzzle[x][y][z]) {
                            mistakeCount++;
                            const counter = document.querySelector<HTMLSpanElement>("#mistakes-count");
                            if (counter) {
                                counter.textContent = mistakeCount.toString();
                            }
                            object.qFlag = true;
                            updateMaterial(object);
                        } else {
                            scene.remove(object);
                        }
                    }
                }
            }
        } else {
            xHandleMesh.material.opacity = 0.5;
            zHandleMesh.material.opacity = 0.5;
        }
    }
    renderer.render(scene, camera);
}


animate();