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

    const avatarFallback = "assets/images/app-logo.png";

    const initialsOf = function (name) {
        const glyphs = Array.from(String(name || "").trim());
        return glyphs.length ? glyphs[0].toUpperCase() : "?";
    };

    const tintFor = function (name) {
        const tints = ["#57c7ff", "#7c6cff", "#ff8fb1", "#ffb347", "#3ddc97", "#ff6b6b", "#4dd0e1", "#c084fc"];
        const text = String(name || "");
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
        }
        return tints[hash % tints.length];
    };

    const initialsTile = function (name, className) {
        const tile = document.createElement("span");
        tile.className = className + " avatar-initials";
        tile.style.setProperty("--tint", tintFor(name));
        tile.setAttribute("aria-hidden", "true");
        tile.textContent = initialsOf(name);
        return tile;
    };

    document.addEventListener("error", function (event) {
        const img = event.target;
        if (!img || img.tagName !== "IMG") return;
        if (!img.classList.contains("reader-avatar") && !img.classList.contains("reader-profile-avatar")) return;
        if (img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = "1";

        const name = img.getAttribute("alt") || "";
        if (name) {
            img.replaceWith(initialsTile(name, img.className));
            return;
        }

        img.src = avatarFallback;
    }, true);

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

        let match = "";

        if (path.indexOf("about-us") > -1) {
            match = "about-us";
        } else if (path.indexOf("readers") > -1 || path.indexOf("reader") > -1) {
            match = "readers";
        } else if (isHomePath) {
            match = currentHash === "#download" ? "#download" : "#home";
        }

        if (!match) return;

        navLinks.forEach(function (item) {
            const href = (item.getAttribute("href") || "").toLowerCase();
            if (href.indexOf(match) > -1) {
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
        return String(value === null || value === undefined ? "" : value)
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

    const readerHref = function (reader) {
        return "reader?id=" + encodeURIComponent(String(reader.id || ""));
    };

    const avatarMarkup = function (reader, className) {
        const name = String(reader.username || "Reader");
        if (reader.photo) {
            return '<img class="' + className + '" src="' + escapeHtml(String(reader.photo)) + '" alt="' +
                escapeHtml(name) + '" loading="lazy" decoding="async">';
        }
        return '<span class="' + className + ' avatar-initials" style="--tint:' + tintFor(name) +
            '" aria-hidden="true">' + escapeHtml(initialsOf(name)) + "</span>";
    };

    const readerCardHtml = function (reader, badgeHtml) {
        const name = String(reader.username || "Reader");
        const count = Number(reader.completedCount) || 0;
        const finished = reader.latestFinishedAt
            ? "<small>Latest finish " + escapeHtml(formatCompletedDate(reader.latestFinishedAt)) + "</small>"
            : "<small>No public books yet</small>";
        return '<a class="reader-card" data-reader-id="' + escapeHtml(String(reader.id || "")) +
            '" href="' + readerHref(reader) + '">' +
            badgeHtml +
            avatarMarkup(reader, "reader-avatar") +
            '<div class="reader-card-copy">' +
            "<h3>" + escapeHtml(name) + "</h3>" +
            "<p>" + escapeHtml(count) + " completed books</p>" +
            finished +
            "</div>" +
            "</a>";
    };

    const rankBadgeHtml = function (rank) {
        const place = Number(rank) || 0;
        if (place >= 1 && place <= 3) {
            return '<span class="reader-medal reader-medal-' + place + '"><b>' + place + "</b></span>";
        }
        return '<span class="reader-rank">#' + escapeHtml(place) + "</span>";
    };

    let readersCache = null;

    const paintReaders = function () {
        const list = document.getElementById("readers-list");
        if (!list || !readersCache) return;
        const readers = readersCache.readers;
        list.innerHTML = readers.map(function (reader) {
            return readerCardHtml(reader, rankBadgeHtml(reader.rank));
        }).join("");
        list.hidden = !readers.length;
    };

    const renderReadersPage = function () {
        const list = document.getElementById("readers-list");
        if (!list) return;

        const loading = document.getElementById("readers-loading");
        const error = document.getElementById("readers-error");
        const total = document.getElementById("reader-total");

        fetchJsonStrict(API_BASE + "/v2/public/readers?limit=50")
            .then(function (data) {
                const readers = (Array.isArray(data.readers) ? data.readers : []).slice().sort(function (a, b) {
                    return (Number(a.rank) || 0) - (Number(b.rank) || 0);
                });
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

                readersCache = { readers: readers };
                paintReaders();
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
                booksTotal.textContent = String(data.total || books.length || 0);
                const avatarName = reader.username || "Reader";
                if (reader.photo) {
                    avatar.src = String(reader.photo);
                    avatar.alt = avatarName;
                } else {
                    avatar.replaceWith(initialsTile(avatarName, avatar.className));
                }
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
                        '<span class="completed-book-cover">' +
                        '<img src="' + cover + '" alt="' + escapeHtml(book.title) + '" loading="lazy" decoding="async">' +
                        '</span>' +
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

    const renderReaderSearch = function () {
        const form = document.getElementById("reader-search-form");
        if (!form) return;

        const input = document.getElementById("reader-search-input");
        const note = document.getElementById("reader-search-note");
        const result = document.getElementById("reader-search-result");
        const button = form.querySelector("button[type=submit]");

        const say = function (message, isError) {
            if (!note) return;
            note.hidden = !message;
            note.textContent = message || "";
            note.classList.toggle("is-error", !!isError);
        };

        const openButton = document.getElementById("reader-search-open");
        const row = document.getElementById("reader-search-row");
        const label = form.querySelector(".reader-search-label");

        const reveal = function () {
            if (!row) return;
            if (openButton) openButton.hidden = true;
            row.hidden = false;
            if (input) input.focus();
        };

        if (openButton) {
            openButton.addEventListener("click", reveal);
        }

        if (label) {
            label.addEventListener("click", function (event) {
                event.preventDefault();
                reveal();
            });
        }

        if (input && row) {
            input.addEventListener("keydown", function (event) {
                if (event.key !== "Escape" || input.value.trim()) return;
                row.hidden = true;
                if (openButton) {
                    openButton.hidden = false;
                    openButton.focus();
                }
            });
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            const deviceId = (input && input.value ? input.value : "").trim();

            if (result) {
                result.hidden = true;
                result.innerHTML = "";
            }

            if (deviceId.length < 8) {
                say("Enter your full profile ID - it is at least 8 characters.", true);
                return;
            }

            say("Searching...");
            if (button) button.disabled = true;

            fetchJsonStrict(API_BASE + "/v2/public/readers/search?device_id=" + encodeURIComponent(deviceId))
                .then(function (data) {
                    const reader = data && data.reader;
                    if (!reader) {
                        say("No public reader profile found for that profile ID.", true);
                        return;
                    }
                    say("");
                    if (result) {
                        result.innerHTML = readerCardHtml(reader,
                            '<span class="reader-rank reader-rank-top">You</span>');
                        result.hidden = false;
                    }
                })
                .catch(function (err) {
                    const raw = err && err.message ? err.message : "";
                    const message = raw.replace(/device\s*ID/gi, "profile ID");
                    say(/route/i.test(message)
                        ? "Search is not available right now. Please try again later."
                        : (message || "Could not search right now."), true);
                })
                .finally(function () {
                    if (button) button.disabled = false;
                });
        });
    };

    const initShowcaseSlider = function () {
        const track = document.getElementById("showcase-track");
        if (!track) return;

        const prev = document.getElementById("showcase-prev");
        const next = document.getElementById("showcase-next");
        const originals = Array.prototype.slice.call(track.querySelectorAll(".shot-card"));
        if (!originals.length) return;

        if (track.scrollWidth <= track.clientWidth + 2) {
            if (prev) prev.hidden = true;
            if (next) next.hidden = true;
            return;
        }

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        const easing = function () {
            return reduced.matches ? "auto" : "smooth";
        };

        const stepSize = function () {
            const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
            return originals[0].getBoundingClientRect().width + gap;
        };

        const maxScroll = function () {
            return Math.max(0, track.scrollWidth - track.clientWidth);
        };

        const sync = function () {
            const max = maxScroll();
            if (prev) prev.disabled = track.scrollLeft <= 2;
            if (next) next.disabled = track.scrollLeft >= max - 2;
        };

        let rewindTimer = 0;
        const slide = function (direction, isAuto) {
            window.clearTimeout(rewindTimer);
            const max = maxScroll();

            if (direction > 0 && track.scrollLeft >= max - 2) {
                if (isAuto) {
                    rewindTimer = window.setTimeout(function () {
                        track.scrollTo({ left: 0, behavior: easing() });
                    }, 1300);
                }
                return;
            }

            let target = track.scrollLeft + direction * Math.round(stepSize());
            if (target > max) target = max;
            if (target < 0) target = 0;
            track.scrollTo({ left: target, behavior: easing() });
        };

        let resumeAt = 0;
        const holdOff = function () {
            resumeAt = Date.now() + 4000;
        };

        if (prev) prev.addEventListener("click", function () { holdOff(); slide(-1, false); });
        if (next) next.addEventListener("click", function () { holdOff(); slide(1, false); });
        track.addEventListener("pointerdown", holdOff, { passive: true });
        track.addEventListener("wheel", holdOff, { passive: true });

        let syncTimer = 0;
        track.addEventListener("scroll", function () {
            window.clearTimeout(syncTimer);
            syncTimer = window.setTimeout(sync, 80);
        }, { passive: true });

        window.setInterval(function () {
            if (document.hidden) return;
            if (Date.now() < resumeAt) return;
            slide(1, true);
        }, 3200);

        let resizeTimer = 0;
        window.addEventListener("resize", function () {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(function () {
                track.scrollTo({ left: 0, behavior: "auto" });
                sync();
            }, 180);
        });

        sync();
    };

    renderReadersPage();
    renderReaderProfilePage();
    renderReaderSearch();
    initShowcaseSlider();
});

