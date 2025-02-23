import * as THREE from 'three';

export class CharacterControls {
    model: THREE.Group;
    mixer: THREE.AnimationMixer;
    animationsMap: Map<string, THREE.AnimationAction> = new Map(); // Walk, Run, Idle
    camera: THREE.Camera;

    // state
    toggleRun: boolean = true;
    currentAction: string;
    controlsEnabled: boolean = true; // Flag to enable/disable controls

    // temporary data
    walkDirection = new THREE.Vector3();
    rotateAngle = new THREE.Vector3(0, 1, 0);
    rotateQuarternion: THREE.Quaternion = new THREE.Quaternion();
    cameraTarget = new THREE.Vector3();

    // constants
    fadeDuration: number = 0.2;
    runVelocity = 10;
    walkVelocity = 5;

    // WASD control variables
    keys = {
        W: false,
        A: false,
        S: false,
        D: false,
    };

    // Camera offset (fixed position above the character)
    cameraOffset = new THREE.Vector3(0, 5, 10); // Adjust the height and distance of the camera

    constructor(
        model: THREE.Group,
        mixer: THREE.AnimationMixer,
        animationsMap: Map<string, THREE.AnimationAction>,
        camera: THREE.Camera,
        currentAction: string
    ) {
        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap;
        this.currentAction = currentAction;
        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play();
            }
        });
        this.camera = camera;

        // Set up key event listeners for WASD
        this.initKeyListeners();
    }

    // Initialize WASD Key Event Listeners
    private initKeyListeners() {
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            switch (event.key) {
                case 'w':
                    this.keys.W = true;
                    break;
                case 'a':
                    this.keys.A = true;
                    break;
                case 's':
                    this.keys.S = true;
                    break;
                case 'd':
                    this.keys.D = true;
                    break;
            }
        });

        document.addEventListener('keyup', (event: KeyboardEvent) => {
            switch (event.key) {
                case 'w':
                    this.keys.W = false;
                    break;
                case 'a':
                    this.keys.A = false;
                    break;
                case 's':
                    this.keys.S = false;
                    break;
                case 'd':
                    this.keys.D = false;
                    break;
            }
        });
    }

    // Enable or disable character controls
    public setControlsEnabled(enabled: boolean) {
        this.controlsEnabled = enabled;
    }

    public switchRunToggle() {
        this.toggleRun = !this.toggleRun;
    }

    public update(delta: number) {
        // If controls are disabled, do nothing
        if (!this.controlsEnabled) return;

        // Use WASD keys for movement
        const directionPressed = this.keys.W || this.keys.A || this.keys.S || this.keys.D;

        let play = '';
        if (directionPressed && this.toggleRun) {
            play = 'Run';
        } else if (directionPressed) {
            play = 'Walk';
        } else {
            play = 'Idle';
        }

        if (this.currentAction !== play) {
            const toPlay = this.animationsMap.get(play);
            const current = this.animationsMap.get(this.currentAction);

            current.fadeOut(this.fadeDuration);
            toPlay.reset().fadeIn(this.fadeDuration).play();

            this.currentAction = play;
        }

        this.mixer.update(delta);

        if (this.currentAction === 'Run' || this.currentAction === 'Walk') {
            // WASD movement logic
            const movementDirection = new THREE.Vector3();

            if (this.keys.W) movementDirection.z = -1; // Move forward (negative Z direction)
            if (this.keys.S) movementDirection.z = 1;  // Move backward (positive Z direction)
            if (this.keys.A) movementDirection.x = -1; // Move left (negative X direction)
            if (this.keys.D) movementDirection.x = 1;  // Move right (positive X direction)

            // Normalize direction to ensure consistent speed
            movementDirection.normalize();

            // Run/Walk velocity
            const velocity = this.currentAction === 'Run' ? this.runVelocity : this.walkVelocity;

            // Move model
            const moveX = movementDirection.x * velocity * delta;
            const moveZ = movementDirection.z * velocity * delta;
            this.model.position.x += moveX;
            this.model.position.z += moveZ;

            // Corrected rotation logic: Make sure the character faces the movement direction
            if (movementDirection.length() > 0) {
                const targetRotation = Math.atan2(-movementDirection.x, -movementDirection.z); // Adjusted rotation logic
                this.model.rotation.y = targetRotation; // Set the rotation to face the movement direction
            }
        }
    }
}
