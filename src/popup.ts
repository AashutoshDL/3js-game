import { CharacterControls } from "./characterControls";

export function createVideoPopup(characterControls: CharacterControls) {
    // Disable character controls when the video popup is shown
    characterControls.setControlsEnabled(false);

    // Create overlay div container
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.display = 'flex'; // Initially show the overlay
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.zIndex = '1000'; // Ensure overlay is above the 3D scene

    // Create the video element
    const video = document.createElement('video');
    video.id = 'overlayVideo';
    video.width = 1280;
    video.height = 720;
    video.controls = true;
    
    const source = document.createElement('source');
    source.src = 'vids/futurama.mp4'; // Your video path
    source.type = 'video/mp4';
    video.appendChild(source);
    
    overlay.appendChild(video);
    document.body.appendChild(overlay);

    // Play video when overlay is shown
    video.play();

    // Hide the overlay when the video ends
    video.onended = () => {
        // Enable character controls when the video ends
        characterControls.setControlsEnabled(true);
        // Remove the overlay from the document
        document.body.removeChild(overlay);
    };
}
