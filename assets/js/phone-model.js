export function createPhone(THREE, { mobile = false, reflection = true } = {}) {
    const roundedRect = (width, height, radius) => {
        const shape = new THREE.Shape();
        const l = -width / 2, r = width / 2, b = -height / 2, t = height / 2;
        shape.moveTo(l + radius, b);
        shape.lineTo(r - radius, b);
        shape.quadraticCurveTo(r, b, r, b + radius);
        shape.lineTo(r, t - radius);
        shape.quadraticCurveTo(r, t, r - radius, t);
        shape.lineTo(l + radius, t);
        shape.quadraticCurveTo(l, t, l, t - radius);
        shape.lineTo(l, b + radius);
        shape.quadraticCurveTo(l, b, l + radius, b);
        return shape;
    };

    const group = new THREE.Group();
    const width = 3.35, height = 7.04, depth = 0.24;
    const bodyGeometry = new THREE.ExtrudeGeometry(roundedRect(width, height, .42), {
        depth, bevelEnabled: true, bevelSegments: mobile ? 2 : 5,
        bevelSize: .075, bevelThickness: .065, curveSegments: mobile ? 6 : 10
    });
    bodyGeometry.translate(0, 0, -depth / 2);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x8dbcd4, metalness: .35, roughness: .3, clearcoat: .85,
        clearcoatRoughness: .2, emissive: 0x24475d, emissiveIntensity: .5
    });
    group.add(new THREE.Mesh(bodyGeometry, bodyMaterial));

    const screenWidth = 3.12, screenHeight = screenWidth * (575 / 266);
    const screenGeometry = new THREE.ShapeGeometry(
        roundedRect(screenWidth, screenHeight, .2), mobile ? 6 : 12
    );
    const positions = screenGeometry.getAttribute('position');
    const uv = screenGeometry.getAttribute('uv');
    for (let i = 0; i < positions.count; i++) {
        uv.setXY(i, (positions.getX(i) + screenWidth / 2) / screenWidth,
            (positions.getY(i) + screenHeight / 2) / screenHeight);
    }
    uv.needsUpdate = true;

    const baseScreen = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const nextScreen = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false, transparent: true, opacity: 0, depthWrite: false
    });
    const baseMesh = new THREE.Mesh(screenGeometry, baseScreen);
    baseMesh.position.z = depth / 2 + .08;
    group.add(baseMesh);
    const nextMesh = new THREE.Mesh(screenGeometry, nextScreen);
    nextMesh.position.z = baseMesh.position.z + .002;
    group.add(nextMesh);

    const dark = new THREE.MeshStandardMaterial({ color: 0x080b10, roughness: .4, metalness: .3 });
    const speaker = new THREE.Mesh(new THREE.CapsuleGeometry(.015, .28, 3, 8), dark);
    speaker.rotation.z = Math.PI / 2;
    speaker.position.set(0, height / 2 - .055, depth / 2 + .082);
    group.add(speaker);
    const sideMaterial = new THREE.MeshStandardMaterial({ color: 0xa6cbe0, metalness: .4, roughness: .35 });
    const power = new THREE.Mesh(new THREE.BoxGeometry(.065, .68, .13), sideMaterial);
    power.position.set(width / 2 + .075, 1.1, 0);
    group.add(power);

    if (reflection && !mobile) {
        const shineGeometry = new THREE.PlaneGeometry(screenWidth * .25, screenHeight * .96);
        const shineMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: .055,
            depthWrite: false, toneMapped: false
        });
        const shine = new THREE.Mesh(shineGeometry, shineMaterial);
        shine.position.set(-.76, .03, nextMesh.position.z + .003);
        shine.rotation.z = -.2;
        group.add(shine);
    }

    return {
        group,
        setScreens(first, second = null) {
            baseScreen.map = first;
            nextScreen.map = second;
            baseScreen.needsUpdate = true;
            nextScreen.needsUpdate = true;
        },
        setBlend(value) { nextScreen.opacity = Math.max(0, Math.min(1, value)); },
        dispose() {
            const geometries = new Set(), materials = new Set();
            group.traverse((item) => {
                if (item.geometry) geometries.add(item.geometry);
                if (item.material) materials.add(item.material);
            });
            geometries.forEach((item) => item.dispose());
            materials.forEach((item) => item.dispose());
        }
    };
}

export function prepareScreenshotTexture(THREE, texture, renderer) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.set(266 / 368, 575 / 679);
    texture.offset.set(49 / 368, 51 / 679);
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    return texture;
}
