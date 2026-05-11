$(function () {
    window.setTimeout(function () {
        $("#preloader").fadeOut("slow");
    }, 500);

    const header = document.querySelector(".saw-header");
    const updateHeader = function () {
        if (!header) return;
        if (window.scrollY > 10) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    const nav = document.getElementById("navbarSupportedContent");
    const navLinks = document.querySelectorAll(".saw-links .nav-link");
    const path = window.location.pathname.toLowerCase();
    const isHomePath = path === "/" || path.endsWith("/index.html");
    const isDownloadPath = path === "/download" || path === "/download/" || path.endsWith("/download/index.html");

    const clearActiveLinks = function () {
        navLinks.forEach(function (item) {
            item.classList.remove("nav-active");
        });
    };

    const setActiveFromLocation = function () {
        const currentHash = window.location.hash.toLowerCase();
        clearActiveLinks();
        navLinks.forEach(function (item) {
            const href = (item.getAttribute("href") || "").toLowerCase();
            const isAbout = path.indexOf("about-us.html") > -1 && href.indexOf("about-us.html") > -1;
            const isDownloadHash = currentHash === "#download" && href.indexOf("#download") > -1;
            const isDownloadRoute = isDownloadPath && href === "/download";
            const isDownload = isDownloadHash || isDownloadRoute;
            const isHome = isHomePath && (href === "#home" || href === "/");

            if (isAbout || isDownload || isHome) {
                item.classList.add("nav-active");
            }
        });
    };

    setActiveFromLocation();
    window.addEventListener("hashchange", setActiveFromLocation);

    navLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            link.classList.add("nav-clicked");
            window.setTimeout(function () {
                link.classList.remove("nav-clicked");
            }, 180);

            clearActiveLinks();
            link.classList.add("nav-active");

            if (nav && nav.classList.contains("show")) {
                $(".navbar-collapse").collapse("hide");
            }
        });
    });

    const words = [
        "စာရေးဆရာများ",
        "နာမည်ကြီးစာအုပ်များ",
        "စာအုပ်ပေါင်း ၈၀၀၀+",
        "အင်္ဂလိပ်စာအုပ်များ",
        "အသံစာအုပ်များ"
    ];
    const rotatingWord = document.getElementById("rotating-word");
    let wordIndex = 0;
    if (rotatingWord) {
        rotatingWord.style.opacity = "1";
        rotatingWord.style.transform = "translateY(0)";
        window.setInterval(function () {
            rotatingWord.style.opacity = "0";
            rotatingWord.style.transform = "translateY(-8px)";
            window.setTimeout(function () {
                wordIndex = (wordIndex + 1) % words.length;
                rotatingWord.textContent = words[wordIndex];
                rotatingWord.style.transform = "translateY(8px)";
                rotatingWord.style.opacity = "0";
                window.setTimeout(function () {
                    rotatingWord.style.opacity = "1";
                    rotatingWord.style.transform = "translateY(0)";
                }, 40);
            }, 280);
        }, 2400);
    }

    document.querySelectorAll(".faq-toggle").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const item = btn.closest(".faq-item");
            if (!item) return;
            const expanded = btn.getAttribute("aria-expanded") === "true";
            document.querySelectorAll(".faq-item").forEach(function (other) {
                other.classList.remove("active");
                const otherBtn = other.querySelector(".faq-toggle");
                if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
            });
            if (!expanded) {
                item.classList.add("active");
                btn.setAttribute("aria-expanded", "true");
            }
        });
    });

    const downloadNowBtn = document.getElementById("download-now-btn");
    if (downloadNowBtn) {
        downloadNowBtn.addEventListener("click", function (event) {
            event.preventDefault();

            const ua = navigator.userAgent || "";
            const isAndroid = /Android/i.test(ua);
            const isIOS = /iPhone|iPad|iPod/i.test(ua);
            const isMobile = isAndroid || isIOS;

            const androidDeepLink = "intent://open#Intent;scheme=sawlai;package=digital.online.books;end";
            const androidFallback = "https://play.google.com/store/apps/details?id=digital.online.books";
            const iosDeepLink = "sawlai://open";
            const iosFallback = "https://apps.apple.com/";
            const desktopFallback = "/download";

            let fallbackUrl = desktopFallback;
            let deepLink = "";

            if (isAndroid) {
                deepLink = androidDeepLink;
                fallbackUrl = androidFallback;
            } else if (isIOS) {
                deepLink = iosDeepLink;
                fallbackUrl = iosFallback;
            }

            let didLeavePage = false;
            const onHidden = function () {
                didLeavePage = true;
            };
            document.addEventListener("visibilitychange", onHidden, { once: true });

            if (isMobile && deepLink) {
                window.location.href = deepLink;
            }

            window.setTimeout(function () {
                if (!didLeavePage) {
                    window.location.href = fallbackUrl;
                }
            }, 1200);
        });
    }

    if (typeof AOS !== "undefined") {
        AOS.init({
            once: false,
            offset: 80,
            duration: 700,
            easing: "ease-out-cubic"
        });
    }
});

