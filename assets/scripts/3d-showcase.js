// The hero keeps the original home screen and gently follows the mouse.
import * as THREE from './vendor/three.module.js';

const canvas = document.getElementById('hero-phone-canvas');
if (canvas) {
    const host = canvas.parentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const pointer = { x: 0, y: 0 };
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.z = 10.4;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !mobile, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.2 : 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    scene.add(new THREE.HemisphereLight(0xd8efff, 0x11172b, 1.25));
    const keyLight = new THREE.PointLight(0x68caff, 50, 28, 2);
    keyLight.position.set(4, 5, 7);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x9b78ff, 28, 28, 2);
    rimLight.position.set(-5, -1, 4);
    scene.add(rimLight);

    function roundedRect(width, height, radius) {
        const shape = new THREE.Shape();
        const left = -width / 2, right = width / 2, bottom = -height / 2, top = height / 2;
        shape.moveTo(left + radius, bottom);
        shape.lineTo(right - radius, bottom);
        shape.quadraticCurveTo(right, bottom, right, bottom + radius);
        shape.lineTo(right, top - radius);
        shape.quadraticCurveTo(right, top, right - radius, top);
        shape.lineTo(left + radius, top);
        shape.quadraticCurveTo(left, top, left, top - radius);
        shape.lineTo(left, bottom + radius);
        shape.quadraticCurveTo(left, bottom, left + radius, bottom);
        return shape;
    }

    const phone = new THREE.Group();
    scene.add(phone);
    const width = 3.35, height = 7.04, depth = 0.24;
    const body = new THREE.ExtrudeGeometry(roundedRect(width, height, 0.42), {
        depth, bevelEnabled: true, bevelSegments: 5, bevelSize: 0.075, bevelThickness: 0.065, curveSegments: 10
    });
    body.translate(0, 0, -depth / 2);
    phone.add(new THREE.Mesh(body, new THREE.MeshPhysicalMaterial({
        color: 0x8dbcd4, metalness: 0.35, roughness: 0.3, clearcoat: 0.85, clearcoatRoughness: 0.2,
        emissive: 0x24475d, emissiveIntensity: 0.5
    })));

    // The source captures already contain a phone. UV cropping samples only the display,
    // avoiding a second phone frame and the black margins inside our 3D device.
    const screenWidth = 3.12, screenHeight = screenWidth * (575 / 266);
    const screenGeometry = new THREE.ShapeGeometry(roundedRect(screenWidth, screenHeight, 0.2), 12);
    const position = screenGeometry.getAttribute('position');
    const uv = screenGeometry.getAttribute('uv');
    // TextureLoader already flips image data for WebGL; keep UVs bottom-to-top.
    for (let i = 0; i < position.count; i += 1) {
        uv.setXY(i, (position.getX(i) + screenWidth / 2) / screenWidth,
            (position.getY(i) + screenHeight / 2) / screenHeight);
    }
    uv.needsUpdate = true;
    const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = depth / 2 + 0.08;
    phone.add(screen);

    const black = new THREE.MeshStandardMaterial({ color: 0x080b10, roughness: 0.4, metalness: 0.3 });
    const speaker = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.28, 3, 8), black);
    speaker.rotation.z = Math.PI / 2;
    speaker.position.set(0, height / 2 - 0.055, depth / 2 + 0.082);
    phone.add(speaker);
    const sideMaterial = new THREE.MeshStandardMaterial({ color: 0xa6cbe0, metalness: 0.4, roughness: 0.35 });
    const powerButton = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.68, 0.13), sideMaterial);
    powerButton.position.set(width / 2 + 0.075, 1.1, 0);
    phone.add(powerButton);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('assets/images/homep.png', (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.repeat.set(266 / 368, 575 / 679);
        texture.offset.set(49 / 368, (679 - 628) / 679);
        texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
        screenMaterial.map = texture;
        screenMaterial.needsUpdate = true;
        render();
        host.classList.add('is-3d-ready');
    });

    // Mouse movement anywhere over the hero gently turns the phone toward the pointer.
    const hero = host.closest('.hero-section');
    if (!reducedMotion) {
        hero?.addEventListener('pointermove', (event) => {
            if (event.pointerType !== 'mouse') return;
            const rect = hero.getBoundingClientRect();
            pointer.x = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
            pointer.y = THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
        }, { passive: true });
        hero?.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });
    }

    function resize() {
        const w = host.clientWidth, h = host.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.position.z = 12.8;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        render();
    }
    function render() { renderer.render(scene, camera); }
    window.addEventListener('resize', resize, { passive: true });
    resize();

    if (!reducedMotion) {
        const clock = new THREE.Clock();
        function animate() {
            const delta = Math.min(clock.getDelta(), 0.05);
            const elapsed = clock.elapsedTime;
            phone.rotation.x = THREE.MathUtils.damp(phone.rotation.x,
                0.025 + pointer.y * 0.08 + Math.sin(elapsed * 0.42) * 0.025, 7, delta);
            phone.rotation.y = THREE.MathUtils.damp(phone.rotation.y,
                -0.12 + pointer.x * 0.22 + Math.sin(elapsed * 0.36) * 0.05, 7, delta);
            phone.rotation.z = Math.sin(elapsed * 0.3) * 0.018;
            phone.position.y = Math.sin(elapsed * 0.65) * 0.08;
            render();
            requestAnimationFrame(animate);
        }
        animate();
    }
}
