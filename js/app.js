/**
 * Valentine page (no sound):
 * - NO: dog runs to the NO button, grabs it (button docks to snout),
 *       carries it to a new position, drops it, stays next to it.
 * - YES: pops hearts + popup
 *
 * Required DOM ids:
 *   #btnNo, #btnYes, #fxLayer (optional), #dog (wrapper), inside dog: .snout
 */

const btnNo = document.getElementById("btnNo");
const btnYes = document.getElementById("btnYes");
const fxLayer = document.getElementById("fxLayer"); // optional (hearts use body anyway)
const dog = document.getElementById("dog");

// ---- config ----
const CONFIG = {
  yesPopupText: "Yessss 💖",
  carryDurationMs: 620,   // movement time for carrying
  grabDurationMs: 220,    // little snap into mouth
  settleDurationMs: 280,  // drop + settle
  dogOffsetX: -140,       // dog stands a bit left of the button
  dogOffsetY: -70,        // and slightly above
  minEdgePadding: 16,
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function viewport() { return { w: window.innerWidth, h: window.innerHeight }; }

function rect(el){
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height, cx: r.left + r.width/2, cy: r.top + r.height/2 };
}

/** Find a new position for the NO button that stays on screen */
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

/** Ensure dog is positioned with fixed left/top (not transform translate chaos) */
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

/** Dock the NO button to dog's snout so it looks "in mouth" */
function dockButtonToSnout() {
  if (!dog || !btnNo) return null;
  const snout = dog.querySelector(".snout");
  if (!snout) return null;

  const s = rect(snout);
  const b = rect(btnNo);

  // target: center of button to snout center, slightly lower so it's "bitten"
  const targetLeft = s.cx - b.width * 0.55;
  const targetTop  = s.cy - b.height * 0.55;

  // make button fixed so we can animate precisely
  btnNo.style.position = "fixed";
  btnNo.style.margin = "0";
  btnNo.style.left = `${b.left}px`;
  btnNo.style.top  = `${b.top}px`;

  // set on top of dog
  btnNo.style.zIndex = "120";
  btnNo.classList.add("grabbed");

  return { targetLeft, targetTop };
}

/** Animate helper using WAAPI if possible */
function animateTo(el, keyframes, options) {
  if (!el) return Promise.resolve();
  try {
    const anim = el.animate(keyframes, options);
    return anim.finished.catch(() => {});
  } catch {
    // fallback: jump
    const last = keyframes[keyframes.length - 1];
    for (const [k, v] of Object.entries(last)) {
      el.style[k] = v;
    }
    return Promise.resolve();
  }
}

let busy = false;

async function dogStealsNo() {
  if (busy || !btnNo || !dog) return;
  busy = true;

  // step A: move dog near current NO button
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

  // step B: grab (dock button into snout)
  setDogState("grab");
  const dock = dockButtonToSnout();
  if (dock) {
    await animateTo(btnNo,
      [
        { left: `${b0.left}px`, top: `${b0.top}px`, transform: "scale(1)" },
        { left: `${dock.targetLeft}px`, top: `${dock.targetTop}px`, transform: "scale(0.98)" }
      ],
      { duration: CONFIG.grabDurationMs, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );
  }

  // step C: pick a new position for NO
  const pos = findNewButtonPosition(btnNo);

  // move dog to new location (button stays "attached" by updating relative offsets)
  const dogX1 = clamp(pos.left + CONFIG.dogOffsetX, 8, viewport().w - 120);
  const dogY1 = clamp(pos.top + CONFIG.dogOffsetY, 8, viewport().h - 120);

  setDogState("running");

  // Animate dog
  const dogMove = animateTo(dog,
    [
      { left: `${dogX0}px`, top: `${dogY0}px` },
      { left: `${dogX1}px`, top: `${dogY1}px` }
    ],
    { duration: CONFIG.carryDurationMs, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
  );

  // While dog moves, also update button to stay near snout (simple: animate to future snout dock)
  const snout = dog.querySelector(".snout");
  let btnMove = Promise.resolve();
  if (snout) {
    // estimate where snout will be after move using current snout offset inside dog
    const sNow = rect(snout);
    const dogNow = rect(dog);
    const snoutOffsetX = sNow.cx - dogNow.left;
    const snoutOffsetY = sNow.cy - dogNow.top;

    // where snout center will be at destination:
    const snoutDestCx = dogX1 + snoutOffsetX;
    const snoutDestCy = dogY1 + snoutOffsetY;

    const bNow = rect(btnNo);
    const btnDestLeft = snoutDestCx - bNow.width * 0.55;
    const btnDestTop  = snoutDestCy - bNow.height * 0.55;

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

  // step D: drop NO at its new position, dog stays near it
  setDogState("grab");
  const bAfterCarry = rect(btnNo);

  await animateTo(btnNo,
    [
      { left: `${bAfterCarry.left}px`, top: `${bAfterCarry.top}px`, transform: "scale(0.98)" },
      { left: `${pos.left}px`, top: `${pos.top}px`, transform: "scale(1)" }
    ],
    { duration: CONFIG.settleDurationMs, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
  );

  // ensure final stable positions
  btnNo.style.left = `${pos.left}px`;
  btnNo.style.top  = `${pos.top}px`;

  // restore button clickability and stacking
  btnNo.classList.remove("grabbed");
  btnNo.style.zIndex = "";

  // keep dog next to the button (idle)
  setDogState("idle");
  busy = false;
}

/* Hook NO interactions */
if (btnNo) {
  // Mobile tap / click
  btnNo.addEventListener("click", (e) => {
    e.preventDefault();
    dogStealsNo();
  });

  // Desktop hover = also steal, optional:
  btnNo.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") dogStealsNo();
  });

  // Keyboard focus
  btnNo.addEventListener("focus", () => dogStealsNo());
}

/* YES button */
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

/* initial dog placement (bottom-left-ish) */
(function initDog() {
  if (!dog) return;
  // If CSS already positions it, don't override too aggressively:
  if (!dog.style.left && !dog.style.top) {
    placeDogAt(18, 18);
  }
  setDogState("idle");
})();
