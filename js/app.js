/**
 * Valentine page (no sound):
 * - NO: dog runs to the NO button, grabs it (button docks into snout),
 *       carries it to a new position, drops it, stays next to it.
 * - YES: pops hearts + popup
 *
 * Required DOM ids:
 *   #btnNo, #btnYes, #dog (wrapper), inside dog: .snout
 */

const btnNo = document.getElementById("btnNo");
const btnYes = document.getElementById("btnYes");
const dog = document.getElementById("dog");

// ---- config ----
const CONFIG = {
  yesPopupText: "Yessss 💖",

  carryDurationMs: 620,
  grabDurationMs: 220,
  settleDurationMs: 280,

  dogOffsetX: -140,
  dogOffsetY: -70,

  // bite tuning
  biteX: 0.62,
  biteY: 0.55,
  biteNudgeX: 0,
  biteNudgeY: 2,

  minEdgePadding: 16,
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function viewport() { return { w: window.innerWidth, h: window.innerHeight }; }

function rect(el){
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height, cx: r.left + r.width/2, cy: r.top + r.height/2 };
}

function findNewButtonPosition(btn) {
  const { w, h } = viewport();
  const r = btn.getBoundingClientRect();

  const pad = CONFIG.minEdgePadding;
  const maxX = w - r.width - pad;
  const maxY = h - r.height - pad;

  const centerAvoid = { x: w / 2, y: h / 2 };
  const avoidRadius = Math.min(w, h) * 0.18;

  let x = pad, y = pad;
  for (let tries = 0; tries < 40; tries++) {
    x = rand(pad, Math.max(pad, maxX));
    y = rand(pad, Math.max(pad, maxY));
    const cx = x + r.width / 2;
    const cy = y + r.height / 2;
    if (Math.hypot(cx - centerAvoid.x, cy - centerAvoid.y) > avoidRadius) break;
  }
  return { left: x, top: y };
}

function placeDogAt(x, y) {
  if (!dog) return;
  dog.style.position = "fixed";
  dog.style.left = `${x}px`;
  dog.style.top = `${y}px`;
}

function setDogState(state) {
  if (!dog) return;
  dog.classList.toggle("running", state === "running");
  dog.classList.toggle("grab", state === "grab");
  dog.classList.toggle("idle", state === "idle");
}

function animateTo(el, keyframes, options) {
  if (!el) return Promise.resolve();
  try {
    const anim = el.animate(keyframes, options);
    return anim.finished.catch(() => {});
  } catch {
    const last = keyframes[keyframes.length - 1];
    for (const [k, v] of Object.entries(last)) el.style[k] = v;
    return Promise.resolve();
  }
}

function dockButtonToSnout() {
  if (!dog || !btnNo) return null;
  const snout = dog.querySelector(".snout");
  if (!snout) return null;

  const s = rect(snout);
  const b = rect(btnNo);

  const targetLeft = s.cx - b.width * CONFIG.biteX + CONFIG.biteNudgeX;
  const targetTop  = s.cy - b.height * CONFIG.biteY + CONFIG.biteNudgeY;

  btnNo.style.position = "fixed";
  btnNo.style.margin = "0";
  btnNo.style.left = `${b.left}px`;
  btnNo.style.top  = `${b.top}px`;

  // dog above button so snout can overlap it
  dog.style.zIndex = "300";
  btnNo.style.zIndex = "290";
  btnNo.classList.add("grabbed", "in-mouth");

  return { targetLeft, targetTop };
}

let busy = false;

async function dogStealsNo() {
  if (busy) return;

  if (!btnNo) return;

  // If dog isn't present, fall back to old dodge behavior (just move the button)
  if (!dog) {
    const pos = findNewButtonPosition(btnNo);
    btnNo.style.position = "fixed";
    btnNo.style.left = `${pos.left}px`;
    btnNo.style.top = `${pos.top}px`;
    return;
  }

  busy = true;
  btnNo.style.pointerEvents = "none"; // ✅ prevents retrigger + "flying"

  try {
    const b0 = rect(btnNo);
    const dogX0 = clamp(b0.left + CONFIG.dogOffsetX, 8, viewport().w - 120);
    const dogY0 = clamp(b0.top + CONFIG.dogOffsetY, 8, viewport().h - 120);

    setDogState("running");
    await animateTo(dog,
      [
        { left: dog.style.left || `${dogX0}px`, top: dog.style.top || `${dogY0}px` },
        { left: `${dogX0}px`, top: `${dogY0}px` }
      ],
      { duration: 360, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );
    placeDogAt(dogX0, dogY0);

    setDogState("grab");
    const dock = dockButtonToSnout();

    if (dock) {
      await animateTo(btnNo,
        [
          { left: `${b0.left}px`, top: `${b0.top}px`, transform: "scale(1) rotate(0deg)" },
          { left: `${dock.targetLeft}px`, top: `${dock.targetTop}px`, transform: "scale(0.98) rotate(-3deg)" }
        ],
        { duration: CONFIG.grabDurationMs, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
      );
    }

    const pos = findNewButtonPosition(btnNo);
    const dogX1 = clamp(pos.left + CONFIG.dogOffsetX, 8, viewport().w - 120);
    const dogY1 = clamp(pos.top + CONFIG.dogOffsetY, 8, viewport().h - 120);

    setDogState("running");

    const dogMove = animateTo(dog,
      [
        { left: `${dogX0}px`, top: `${dogY0}px` },
        { left: `${dogX1}px`, top: `${dogY1}px` }
      ],
      { duration: CONFIG.carryDurationMs, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );

    let btnMove = Promise.resolve();
    const snout = dog.querySelector(".snout");
    if (snout) {
      const sNow = rect(snout);
      const dNow = rect(dog);
      const snoutOffsetX = sNow.cx - dNow.left;
      const snoutOffsetY = sNow.cy - dNow.top;

      const snoutDestCx = dogX1 + snoutOffsetX;
      const snoutDestCy = dogY1 + snoutOffsetY;

      const bNow = rect(btnNo);
      const btnDestLeft = snoutDestCx - bNow.width * CONFIG.biteX + CONFIG.biteNudgeX;
      const btnDestTop  = snoutDestCy - bNow.height * CONFIG.biteY + CONFIG.biteNudgeY;

      btnMove = animateTo(btnNo,
        [
          { left: `${bNow.left}px`, top: `${bNow.top}px` },
          { left: `${btnDestLeft}px`, top: `${btnDestTop}px` }
        ],
        { duration: CONFIG.carryDurationMs, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
      );
    }

    await Promise.all([dogMove, btnMove]);
    placeDogAt(dogX1, dogY1);

    setDogState("grab");
    const bAfterCarry = rect(btnNo);

    await animateTo(btnNo,
      [
        { left: `${bAfterCarry.left}px`, top: `${bAfterCarry.top}px`, transform: "scale(0.98) rotate(-3deg)" },
        { left: `${pos.left}px`, top: `${pos.top}px`, transform: "scale(1) rotate(0deg)" }
      ],
      { duration: CONFIG.settleDurationMs, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );

    btnNo.style.left = `${pos.left}px`;
    btnNo.style.top  = `${pos.top}px`;

    btnNo.classList.remove("grabbed", "in-mouth");
    btnNo.style.zIndex = "";
    dog.style.zIndex = "";

    setDogState("idle");
  } finally {
    // ✅ ALWAYS restore
    btnNo.style.pointerEvents = "";
    busy = false;
  }
}


/* NO interactions */
if (btnNo) {
  // click / tap only (no hover retrigger)
  btnNo.addEventListener("click", (e) => {
    e.preventDefault();
    dogStealsNo();
  });

  // keyboard users
  btnNo.addEventListener("focus", () => dogStealsNo());
}


/* YES */
function popWhiteHearts(fromEl) {
  if (!fromEl) return;
  const r = fromEl.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  const count = 10;
  for (let i = 0; i < count; i++) {
    const h = document.createElement("div");
    h.className = "heart-pop";
    h.textContent = "♡";

    const ang = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 70;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist - (30 + Math.random() * 40);

    h.style.left = `${cx}px`;
    h.style.top = `${cy}px`;
    h.style.setProperty("--dx", `${dx.toFixed(1)}px`);
    h.style.setProperty("--dy", `${dy.toFixed(1)}px`);

    document.body.appendChild(h);
    h.addEventListener("animationend", () => h.remove());
  }
}

if (btnYes) {
  btnYes.addEventListener("click", () => {
    popWhiteHearts(btnYes);
    alert(CONFIG.yesPopupText);
  });
}

/* init */
(function initDog() {
  if (!dog) return;
  if (!dog.style.left && !dog.style.top) placeDogAt(18, 18);
  setDogState("idle");
})();
