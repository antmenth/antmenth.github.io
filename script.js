/* =========================================================
   antmenth. — Global Site Script
   ========================================================= */

const CONFIG = {
    youtube: {
        handle: "@antmenth",
        channelUrl: "https://www.youtube.com/@antmenth"
    }
};


/* =========================================================
   HELPERS
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function formatSubscriberCount(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "— subscribers";
    }

    if (number >= 1000000) {
        return `${(number / 1000000).toFixed(1).replace(".0", "")}M subscribers`;
    }

    if (number >= 1000) {
        return `${(number / 1000).toFixed(1).replace(".0", "")}K subscribers`;
    }

    return `${number.toLocaleString()} subscribers`;
}


/* =========================================================
   SITE ROOT
   ========================================================= */

function getSiteRoot() {
    const pageType = document.body.dataset.page;

    if (pageType === "tutorial") {
        return "../../";
    }

    return "./";
}


/* =========================================================
   BRAND
   ========================================================= */

function setupBrand() {
    const brandText = $("#brandText");

    if (brandText) {
        brandText.textContent = "antmenth.";
    }

    const heroBrand = $("#heroBrand");

    if (!heroBrand) {
        return;
    }

    const text = "antmenth.";

    heroBrand.textContent = "";

    let index = 0;

    const interval = setInterval(() => {
        heroBrand.textContent += text[index];
        index++;

        if (index >= text.length) {
            clearInterval(interval);
        }
    }, 85);
}


/* =========================================================
   YOUTUBE CHANNEL DATA
   ========================================================= */

async function loadYoutubeData() {
    const avatar = $("#youtubeAvatar");
    const name = $("#youtubeName");
    const handle = $("#youtubeHandle");
    const subscribers = $("#subscriberCount");

    if (!avatar && !name && !handle && !subscribers) {
        return;
    }

    try {
        const cleanHandle = CONFIG.youtube.handle.replace(/^@/, "");

        const response = await fetch(
            `https://banner.yt/api/channel/${encodeURIComponent(cleanHandle)}?type=handle`
        );

        if (!response.ok) {
            throw new Error(`YouTube API returned ${response.status}`);
        }

        const data = await response.json();

        if (name) {
            name.textContent = data.title || "antmenth.";
        }

        if (handle) {
            handle.textContent =
                data.customUrl ||
                CONFIG.youtube.handle;
        }

        if (subscribers) {
            subscribers.textContent =
                formatSubscriberCount(data.subscriberCount);
        }

        if (avatar) {
            avatar.src =
                data.avatarUrl ||
                (data.channelId
                    ? `https://banner.yt/${data.channelId}/avatar`
                    : "");

            avatar.alt = `${data.title || "YouTube"} profile picture`;
        }

    } catch (error) {
        console.warn("Could not load YouTube channel data:", error);

        if (name) {
            name.textContent = "antmenth.";
        }

        if (handle) {
            handle.textContent = CONFIG.youtube.handle;
        }

        if (subscribers) {
            subscribers.textContent = "subscriber count unavailable";
        }

        if (avatar) {
            avatar.src =
                "https://banner.yt/antmenth/avatar";
        }
    }
}


/* =========================================================
   TUTORIAL DATA
   ========================================================= */

let tutorials = [];

async function loadTutorials() {
    try {
        const root = getSiteRoot();

        const response = await fetch(`${root}tutorials.json`, {
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error(`tutorials.json returned ${response.status}`);
        }

        tutorials = await response.json();

        if ($("#tutorialList")) {
            setupTutorialControls();
            renderTutorials();
        }

        if ($("[data-tutorial-page]")) {
            loadTutorialPage();
        }

    } catch (error) {
        console.error("Could not load tutorials.json:", error);

        const list = $("#tutorialList");

        if (list) {
            list.innerHTML = `
        <div class="empty-state">
          > failed to load tutorials.json
        </div>
      `;
        }
    }
}


/* =========================================================
   HOMEPAGE TUTORIALS
   ========================================================= */

function renderTutorials() {
    const list = $("#tutorialList");
    const emptyState = $("#emptyState");
    const count = $("#tutorialCount");

    if (!list) {
        return;
    }

    const searchInput = $("#searchInput");
    const sortSelect = $("#sortSelect");

    const searchTerm =
        searchInput?.value.trim().toLowerCase() || "";

    const sortMode =
        sortSelect?.value || "newest";

    let filtered = tutorials.filter((tutorial) => {
        const searchableText = [
            tutorial.title,
            tutorial.description,
            ...(tutorial.tags || [])
        ]
            .join(" ")
            .toLowerCase();

        return searchableText.includes(searchTerm);
    });

    filtered.sort((a, b) => {
        switch (sortMode) {
            case "az":
                return a.title.localeCompare(b.title);

            case "za":
                return b.title.localeCompare(a.title);

            case "oldest":
                return new Date(a.date) - new Date(b.date);

            case "newest":
            default:
                return new Date(b.date) - new Date(a.date);
        }
    });

    list.innerHTML = "";

    if (count) {
        count.textContent =
            `${filtered.length} tutorial${filtered.length === 1 ? "" : "s"}`;
    }

    if (filtered.length === 0) {
        if (emptyState) {
            emptyState.hidden = false;
        }

        return;
    }

    if (emptyState) {
        emptyState.hidden = true;
    }

    filtered.forEach((tutorial) => {
        const card = document.createElement("a");

        card.className = "tutorial-card";
        card.href = tutorial.url;

        const tags = (tutorial.tags || [])
            .map(
                (tag) =>
                    `<span class="tag">${escapeHtml(tag)}</span>`
            )
            .join("");

        card.innerHTML = `
      <div class="tutorial-card-top">
        <h3 class="tutorial-card-title">
          ${escapeHtml(tutorial.title)}
        </h3>

        <span class="tutorial-card-date">
          ${escapeHtml(formatDate(tutorial.date))}
        </span>
      </div>

      <p class="tutorial-card-description">
        ${escapeHtml(tutorial.description)}
      </p>

      <div class="tutorial-tags">
        ${tags}
      </div>
    `;

        list.appendChild(card);
    });
}


/* =========================================================
   TUTORIAL PAGE
   ========================================================= */

function getCurrentTutorialSlug() {
    const parts = window.location.pathname
        .split("/")
        .filter(Boolean);

    if (parts.length === 0) {
        return "";
    }

    if (parts[parts.length - 1] === "index.html") {
        return parts[parts.length - 2] || "";
    }

    return parts[parts.length - 1];
}


function getTutorialSlug(tutorial) {
    const cleanUrl = tutorial.url
        .split("?")[0]
        .split("#")[0]
        .replace(/\/+$/, "");

    const parts = cleanUrl
        .split("/")
        .filter(Boolean);

    return parts[parts.length - 1] || "";
}


function loadTutorialPage() {
    const slug = getCurrentTutorialSlug();

    const tutorial = tutorials.find(
        (item) => getTutorialSlug(item) === slug
    );

    if (!tutorial) {
        showTutorialNotFound();
        return;
    }

    const title = $("#tutorialTitle");
    const description = $("#tutorialDescription");
    const date = $("#tutorialDate");
    const tags = $("#tutorialTags");

    if (title) {
        title.textContent = tutorial.title;
    }

    if (description) {
        description.textContent = tutorial.description;
    }

    if (date) {
        date.textContent = formatDate(tutorial.date);
    }

    if (tags) {
        tags.innerHTML = (tutorial.tags || [])
            .map(
                (tag) =>
                    `<span class="tag">${escapeHtml(tag)}</span>`
            )
            .join("");
    }

    renderTutorialVideo(tutorial.video);
}


function showTutorialNotFound() {
    const title = $("#tutorialTitle");
    const description = $("#tutorialDescription");

    if (title) {
        title.textContent = "Tutorial not found";
    }

    if (description) {
        description.textContent =
            "This tutorial could not be found in tutorials.json.";
    }
}


/* =========================================================
   VIDEO
   ========================================================= */

function renderTutorialVideo(videoUrl) {
    const frame = $("#videoFrame");

    if (!frame) {
        return;
    }

    const videoId = getYoutubeVideoId(videoUrl);

    if (!videoId) {
        frame.innerHTML = `
      <div class="video-placeholder">
        Tutorial in progress! Please check back soon.
      </div>
    `;

        return;
    }

    const iframe = document.createElement("iframe");

    iframe.src =
        `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;

    iframe.title = "YouTube tutorial video";

    iframe.loading = "lazy";

    iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

    iframe.allowFullscreen = true;

    frame.innerHTML = "";
    frame.appendChild(iframe);
}


function getYoutubeVideoId(url) {
    if (!url || typeof url !== "string") {
        return null;
    }

    try {
        const parsed = new URL(url);

        const hostname =
            parsed.hostname.replace(/^www\./, "").toLowerCase();

        if (hostname === "youtu.be") {
            return parsed.pathname
                .replace("/", "")
                .split("/")[0];
        }

        if (
            hostname === "youtube.com" ||
            hostname === "m.youtube.com"
        ) {
            if (parsed.pathname === "/watch") {
                return parsed.searchParams.get("v");
            }

            if (parsed.pathname.startsWith("/shorts/")) {
                return parsed.pathname.split("/")[2];
            }

            if (parsed.pathname.startsWith("/embed/")) {
                return parsed.pathname.split("/")[2];
            }
        }

    } catch {
        return null;
    }

    return null;
}


/* =========================================================
   SEARCH / SORT
   ========================================================= */

function setupTutorialControls() {
    const searchInput = $("#searchInput");
    const sortSelect = $("#sortSelect");

    if (searchInput) {
        searchInput.addEventListener("input", renderTutorials);
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", renderTutorials);
    }

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "/" &&
            document.activeElement !== searchInput
        ) {
            event.preventDefault();

            searchInput?.focus();
        }
    });
}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(dateString) {
    if (!dateString) {
        return "unknown";
    }

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


/* =========================================================
   COPY BUTTONS
   ========================================================= */

function setupCopyButtons() {
    document.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-copy-target]");

        if (!button) {
            return;
        }

        const targetId = button.dataset.copyTarget;
        const target = document.getElementById(targetId);

        if (!target) {
            return;
        }

        const value =
            target.textContent.trim();

        try {
            await navigator.clipboard.writeText(value);

            button.textContent = "Copied!";
            button.classList.add("copied");

            setTimeout(() => {
                button.textContent = "Copy";
                button.classList.remove("copied");
            }, 1500);

        } catch (error) {
            console.error("Copy failed:", error);

            button.textContent = "Failed";

            setTimeout(() => {
                button.textContent = "Copy";
            }, 1500);
        }
    });
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    setupBrand();
    loadYoutubeData();
    loadTutorials();
    setupCopyButtons();
});