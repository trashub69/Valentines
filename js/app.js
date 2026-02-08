/**
// Während der Hund rausläuft, ziehen wir den Button per requestAnimationFrame hinterher
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


// Button "verschwindet" kurz, dann taucht woanders wieder auf
btnNo.style.opacity = "0";
dog.classList.remove("running");
dog.classList.remove("grab");


// Neu positionieren
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


// Hund zurück in die Ecke
dog.classList.add("returning");
await animateTo(dog, 18, 18, CONFIG.returnDurationMs, "cubic-bezier(.2,.8,.2,1)");
dog.classList.remove("returning");


carrying = false;
}


// "Nein" Event: click + touch
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


// "Ja" Event
if (btnYes) {
btnYes.addEventListener("click", () => {
popHearts(btnYes);
window.setTimeout(() => alert(CONFIG.yesPopupText), 60);
});
}


// Initial dog placement (top-left)
if (dog) {
setDogXY(18, 18);
}
