
const btnNo = document.getElementById("btnNo");
const btnYes = document.getElementById("btnYes");
const dog = document.getElementById("dog");

const CONFIG = {
  yesPopupText: "Yessss 💖",
  carryDurationMs: 850,
  runToDurationMs: 420,
  returnDurationMs: 520,
  offscreenPadding: 140,
  appearDelayMs: 240,
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function viewport() { return { w: window.innerWidth, h: window.innerHeight }; }

function rectCenter(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}

function setDogXY(x, y) {
  dog.style.left = `${x}px`;
  dog.style.top = `${y}px`;
}

/**
 * Animiert das Element per Web Animations API zu einer Zielposition.
 * Danach "committen" wir die Position in left/top und resetten transform.
 */
function animateTo(el, toLeft, toTop, duration, easing = "cubic-bezier(.2,.9,.2,1)") {
  const from = el.getBoundingClientRect();
  const fromLeft = from.left;
  const fromTop = from.top;

  const dx = toLeft - fromLeft;
  const dy = toTop - fromTop;

  const anim = el.animate(
    [
      { transform: `translate(0px, 0px)` },
      { transform: `translate(${dx}px, ${dy}px)` },
    ],
    { duration, easing, fill: "forwards" }
  );

  return anim.finished.then(() => {
    // cancel only animations on the dog element, then commit final position
    el.getAnimations().forEach(a => a.cancel());
    setDogXY(toLeft, toTop);
    el.style.transform = "none";
  });
}

function findNewButtonPosition(btn) {
  const { w, h } = viewport();
  const r = btn.getBoundingClientRect();

  const pad = 16;
  const maxX = w - r.width - pad;
  const maxY = h - r.height - pad;

  const centerAvoid = { x: w / 2, y: h / 2 };
  const avoidRadius = Math.min(w, h) * 0.22;

  let x = pad, y = pad;
  for (let tries = 0; tries < 30; tries++) {
    x = rand(pad, Math.max(pad, maxX));
    y = rand(pad, Math.max(pad, maxY));
    const cx = x + r.width / 2;
    const cy = y + r.height / 2;
    if (Math.hypot(cx - centerAvoid.x, cy - centerAvoid.y) > avoidRadius) break;
  }
  return { left: x, top: y };
}

function popHearts(fromEl) {
  if (!fromEl) return;

  const r = fromEl.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  const count = 10;
  for (let i = 0; i < count; i++) {
    const h = document.createElement("div");
    h.className = "heart-pop";
    h.textContent = Math.random() < 0.5 ? "♡" : "❤";

    const ang = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 80;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist - (40 + Math.random() * 50);

    h.style.left = `${cx}px`;
    h.style.top = `${cy}px`;
    h.style.setProperty("--dx", `${dx.toFixed(1)}px`);
    h.style.setProperty("--dy", `${dy.toFixed(1)}px`);

    document.body.appendChild(h);
    h.addEventListener("animationend", () => h.remove());
  }
}

let carrying = false;

async function dogCarryNo() {
  if (!btnNo || !dog || carrying) return;
  carrying = true;

  // freeze button position
  const rBtn = btnNo.getBoundingClientRect();
  btnNo.style.position = "fixed";
  btnNo.style.left = `${rBtn.left}px`;
  btnNo.style.top = `${rBtn.top}px`;

  btnNo.classList.add("targeted");
  btnNo.disabled = true;

  // dog runs to button
  dog.classList.add("running");
  const to = rectCenter(btnNo);
  const dogRect = dog.getBoundingClientRect();

  const targetLeft = clamp(to.x - dogRect.width * 0.65, 8, viewport().w - dogRect.width - 8);
  const targetTop  = clamp(to.y - dogRect.height * 0.55, 8, viewport().h - dogRect.height - 8);

  await animateTo(dog, targetLeft, targetTop, CONFIG.runToDurationMs);

  // grab!
  dog.classList.remove("running");
  dog.classList.add("grab");
  btnNo.classList.add("grabbed");
  btnNo.style.transition = "transform 120ms ease, opacity 120ms ease";
  btnNo.style.transform = "scale(0.96) rotate(-3deg)";

  // carry offscreen
  const { w, h } = viewport();
  const offX = w + CONFIG.offscreenPadding;
  const offY = clamp(rand(h * 0.15, h * 0.75), 16, h - 16);

  // follow dog with button while carrying
  const dogStart = dog.getBoundingClientRect();
  const btnOffsetX = rBtn.left - dogStart.left + 18;
  const btnOffsetY = rBtn.top - dogStart.top + 28;

  let raf = 0;
  const follow = () => {
    const dr = dog.getBoundingClientRect();
    btnNo.style.left = `${dr.left + btnOffsetX}px`;
    btnNo.style.top = `${dr.top + btnOffsetY}px`;
    raf = requestAnimationFrame(follow);
  };
  raf = requestAnimationFrame(follow);

  dog.classList.add("running");
  await animateTo(dog, offX, offY, CONFIG.carryDurationMs);

  cancelAnimationFrame(raf);

  // button disappears, then respawns elsewhere
  btnNo.style.opacity = "0";
  dog.classList.remove("running");
  dog.classList.remove("grab");

  const pos = findNewButtonPosition(btnNo);
  btnNo.style.left = `${pos.left}px`;
  btnNo.style.top = `${pos.top}px`;
  btnNo.style.transform = "none";

  window.setTimeout(() => {
    btnNo.style.opacity = "1";
    btnNo.classList.remove("grabbed");
    btnNo.classList.remove("targeted");
    btnNo.disabled = false;
  }, CONFIG.appearDelayMs);

  // dog returns to corner
  dog.classList.add("returning");
  await animateTo(dog, 18, 18, CONFIG.returnDurationMs, "cubic-bezier(.2,.8,.2,1)");
  dog.classList.remove("returning");

  carrying = false;
}

// no button: click + touch
if (btnNo) {
  btnNo.addEventListener("click", (e) => {
    e.preventDefault();
    dogCarryNo();
  });

  btnNo.addEventListener("touchstart", (e) => {
    e.preventDefault();
    dogCarryNo();
  }, { passive: false });
}

// yes button
if (btnYes) {
  btnYes.addEventListener("click", () => {
    popHearts(btnYes);
    window.setTimeout(() => alert(CONFIG.yesPopupText), 60);
  });
}

// initial placement
if (dog) setDogXY(18, 18);
