import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../assets/js/phone-showcase.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const screenshots = [...html.matchAll(/class="shot-card"><img src="([^"]+)" alt="([^"]+)"/g)]
    .map(([, src, alt]) => ({ src, alt }));

class Element {
    constructor(className = '') {
        this.className = className;
        this.children = [];
        this.attributes = {};
        this.style = {};
        this.listeners = new Map();
        this.classList = {
            add: value => { this.className = [...new Set([...this.className.split(' '), value])].join(' ').trim(); },
            remove: value => { this.className = this.className.split(' ').filter(item => item !== value).join(' '); },
            contains: value => this.className.split(' ').includes(value),
            toggle: (value, enabled) => {
                this.className = this.className.split(' ').filter(item => item !== value).join(' ');
                if (enabled) this.classList.add(value);
            }
        };
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name]; }
    addEventListener(name, fn, options) {
        const listeners = this.listeners.get(name) || [];
        listeners.push({ fn, once: options?.once });
        this.listeners.set(name, listeners);
    }
    emit(name, event = {}) {
        for (const listener of [...(this.listeners.get(name) || [])]) {
            listener.fn({ target: this, ...event });
            if (listener.once) this.listeners.set(name, this.listeners.get(name).filter(item => item !== listener));
        }
    }
    append(child) {
        child.remove();
        child.parent = this;
        this.children.push(child);
    }
    remove() {
        if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
        this.parent = null;
    }
    replaceChildren(...children) {
        for (const child of [...this.children]) child.remove();
        for (const child of children) this.append(child);
    }
    querySelector(selector) {
        return this.children.find(child => selector === 'img' ? child.tagName === 'IMG' : child.classList.contains(selector.slice(1)));
    }
}

function setup({ reduced = false, failed = [], delayed = [], gallerySources = screenshots, observers = true } = {}) {
    const host = new Element('hero-visual');
    const screen = new Element('phone-screen');
    const frame = new Element('phone-mockup');
    const rotor = new Element('phone-rotor');
    const current = new Element('phone-slide is-current');
    const originalImage = new Element();
    originalImage.tagName = 'IMG';
    current.append(originalImage);
    screen.append(current);
    frame.append(screen);
    rotor.append(frame);
    host.append(rotor);
    host.querySelector = selector => ({
        '.phone-screen': screen,
        '.phone-rotor': rotor
    })[selector];
    const gallery = { querySelectorAll: () => gallerySources.map(item => ({ alt: item.alt, getAttribute: () => item.src })) };
    const preloader = new Element();
    preloader.display = 'flex';
    const document = new Element();
    document.hidden = false;
    document.createElement = () => new Element();
    document.getElementById = id => ({ 'phone-showcase': host, 'showcase-track': gallery, preloader })[id];
    const media = new Element();
    media.matches = reduced;
    const window = new Element();
    const timers = new Map();
    const frames = new Map();
    const pendingLoads = new Map();
    const loads = [];
    let serial = 0;
    let now = 0;
    let intersection;
    let mutation;
    let angle = 0;
    window.matchMedia = () => media;
    window.getComputedStyle = element => ({ display: element.display, transform: String(angle) });
    window.setTimeout = (fn, delay) => { const id = ++serial; timers.set(id, { fn, at: now + delay }); return id; };
    window.clearTimeout = id => timers.delete(id);
    window.requestAnimationFrame = fn => { const id = ++serial; frames.set(id, fn); return id; };
    window.cancelAnimationFrame = id => frames.delete(id);
    if (observers) window.IntersectionObserver = true;
    class FakeImage extends Element {
        constructor() { super(); this.tagName = 'IMG'; }
        set src(value) {
            this.url = value;
            loads.push(value);
            const finish = () => queueMicrotask(() => failed.includes(value) ? this.onerror() : this.onload());
            if (delayed.includes(value)) pendingLoads.set(value, finish);
            else finish();
        }
        get src() { return this.url; }
        async decode() {}
    }
    vm.runInNewContext(script, {
        document, window, Image: FakeImage,
        DOMMatrixReadOnly: class {
            constructor(value) {
                const radians = Number(value) * Math.PI / 180;
                this.m11 = Math.cos(radians);
                this.m31 = Math.sin(radians);
            }
        },
        IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} },
        MutationObserver: class { constructor(fn) { mutation = fn; } observe() {} disconnect() {} }
    });
    const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
    const tick = async milliseconds => {
        now += milliseconds;
        for (const [id, timer] of [...timers]) {
            if (timer.at <= now && timers.has(id)) {
                timers.delete(id);
                timer.fn();
            }
        }
        await flush();
    };
    const reveal = () => {
        if (observers) intersection([{ isIntersecting: true }]);
        preloader.display = 'none';
        mutation();
    };
    const incoming = () => screen.querySelector('.is-incoming');
    const sample = async degreesTurnedLeft => {
        angle = -degreesTurnedLeft;
        for (const [id, fn] of [...frames]) {
            frames.delete(id);
            fn();
        }
        await flush();
    };
    const finishRotation = async () => {
        await sample(360);
        rotor.emit('animationend', { animationName: 'phone-showcase-turn' });
        await flush();
    };
    return { host, frame, rotor, screen, media, document, window, timers, loads,
        frames, pendingLoads, tick, reveal, incoming, sample, finishRotation,
        visible: value => intersection([{ isIntersecting: value }]) };
}

test('waits for the viewport and preloader, then completes a 1.2-second entrance', async () => {
    const app = setup();
    assert.equal(app.host.classList.contains('is-revealed'), false);
    app.visible(true);
    assert.equal(app.host.classList.contains('is-revealed'), false);
    app.reveal();
    assert.equal(app.host.classList.contains('is-revealed'), true);
    await app.tick(1199);
    assert.equal(app.host.classList.contains('has-entered'), false);
    await app.tick(1);
    assert.equal(app.host.classList.contains('has-entered'), true);
    assert.equal(app.incoming(), undefined);
});

test('instantly switches behind the back at 180 degrees, once per turn, through every screenshot', async () => {
    assert.equal(screenshots.length, 7);
    const app = setup();
    app.reveal();
    await app.tick(1200);
    for (let step = 1; step <= screenshots.length * 2; step++) {
        await app.tick(3499);
        assert.equal(app.incoming(), undefined);
        await app.tick(1);
        assert.equal(app.host.classList.contains('is-rotating'), true);
        assert.equal(app.screen.children.length, 1);
        assert.equal(app.screen.attributes['aria-label'], screenshots[(step - 1) % screenshots.length].alt);
        const slide = app.screen.children[0];
        for (const angle of [0, 89, 120, 179]) {
            await app.sample(angle);
            assert.equal(app.screen.attributes['aria-label'], screenshots[(step - 1) % screenshots.length].alt);
        }
        await app.sample(180);
        assert.equal(app.screen.style.visibility, 'hidden');
        assert.equal(slide.children[0].src, screenshots[step % screenshots.length].src);
        assert.equal(app.screen.attributes['aria-label'], screenshots[step % screenshots.length].alt);
        assert.equal(app.host.classList.contains('is-rotating'), true);
        await app.sample(225);
        await app.sample(269);
        assert.equal(app.screen.attributes['aria-label'], screenshots[step % screenshots.length].alt);
        await app.sample(271);
        assert.equal(app.screen.style.visibility, 'visible');
        await app.finishRotation();
        assert.equal(app.host.classList.contains('is-rotating'), false);
        assert.equal(app.frame.className, 'phone-mockup');
        assert.equal(app.screen.children[0], slide);
        assert.equal(slide.className, 'phone-slide is-current');
        assert.equal(app.screen.children.length, 1);
        assert.equal(app.screen.attributes['aria-label'], screenshots[step % screenshots.length].alt);
    }
});

test('pauses angle tracking and resumes the same turn without a premature or duplicate switch', async () => {
    const app = setup();
    app.reveal();
    await app.tick(1200);
    await app.tick(3500);
    assert.equal(app.host.classList.contains('is-rotating'), true);
    await app.sample(170);
    app.visible(false);
    assert.equal(app.host.classList.contains('is-idle'), true);
    assert.equal(app.timers.size, 0);
    assert.equal(app.frames.size, 0);
    await app.sample(180);
    assert.equal(app.screen.attributes['aria-label'], screenshots[0].alt);
    app.visible(true);
    assert.equal(app.host.classList.contains('is-idle'), false);
    assert.equal(app.host.classList.contains('is-rotating'), true);
    await app.sample(180);
    assert.equal(app.screen.attributes['aria-label'], screenshots[1].alt);
    app.visible(false);
    assert.equal(app.frames.size, 0);
    app.visible(true);
    await app.sample(220);
    assert.equal(app.screen.attributes['aria-label'], screenshots[1].alt);
    await app.finishRotation();
    app.visible(false);
    await app.tick(10000);
    assert.equal(app.incoming(), undefined);
    assert.equal(app.timers.size, 0);
    app.visible(true);
    app.document.hidden = true;
    app.document.emit('visibilitychange');
    assert.equal(app.timers.size, 0);
    app.document.hidden = false;
    app.document.emit('visibilitychange');
    await app.tick(3500);
    assert.equal(app.host.classList.contains('is-rotating'), true);
    await app.sample(180);
    await app.finishRotation();
    assert.equal(app.screen.attributes['aria-label'], screenshots[2].alt);
    assert.equal(app.incoming(), undefined);
});

test('reduced motion stays static and cancels tracking without switching a front-facing image', async () => {
    const reducedApp = setup({ reduced: true });
    reducedApp.reveal();
    await reducedApp.tick(10000);
    assert.equal(reducedApp.timers.size, 0);
    assert.equal(reducedApp.loads.length, 0);
    const app = setup();
    app.reveal();
    await app.tick(1200);
    await app.tick(3500);
    assert.equal(app.host.classList.contains('is-rotating'), true);
    app.media.matches = true;
    app.media.emit('change');
    assert.equal(app.screen.children.length, 1);
    assert.equal(app.incoming(), undefined);
    assert.equal(app.host.classList.contains('is-rotating'), false);
    assert.equal(app.frames.size, 0);
    assert.equal(app.timers.size, 0);
    app.media.matches = false;
    app.media.emit('change');
    await app.tick(3500);
    await app.sample(180);
    assert.equal(app.screen.attributes['aria-label'], screenshots[1].alt);
    app.media.matches = true;
    app.media.emit('change');
    assert.equal(app.screen.children.length, 1);
    assert.equal(app.timers.size, 0);
    assert.equal(app.screen.style.visibility, 'visible');
});

test('skips failed images and reads gallery changes without a hardcoded source list', async () => {
    const gallerySources = [screenshots[0], { src: 'missing.png', alt: 'Missing' }, { src: 'custom.png', alt: 'Custom screen' }];
    const app = setup({ gallerySources, failed: ['missing.png'] });
    app.reveal();
    await app.tick(1200);
    assert.ok(app.loads.includes('custom.png'));
    await app.tick(3500);
    await app.sample(180);
    assert.equal(app.screen.children[0].children[0].src, 'custom.png');
    await app.finishRotation();
    assert.equal(app.screen.attributes['aria-label'], 'Custom screen');
});

test('pagehide stops work and pageshow resumes without replaying entrance', async () => {
    const app = setup();
    app.reveal();
    await app.tick(1200);
    app.window.emit('pagehide');
    assert.equal(app.timers.size, 0);
    app.window.emit('pageshow');
    await app.tick(3500);
    await app.sample(180);
    await app.finishRotation();
    assert.equal(app.screen.attributes['aria-label'], screenshots[1].alt);
});

test('still rotates a single screenshot, supports no IntersectionObserver, and ignores an empty gallery', async () => {
    const app = setup({ observers: false, gallerySources: [screenshots[0]] });
    app.reveal();
    await app.tick(1200);
    await app.tick(3500);
    assert.equal(app.host.classList.contains('is-rotating'), true);
    await app.finishRotation();
    assert.equal(app.incoming(), undefined);
    assert.equal(app.screen.children.length, 1);
    await app.tick(3500);
    assert.equal(app.host.classList.contains('is-rotating'), true);
    app.document.hidden = true;
    app.document.emit('visibilitychange');
    assert.equal(app.timers.size, 0);
    const empty = setup({ gallerySources: [] });
    assert.equal(empty.host.classList.contains('showcase-ready'), false);
});

test('ignores bubbled screen events and never switches at the end of a turn', async () => {
    const app = setup();
    app.reveal();
    await app.tick(1200);
    await app.tick(3500);
    app.rotor.emit('animationend', { target: app.screen, animationName: 'phone-screen-in' });
    assert.equal(app.host.classList.contains('is-rotating'), true);
    await app.finishRotation();
    assert.equal(app.incoming(), undefined);
    assert.equal(app.screen.attributes['aria-label'], screenshots[0].alt);
    assert.equal(app.frames.size, 0);
});

test('a late image waits for the next rear-facing window instead of flickering on the front', async () => {
    const app = setup({ delayed: [screenshots[1].src] });
    app.reveal();
    await app.tick(1200);
    await app.tick(3500);
    await app.sample(180);
    assert.equal(app.screen.attributes['aria-label'], screenshots[0].alt);
    await app.sample(280);
    app.pendingLoads.get(screenshots[1].src)();
    await app.sample(300);
    assert.equal(app.screen.attributes['aria-label'], screenshots[0].alt);
    await app.finishRotation();
    assert.equal(app.screen.attributes['aria-label'], screenshots[0].alt);
    await app.tick(3500);
    await app.sample(180);
    assert.equal(app.screen.attributes['aria-label'], screenshots[1].alt);
});

test('an image decoded while the back is visible switches safely before the front returns', async () => {
    const app = setup({ delayed: [screenshots[1].src] });
    app.reveal();
    await app.tick(1200);
    await app.tick(3500);
    await app.sample(180);
    app.pendingLoads.get(screenshots[1].src)();
    await app.sample(210);
    await app.sample(215);
    assert.equal(app.screen.style.visibility, 'hidden');
    assert.equal(app.screen.attributes['aria-label'], screenshots[1].alt);
    await app.sample(280);
    assert.equal(app.screen.style.visibility, 'visible');
    assert.equal(app.screen.attributes['aria-label'], screenshots[1].alt);
});

test('preserves phone motion and disables screenshot transitions with an opaque rear panel', () => {
    const css = readFileSync(new URL('../assets/styles/3d-showcase.css', import.meta.url), 'utf8');
    assert.match(css, /animation: phone-showcase-turn 6\.4s cubic-bezier\(\.45, 0, \.25, 1\) both/);
    assert.match(css, /@keyframes phone-showcase-turn\s*\{\s*from \{ transform: rotateY\(0deg\); \}\s*to \{ transform: rotateY\(-360deg\); \}/);
    assert.match(css, /animation: phone-showcase-float 9s ease-in-out infinite/);
    assert.match(css, /translate3d\(0, 180px, -180px\) rotateX\(12deg\) rotateY\(-18deg\) scale\(\.75\)/);
    assert.match(css, /transition: opacity 1\.2s cubic-bezier\(\.22, 1, \.36, 1\), transform 1\.2s/);
    for (const selector of ['.phone-slide', '.phone-screen .phone-screen-image']) {
        const rule = css.slice(css.indexOf(selector + ' {')).split('}')[0];
        assert.match(rule, /animation: none/);
        assert.match(rule, /transition: none/);
    }
    const back = css.slice(css.indexOf('.phone-back {')).split('}')[0];
    assert.match(back, /background-color: #102331/);
    assert.match(back, /backface-visibility: hidden/);
    assert.match(back, /opacity: 1/);
    assert.doesNotMatch(css, /phone-screen-in|phone-screen-out/);
});
