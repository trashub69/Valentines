/**
 * Valentine page (no sound):
 * - NO: dog runs to NO, grabs it (button becomes a child of a "mouth slot"),
 *       carries it to a new position, drops it, stays near it.
 * - YES: hearts + popup
 *
 * Required:
 *   #btnNo, #btnYes, #dog wrapper, inside dog: .snout
 */

const btnNo = document.getElementById("btnNo");
const btnYes = document.getElementById("btnYes");
const dog = document.getElementById("dog");

const CONFIG = {
  yesPopupText: "Yessss 💖",

  // timings
  runToBtnMs: 360,
  grabMs: 220,
  carryMs: 620,
  dropMs: 280,

  // where dog stands relative to NO when idle next to it
  dogOffsetX: -140,
  dogOffsetY: -70,

  // drop padding from screen edges
  pad: 16,

  // mouth position tweak (inside slot)
  mouthNudgeX: 6,
  mouthNudgeY: 6,
};

function vp() {
  // stable viewport size on mobile
  const w = document.documentElement.clientWidth;
  const h = document.documentElement.clientHeight;
  return { w, h };
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function rect(el) {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
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

function setDogState(state) {
  if (!dog) return;
  dog.classList.toggle("running", state === "running");
  dog.classList.toggle("grab", state === "grab");
  dog.classList.toggle("idle", state === "idle");
}

function placeDogAt(x, y) {
  if (!dog) return;
  dog.style.left = `${x}px`;
  dog.style.top = `${y}px`;
}

/** Find a good new NO position */
function findNewButtonPosition(btn) {
  const { w, h } = vp();
  const r = btn.getBoundingClientRect();

  const pad = CONFIG.pad;
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

/** Ensure dog stays on screen (uses actual scaled rect size) */
function clampDogToScreen(x, y) {
  const { w, h } = vp();
  const dr = dog.getBoundingClientRect();
  const maxX = w - dr.width - 8;
  const maxY = h - dr.height - 8;
  return {
    x: clamp(x, 8, Math.max(8, maxX)),
    y: clamp(y, 8, Math.max(8, maxY)),
  };
}

/** Create (or reuse) a mouth slot positioned on the snout */
function getMouthSlot() {
  const snout = dog?.querySelector(".snout");
  if (!snout) return null;

  let slot = dog.querySelector(".mouth-slot");
  if (!slot) {
    slot = document.createElement("div");
    slot.className = "mouth-slot";
    dog.appendChild(slot);
  }

  // Position slot relative to dog, based on current snout rect.
  const d = rect(dog);
  const s = rect(snout);

  const left = (s.cx - d.left) + CONFIG.mouthNudgeX;
  const top  = (s.cy - d.top) + CONFIG.mouthNudgeY;

  slot.style.left = `${left}px`;
  slot.style.top  = `${top}px`;

  return slot;
}

/** Move button into dog mouth (re-parent) */
function grabButtonIntoMouth() {
  const slot = getMouthSlot();
  if (!slot) return false;

  // keep visual size stable
  const b = rect(btnNo);

  // Move button into slot
  slot.appendChild(btnNo);

  // Now button is positioned relative to slot
  btnNo.style.position = "absolute";
  btnNo.style.left = "0px";
  btnNo.style.top = "0px";

  btnNo.classList.add("grabbed", "in-mouth");
  return true;
}

/** Drop button back to body and fix its screen coords */
function dropButtonToScreen(left, top) {
  // move back to body
  document.body.appendChild(btnNo);

  btnNo.style.position = "fixed";
  btnNo.style.left = `${left}px`;
  btnNo.style.top = `${top}px`;
  btnNo.style.width = ""; // back to CSS control
  btnNo.classList.remove("grabbed", "in-mouth");
}

let busy = false;

async function dogStealsNo() {
  if (busy) return;
  if (!btnNo) return;

  // Fallback if dog missing
  if (!dog) {
    const pos = findNewButtonPosition(btnNo);
    btnNo.style.position = "fixed";
    btnNo.style.left = `${pos.left}px`;
    btnNo.style.top = `${pos.top}px`;
    return;
  }

  busy = true;
  btnNo.style.pointerEvents = "none";

  try {
    const b0 = rect(btnNo);

    // 1) Run dog near button
    setDogState("running");

    const targetDogX0 = b0.left + CONFIG.dogOffsetX;
    const targetDogY0 = b0.top + CONFIG.dogOffsetY;

    const clamped0 = clampDogToScreen(targetDogX0, targetDogY0);

    await animateTo(dog,
      [
        { left: dog.style.left || `${clamped0.x}px`, top: dog.style.top || `${clamped0.y}px` },
        { left: `${clamped0.x}px`, top: `${clamped0.y}px` }
      ],
      { duration: CONFIG.runToBtnMs, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );
    placeDogAt(clamped0.x, clamped0.y);

    // 2) Grab into mouth (re-parent)
    setDogState("grab");

    // Convert button to fixed before reparent so its last position is stable for the grab animation
    btnNo.style.position = "fixed";
    btnNo.style.left = `${b0.left}px`;
    btnNo.style.top = `${b0.top}px`;

    // Animate it toward mouth slot (screen coords) first, then reparent
    const slot = getMouthSlot();
    if (slot) {
      const slotRect = rect(slot);
      await animateTo(btnNo,
        [
          { left: `${b0.left}px`, top: `${b0.top}px`, transform: "scale(1) rotate(0deg)" },
          { left: `${slotRect.left}px`, top: `${slotRect.top}px`, transform: "scale(0.98) rotate(-3deg)" }
        ],
        { duration: CONFIG.grabMs, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
      );
    }

    // Now attach for perfect carry
    const grabbed = grabButtonIntoMouth();

    // 3) Choose new spot + carry dog there (button follows automatically)
    const pos = findNewButtonPosition(btnNo);
    const targetDogX1 = pos.left + CONFIG.dogOffsetX;
    const targetDogY1 = pos.top + CONFIG.dogOffsetY;
    const clamped1 = clampDogToScreen(targetDogX1, targetDogY1);

    setDogState("running");
    await animateTo(dog,
      [
        { left: `${clamped0.x}px`, top: `${clamped0.y}px` },
        { left: `${clamped1.x}px`, top: `${clamped1.y}px` }
      ],
      { duration: CONFIG.carryMs, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );
    placeDogAt(clamped1.x, clamped1.y);

    // keep mouth slot positioned correctly after movement (important if dog scale/viewport changed)
    getMouthSlot();

    // 4) Drop at new position
    setDogState("grab");

    // If we didn't manage to grab (missing snout), just teleport button
    if (!grabbed) {
      btnNo.style.position = "fixed";
      btnNo.style.left = `${pos.left}px`;
      btnNo.style.top = `${pos.top}px`;
    } else {
      // Drop with a tiny animation from mouth to final spot
      const mouthNow = rect(dog.querySelector(".mouth-slot"));
      // first put it back on screen at mouth coords
      document.body.appendChild(btnNo);
      btnNo.style.position = "fixed";
      btnNo.style.left = `${mouthNow.left}px`;
      btnNo.style.top = `${mouthNow.top}px`;
      btnNo.classList.add("grabbed", "in-mouth");

      await animateTo(btnNo,
        [
          { left: `${mouthNow.left}px`, top: `${mouthNow.top}px`, transform: "scale(0.98) rotate(-3deg)" },
          { left: `${pos.left}px`, top: `${pos.top}px`, transform: "scale(1) rotate(0deg)" }
        ],
        { duration: CONFIG.dropMs, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
      );

      dropButtonToScreen(pos.left, pos.top);
    }

    setDogState("idle");
  } finally {
    btnNo.style.pointerEvents = "";
    busy = false;
  }
}

/* NO interactions: click + focus only (NO hover chaos) */
if (btnNo) {
  btnNo.addEventListener("click", (e) => {
    e.preventDefault();
    dogStealsNo();
  });
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

/* init dog */
(function initDog() {
  if (!dog) return;
  if (!dog.style.left && !dog.style.top) placeDogAt(18, 18);
  setDogState("idle");
})();
