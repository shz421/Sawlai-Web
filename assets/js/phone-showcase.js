(() => {
    const host = document.getElementById('phone-showcase');
    const gallery = document.getElementById('showcase-track');
    if (!host || !gallery) return;

    const sources = Array.from(gallery.querySelectorAll('.shot-card img'))
        .map(image => ({ src: image.getAttribute('src'), alt: image.alt }))
        .filter((item, index, items) => item.src && items.findIndex(other => other.src === item.src) === index);
    if (!sources.length) return;

    const screen = host.querySelector('.phone-screen');
    const rotor = host.querySelector('.phone-rotor');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cache = new Map();
    const current = screen.querySelector('.phone-slide');
    let index = 0;
    let nextScreen = null;
    let timer = 0;
    let entranceTimer = 0;
    let entered = false;
    let revealed = false;
    let visible = false;
    let pageActive = true;
    let loading = false;
    let rotating = false;
    let switchedThisTurn = false;
    let frame = 0;

    current.querySelector('img').src = sources[0].src;
    screen.setAttribute('aria-label', sources[0].alt);
    const active = () => entered && visible && pageActive && !document.hidden && !reduced.matches;
    const clearTimer = () => {
        window.clearTimeout(timer);
        timer = 0;
    };
    const load = position => {
        if (!cache.has(position)) {
            cache.set(position, new Promise(resolve => {
                const image = new Image();
                image.className = 'phone-screen-image';
                image.alt = '';
                image.width = 368;
                image.height = 679;
                image.decoding = 'async';
                image.onload = async () => {
                    try { await image.decode(); } catch {}
                    resolve(image);
                };
                image.onerror = () => resolve(null);
                image.src = sources[position].src;
            }));
        }
        return cache.get(position);
    };
    const prepareNext = async () => {
        if (loading || nextScreen || sources.length < 2 || reduced.matches) return;
        loading = true;
        let position = index;
        let image = null;
        for (let attempt = 1; attempt < sources.length; attempt++) {
            position = (index + attempt) % sources.length;
            image = await load(position);
            if (image) break;
        }
        loading = false;
        if (image) nextScreen = { position, image };
    };
    const stopWatching = () => {
        window.cancelAnimationFrame(frame);
        frame = 0;
    };
    const watchRotation = () => {
        frame = 0;
        if (!active() || !rotating) return;
        const matrix = new DOMMatrixReadOnly(window.getComputedStyle(rotor).transform);
        const angle = (Math.atan2(-matrix.m31, matrix.m11) * 180 / Math.PI + 360) % 360;
        const backFacing = angle > 90 && angle < 270;
        screen.style.visibility = backFacing ? 'hidden' : 'visible';
        if (!switchedThisTurn && angle >= 180 && angle < 270 && nextScreen) {
            current.replaceChildren(nextScreen.image);
            index = nextScreen.position;
            nextScreen = null;
            switchedThisTurn = true;
            screen.setAttribute('aria-label', sources[index].alt);
            prepareNext();
        }
        frame = window.requestAnimationFrame(watchRotation);
    };
    const startWatching = () => {
        if (!frame && active() && rotating) frame = window.requestAnimationFrame(watchRotation);
    };
    const schedule = () => {
        clearTimer();
        if (!active() || rotating) return;
        prepareNext();
        timer = window.setTimeout(() => {
            if (!active()) return;
            rotating = true;
            switchedThisTurn = false;
            host.classList.add('is-rotating');
            startWatching();
        }, 3500);
    };
    const sync = () => {
        host.classList.toggle('is-idle', !active());
        if (reduced.matches) {
            rotating = false;
            host.classList.remove('is-rotating');
            screen.style.visibility = 'visible';
        }
        if (active()) startWatching();
        else stopWatching();
        schedule();
    };
    const finishEntrance = () => {
        if (entered) return;
        window.clearTimeout(entranceTimer);
        entered = true;
        host.classList.add('has-entered');
        prepareNext();
        sync();
    };
    const preloader = document.getElementById('preloader');
    const reveal = () => {
        if (revealed || !visible || (preloader && window.getComputedStyle(preloader).display !== 'none')) return;
        revealed = true;
        preloaderObserver?.disconnect();
        host.classList.add('is-revealed');
        if (reduced.matches) finishEntrance();
        else entranceTimer = window.setTimeout(finishEntrance, 1200);
    };
    const preloaderObserver = preloader ? new MutationObserver(reveal) : null;
    preloaderObserver?.observe(preloader, { attributes: true, attributeFilter: ['style', 'class'] });
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        reveal();
        sync();
    }, { threshold: .15 }) : null;

    host.classList.add('showcase-ready');
    rotor.addEventListener('animationend', event => {
        if (event.target !== rotor || event.animationName !== 'phone-showcase-turn' || !rotating) return;
        stopWatching();
        rotating = false;
        screen.style.visibility = 'visible';
        host.classList.remove('is-rotating');
        schedule();
    });
    reduced.addEventListener('change', () => {
        if (reduced.matches && revealed) finishEntrance();
        sync();
    });
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', () => { pageActive = false; sync(); });
    window.addEventListener('pageshow', () => { pageActive = true; reveal(); sync(); });
    if (observer) observer.observe(host);
    else { visible = true; reveal(); sync(); }
})();
