import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Vector3, MathUtils, Camera as ThreeCamera } from "three";
import {
  useCameraPosition,
  useZoom,
  useSetCameraPosition,
  useSetZoom,
  useCameraRotation,
  useCameraRotationTarget,
  useCameraElevation,
  useCameraElevationTarget,
  useSetCameraRotation,
  useSetCameraElevation,
} from '@/app/components/a2ui/game/store';

// ============================================================================
// Camera Controller Hook
// ============================================================================

export interface CameraControllerProps {
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number;
  panSpeed?: number;
  rotationSpeed?: number;
  elevationSpeed?: number;
  damping?: number; // Smoothness factor (0-1), higher = smoother
  enableInertia?: boolean; // Enable momentum-based camera movement
  inertiaDamping?: number; // How quickly inertia decays (0-1)
  worldBounds?: { minX: number; maxX: number; minZ: number; maxZ: number }; // Restrict camera to world bounds
}

// Constants for isometric camera
const MIN_ELEVATION = Math.PI / 8; // 22.5 degrees minimum
const MAX_ELEVATION = Math.PI / 3; // 60 degrees maximum
const DISTANCE_BASE = 40; // Base distance from target
const MIN_CAMERA_HEIGHT = 5; // Minimum camera height to prevent terrain clipping

/**
 * useCameraController - Manages the isometric RTS camera
 *
 * Features:
 * - Isometric projection with 45-degree default angle
 * - Fully rotational camera around the scene
 * - Smooth damping for all camera movements
 * - Zoom with scroll wheel (0.2x to 5.0x range for agent-to-map view)
 * - Pan with edge scrolling, middle-click drag, or WASD/arrow keys
 * - Rotate with Q/E keys or right-click drag
 * - Adjust elevation with Home/End keys
 *
 * Zoom Levels:
 * - 5.0x: Full map overview (50x50 tiles visible)
 * - 2.0x: Standard tactical view (default)
 * - 1.0x: Medium-close view (multiple agents)
 * - 0.5x: Close view (single agent detail)
 * - 0.2x: Extreme close-up (agent inspection)
 */
export function useCameraController({
  minZoom = 0.2,
  maxZoom = 5.0,
  zoomSpeed = 0.0015,
  panSpeed = 0.5,
  rotationSpeed = 0.03,
  elevationSpeed = 0.02,
  damping = 0.15,
  enableInertia = true,
  inertiaDamping = 0.92,
  worldBounds = { minX: -5, maxX: 55, minZ: -5, maxZ: 55 },
}: CameraControllerProps = {}) {
  const { camera, gl } = useThree();

  // Get current state from store
  const position = useCameraPosition();
  const zoom = useZoom();
  const rotation = useCameraRotation();
  const rotationTarget = useCameraRotationTarget();
  const elevation = useCameraElevation();
  const elevationTarget = useCameraElevationTarget();

  // Get setters
  const setPosition = useSetCameraPosition();
  const setZoom = useSetZoom();
  const setRotation = useSetCameraRotation();
  const setElevation = useSetCameraElevation();

  // Local ref for smooth interpolation values and velocity
  const smoothRef = useRef<{
    currentX: number;
    currentZ: number;
    currentZoom: number;
    currentRotation: number;
    currentElevation: number;
    velocityX: number;
    velocityZ: number;
    velocityRotation: number;
    velocityElevation: number;
    keysPressed: Set<string>;
  }>({
    currentX: position.x,
    currentZ: position.z,
    currentZoom: zoom,
    currentRotation: rotation,
    currentElevation: elevation,
    velocityX: 0,
    velocityZ: 0,
    velocityRotation: 0,
    velocityElevation: 0,
    keysPressed: new Set(),
  });

  // Update smooth values when target changes (for direct set operations)
  useEffect(() => {
    smoothRef.current.currentX = position.x;
    smoothRef.current.currentZ = position.z;
  }, [position]);

  // Handle keyboard input for camera control with continuous movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Track pressed keys for continuous movement
      if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e'].includes(key)) {
        smoothRef.current.keysPressed.add(key);
        e.preventDefault();
      }

      // Handle one-time key presses for elevation
      if (e.key === "Home") {
        setElevation(Math.min(MAX_ELEVATION, elevationTarget + elevationSpeed * 2));
        e.preventDefault();
      } else if (e.key === "End") {
        setElevation(Math.max(MIN_ELEVATION, elevationTarget - elevationSpeed * 2));
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      smoothRef.current.keysPressed.delete(key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [elevationTarget, setElevation, elevationSpeed]);

  // Handle mouse wheel for zooming with improved sensitivity
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Normalize wheel delta (different browsers/devices have different scales)
      const delta = e.deltaY > 0 ? -1 : 1;
      const zoomFactor = delta > 0 ? 1.12 : 0.89; // ~12% zoom per scroll step

      const newZoom = MathUtils.clamp(
        smoothRef.current.currentZoom * zoomFactor,
        minZoom,
        maxZoom
      );

      setZoom(newZoom);
    };

    const canvas = gl.domElement;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [gl, minZoom, maxZoom, setZoom]);

  // Handle middle mouse drag for panning and right mouse drag for rotation
  useEffect(() => {
    let isPanning = false;
    let isRotating = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        // Middle mouse button - pan
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        e.preventDefault();
      } else if (e.button === 2) {
        // Right mouse button - rotate
        isRotating = true;
        lastX = e.clientX;
        lastY = e.clientY;
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;

        // Convert screen delta to world delta based on current rotation
        const currentRotation = smoothRef.current.currentRotation;
        const panAmount = 0.08 / smoothRef.current.currentZoom;

        // Calculate pan direction based on camera rotation
        const cos = Math.cos(currentRotation);
        const sin = Math.sin(currentRotation);

        const worldDeltaX = (deltaX * cos - deltaY * sin) * panAmount;
        const worldDeltaZ = (deltaX * sin + deltaY * cos) * panAmount;

        const newX = MathUtils.clamp(position.x - worldDeltaX, worldBounds.minX, worldBounds.maxX);
        const newZ = MathUtils.clamp(position.z - worldDeltaZ, worldBounds.minZ, worldBounds.maxZ);

        setPosition({ x: newX, y: position.y, z: newZ });

        lastX = e.clientX;
        lastY = e.clientY;
      } else if (isRotating) {
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;

        // Horizontal movement = rotation (increased sensitivity)
        const newRotation = rotationTarget + deltaX * rotationSpeed * 0.8;
        setRotation(newRotation);

        // Vertical movement = elevation (increased sensitivity)
        const newElevation = MathUtils.clamp(
          elevationTarget - deltaY * elevationSpeed * 0.8,
          MIN_ELEVATION,
          MAX_ELEVATION
        );
        setElevation(newElevation);

        lastX = e.clientX;
        lastY = e.clientY;
      }
    };

    const handleMouseUp = () => {
      isPanning = false;
      isRotating = false;
    };

    const handleContextMenu = (e: Event) => {
      // Prevent context menu on right-click
      e.preventDefault();
    };

    const canvas = gl.domElement;
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("contextmenu", handleContextMenu);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [gl, position, rotationTarget, elevationTarget, setPosition, setRotation, setElevation, rotationSpeed, elevationSpeed, worldBounds]);

  // Double-click to focus camera on position
  useEffect(() => {
    let lastClickTime = 0;

    const handleDoubleClick = (e: MouseEvent) => {
      const now = Date.now();
      const timeDiff = now - lastClickTime;

      if (timeDiff < 300 && e.button === 0) {
        // Calculate world position from screen click
        const rect = gl.domElement.getBoundingClientRect();

        const worldPos = screenToWorld(
          e.clientX - rect.left,
          e.clientY - rect.top,
          camera,
          rect.width,
          rect.height
        );

        if (worldPos) {
          const newX = MathUtils.clamp(worldPos.x, worldBounds.minX, worldBounds.maxX);
          const newZ = MathUtils.clamp(worldPos.z, worldBounds.minZ, worldBounds.maxZ);
          setPosition({ x: newX, y: position.y, z: newZ });
        }

        lastClickTime = 0;
      } else {
        lastClickTime = now;
      }
    };

    const canvas = gl.domElement;
    canvas.addEventListener("mousedown", handleDoubleClick);

    return () => {
      canvas.removeEventListener("mousedown", handleDoubleClick);
    };
  }, [gl, camera, position, setPosition, worldBounds]);

  // Edge scrolling
  useEffect(() => {
    const EDGE_THRESHOLD = 30;
    let edgeX = 0;
    let edgeZ = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const width = window.innerWidth;
      const height = window.innerHeight;

      edgeX = 0;
      edgeZ = 0;

      if (x < EDGE_THRESHOLD) edgeX = -1;
      if (x > width - EDGE_THRESHOLD) edgeX = 1;
      if (y < EDGE_THRESHOLD) edgeZ = -1;
      if (y > height - EDGE_THRESHOLD) edgeZ = 1;
    };

    window.addEventListener("mousemove", handleMouseMove);

    let animationFrameId: number;
    const updateEdgeScroll = () => {
      if (edgeX !== 0 || edgeZ !== 0) {
        const currentRotation = smoothRef.current.currentRotation;
        const edgeSpeed = (0.8 / smoothRef.current.currentZoom) * panSpeed;

        // Calculate pan direction based on camera rotation
        const cos = Math.cos(currentRotation);
        const sin = Math.sin(currentRotation);

        const worldDeltaX = (edgeX * cos - edgeZ * sin) * edgeSpeed;
        const worldDeltaZ = (edgeX * sin + edgeZ * cos) * edgeSpeed;

        const currentPos = { x: smoothRef.current.currentX, y: position.y, z: smoothRef.current.currentZ };
        const newX = MathUtils.clamp(currentPos.x + worldDeltaX, worldBounds.minX, worldBounds.maxX);
        const newZ = MathUtils.clamp(currentPos.z + worldDeltaZ, worldBounds.minZ, worldBounds.maxZ);

        setPosition({ x: newX, y: currentPos.y, z: newZ });
      }
      animationFrameId = requestAnimationFrame(updateEdgeScroll);
    };

    updateEdgeScroll();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [position, setPosition, panSpeed, worldBounds]);

  // Update camera position each frame with smooth damping and keyboard control
  useFrame((_, delta) => {
    // Cap delta to prevent large jumps
    const clampedDelta = Math.min(delta, 0.1);

    // Handle continuous keyboard movement
    const keys = smoothRef.current.keysPressed;
    if (keys.size > 0) {
      const keyPanSpeed = panSpeed * 1.5 / smoothRef.current.currentZoom;
      const keyRotSpeed = rotationSpeed * 50;

      const currentRotation = smoothRef.current.currentRotation;
      const cos = Math.cos(currentRotation);
      const sin = Math.sin(currentRotation);

      let moveX = 0;
      let moveZ = 0;

      // WASD/Arrow movement
      if (keys.has('w') || keys.has('arrowup')) moveZ -= 1;
      if (keys.has('s') || keys.has('arrowdown')) moveZ += 1;
      if (keys.has('a') || keys.has('arrowleft')) moveX -= 1;
      if (keys.has('d') || keys.has('arrowright')) moveX += 1;

      // Apply rotation to movement direction
      if (moveX !== 0 || moveZ !== 0) {
        const worldDeltaX = (moveX * cos - moveZ * sin) * keyPanSpeed;
        const worldDeltaZ = (moveX * sin + moveZ * cos) * keyPanSpeed;

        if (enableInertia) {
          smoothRef.current.velocityX += worldDeltaX * 0.3;
          smoothRef.current.velocityZ += worldDeltaZ * 0.3;
        } else {
          const newX = MathUtils.clamp(position.x + worldDeltaX, worldBounds.minX, worldBounds.maxX);
          const newZ = MathUtils.clamp(position.z + worldDeltaZ, worldBounds.minZ, worldBounds.maxZ);
          setPosition({ x: newX, y: position.y, z: newZ });
        }
      }

      // Q/E rotation
      if (keys.has('q')) {
        if (enableInertia) {
          smoothRef.current.velocityRotation += keyRotSpeed * clampedDelta;
        } else {
          setRotation(rotationTarget + rotationSpeed);
        }
      }
      if (keys.has('e')) {
        if (enableInertia) {
          smoothRef.current.velocityRotation -= keyRotSpeed * clampedDelta;
        } else {
          setRotation(rotationTarget - rotationSpeed);
        }
      }
    }

    // Apply inertia/velocity
    if (enableInertia) {
      const newX = MathUtils.clamp(
        position.x + smoothRef.current.velocityX,
        worldBounds.minX,
        worldBounds.maxX
      );
      const newZ = MathUtils.clamp(
        position.z + smoothRef.current.velocityZ,
        worldBounds.minZ,
        worldBounds.maxZ
      );

      if (newX !== position.x || newZ !== position.z) {
        setPosition({ x: newX, y: position.y, z: newZ });
      }

      if (smoothRef.current.velocityRotation !== 0) {
        setRotation(rotationTarget + smoothRef.current.velocityRotation);
      }

      // Apply damping to velocity
      smoothRef.current.velocityX *= inertiaDamping;
      smoothRef.current.velocityZ *= inertiaDamping;
      smoothRef.current.velocityRotation *= inertiaDamping;

      // Stop velocity if very small
      if (Math.abs(smoothRef.current.velocityX) < 0.001) smoothRef.current.velocityX = 0;
      if (Math.abs(smoothRef.current.velocityZ) < 0.001) smoothRef.current.velocityZ = 0;
      if (Math.abs(smoothRef.current.velocityRotation) < 0.0001) smoothRef.current.velocityRotation = 0;
    }

    // Smoothly interpolate all values towards targets
    const smoothFactor = 1 - Math.pow(1 - damping, clampedDelta * 60); // Frame-rate independent

    // Interpolate position
    smoothRef.current.currentX += (position.x - smoothRef.current.currentX) * smoothFactor;
    smoothRef.current.currentZ += (position.z - smoothRef.current.currentZ) * smoothFactor;

    // Interpolate zoom
    smoothRef.current.currentZoom += (zoom - smoothRef.current.currentZoom) * smoothFactor;

    // Interpolate rotation
    smoothRef.current.currentRotation += (rotationTarget - smoothRef.current.currentRotation) * smoothFactor;

    // Interpolate elevation
    smoothRef.current.currentElevation += (elevationTarget - smoothRef.current.currentElevation) * smoothFactor;

    // Calculate isometric camera position
    const distance = DISTANCE_BASE / smoothRef.current.currentZoom;
    const currentRotation = smoothRef.current.currentRotation;
    const currentElevation = smoothRef.current.currentElevation;

    const camX = smoothRef.current.currentX + distance * Math.sin(currentRotation) * Math.cos(currentElevation);
    const camY = distance * Math.sin(currentElevation);
    const camZ = smoothRef.current.currentZ + distance * Math.cos(currentRotation) * Math.cos(currentElevation);

    // Clamp camera height to prevent clipping through terrain
    const clampedCamY = Math.max(MIN_CAMERA_HEIGHT, camY);

    camera.position.set(camX, clampedCamY, camZ);
    camera.lookAt(
      smoothRef.current.currentX,
      0,
      smoothRef.current.currentZ
    );
  });

  return smoothRef;
}

// ============================================================================
// Camera Controller Component
// ============================================================================

export function CameraController(props: CameraControllerProps) {
  useCameraController(props);
  return null;
}

// ============================================================================
// World Position to Screen Position Helper
// ============================================================================

export function worldToScreen(
  worldPos: Vector3,
  camera: ThreeCamera,
  width: number,
  height: number
): { x: number; y: number } {
  const vector = worldPos.clone();
  vector.project(camera);

  return {
    x: (vector.x * 0.5 + 0.5) * width,
    y: (-(vector.y * 0.5) + 0.5) * height,
  };
}

// ============================================================================
// Screen Position to World Position Helper (Raycast to ground plane)
// ============================================================================

export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: ThreeCamera,
  width: number,
  height: number
): Vector3 | null {
  const vector = new Vector3();
  vector.set(
    (screenX / width) * 2 - 1,
    -(screenY / height) * 2 + 1,
    0.5
  );

  vector.unproject(camera);

  const dir = vector.sub(camera.position).normalize();
  const distance = -camera.position.y / dir.y;

  if (distance < 0) return null;

  return camera.position.clone().add(dir.multiplyScalar(distance));
}
