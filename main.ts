import { BoxGeometry, Color, DirectionalLight, Mesh, MeshLambertMaterial, PerspectiveCamera, Raycaster, Scene, TextureLoader, Vector2, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Hint, Hints, Puzzle, createHints } from './puzzle';

interface XRay {
    direction: "up" | "down" | "left" | "right" | "front" | "back";
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

function getAssetURL(hint: Hint): string {
    let number = hint.count.toString();
    let type = "";
    if (hint.type == "circle") {
        type = "c";
    } else if (hint.type == "square") {
        type = "s";
    }
    return `/assets/${number}${type}w.png`
}

let click = false;
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

const puzzle: Puzzle = [
    [
        [false, false, false, false, false],
        [false, true, true, true, false],
        [false, true, true, true, false],
        [false, true, true, true, false],
        [false, true, true, true, false],
    ],
    [
        [false, true, true, true, false],
        [true, false, false, false, true],
        [true, false, false, false, true],
        [true, false, false, false, true],
        [true, false, false, false, true],
    ],
    [
        [false, true, true, true, false],
        [true, false, false, false, true],
        [true, false, false, false, true],
        [true, false, false, false, true],
        [true, false, false, false, true],
    ],
    [
        [false, true, true, true, false],
        [true, false, false, false, true],
        [true, false, false, false, true],
        [true, false, false, false, true],
        [true, false, false, false, true],
    ],
    [
        [false, false, false, false, false],
        [false, true, true, true, false],
        [false, true, true, true, false],
        [false, true, true, true, false],
        [false, true, true, true, false],
    ],
    [
        [false, false, false, false, false],
        [false, false, true, false, false],
        [false, false, false, false, false],
        [false, false, true, false, false],
        [false, false, false, false, false],
    ],
    [
        [false, false, false, false, false],
        [false, false, true, false, false],
        [false, false, true, false, false],
        [false, false, true, false, false],
        [false, false, false, false, false],
    ],
];
const puzzleSize = { x: puzzle.length, y: puzzle[0].length, z: puzzle[0][0].length};
const distance = Math.sqrt(puzzleSize.x * puzzleSize.x + puzzleSize.y * puzzleSize.y + puzzleSize.z * puzzleSize.z);
camera.position.z = distance;
const hints: Hints = createHints(puzzle);
const cubes: Mesh[] = [];
for (let x = 0; x < puzzleSize.x; x++) {
    for (let y = 0; y < puzzleSize.y; y++) {
        for (let z = 0; z < puzzleSize.z; z++) {
            if (!isVisible(xray, x, y, z, puzzleSize.x, puzzleSize.y, puzzleSize.z)) {
                continue;
            }
            const geometry = new BoxGeometry(1, 1, 1);
            const loader = new TextureLoader();
            const materials = [
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.x[y][z])) }), // right
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.x[y][z])) }), // left
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.y[x][z])) }), // top
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.y[x][z])) }), // bottom
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.z[x][y])) }), // front
                new MeshLambertMaterial({ map: loader.load(getAssetURL(hints.z[x][y])) }), // back
            ];
            const cube = new Mesh(geometry, materials);
            cube.position.set(x - puzzleSize.x / 2 + 0.5, y - puzzleSize.y / 2 + 0.5, z - puzzleSize.z / 2 + 0.5);
            scene.add(cube);
            cubes.push(cube);
        }
    }
}

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


function animate() {
    requestAnimationFrame(animate);
    if (click) {
        raycaster.setFromCamera(pointer, camera);

        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
            scene.remove(intersects[0].object);
        }
        click = false;
    }
    renderer.render(scene, camera);
}

window.addEventListener('mousedown', function (ev: MouseEvent) {
    moved = false;
})

window.addEventListener('mousemove', function (ev: MouseEvent) {
    moved = true;
})

window.addEventListener('mouseup', function (ev: MouseEvent) {
    if (moved) {
        return;
    }
    pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (ev.clientY / window.innerHeight) * 2 + 1;
    click = true;
})

animate();