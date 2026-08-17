$(function () {
    const API_BASE = "https://lib.sawlai.com";
    const fetchJsonStrict = function (url) {
        return fetch(url).then(function (response) {
            return response.text().then(function (text) {
                let data = null;
                try {
                    data = text ? JSON.parse(text) : null;
                } catch (e) {
                    data = null;
                }

                if (!response.ok) {
                    const message = data && (data.error || data.message)
                        ? String(data.error || data.message)
                        : "Request failed.";
                    throw new Error(message);
                }

                return data || {};
            });
        });
    };

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
            const isAbout = path.indexOf("about-us") > -1 && href.indexOf("about-us") > -1;
            const isReaders = (path.indexOf("readers") > -1 || path.indexOf("reader") > -1) && href.indexOf("readers") > -1;
            const isDownload = (currentHash === "#download" && href.indexOf("#download") > -1) || (path === "/" && href === "#download" && currentHash === "#download");
            const isHome = isHomePath && (href.indexOf("#home") > -1 || href === "/");

            if (isAbout || isReaders || isDownload || isHome) {
                item.classList.add("nav-active");
            }
        });
    };

    setActiveFromLocation();
    window.addEventListener("hashchange", setActiveFromLocation);

    navLinks.forEach(function (link) {
        link.addEventListener("click", function () {
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
        "စာအုပ်ပေါင်း ၂၆၀၀၀+",
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
            const desktopFallback = "/#download";

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

    const escapeHtml = function (value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };

    const formatCompletedDate = function (value) {
        const stamp = Number(value || 0);
        if (!stamp) return "";
        const date = new Date(stamp);
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };

    const renderReadersPage = function () {
        const list = document.getElementById("readers-list");
        if (!list) return;

        const loading = document.getElementById("readers-loading");
        const error = document.getElementById("readers-error");
        const total = document.getElementById("reader-total");

        fetchJsonStrict(API_BASE + "/v2/public/readers?limit=50")
            .then(function (data) {
                const readers = Array.isArray(data.readers) ? data.readers : [];
                if (loading) loading.hidden = true;
                if (error) error.hidden = true;
                if (total) total.textContent = String(data.total || readers.length || 0);

                if (!readers.length) {
                    if (error) {
                        error.hidden = false;
                        error.textContent = "No public readers yet.";
                    }
                    return;
                }

                list.innerHTML = readers.map(function (reader) {
                    const rankClass = reader.rank <= 3 ? " reader-rank-top" : "";
                    const photo = reader.photo ? escapeHtml(reader.photo) : "assets/images/app-logo.png";
                    return '<a class="reader-card" href="reader?id=' + encodeURIComponent(String(reader.id || "")) + '">' +
                        '<span class="reader-rank' + rankClass + '">#' + escapeHtml(reader.rank) + '</span>' +
                        '<img class="reader-avatar" src="' + photo + '" alt="' + escapeHtml(reader.username) + '">' +
                        '<div class="reader-card-copy">' +
                        '<h3>' + escapeHtml(reader.username) + '</h3>' +
                        '<p>' + escapeHtml(reader.completedCount) + ' completed books</p>' +
                        '<small>Latest finish ' + escapeHtml(formatCompletedDate(reader.latestFinishedAt)) + '</small>' +
                        '</div>' +
                        '</a>';
                }).join("");
                list.hidden = false;
            })
            .catch(function (err) {
                if (loading) loading.hidden = true;
                if (error) {
                    error.hidden = false;
                    error.textContent = err && err.message ? err.message : "Could not load readers.";
                }
            });
    };

    const renderReaderProfilePage = function () {
        const profile = document.getElementById("reader-profile");
        if (!profile) return;

        const params = new URLSearchParams(window.location.search);
        const readerId = params.get("id");
        const loading = document.getElementById("reader-profile-loading");
        const error = document.getElementById("reader-profile-error");
        const title = document.getElementById("reader-profile-title");
        const subtitle = document.getElementById("reader-profile-sub");
        const avatar = document.getElementById("reader-profile-avatar");
        const booksTotal = document.getElementById("reader-books-total");
        const booksWrap = document.getElementById("reader-books");
        const shareBtn = document.getElementById("reader-profile-share");

        if (!readerId) {
            if (loading) loading.hidden = true;
            if (error) {
                error.hidden = false;
                error.textContent = "Reader not found.";
            }
            return;
        }

        fetchJsonStrict(API_BASE + "/v2/public/reader?id=" + encodeURIComponent(readerId))
            .then(function (data) {
                const reader = data.reader || null;
                const books = Array.isArray(data.books) ? data.books : [];
                if (!reader) throw new Error("Reader not found.");

                if (loading) loading.hidden = true;
                if (error) error.hidden = true;

                title.textContent = reader.username || "Reader";
                subtitle.textContent = (reader.completedCount || books.length || 0) + " completed books visible on the web.";
                booksTotal.textContent = String(data.total || books.length || 0);
                avatar.src = reader.photo || "assets/images/app-logo.png";
                avatar.alt = reader.username || "Reader";
                if (shareBtn) {
                    const shareUrl = window.location.href;
                    shareBtn.hidden = false;
                    shareBtn.href = shareUrl;
                    shareBtn.addEventListener("click", function (event) {
                        event.preventDefault();
                        if (navigator.share) {
                            navigator.share({
                                title: (reader.username || "Reader") + " - Sawlai Library",
                                url: shareUrl
                            }).catch(function () { });
                            return;
                        }
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(shareUrl).then(function () {
                                shareBtn.textContent = "Copied";
                                window.setTimeout(function () {
                                    shareBtn.textContent = "Share Profile";
                                }, 1200);
                            }).catch(function () {
                                window.open(shareUrl, "_blank");
                            });
                            return;
                        }
                        window.open(shareUrl, "_blank");
                    });
                }

                booksWrap.innerHTML = books.map(function (book) {
                    const cover = book.photo ? escapeHtml(book.photo) : "assets/images/app-logo.png";
                    const author = book.author ? '<p>' + escapeHtml(book.author) + '</p>' : "";
                    const rawLink = String(book.appLink || "");
                    const openLink = rawLink.indexOf("http://") === 0 || rawLink.indexOf("https://") === 0
                        ? rawLink
                        : (API_BASE + (rawLink.indexOf("/") === 0 ? rawLink : ("/" + rawLink)));
                    return '<a class="completed-book-card" href="' + escapeHtml(openLink) + '">' +
                        '<img class="completed-book-cover" src="' + cover + '" alt="' + escapeHtml(book.title) + '">' +
                        '<div class="completed-book-copy">' +
                        '<h3>' + escapeHtml(book.title) + '</h3>' +
                        author +
                        '<small>Completed ' + escapeHtml(formatCompletedDate(book.finishedAt)) + '</small>' +
                        '</div>' +
                        '</a>';
                }).join("");

                if (!books.length) {
                    booksWrap.innerHTML = '<div class="reader-empty">No public completed books found.</div>';
                }

                profile.hidden = false;
            })
            .catch(function (err) {
                if (loading) loading.hidden = true;
                if (error) {
                    error.hidden = false;
                    error.textContent = err && err.message ? err.message : "Could not load reader profile.";
                }
            });
    };

    renderReadersPage();
    renderReaderProfilePage();
});

