import * as THREE from '../vendor/three.module.js';

export const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clampPointer = (value) => Math.max(-1, Math.min(1, value));

export function createSafeRenderer(canvas) {
    if (!canvas || !window.WebGL2RenderingContext) return null;
    try {
        const renderer = new THREE.WebGLRenderer({
            canvas, alpha: true, antialias: !isMobile(), powerPreference: 'low-power'
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile() ? 1.25 : 1.7));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        return renderer;
    } catch {
        return null;
    }
}

export function observeScene(section, { init, start, stop, dispose }) {
    if (!section) return () => {};
    let ready = false;
    let visible = false;
    let destroyed = false;

    const destroy = () => {
        if (destroyed) return;
        destroyed = true;
        nearObserver?.disconnect();
        visibleObserver?.disconnect();
        removalObserver.disconnect();
        window.removeEventListener('pagehide', destroy);
        stop();
        if (ready) dispose();
    };
    const initialize = () => {
        if (ready || destroyed) return;
        try { ready = !!init(); } catch { ready = false; }
        nearObserver?.disconnect();
        if (ready && visible) start();
    };
    const nearObserver = 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) initialize();
        }, { rootMargin: '420px 0px' })
        : null;
    const visibleObserver = 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
            visible = !!entries[0]?.isIntersecting;
            if (!ready) return;
            if (visible) start();
            else stop();
        }, { threshold: 0.01 })
        : null;
    const removalObserver = new MutationObserver(() => {
        if (!section.isConnected) destroy();
    });
    removalObserver.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('pagehide', destroy, { once: true });

    if (nearObserver) nearObserver.observe(section);
    else { visible = true; initialize(); }
    if (visibleObserver) visibleObserver.observe(section);
    return destroy;
}
