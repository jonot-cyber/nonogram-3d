import { BoxGeometry, Color, DirectionalLight, Mesh, MeshLambertMaterial, PerspectiveCamera, Raycaster, Scene, TextureLoader, Vector2, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Hint, Hints, Puzzle, createHints } from './puzzle';
import mug from './library/mug';
import hund from './library/hund';
import shibaInu from './library/shibaInu';

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
let moved = false;
const pointer = new Vector2();

const raycaster = new Raycaster();
const scene = new Scene();
scene.background = new Color(240, 240, 240);
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);


const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);

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
    "mug": mug,
    "hund": hund,
    "shibainu": shibaInu,
}
const puzzle: Puzzle = puzzleTable[puzzleName ?? "mug"];
const loader = new TextureLoader();
const puzzleSize = { x: puzzle.length, y: puzzle[0].length, z: puzzle[0][0].length };
const distance = Math.sqrt(puzzleSize.x * puzzleSize.x + puzzleSize.y * puzzleSize.y + puzzleSize.z * puzzleSize.z);
camera.position.z = distance;
const hints: Hints = createHints(puzzle);
const cubes: Mesh[] = [];
for (let x = 0; x < puzzleSize.x; x++) {
    for (let y = 0; y < puzzleSize.y; y++) {
        for (let z = 0; z < puzzleSize.z; z++) {
            // if (!puzzle[x][y][z]) { continue; }
            const geometry = new BoxGeometry(1, 1, 1);
            const materials = [
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.x[y][z])) }), // right
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.x[y][z])) }), // left
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.y[x][z])) }), // top
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.y[x][z])) }), // bottom
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.z[x][y])) }), // front
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.z[x][y])) }), // back
            ];
            const cube: CoolMesh = new Mesh(geometry, materials);
            cube.position.set(x - puzzleSize.x / 2 + 0.5, y - puzzleSize.y / 2 + 0.5, z - puzzleSize.z / 2 + 0.5);
            cube.qX = x;
            cube.qY = y;
            cube.qZ = z;
            cube.qFlag = false;
            cube.layers.enable(0);
            scene.add(cube);
            cubes.push(cube);
        }
    }
}

window.addEventListener("mousedown", function (ev: MouseEvent) {
    moved = false;
})

window.addEventListener("mousemove", function (ev: MouseEvent) {
    moved = true;
    pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (ev.clientY / window.innerHeight) * 2 + 1;
})

window.addEventListener("mouseup", function (ev: MouseEvent) {
    if (moved) {
        return;
    }
    pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (ev.clientY / window.innerHeight) * 2 + 1;
    click = true;
})

window.addEventListener("keydown", function (ev: KeyboardEvent) {
    if (ev.key != "f") {
        return;
    }
    flag = true;
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
    if (click) {
        click = false;
        raycaster.setFromCamera(pointer, camera);
        raycaster.layers.set(0);

        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
            let object: CoolMesh = intersects[0].object as CoolMesh;
            if (!object?.qFlag) {
                scene.remove(intersects[0].object);
            }
        }
    }
    if (flag) {
        flag = false;
        raycaster.setFromCamera(pointer, camera);
        raycaster.layers.set(0);

        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
            let o: CoolMesh = intersects[0].object as CoolMesh;
            o.qFlag = !o.qFlag;
            let x: number = o.qX ?? 0;
            let y: number = o.qY ?? 0;
            let z: number = o.qZ ?? 0;
            o.material = [
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.x[y][z], o.qFlag)) }),
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.x[y][z], o.qFlag)) }),
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.y[x][z], o.qFlag)) }),
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.y[x][z], o.qFlag)) }),
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.z[x][y], o.qFlag)) }),
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.z[x][y], o.qFlag)) }),
            ];
        }
    }
    renderer.render(scene, camera);
}


animate();