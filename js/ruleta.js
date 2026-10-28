import { OPCIONES } from "./ruleta-opciones.js";

const NS = "http://www.w3.org/2000/svg";
const COLORES = {
  menta: { fondo: "#14d4c0", tinta: "#0f2c66" },
  cielo: { fondo: "#d6eefb", tinta: "#0f2c66" },
  crema: { fondo: "#fffff2", tinta: "#0f2c66" },
  azul: { fondo: "#5983b3", tinta: "#fffff2" },
};
const CICLO = ["menta", "cielo", "azul", "menta", "crema"];
const ICONOS = ["bombilla", "grafica", "codigo", "megafono", "camara"];

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wheel = document.querySelector("#wheel");
const rotator = document.querySelector("#rotator");
const wheelHit = document.querySelector("#wheel-hit");
const hub = document.querySelector("#hub");
const btnSpin = document.querySelector("#btn-spin");
const statusEl = document.querySelector("#status");
const result = document.querySelector("#result");
const resultCard = document.querySelector("#result-card");
const resultBadge = document.querySelector("#result-badge");
const resultName = document.querySelector("#result-name");
const resultDetail = document.querySelector("#result-detail");
const countdownEl = document.querySelector("#countdown");
const btnNext = document.querySelector("#btn-next");
const btnMute = document.querySelector("#btn-mute");
const btnFull = document.querySelector("#btn-full");

let opciones = [];
let resetSeconds = 22;

function usable(list) {
  return (Array.isArray(list) ? list : []).filter((item) => {
    if (!item) return false;
    const peso = Number(item.peso);
    const off = item.activa === false || item.activa === 0 || item.activa === "0";
    if (off) return false;
    if (item.peso != null && item.peso !== "" && Number.isFinite(peso) && peso <= 0) return false;
    return String(item.nombre || item.rueda || "").trim().length > 0;
  });
}

function setText(id, value) {
  if (value == null || String(value).trim() === "") return;
  const node = document.getElementById(id);
  if (node) node.textContent = String(value);
}

const TEXTOS_BASE = {
  encabezado: "HUB CHALLENGE",
  titulo1: "GIRA",
  titulo2: "LA RULETA",
  frase: "Una persona, un reto. La ruleta elige la línea del Hub.",
  paso1Titulo: "01 / TOCA",
  paso1Texto: "Cada toque sube 1 la velocidad.",
  paso2Titulo: "02 / TU LÍNEA",
  paso2Texto: "Mira dónde se detiene.",
  paso3Titulo: "03 / EL RETO",
  paso3Texto: "Ve a ese mini stand y haz la actividad.",
  etiquetaResultado: "TU LÍNEA",
  mensajeResultado: "Ve al mini stand y completa el reto.",
  botonSiguiente: "SIGUIENTE PERSONA",
};

function applyTextos(textos) {
  if (textos) textosActuales = textos;
  const data = textos || textosActuales;
  if (!data) return;
  setText("info-eyebrow", data.encabezado);
  setText("info-title-1", data.titulo1);
  setText("info-title-2", data.titulo2);
  setText("info-lede", data.frase);
  setText("paso-1-titulo", data.paso1Titulo);
  setText("paso-1-texto", data.paso1Texto);
  setText("paso-2-titulo", data.paso2Titulo);
  setText("paso-2-texto", data.paso2Texto);
  setText("paso-3-titulo", data.paso3Titulo);
  setText("paso-3-texto", data.paso3Texto);
  setText("result-kicker", data.etiquetaResultado);
  setText("result-go", data.mensajeResultado);
  setText("btn-next", data.botonSiguiente);
  const seconds = Number(data.segundos);
  if (Number.isFinite(seconds) && seconds >= 5 && seconds <= 180) resetSeconds = Math.round(seconds);
}

let rotation = 0;
let rock = 0;
let spinning = false;
let dragging = false;
let resultOpen = false;
let resetTimer = 0;
let audioCtx = null;
let muted = false;
let lastTickAt = 0;
let whir = null;

function $(tag, attrs, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, String(value));
  if (parent) parent.appendChild(node);
  return node;
}

function mod(value, base) {
  return ((value % base) + base) % base;
}

function polar(cx, cy, radius, deg) {
  const rad = (deg * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

function colorDe(item, index) {
  const raw = String(item.color || CICLO[index % CICLO.length]).trim().toLowerCase();
  if (COLORES[raw]) return COLORES[raw];
  if (/^#[0-9a-f]{6}$/i.test(raw)) {
    const r = Number.parseInt(raw.slice(1, 3), 16);
    const g = Number.parseInt(raw.slice(3, 5), 16);
    const b = Number.parseInt(raw.slice(5, 7), 16);
    const luz = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return { fondo: raw, tinta: luz > 0.62 ? "#0f2c66" : "#fffff2" };
  }
  return COLORES[CICLO[index % CICLO.length]];
}

function lineasDe(item) {
  const text = String(item.rueda || item.nombre || "").trim();
  if (text.length <= 12 || !text.includes(" ")) return [text];
  const words = text.split(/\s+/);
  let cut = 1;
  let best = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const left = words.slice(0, i).join(" ");
    const right = words.slice(i).join(" ");
    const score = Math.abs(left.length - right.length);
    if (score < best) {
      best = score;
      cut = i;
    }
  }
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

function iconGroup(name) {
  if (!ICONOS.includes(name)) return null;
  const group = $("g", { fill: "currentColor", stroke: "none" });
  if (name === "bombilla") {
    $("circle", { cx: 0, cy: -8, r: 16 }, group);
    $("rect", { x: -8, y: 8, width: 16, height: 6, rx: 1 }, group);
    $("rect", { x: -6, y: 16, width: 12, height: 5 }, group);
  } else if (name === "grafica") {
    $("rect", { x: -24, y: -2, width: 12, height: 26 }, group);
    $("rect", { x: -6, y: -20, width: 12, height: 44 }, group);
    $("rect", { x: 12, y: -10, width: 12, height: 34 }, group);
  } else if (name === "codigo") {
    $("path", {
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 7,
      "stroke-linejoin": "miter",
      "stroke-linecap": "square",
      d: "M-22 -16 H22 V14 H-22 Z M-10 -4 L-18 2 L-10 8 M10 -4 L18 2 L10 8",
    }, group);
  } else if (name === "megafono") {
    $("path", { d: "M-6 -8 H6 L24 -20 V20 L6 8 H-6 Z" }, group);
    $("rect", { x: -16, y: -8, width: 10, height: 16 }, group);
    $("path", {
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 6,
      "stroke-linecap": "square",
      d: "M-8 10 L-14 22",
    }, group);
  } else if (name === "camara") {
    $("path", {
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 6,
      "stroke-linejoin": "miter",
      d: "M-8 -16 H4 L10 -10 H22 V16 H-22 V-10 H-14 Z",
    }, group);
    $("circle", { cx: 0, cy: 4, r: 6, fill: "none", stroke: "currentColor", "stroke-width": 6 }, group);
  }
  return group;
}

function slicePath(cx, cy, radius, start, end) {
  const [x0, y0] = polar(cx, cy, radius, start);
  const [x1, y1] = polar(cx, cy, radius, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} Z`;
}

function buildWheel() {
  wheel.replaceChildren();
  const count = opciones.length;
  const slice = 360 / count;
  const label = opciones.map((item) => item.nombre).join(", ");
  wheel.setAttribute("aria-label", `Ruleta con ${count} opciones: ${label}`);

  $("circle", { cx: 500, cy: 500, r: 486, fill: "#0c2458" }, wheel);
  $("circle", { cx: 500, cy: 500, r: 458, fill: "#1b4f9e" }, wheel);

  opciones.forEach((item, index) => {
    const color = colorDe(item, index);
    const start = -90 - slice / 2 + index * slice;
    const mid = start + slice / 2;
    const group = $("g", { class: "slice", "data-index": index }, wheel);
    const path = $("path", {
      class: "slice-fill",
      d: count === 1
        ? "M 500 92 A 408 408 0 1 1 499.9 92 Z"
        : slicePath(500, 500, 408, start, start + slice),
      fill: color.fondo,
      stroke: "#0f2c66",
      "stroke-width": 6,
    }, group);

    const lines = lineasDe(item);
    const longest = Math.max(...lines.map((line) => line.length), 1);
    const room = 2 * 230 * Math.sin((slice * Math.PI) / 360) - 28;
    const size = Math.max(18, Math.min(46, room / (longest * 0.7)));
    const hasIcon = ICONOS.includes(item.icono);
    const textRadius = hasIcon ? 214 : 250;
    const [tx, ty] = polar(500, 500, textRadius, mid);
    const textGroup = $("g", {
      transform: `translate(${tx} ${ty}) rotate(${mid + 90})`,
      fill: color.tinta,
      color: color.tinta,
    }, group);
    if (hasIcon) {
      const [ix, iy] = polar(500, 500, 318, mid);
      const iconWrap = $("g", {
        transform: `translate(${ix} ${iy}) rotate(${mid + 90}) scale(1.25)`,
        color: color.tinta,
      }, group);
      iconWrap.appendChild(iconGroup(item.icono));
    }
    const text = $("text", {
      "text-anchor": "middle",
      fill: color.tinta,
      "font-family": "Lilita One, Arial Black, Impact, sans-serif",
      "font-size": size.toFixed(1),
    }, textGroup);
    const lineH = size * 1.02;
    const firstY = lines.length === 1 ? size * 0.34 : -(lineH * (lines.length - 1)) / 2 + size * 0.32;
    lines.forEach((line, lineIndex) => {
      const span = $("tspan", { x: 0 }, text);
      if (lineIndex === 0) span.setAttribute("y", firstY.toFixed(1));
      else span.setAttribute("dy", lineH.toFixed(1));
      span.textContent = line;
    });
    path.dataset.ink = color.tinta;
  });

  for (let i = 0; i < 26; i += 1) {
    const [x, y] = polar(500, 500, 446, -90 + (i * 360) / 26);
    $("circle", {
      class: "stud",
      cx: x.toFixed(1),
      cy: y.toFixed(1),
      r: 11,
      fill: i % 2 ? "#d7eefc" : "#7eb6e8",
      stroke: "#0f2c66",
      "stroke-width": 4,
    }, wheel);
  }

  $("circle", { cx: 500, cy: 500, r: 108, fill: "#153a83", stroke: "#0f2c66", "stroke-width": 12 }, wheel);
  $("circle", { cx: 500, cy: 500, r: 74, fill: "#0f2c66" }, wheel);
}

function applyRotation() {
  rotator.style.transform = `rotate(${rotation + rock}deg)`;
}

function pickIndex() {
  const weights = opciones.map((item) => {
    const value = Number(item.peso);
    if (item.peso == null) return 1;
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return Math.floor(Math.random() * opciones.length);
  let ticket = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    ticket -= weights[i];
    if (ticket < 0) return i;
  }
  return opciones.length - 1;
}

function readMute() {
  try {
    muted = localStorage.getItem("muted") === "1";
  } catch {
    muted = false;
  }
  btnMute.textContent = muted ? "Sonido: no" : "Sonido: sí";
}

function saveMute() {
  try {
    localStorage.setItem("muted", muted ? "1" : "0");
  } catch {
    /* la pantalla puede estar en modo privado */
  }
}

function unlockAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx || muted) return Promise.resolve();
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === "suspended") return audioCtx.resume();
  return Promise.resolve();
}

function beep(freq, dur, type = "square", gain = 0.045) {
  if (muted) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === "suspended") return;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, audioCtx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

function chirp() {
  if (muted || !audioCtx || audioCtx.state === "suspended") return;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(160, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(720, audioCtx.currentTime + 0.18);
  amp.gain.setValueAtTime(0.04, audioCtx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.22);
}

function startWhir() {
  if (muted || !audioCtx || audioCtx.state === "suspended") return;
  stopWhir();
  const frames = Math.floor(audioCtx.sampleRate * 1.2);
  const buffer = audioCtx.createBuffer(1, frames, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 420;
  filter.Q.value = 0.8;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.0001;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
  whir = { source, filter, gain };
}

function setWhir(speed) {
  if (!whir || !audioCtx) return;
  const now = audioCtx.currentTime;
  whir.gain.gain.setTargetAtTime(0.0001 + speed * 0.035, now, 0.05);
  whir.filter.frequency.setTargetAtTime(260 + speed * 980, now, 0.05);
}

function stopWhir() {
  if (!whir) return;
  try {
    whir.gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.05);
    const source = whir.source;
    setTimeout(() => {
      try { source.stop(); } catch { /* ya se detuvo */ }
    }, 180);
  } catch {
    /* sin audio */
  }
  whir = null;
}

function tick(speed) {
  const now = performance.now();
  if (now - lastTickAt < 46) return;
  lastTickAt = now;
  beep(480 + speed * 700, 0.03, "square", 0.038);
}

function fanfare() {
  [523, 659, 784, 1047].forEach((freq, index) => {
    setTimeout(() => beep(freq, index === 3 ? 0.36 : 0.12, "square", 0.05), index * 120);
  });
}

function burst() {
  if (reduceMotion) return;
  const box = document.querySelector("#confetti");
  box.hidden = false;
  box.replaceChildren();
  const colors = ["#fffff2", "#cde7f7", "#ffe56a", "#14d4c0", "#ffffff", "#5983b3"];
  for (let i = 0; i < 42; i += 1) {
    const bit = document.createElement("i");
    const angle = Math.random() * Math.PI * 2;
    const dist = 140 + Math.random() * 460;
    bit.style.background = colors[i % colors.length];
    bit.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    bit.style.setProperty("--dy", `${Math.sin(angle) * dist - 40}px`);
    bit.style.animationDelay = `${Math.random() * 0.08}s`;
    box.appendChild(bit);
  }
  setTimeout(() => {
    box.hidden = true;
    box.replaceChildren();
  }, 1100);
}

const MAX_SPEED = 8;
const WARM_AT = 5;
const SPEED_UNIT = 320;
let speedLevel = 0;
let velocity = 0;
let spinDir = 1;
let phase = "idle";
let lastBoost = 0;
let loopOn = false;
let ease = null;
let peg = 0;

function restLabel() {
  return `${opciones.length} líneas. Cada toque sube 1 la velocidad.`;
}

let textosActuales = null;

function heatOf(level) {
  if (level < WARM_AT) return 0;
  return (level - WARM_AT + 1) / (MAX_SPEED - WARM_AT + 1);
}

function paintSpeed() {
  spinning = true;
  hub.disabled = false;
  btnSpin.disabled = false;
  btnSpin.classList.remove("is-idle");
  document.body.classList.add("is-spinning");
  hub.textContent = String(speedLevel);
  const heat = heatOf(speedLevel);
  document.body.style.setProperty("--heat", heat.toFixed(3));
  document.body.classList.toggle("is-hot", heat > 0);
  document.body.classList.toggle("is-critical", speedLevel >= MAX_SPEED);
  const rate = Math.max(0.05, 0.2 - speedLevel * 0.018);
  document.body.style.setProperty("--spin-rate", `${rate}s`);
  if (speedLevel >= MAX_SPEED) {
    btnSpin.textContent = "¡VA A EXPLOTAR!";
    statusEl.textContent = "Está roja. Un toque más y explota.";
  } else if (heat > 0) {
    btnSpin.textContent = "+1 VELOCIDAD";
    statusEl.textContent = `Se está poniendo roja. Velocidad ${speedLevel}.`;
  } else {
    btnSpin.textContent = "+1 VELOCIDAD";
    statusEl.textContent = `Velocidad ${speedLevel}. Toca para subir.`;
  }
}

function restControls(keepBoom) {
  spinning = false;
  speedLevel = 0;
  velocity = 0;
  phase = "idle";
  ease = null;
  document.body.classList.remove("is-spinning", "is-slow", "is-hot", "is-critical");
  if (!keepBoom) {
    document.body.classList.remove("is-boom");
    document.body.style.setProperty("--heat", "0");
  }
  hub.textContent = "GIRAR";
  btnSpin.textContent = "¡GIRAR!";
  const locked = resultOpen;
  hub.disabled = locked;
  btnSpin.disabled = locked;
  btnSpin.classList.toggle("is-idle", !locked);
}

function clearWinner() {
  wheel.querySelectorAll(".slice").forEach((slice) => slice.classList.remove("is-winner"));
}

function markWinner(index) {
  wheel.querySelectorAll(".slice").forEach((slice) => {
    slice.classList.toggle("is-winner", Number(slice.dataset.index) === index);
  });
  const path = wheel.querySelector(`.slice[data-index="${index}"] .slice-fill`);
  if (path) path.setAttribute("stroke", "#ffe56a");
}

function showResult(index) {
  const item = opciones[index];
  const color = colorDe(item, index);
  resultOpen = true;
  result.hidden = false;
  resultCard.style.setProperty("--win", color.fondo);
  resultCard.style.setProperty("--win-ink", color.tinta);
  resultName.textContent = item.nombre;
  resultDetail.hidden = !item.detalle;
  resultDetail.textContent = item.detalle || "";
  statusEl.textContent = "Resultado en pantalla.";
  resultBadge.replaceChildren();
  resultBadge.style.color = color.tinta;
  const icon = iconGroup(item.icono);
  resultBadge.hidden = !icon;
  if (icon) {
    const svg = $("svg", { viewBox: "-36 -36 72 72" });
    svg.appendChild(icon);
    resultBadge.appendChild(svg);
  }
  let left = resetSeconds;
  countdownEl.textContent = `Siguiente persona en ${left} s`;
  clearInterval(resetTimer);
  resetTimer = setInterval(() => {
    left -= 1;
    if (left <= 0) closeResult();
    else countdownEl.textContent = `Siguiente persona en ${left} s`;
  }, 1000);
  restControls();
  hub.disabled = true;
  btnSpin.disabled = true;
  btnSpin.classList.remove("is-idle");
}

function closeResult() {
  clearInterval(resetTimer);
  result.hidden = true;
  resultOpen = false;
  restControls();
  applyTextos(textosActuales || TEXTOS_BASE);
  statusEl.textContent = restLabel();
}

function finish(index, target) {
  rotation = target;
  rock = 0;
  applyRotation();
  document.body.classList.add("is-landed");
  markWinner(index);
  stopWhir();
  beep(180, 0.09, "triangle", 0.07);
  setTimeout(fanfare, 80);
  if (navigator.vibrate) navigator.vibrate([24, 40, 24, 40, 90]);
  burst();
  showResult(index);
}

function notePegs(rate) {
  const slice = 360 / opciones.length;
  const next = Math.floor((rotation + slice / 2) / slice);
  if (next !== peg) {
    peg = next;
    tick(rate);
  }
}

function beginSpinVisuals() {
  clearWinner();
  wheel.querySelectorAll(".slice-fill").forEach((path) => path.setAttribute("stroke", "#0f2c66"));
  document.body.classList.remove("is-landed", "is-slow");
  peg = Math.floor((rotation + 360 / opciones.length / 2) / (360 / opciones.length));
}

function startEase() {
  const index = pickIndex();
  const slice = 360 / opciones.length;
  const targetMod = mod(-index * slice, 360);
  let delta = mod(targetMod - mod(rotation, 360), 360);
  if (spinDir < 0) delta = delta === 0 ? -360 : delta - 360;
  else if (delta === 0) delta = 360;
  const v = Math.max(Math.abs(velocity), SPEED_UNIT * speedLevel * 0.85);
  const seconds = (reduceMotion ? 700 : 2400 + speedLevel * 320) / 1000;
  const ideal = v * seconds / 2;
  let travel = delta;
  while (Math.abs(travel) + 360 < ideal) travel += 360 * spinDir;
  if (Math.abs(Math.abs(travel) + 360 - ideal) < Math.abs(Math.abs(travel) - ideal)) {
    travel += 360 * spinDir;
  }
  ease = {
    from: rotation,
    travel,
    duration: (2 * Math.abs(travel) / v) * 1000,
    elapsed: 0,
    index,
    v,
  };
  phase = "ease";
}

function ensureLoop() {
  if (loopOn) return;
  loopOn = true;
  let previous = performance.now();
  const frame = (now) => {
    const dt = Math.min(34, now - previous);
    previous = now;
    if (phase === "run") {
      const targetV = spinDir * SPEED_UNIT * speedLevel;
      velocity += (targetV - velocity) * (1 - Math.exp(-dt / 120));
      rotation += (velocity * dt) / 1000;
      rock = 0;
      applyRotation();
      notePegs(Math.min(1, Math.abs(velocity) / (SPEED_UNIT * 5)));
      setWhir(Math.min(1, Math.abs(velocity) / (SPEED_UNIT * MAX_SPEED)));
      const hold = reduceMotion ? 320 : 900;
      if (now - lastBoost > hold) startEase();
      requestAnimationFrame(frame);
      return;
    }
    if (phase === "ease" && ease) {
      ease.elapsed += dt;
      const t = Math.min(1, ease.elapsed / ease.duration);
      const slice = 360 / opciones.length;
      const amp = Math.min(12, slice * 0.2);
      let wobble = 0;
      if (!reduceMotion && t > 0.88 && t < 1) {
        const u = (t - 0.88) / 0.12;
        wobble = Math.sin(u * Math.PI) * (1 - u) * amp * spinDir;
      }
      const progress = 2 * t - t * t;
      rotation = t === 1 ? ease.from + ease.travel : ease.from + ease.travel * progress + wobble;
      rock = 0;
      applyRotation();
      notePegs((1 - t) ** 2);
      setWhir((1 - t) ** 2);
      if (t > 0.72) {
        document.body.classList.add("is-slow");
        if (speedLevel >= MAX_SPEED) statusEl.textContent = "Está roja. Un toque más y explota.";
        else if (speedLevel >= WARM_AT) statusEl.textContent = "Se está poniendo roja…";
        else statusEl.textContent = "YA CASI… toca para subir.";
      }
      if (t < 1) requestAnimationFrame(frame);
      else {
        loopOn = false;
        const { index, from, travel } = ease;
        ease = null;
        phase = "idle";
        finish(index, from + travel);
      }
      return;
    }
    loopOn = false;
  };
  requestAnimationFrame(frame);
}

function boomSound() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx || muted) return;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === "suspended") audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(240, now);
  osc.frequency.exponentialRampToValueAtTime(36, now + 0.48);
  amp.gain.setValueAtTime(0.09, now);
  amp.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
  const frames = Math.floor(audioCtx.sampleRate * 0.35);
  const buffer = audioCtx.createBuffer(1, frames, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const noiseAmp = audioCtx.createGain();
  noiseAmp.gain.setValueAtTime(0.12, now);
  noiseAmp.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  noise.connect(noiseAmp);
  noiseAmp.connect(audioCtx.destination);
  noise.start(now);
  noise.stop(now + 0.35);
}

function explodeBurst() {
  if (reduceMotion) return;
  const box = document.querySelector("#confetti");
  box.hidden = false;
  box.replaceChildren();
  const colors = ["#e23b2f", "#ff8a3d", "#ffe56a", "#fffff2", "#7a120c"];
  for (let i = 0; i < 70; i += 1) {
    const bit = document.createElement("i");
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 620;
    bit.style.background = colors[i % colors.length];
    bit.style.width = `${10 + (i % 4) * 8}px`;
    bit.style.height = bit.style.width;
    bit.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    bit.style.setProperty("--dy", `${Math.sin(angle) * dist - 30}px`);
    bit.style.animationDuration = `${0.7 + Math.random() * 0.5}s`;
    box.appendChild(bit);
  }
  setTimeout(() => {
    box.hidden = true;
    box.replaceChildren();
  }, 1400);
}

function showBoomCard() {
  resultOpen = true;
  result.hidden = false;
  resultCard.style.setProperty("--win", "#e23b2f");
  resultCard.style.setProperty("--win-ink", "#fffff2");
  resultName.textContent = "¡EXPLOTÓ!";
  resultDetail.hidden = false;
  resultDetail.textContent = "La presionaron demasiado.";
  setText("result-kicker", "DEMASIADO");
  setText("result-go", "Hay que armarla de nuevo.");
  setText("btn-next", "ARMAR DE NUEVO");
  resultBadge.replaceChildren();
  resultBadge.hidden = true;
  statusEl.textContent = "La ruleta explotó.";
  let left = resetSeconds;
  countdownEl.textContent = `Se arma de nuevo en ${left} s`;
  clearInterval(resetTimer);
  resetTimer = setInterval(() => {
    left -= 1;
    if (left <= 0) closeResult();
    else countdownEl.textContent = `Se arma de nuevo en ${left} s`;
  }, 1000);
  restControls(true);
  document.body.classList.add("is-boom");
  hub.disabled = true;
  btnSpin.disabled = true;
  btnSpin.classList.remove("is-idle");
}

function explode() {
  if (phase === "boom" || resultOpen) return;
  phase = "boom";
  resultOpen = true;
  ease = null;
  velocity = 0;
  spinning = false;
  stopWhir();
  document.body.classList.remove("is-spinning", "is-slow");
  document.body.classList.add("is-boom");
  hub.disabled = true;
  btnSpin.disabled = true;
  btnSpin.textContent = "¡EXPLOTÓ!";
  statusEl.textContent = "¡BOOM!";
  boomSound();
  explodeBurst();
  if (navigator.vibrate) navigator.vibrate([50, 40, 90, 40, 180]);
  setTimeout(showBoomCard, reduceMotion ? 160 : 640);
}

function boost(direction = 1, startLevel = 1) {
  if (resultOpen || opciones.length < 2 || phase === "glide" || phase === "boom") return;
  const wasGoing = phase === "run" || phase === "ease";
  if (wasGoing && speedLevel >= MAX_SPEED) {
    explode();
    return;
  }
  if (phase === "ease" && ease) {
    if (ease.duration - ease.elapsed < 260) return;
    const u = Math.min(1, ease.elapsed / ease.duration);
    velocity = spinDir * ease.v * (1 - u);
    ease = null;
    document.body.classList.remove("is-slow");
  }
  if (!wasGoing) {
    rotation += rock;
    rock = 0;
    spinDir = direction < 0 ? -1 : 1;
    speedLevel = Math.min(MAX_SPEED, Math.max(1, Math.round(startLevel)));
    velocity = spinDir * SPEED_UNIT * 0.25 * speedLevel;
    phase = "run";
    beginSpinVisuals();
    Promise.resolve(unlockAudio()).then(() => {
      chirp();
      startWhir();
    });
  } else if (speedLevel < MAX_SPEED) {
    phase = "run";
    speedLevel += 1;
    Promise.resolve(unlockAudio()).then(() => beep(360 + speedLevel * 70, 0.07, "square", 0.05));
  } else {
    phase = "run";
    Promise.resolve(unlockAudio()).then(() => beep(1040, 0.05, "square", 0.04));
  }
  lastBoost = performance.now();
  paintSpeed();
  document.body.classList.add("is-launch");
  setTimeout(() => document.body.classList.remove("is-launch"), 160);
  if (navigator.vibrate) navigator.vibrate(10 + speedLevel * 4);
  ensureLoop();
}

function glideTo(target) {
  const from = rotation;
  const started = performance.now();
  phase = "glide";
  spinning = true;
  hub.disabled = true;
  btnSpin.disabled = true;
  const frame = (now) => {
    const t = Math.min(1, (now - started) / 280);
    const eased = 1 - (1 - t) ** 3;
    rotation = from + (target - from) * eased;
    applyRotation();
    if (t < 1) requestAnimationFrame(frame);
    else restControls();
  };
  requestAnimationFrame(frame);
}

function bindDrag() {
  let origin = 0;
  let last = 0;
  let lastTime = 0;
  let flick = 0;
  let moved = 0;
  let startX = 0;
  let startY = 0;
  let pointerId = null;
  let boostId = null;

  const angleOf = (event) => {
    const rect = wheelHit.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    return Math.atan2(y, x);
  };

  wheelHit.addEventListener("pointerdown", (event) => {
    if (event.button > 0 || resultOpen || phase === "glide") return;
    if (event.target.closest("button")) return;
    event.preventDefault();
    if (phase === "run" || phase === "ease") {
      boostId = event.pointerId;
      return;
    }
    unlockAudio();
    dragging = true;
    pointerId = event.pointerId;
    wheelHit.setPointerCapture(event.pointerId);
    rotation += rock;
    rock = 0;
    origin = rotation;
    last = angleOf(event);
    lastTime = event.timeStamp;
    flick = 0;
    moved = 0;
    startX = event.clientX;
    startY = event.clientY;
  });

  wheelHit.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    const angle = angleOf(event);
    let delta = angle - last;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    const dt = Math.max(16, event.timeStamp - lastTime) / 1000;
    flick = delta / dt;
    rotation += (delta * 180) / Math.PI;
    moved = Math.hypot(event.clientX - startX, event.clientY - startY);
    last = angle;
    lastTime = event.timeStamp;
    applyRotation();
    const slice = 360 / opciones.length;
    const peg = Math.floor((rotation + slice / 2) / slice);
    if (peg !== wheelHit.dataset.peg) {
      wheelHit.dataset.peg = String(peg);
      tick(0.35);
    }
  });

  const end = (event) => {
    if (boostId !== null && event && event.pointerId === boostId) {
      boostId = null;
      boost(1);
      return;
    }
    if (!dragging || (event && event.pointerId !== pointerId)) return;
    dragging = false;
    pointerId = null;
    if (moved < 16 && Math.abs(flick) < 1.5) boost(1);
    else if (Math.abs(flick) > 1.5) boost(Math.sign(flick) || 1, 1);
    else glideTo(origin);
  };
  wheelHit.addEventListener("pointerup", end);
  wheelHit.addEventListener("pointercancel", end);
}

function bindIdle() {
  const loop = (now) => {
    if (!spinning && !dragging && !resultOpen) {
      rock = reduceMotion ? 0 : Math.sin(now / 420) * 4;
      applyRotation();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function bindControls() {
  const go = (event) => {
    event.preventDefault();
    boost(1);
  };
  btnSpin.addEventListener("click", go);
  hub.addEventListener("click", go);
  btnNext.addEventListener("click", closeResult);
  btnMute.addEventListener("click", () => {
    muted = !muted;
    saveMute();
    btnMute.textContent = muted ? "Sonido: no" : "Sonido: sí";
    if (muted) stopWhir();
    else unlockAudio();
  });
  const fullscreenEnabled = document.fullscreenEnabled || document.documentElement.webkitRequestFullscreen;
  if (!fullscreenEnabled) btnFull.hidden = true;
  btnFull.addEventListener("click", () => {
    const root = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else (root.requestFullscreen || root.webkitRequestFullscreen)?.call(root);
  });
  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.key !== " " && event.key !== "Enter") return;
    if (event.target.closest("button") && event.target !== btnSpin && event.target !== hub && event.target !== btnNext) return;
    event.preventDefault();
    if (resultOpen) closeResult();
    else boost(1);
  });
}

readMute();
const pack = await fetch("./opciones.json", { cache: "no-store" })
  .then((res) => (res.ok ? res.json() : null))
  .catch(() => null);
if (pack && Array.isArray(pack.opciones)) {
  opciones = usable(pack.opciones);
  applyTextos(pack.informacion);
} else {
  opciones = usable(OPCIONES);
}
if (opciones.length < 2) {
  statusEl.textContent = "Hacen falta al menos 2 opciones en opciones.json";
  btnSpin.disabled = true;
  hub.disabled = true;
} else {
  buildWheel();
  applyRotation();
  bindDrag();
  bindIdle();
  bindControls();
  statusEl.textContent = restLabel();
}
