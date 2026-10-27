import * as THREE from '../vendor/three.module.js';
import { clampPointer, createSafeRenderer, isMobile, observeScene, prefersReducedMotion } from './3d-utils.js';
import { createPhone, prepareScreenshotTexture } from './phone-model.js';

const hero = document.querySelector('.hero-section');
const phoneCanvas = document.getElementById('hero-phone-canvas');
const booksCanvas = document.getElementById('hero-books-canvas');

if (hero && phoneCanvas) {
    const host = phoneCanvas.parentElement;
    let renderer, scene, camera, model, texture, frame = 0, running = false, disposed = false;
    let mobile = isMobile();
    const pointer = { x: 0, y: 0 };
    const clock = new THREE.Clock(false);

    const render = () => renderer?.render(scene, camera);
    const resize = () => {
        if (!renderer || !host.isConnected) return;
        mobile = isMobile();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.7));
        const w = host.clientWidth, h = host.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.position.z = 12.8;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        render();
    };
    const move = (event) => {
        if (event.pointerType !== 'mouse') return;
        const rect = hero.getBoundingClientRect();
        pointer.x = clampPointer((event.clientX - rect.left) / rect.width * 2 - 1);
        pointer.y = clampPointer((event.clientY - rect.top) / rect.height * 2 - 1);
    };
    const leave = () => { pointer.x = 0; pointer.y = 0; };
    const tick = () => {
        if (!running) return;
        const delta = Math.min(clock.getDelta(), .05);
        const time = clock.elapsedTime;
        model.group.rotation.x = THREE.MathUtils.damp(model.group.rotation.x,
            .025 + pointer.y * (mobile ? .04 : .08) + Math.sin(time * .42) * .025, 7, delta);
        model.group.rotation.y = THREE.MathUtils.damp(model.group.rotation.y,
            -.12 + pointer.x * (mobile ? .1 : .22) + Math.sin(time * .36) * .05, 7, delta);
        model.group.rotation.z = Math.sin(time * .3) * .018;
        model.group.position.y = Math.sin(time * .65) * .08;
        render();
        frame = requestAnimationFrame(tick);
    };
    const stop = () => {
        running = false;
        cancelAnimationFrame(frame);
        frame = 0;
        clock.stop();
    };
    const start = () => {
        if (!renderer) return;
        if (prefersReducedMotion()) { render(); return; }
        if (running) return;
        running = true;
        clock.start();
        frame = requestAnimationFrame(tick);
    };
    const dispose = () => {
        if (disposed) return;
        disposed = true;
        stop();
        window.removeEventListener('resize', resize);
        window.removeEventListener('orientationchange', resize);
        hero.removeEventListener('pointermove', move);
        hero.removeEventListener('pointerleave', leave);
        host.classList.remove('is-3d-ready');
        texture?.dispose();
        model?.dispose();
        renderer?.dispose();
        renderer?.forceContextLoss();
    };
    const init = () => {
        renderer = createSafeRenderer(phoneCanvas);
        if (!renderer) return false;
        try {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(34, 1, .1, 40);
            scene.add(new THREE.HemisphereLight(0xd8efff, 0x11172b, 1.25));
            const cool = new THREE.PointLight(0x68caff, 50, 28, 2);
            cool.position.set(4, 5, 7);
            scene.add(cool);
            const amber = new THREE.PointLight(0xffbb70, 16, 28, 2);
            amber.position.set(-5, -1, 4);
            scene.add(amber);
            model = createPhone(THREE, { mobile, reflection: !mobile });
            scene.add(model.group);
            new THREE.TextureLoader().load('assets/images/homep.png', (loaded) => {
                if (disposed) { loaded.dispose(); return; }
                texture = prepareScreenshotTexture(THREE, loaded, renderer);
                model.setScreens(texture);
                render();
                host.classList.add('is-3d-ready');
            }, undefined, () => {});
            hero.addEventListener('pointermove', move, { passive: true });
            hero.addEventListener('pointerleave', leave);
            window.addEventListener('resize', resize, { passive: true });
            window.addEventListener('orientationchange', resize, { passive: true });
            resize();
            return true;
        } catch {
            dispose();
            return false;
        }
    };
    observeScene(hero, { init, start, stop, dispose });
}

if (hero && booksCanvas) {
    let renderer, scene, camera, frame = 0, running = false, disposed = false;
    let mobile = isMobile();
    const pointer = { x: 0, y: 0 };
    const books = [];
    const clock = new THREE.Clock(false);
    const coverGeometry = new THREE.BoxGeometry(.82, 1.16, .15);
    const pageGeometry = new THREE.BoxGeometry(.74, 1.04, .12);
    const spineGeometry = new THREE.BoxGeometry(.06, 1.12, .17);
    const pageMaterial = new THREE.MeshStandardMaterial({ color: 0xdde5e5, roughness: .72 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xb9905e, metalness: .65, roughness: .36 });
    const covers = [0x123451, 0x19435b, 0x355076, 0x563e47].map((color) =>
        new THREE.MeshStandardMaterial({ color, metalness: .18, roughness: .56 })
    );
    const positions = Array.from({ length: 16 }, (_, i) => {
        const a = i * 2.39996;
        return {
            x: Math.sin(a) * (3.9 + (i % 3) * .6),
            y: Math.cos(a) * (2.3 + (i % 4) * .34),
            z: -1 - (i % 5) * .75,
            phase: i * .72
        };
    });

    const syncBooks = () => {
        if (!scene) return;
        const count = mobile ? 6 : 16;
        while (books.length > count) scene.remove(books.pop().group);
        while (books.length < count) {
            const i = books.length;
            const group = new THREE.Group();
            group.add(new THREE.Mesh(coverGeometry, covers[i % covers.length]));
            const pages = new THREE.Mesh(pageGeometry, pageMaterial);
            pages.position.z = .045;
            group.add(pages);
            const spine = new THREE.Mesh(spineGeometry, trimMaterial);
            spine.position.x = -.39;
            group.add(spine);
            const at = positions[i];
            group.position.set(at.x, at.y, at.z);
            group.rotation.set(.15 + at.phase * .1, at.phase, -.12);
            scene.add(group);
            books.push({ group, at });
        }
    };
    const render = () => renderer?.render(scene, camera);
    const resize = () => {
        if (!renderer) return;
        mobile = isMobile();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.7));
        const w = hero.clientWidth, h = hero.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        syncBooks();
        render();
    };
    const move = (event) => {
        if (event.pointerType !== 'mouse') return;
        const rect = hero.getBoundingClientRect();
        pointer.x = clampPointer((event.clientX - rect.left) / rect.width * 2 - 1);
        pointer.y = clampPointer((event.clientY - rect.top) / rect.height * 2 - 1);
    };
    const leave = () => { pointer.x = 0; pointer.y = 0; };
    const tick = () => {
        if (!running) return;
        clock.getDelta();
        const time = clock.elapsedTime;
        for (const { group, at } of books) {
            group.rotation.y = at.phase + time * .12;
            group.rotation.x = .15 + Math.sin(time * .25 + at.phase) * .12;
            group.position.y = at.y + Math.sin(time * .45 + at.phase) * .16 + pointer.y * .12;
            group.position.x = at.x + pointer.x * .18;
        }
        render();
        frame = requestAnimationFrame(tick);
    };
    const stop = () => {
        running = false;
        cancelAnimationFrame(frame);
        frame = 0;
        clock.stop();
    };
    const start = () => {
        if (!renderer) return;
        if (prefersReducedMotion()) { render(); return; }
        if (running) return;
        running = true;
        clock.start();
        frame = requestAnimationFrame(tick);
    };
    const dispose = () => {
        if (disposed) return;
        disposed = true;
        stop();
        window.removeEventListener('resize', resize);
        window.removeEventListener('orientationchange', resize);
        hero.removeEventListener('pointermove', move);
        hero.removeEventListener('pointerleave', leave);
        coverGeometry.dispose();
        pageGeometry.dispose();
        spineGeometry.dispose();
        pageMaterial.dispose();
        trimMaterial.dispose();
        covers.forEach((item) => item.dispose());
        renderer?.dispose();
        renderer?.forceContextLoss();
    };
    const init = () => {
        renderer = createSafeRenderer(booksCanvas);
        if (!renderer) return false;
        try {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(43, 1, .1, 40);
            camera.position.z = 12;
            scene.add(new THREE.AmbientLight(0xb9d9ec, 1.2));
            const cool = new THREE.PointLight(0x72cfff, 55, 30, 2);
            cool.position.set(-4, 5, 6);
            scene.add(cool);
            const amber = new THREE.PointLight(0xffbe75, 28, 24, 2);
            amber.position.set(5, -2, 5);
            scene.add(amber);
            syncBooks();
            hero.addEventListener('pointermove', move, { passive: true });
            hero.addEventListener('pointerleave', leave);
            window.addEventListener('resize', resize, { passive: true });
            window.addEventListener('orientationchange', resize, { passive: true });
            resize();
            return true;
        } catch {
            dispose();
            return false;
        }
    };
    observeScene(hero, { init, start, stop, dispose });
}
