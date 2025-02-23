import { CharacterControls } from './characterControls';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { World, Body, Box, Vec3 } from 'cannon-es';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createVideoPopup } from './popup';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

const physicsWorld = new World();
physicsWorld.gravity.set(0, -9.82, 0);

const physicsBodies: { mesh: THREE.Object3D; body: Body }[] = [];

// CAMERA (Top-down view)
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 100, 0); // Position camera directly above
camera.lookAt(new THREE.Vector3(0, 0, 0)); // Look down at the center of the scene

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// CSS2DRenderer for the overlay
const css2DRenderer = new CSS2DRenderer();
css2DRenderer.setSize(window.innerWidth, window.innerHeight);
css2DRenderer.domElement.style.position = 'absolute';
css2DRenderer.domElement.style.top = '0px';
document.body.appendChild(css2DRenderer.domElement);

// LIGHTS
addLights();

// FLOOR
generateFloor();

let characterControls: CharacterControls;

new GLTFLoader().load('models/Soldier.glb', function (gltf) {
    const model = gltf.scene;
    model.traverse(function (object: any) {
        if (object.isMesh) object.castShadow = true;
    });
    model.position.set(5, 1, -10);
    scene.add(model);
    addSoldierRigidBody(model);

    const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap: Map<string, THREE.AnimationAction> = new Map();

    gltfAnimations
        .filter((a) => a.name !== 'TPose')
        .forEach((a: THREE.AnimationClip) => {
            animationsMap.set(a.name, mixer.clipAction(a));
        });

    characterControls = new CharacterControls(model, mixer, animationsMap, camera, 'Idle');
});

let robotPosition: THREE.Vector3 | null = null;
let housePosition: THREE.Vector3 | null = null;

// Function to create and place a wall with customizable parameters
function createWall(position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3, name: string) {
    new GLTFLoader().load('models/Wall1.glb', function (gltf) {
        const model = gltf.scene;
        model.name = name; // Assign a name for easier reference
        model.traverse(function (object: any) {
            if (object.isMesh) object.castShadow = true;
        });

        // Apply the custom transformations
        model.position.copy(position);
        model.rotation.copy(rotation);
        model.scale.copy(scale);

        scene.add(model);
        addWallRigidBody(model); // Add the rigid body for collision detection

        // Add the bounding box for collision detection
        const wallBox = new THREE.Box3().setFromObject(model);
        model.userData.boundingBox = wallBox; // Store the bounding box for collision detection
    });
}

// Example usage: Create multiple walls with different positions, rotations, and scales
createWall(new THREE.Vector3(0, 0, 1.2), new THREE.Euler(0, -Math.PI, 0), new THREE.Vector3(0.55, 1, 0.55), 'House1');
createWall(new THREE.Vector3(2, 0, 1.2), new THREE.Euler(0, -Math.PI, 0), new THREE.Vector3(0.55, 1, 0.55), 'House2');
createWall(new THREE.Vector3(2, 0, 1.2), new THREE.Euler(0, -Math.PI, 0), new THREE.Vector3(0.55, 1, 0.55), 'House2');
createWall(new THREE.Vector3(48.57, 0, -3.8), new THREE.Euler(0, -Math.PI, 0), new THREE.Vector3(0.55, 1, 0.8), 'House3');

// COINS MANAGEMENT
const coins: { mesh: THREE.Object3D; body: Body; box: THREE.Box3 }[] = [];
let coinCount = 0;
const coinCountElement = document.createElement('div');
coinCountElement.style.fontSize = '24px';
coinCountElement.style.fontFamily = 'Figtree';
coinCountElement.style.fontWeight = 'bold';
coinCountElement.style.color = 'black';

const coinCountObject = new CSS2DObject(coinCountElement);
scene.add(coinCountObject);

// CONTROL KEYS
const keysPressed: { [key: string]: boolean } = {};
document.addEventListener('keydown', (event) => {
    keysPressed[event.key.toLowerCase()] = true;
}, false);
document.addEventListener('keyup', (event) => {
    keysPressed[event.key.toLowerCase()] = false;
}, false);

const clock = new THREE.Clock();

let previousPosition = new THREE.Vector3(0, 0, 0); // Initialize the previous position
let popupDisplayed = false;

// ADD SOLDIER RIGID BODY AND BOUNDING BOX
function addSoldierRigidBody(model: THREE.Object3D) {
    const boxShape = new Box(new Vec3(0.5, 1, 0.5));
    const soldierBody = new Body({
        mass: 1,
        shape: boxShape,
        position: new Vec3(model.position.x, model.position.y, model.position.z),
    });

    physicsWorld.addBody(soldierBody);
    physicsBodies.push({ mesh: model, body: soldierBody });

    const box = new THREE.Box3().setFromObject(model);
    model.userData.boundingBox = box;
}

// ADD WALL RIGID BODY (STATIC OBJECTS)
function addWallRigidBody(model: THREE.Object3D) {
    const boxShape = new Box(new Vec3(0.55, 1, 0.55)); // Example size
    const wallBody = new Body({
        mass: 0, // Static object, no movement
        position: new Vec3(model.position.x, model.position.y, model.position.z),
        shape: boxShape,
    });

    physicsWorld.addBody(wallBody);
    physicsBodies.push({ mesh: model, body: wallBody });
}

function generateFloor() {
    const textureLoader = new THREE.TextureLoader();
    const placeholder = textureLoader.load('./textures/placeholder/map.jpg');
    
    const WIDTH = 68;
    const LENGTH = 68;
    
    const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
    const material = new THREE.MeshStandardMaterial({
        map: placeholder,
    });
    
    wrapAndRepeatTexture(material.map);
    
    const floor = new THREE.Mesh(geometry, material);
    floor.receiveShadow = true;
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
}

function wrapAndRepeatTexture(map: THREE.Texture) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1, 1);
}

// ADD LIGHTS
function addLights() {
    scene.add(new THREE.AmbientLight(0xffffff, 1));
}

// CAMERA SETTINGS
const cameraOffset = new THREE.Vector3(0, 5, 10); 
let yaw = 0;
let pitch = 0;

let isMouseDown = false;

document.addEventListener('mousedown', () => {
    isMouseDown = true;
});

document.addEventListener('mouseup', () => {
    isMouseDown = false;
});

document.addEventListener('mousemove', (event) => {
    if (isMouseDown) {
        const deltaX = event.movementX;
        const deltaY = event.movementY;

        yaw -= deltaX * 0.002;
        pitch -= deltaY * 0.002;

        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }
}, false);

// CAMERA SETTINGS (Top-down fixed position)
const cameraPosition = new THREE.Vector3(0, 100, 0); // Camera stays in this fixed position above the scene
camera.position.copy(cameraPosition); // Set initial camera position
camera.lookAt(new THREE.Vector3(0, 0, 0)); // Look at the scene center

function updateCameraPosition() {
    // Update the camera's position relative to the character position for top-down view
    if (characterControls) {
        camera.position.set(
            characterControls.model.position.x + cameraOffset.x,
            100, // Fixed height for top-down view
            characterControls.model.position.z + cameraOffset.z
        );
        camera.lookAt(characterControls.model.position); // Always look at the character
    }
}

let movementDirection = new THREE.Vector3(0, 0, 0);  // To store current movement direction

// Function to handle movement, with collision checking
function handleMovement() {
    const speed = 0.1; // Set movement speed
    const moveDirection = new THREE.Vector3(0, 0, 0);

    // Example of checking keys pressed and moving the character accordingly
    if (keysPressed['w']) moveDirection.z -= speed;
    if (keysPressed['s']) moveDirection.z += speed;
    if (keysPressed['a']) moveDirection.x -= speed;
    if (keysPressed['d']) moveDirection.x += speed;

    const potentialNewPosition = new THREE.Vector3(
        characterControls.model.position.x + moveDirection.x,
        characterControls.model.position.y,
        characterControls.model.position.z + moveDirection.z
    );

    // Check for collision in the direction of movement
    const soldierBox = characterControls.model.userData.boundingBox as THREE.Box3;
    soldierBox.setFromObject(characterControls.model);

    let collisionDetected = false;

    // Check collisions with walls
    scene.children.forEach((object) => {
        if (object.name.startsWith('House')) {
            const wallBox = object.userData.boundingBox as THREE.Box3;
            if (soldierBox.intersectsBox(wallBox)) {
                // If there's a collision, set collisionDetected to true
                collisionDetected = true;
            }
        }
    });

    // If no collision is detected, move the character to the new position
    if (!collisionDetected) {
        characterControls.model.position.add(moveDirection);
    }
}

// In your animate loop, replace the existing movement code with handleMovement()
function animate() {
    const mixerUpdateDelta = clock.getDelta();
    if (characterControls) {
        characterControls.update(mixerUpdateDelta);

        handleMovement(); // Update movement based on keypress

        if (coinCountObject) {
            coinCountObject.position.copy(characterControls.model.position);
            coinCountObject.position.y += 2;
        }

        coins.forEach((coin) => {
            if (coin.mesh.userData.mixer) {
                coin.mesh.userData.mixer.update(mixerUpdateDelta);
            }
        });

        checkSoldierCollectCoin();

        if (robotPosition) {
            const soldierPosition = characterControls.model.position;
            const distance = soldierPosition.distanceTo(robotPosition);

            if (distance < 2 && coinCount >= 5 && !popupDisplayed) {
                createVideoPopup(characterControls);
                popupDisplayed = true;
            }
        }
    }

    // Update camera position to follow the character
    updateCameraPosition();

    renderer.render(scene, camera);
    css2DRenderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();


function checkSoldierCollectCoin() {
    const soldierBox = characterControls.model.userData.boundingBox as THREE.Box3;

    for (let i = 0; i < coins.length; i++) {
        const coin = coins[i];
        if (soldierBox.intersectsBox(coin.box)) {
            scene.remove(coin.mesh);
            physicsWorld.removeBody(coin.body);
            coins.splice(i, 1);

            coinCount++;
            coinCountElement.textContent = `Coins: ${coinCount}`;
            break;
        }
    }
}
