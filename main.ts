import { BoxGeometry, DirectionalLight, Mesh, MeshLambertMaterial, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 20;


const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);

for (let x = -4; x < 4; x++) {
    for (let y = -4; y < 4; y++) { 
        for (let z = -4; z < 4; z++) {
            const geometry = new BoxGeometry(1, 1, 1);
            const material = new MeshLambertMaterial({ color: 0xffffff });
            const cube = new Mesh(geometry, material);
            cube.position.set(x, y, z);
            cube.visible = Math.random() > 0.1;
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
    renderer.render(scene, camera);
}

animate();