import { BoxGeometry, DirectionalLight, Mesh, MeshLambertMaterial, PerspectiveCamera, Raycaster, Scene, Vector2, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Hints, Puzzle, createHints } from './puzzle';

let click = false;
let moved = false;
const pointer = new Vector2();

const raycaster = new Raycaster();
const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 20;


const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);

const puzzle: Puzzle = [[[true, true], [true, false]], [[true, true], [true, false]]]
const hints: Hints = createHints(puzzle);
for (let x = 0; x < puzzle.length; x++) {
    for (let y = 0; y < puzzle[0].length; y++) {
        for (let z = 0; z < puzzle[0][0].length; z++) {
            if (!puzzle[x][y][z]) {
                continue;
            }
            const geometry = new BoxGeometry(1, 1, 1);
            const material = new MeshLambertMaterial({ color: 0xffffff });
            const cube = new Mesh(geometry, material);
            cube.position.set(x, y, z);
            scene.add(cube);
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