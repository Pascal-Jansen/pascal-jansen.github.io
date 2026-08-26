const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector("#site-nav");

// "lqip-enabled" is set by an inline <head> script so images never paint
// at full opacity and then snap to hidden. Kept out of this file deliberately.

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(open));
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      nav.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}

const newsScrollPanel = document.querySelector(".news-scroll-panel");

if (newsScrollPanel) {
  let scrollHintTimer = 0;

  const syncNewsScrollHint = () => {
    const atEnd =
      newsScrollPanel.scrollTop + newsScrollPanel.clientHeight >=
      newsScrollPanel.scrollHeight - 4;
    newsScrollPanel.classList.toggle("is-at-end", atEnd);
  };

  newsScrollPanel.addEventListener(
    "scroll",
    () => {
      newsScrollPanel.classList.add("is-scrolling");
      syncNewsScrollHint();
      window.clearTimeout(scrollHintTimer);
      scrollHintTimer = window.setTimeout(() => {
        newsScrollPanel.classList.remove("is-scrolling");
        syncNewsScrollHint();
      }, 520);
    },
    { passive: true },
  );

  window.addEventListener("resize", syncNewsScrollHint);
  syncNewsScrollHint();
}

function setAbstractButtonState(button, target, isOpen) {
  if (!button) return;

  button.type = "button";
  button.classList.toggle("is-open", isOpen);
  button.setAttribute("aria-expanded", isOpen ? "true" : "false");

  if (target) {
    button.setAttribute("data-abstract-target", target);
    button.setAttribute("aria-controls", target);
  }

  button.textContent = isOpen ? "Hide abstract" : "Show abstract";
}

function initializePublicationAbstractButtons() {
  document.querySelectorAll("button.abstract-btn").forEach((button) => {
    const inlineHandler = button.getAttribute("onclick") || "";
    const match = inlineHandler.match(/'([^']+)'/);
    const target = match ? match[1] : button.getAttribute("data-abstract-target");
    const abstract = target ? document.getElementById(target) : null;
    const isOpen =
      !!abstract && window.getComputedStyle(abstract).display !== "none";

    setAbstractButtonState(button, target, isOpen);

    if (abstract) {
      abstract.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }
  });
}

function toggleAbstract(button, target) {
  const abstract = document.getElementById(target);
  if (!abstract) return;

  const opening = window.getComputedStyle(abstract).display === "none";
  abstract.style.display = opening ? "block" : "none";
  abstract.setAttribute("aria-hidden", opening ? "false" : "true");
  setAbstractButtonState(button, target, opening);
}

window.toggleAbstract = toggleAbstract;

function getBoundedVideoTime(video, preferredTime) {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return preferredTime;
  }

  return Math.min(preferredTime, Math.max(0, video.duration - 0.25));
}

function cleanupPendingVideoStart(video) {
  if (!video) return;

  if (typeof video._pendingStartSeekedHandler === "function") {
    video.removeEventListener("seeked", video._pendingStartSeekedHandler);
    video._pendingStartSeekedHandler = null;
  }

  if (typeof video._pendingStartLoadedDataHandler === "function") {
    video.removeEventListener("loadeddata", video._pendingStartLoadedDataHandler);
    video._pendingStartLoadedDataHandler = null;
  }

  if (typeof video._pendingStartCanPlayHandler === "function") {
    video.removeEventListener("canplay", video._pendingStartCanPlayHandler);
    video._pendingStartCanPlayHandler = null;
  }

  if (typeof video._pendingStartMetadataHandler === "function") {
    video.removeEventListener(
      "loadedmetadata",
      video._pendingStartMetadataHandler,
    );
    video._pendingStartMetadataHandler = null;
  }
}

function invalidatePendingVideoStart(video) {
  if (!video) return;
  cleanupPendingVideoStart(video);
  video._pendingStartRequestId = (video._pendingStartRequestId || 0) + 1;
}

function prepareVideoAtTime(video, preferredTime, onReady) {
  if (!video || typeof onReady !== "function") return;

  invalidatePendingVideoStart(video);
  const requestId = video._pendingStartRequestId;

  const finish = () => {
    if (video._pendingStartRequestId !== requestId) return;
    cleanupPendingVideoStart(video);
    window.requestAnimationFrame(() => {
      if (video._pendingStartRequestId !== requestId) return;
      onReady();
    });
  };

  const seekToPreparedFrame = () => {
    if (video._pendingStartRequestId !== requestId) return;

    const boundedTime = getBoundedVideoTime(video, preferredTime);
    const finishWhenFrameReady = () => {
      if (video._pendingStartRequestId !== requestId) return;
      if (video.readyState >= 2) {
        finish();
        return;
      }

      const handleLoadedFrame = () => {
        if (video._pendingStartRequestId !== requestId) return;
        finish();
      };

      video._pendingStartLoadedDataHandler = handleLoadedFrame;
      video._pendingStartCanPlayHandler = handleLoadedFrame;
      video.addEventListener("loadeddata", handleLoadedFrame, { once: true });
      video.addEventListener("canplay", handleLoadedFrame, { once: true });
    };

    const settleIfCurrent = () => {
      if (video._pendingStartRequestId !== requestId) return;
      const timeDelta = Math.abs(video.currentTime - boundedTime);
      if (timeDelta > 0.06 && Number.isFinite(video.duration)) return;
      finishWhenFrameReady();
    };

    video._pendingStartSeekedHandler = settleIfCurrent;
    video.addEventListener("seeked", settleIfCurrent, { once: true });

    try {
      video.currentTime = boundedTime;
    } catch (error) {
      finish();
      return;
    }

    if (video.readyState >= 2 && Math.abs(video.currentTime - boundedTime) <= 0.06) {
      finishWhenFrameReady();
    }
  };

  if (video.readyState >= 2) {
    seekToPreparedFrame();
    return;
  }

  const handleMetadata = () => {
    if (video._pendingStartRequestId !== requestId) return;
    video._pendingStartMetadataHandler = null;
    seekToPreparedFrame();
  };

  video._pendingStartMetadataHandler = handleMetadata;
  video.addEventListener("loadedmetadata", handleMetadata, { once: true });
  video.preload = "auto";

  try {
    video.load();
  } catch (error) {
    // Ignore load errors for preview videos.
  }
}

function initializePublicationVideoPreviews() {
  document.querySelectorAll(".publication-entry").forEach((entry) => {
    const video = entry.querySelector(".pub-video");
    if (!video) return;

    const startTime = parseFloat(video.dataset.start) || 0;
    let hoverRequestId = 0;

    const playFromCurrentPosition = () => {
      const promise = video.play();
      if (promise && promise.catch) {
        promise.catch(() => {
          // Ignore autoplay errors.
        });
      }
    };

    entry.addEventListener("mouseenter", () => {
      hoverRequestId += 1;
      const requestId = hoverRequestId;
      video.style.opacity = "0";

      prepareVideoAtTime(video, startTime, () => {
        if (requestId !== hoverRequestId) return;
        video.style.opacity = "1";
        playFromCurrentPosition();
      });
    });

    entry.addEventListener("mouseleave", () => {
      hoverRequestId += 1;
      invalidatePendingVideoStart(video);
      video.pause();

      try {
        video.currentTime = startTime;
      } catch (error) {
        // Ignore invalid seek errors before metadata is loaded.
      }

      video.style.opacity = "0";
    });
  });
}

function initializeLqipImages() {
  document.querySelectorAll("img[data-lqip]").forEach((image) => {
    const markLoaded = () => {
      image.classList.add("is-loaded");
    };

    const decodeThenMarkLoaded = () => {
      if (typeof image.decode !== "function") {
        markLoaded();
        return;
      }

      image.decode().then(markLoaded).catch(markLoaded);
    };

    if (image.complete && image.naturalWidth > 0) {
      // Already cached: reveal without the fade, otherwise every repeat visit
      // replays a 240ms fade-in that reads as the page reloading.
      image.classList.add("is-instant");
      markLoaded();
      return;
    }

    image.addEventListener("load", decodeThenMarkLoaded, { once: true });
    image.addEventListener("error", markLoaded, { once: true });
  });
}

function initializeFeaturedVisionVideos() {
  document.querySelectorAll(".featured-vision-card video[data-start]").forEach((video) => {
    const startTime = parseFloat(video.dataset.start);
    if (!Number.isFinite(startTime) || startTime <= 0) return;

    const seekToStart = () => {
      if (video.currentTime >= startTime - 0.2) return;

      try {
        video.currentTime = getBoundedVideoTime(video, startTime);
      } catch (error) {
        // Let native playback continue if seeking is unavailable.
      }
    };

    video.addEventListener(
      "play",
      () => {
        if (video.readyState >= 1) {
          seekToStart();
          return;
        }

        video.addEventListener("loadedmetadata", seekToStart, { once: true });
      },
      { once: true },
    );
  });
}

function initializePublicationFilter() {
  const filter = document.querySelector(".publication-filter");
  if (!filter) return;

  const buttons = Array.from(filter.querySelectorAll("button[data-tag]"));
  const entries = Array.from(document.querySelectorAll(".publication-entry"));
  if (!buttons.length || !entries.length) return;

  const applyTag = (tag, isUserChoice) => {
    entries.forEach((entry) => {
      const tags = (entry.dataset.tags || "").split(/\s+/);
      const isHidden = tag !== "all" && !tags.includes(tag);
      entry.hidden = isHidden;

      // A filtered-in entry must never depend on the scroll reveal to become
      // visible, otherwise it can stay at opacity 0 below the fold.
      if (isUserChoice && !isHidden) entry.classList.add("is-visible");
    });

    buttons.forEach((button) => {
      const isActive = button.dataset.tag === tag;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (!isUserChoice) return;

    const url = new URL(window.location.href);

    if (tag === "all") {
      url.searchParams.delete("tag");
    } else {
      url.searchParams.set("tag", tag);
    }

    window.history.replaceState({}, "", url);
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      applyTag(button.dataset.tag, true);
    });
  });

  const availableTags = buttons.map((button) => button.dataset.tag);
  const requestedTag = new URLSearchParams(window.location.search).get("tag");
  applyTag(availableTags.indexOf(requestedTag) === -1 ? "all" : requestedTag, false);
}

function initializePublicationEntryReveal() {
  const publicationEntries = Array.from(
    document.querySelectorAll(".publication-entry"),
  );
  if (!publicationEntries.length) return;

  publicationEntries.forEach((entry, index) => {
    entry.classList.add("publication-entry-fade");
    entry.style.setProperty(
      "--publication-fade-delay",
      `${Math.min((index % 3) * 20, 40)}ms`,
    );
  });

  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    publicationEntries.forEach((entry) => entry.classList.add("is-visible"));
    return;
  }

  if (!("IntersectionObserver" in window)) {
    publicationEntries.forEach((entry) => entry.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -12% 0px",
    },
  );

  const revealPassedEntries = () => {
    const viewportHeight = window.innerHeight;
    const revealThreshold = Math.round(viewportHeight * 0.9);

    publicationEntries.forEach((entry) => {
      if (entry.classList.contains("is-visible")) return;
      const rect = entry.getBoundingClientRect();
      const inViewport = rect.top < viewportHeight && rect.bottom > 0;
      if (rect.top <= revealThreshold || inViewport) {
        entry.classList.add("is-visible");
        observer.unobserve(entry);
      }
    });
  };

  const scheduleRevealPassedEntries = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(revealPassedEntries);
    });
  };

  publicationEntries.forEach((entry) => observer.observe(entry));
  scheduleRevealPassedEntries();
  window.addEventListener("pageshow", scheduleRevealPassedEntries);
  window.addEventListener("hashchange", scheduleRevealPassedEntries);
  window.addEventListener("resize", scheduleRevealPassedEntries, {
    passive: true,
  });
}

function scrollHashTargetIntoView() {
  if (!window.location.hash) return;

  let targetId = window.location.hash.slice(1);
  if (!targetId) return;

  try {
    targetId = decodeURIComponent(targetId);
  } catch (error) {
    // Keep the raw hash if it is not URI-encoded cleanly.
  }

  const target = document.getElementById(targetId);
  if (!target) return;

  window.requestAnimationFrame(() => {
    target.scrollIntoView({ block: "start" });
  });
}

initializePublicationAbstractButtons();
initializePublicationVideoPreviews();
initializeLqipImages();
// Local double-click preview. GitHub Pages resolves /research to research.html,
// but a file:// page has no server to do that, so internal links are rewritten
// back to their .html form. No-op over http(s), where the clean URLs are real.
function enableFileProtocolLinks() {
  if (window.location.protocol !== "file:") return;
  document.querySelectorAll('a[href^="/"]').forEach((link) => {
    const href = link.getAttribute("href");
    if (href.startsWith("//")) return;
    const hashAt = href.indexOf("#");
    const path = hashAt > -1 ? href.slice(0, hashAt) : href;
    const hash = hashAt > -1 ? href.slice(hashAt) : "";
    const page = path === "/" ? "index" : path.slice(1);
    link.setAttribute("href", `${page}.html${hash}`);
  });
}

enableFileProtocolLinks();
initializeFeaturedVisionVideos();
initializePublicationEntryReveal();
initializePublicationFilter();
scrollHashTargetIntoView();
window.addEventListener("hashchange", scrollHashTargetIntoView);
