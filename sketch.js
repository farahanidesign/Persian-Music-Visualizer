
let ctx, isPressed;
const cols = ["#00BCD4", "#8BC34A"];
const bgCol = "black";
const isMusicEnabled = 1;
const isDiceEnabled = 1;
let mySound;
let numVert = 4;
let numLvl = 3;
let zoom = 1;
let isEnvEnabled = 2;
let img;


const maxPoints = Math.max(400, numVert ** numLvl);
const pointList = new Array(9).fill(0).map((v) => []);
let startTime = 1e-3 * Date.now(); // sec

function preload() {
  mySound = loadSound('2.mp3'); // Load the sound file
  img = loadImage('2-1.png');
}

function mousePressed() {
  if (isMusicEnabled) {
    if (!isPressed) {
      isPressed = true;
      redraw();
      setTimeout(setupAudio, 17);
    } else {
      if (mySound.isPlaying()) {
        mySound.stop();
      } else {
        mySound.play();
      }
    }
  } else {
    if (!mySound.isPlaying()) {
      mySound.play();
    } else {
      mySound.stop();
    }
  }
}



function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  if (isMusicEnabled) noLoop();

  cols.forEach((v, i, a) => (a[i] = color(v)));

  for (let lv = 1; lv < 9; lv++) {
    for (let i = maxPoints; i--; ) {
			pointList[lv][i] = { x: 0, y: 0 };
		}
  }
  windowResized();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pointList[0][0] = { x: width / 2, y: height / 2 };
}

function draw() {
  const nt = isMusicEnabled ? 0 : 1e-3 * Date.now() - startTime;
  const t = nt ? nt : ctx ? ctx.currentTime - startTime : 0;

  if (isDiceEnabled) dice.update(t);

  clear().background(bgCol).blendMode(ADD); // main
  for (let i = 1; i <= numLvl; i++) {
    drawLevel(i, t, min(height, width), pointList[i - 1], pointList[i]);
  }

  const mt = t % dur;
  blendMode(MULTIPLY); // fade in out
  if (isMusicEnabled && isPressed) background(155 * min(mt, 1, (dur - mt) / 5));

  translate(32, 32).fill(255).textAlign(LEFT, TOP).blendMode(BLEND); // text
  if (isMusicEnabled && !isPressed) text("click to start", 0, 0);
  else if (!isLooping()) text("rendering", 0, 0);
  // else text(mt.toFixed(1) + " / " + dur.toFixed(1), 0, 0);
}

const eg = (x, a = 0.1) => min((x % 1) / a, (1 - (x % 1)) / (1 - a));
const am = (x, y = 0) => 0.5 - 0.5 * cos(TAU * x + y);

function drawLevel(lvl, t, w, lowerList, currentList) {
  fill(lerpColor(...cols, am(lvl / numLvl, t)));

  const r = 0.04 * w * zoom * (1 - (lvl - 1) / numLvl) * exp((numVert - 2) / 9);
  const d = 3 * r + isEnvEnabled * 0.1 * lvl * eg(t) * r;
  const pRev = (0.04 / zoom) * (-1) ** lvl * lvl ** 2 * t + HALF_PI;
  const pPm = (numVert == 3 ? 16 : 2) * zoom * pRev;

  const ampPm = isEnvEnabled * (lvl ** 4 / 500);
  const ampPmX = ampPm * eg((5 / 6) * t, 5 / 60); // T = 6 / 5 sec, a = 0.1 sec
  const ampPmY = ampPm * eg((5 / 7) * t, 5 / 70);

  for (let i = 0, k = 0, jl = numVert ** (lvl - 1); i < numVert; i++) {
    const p = pRev + TAU * (i / numVert);
    const tx = d * cos(p + ampPmX * cos(pPm));
    const ty = d * sin(p + ampPmY * sin(pPm / 4));

    for (let j = 0; j < jl; j++) {
      const c = currentList[k++];
      const x = (c.x = lowerList[j].x + tx);
      const y = (c.y = lowerList[j].y + ty);
      if (x < -r || +width + r < x) continue;
      if (y < -r || height + r < y) continue;
      circle(x, y, 2 * r);
    }
  }
}


const getNumLvl = (p, v) => floor(log((p * (v - 1)) / v + 1) / log(v));
const dice = {
  interval: 8,
  updateTime: 0,
  update(t) {
    if (t < this.updateTime + this.interval) return;
    this.updateTime += this.interval;

    zoom = random([0.5, 1, 2, 4, 8].filter((v) => v != zoom));
    numVert = numVert != 2 ? 2 : random([3, 4, 5, 6]);
    numLvl = getNumLvl(maxPoints, numVert);
    
    
    isEnvEnabled = 0;
    if (numVert == 2 && zoom <= 4 && random(5) < 4) isEnvEnabled = 1;
    if (numVert == 3 && zoom <= 1 && random(3) < 2) isEnvEnabled = 1;
  },
};
// noprotect


function setupAudio() {
  const data = [0, 1].map((v) => new Float64Array(dur * fs));
  render(data);
  normalizeAudio(data);

  ctx = new AudioContext();
  const source = ctx.createBufferSource();
  const buffer = (source.buffer = ctx.createBuffer(2, dur * fs, fs));
  for (let i = 2; i--; ) buffer.copyToChannel(Float32Array.from(data[i]), i);
  source.connect(ctx.destination);
  source.loop = true;

  startTime = ceil(ctx.currentTime);
  source.start(startTime);
  loop();
}

const fs = 9000;
const dur = 80;
function render(data) {
  const funcs = "sin, cos, exp, sqrt, min".split(", ");
  const [sin, cos, exp, sqrt, min] = funcs.map((v) => Math[v]);
  const amps = Array(8).fill(0);
  function syn(i, t, n, fc, sawPeriod, pan) {
    if (i % (sawPeriod * fs) == 0)
      amps[n] = (60 / (fc - 60)) * 10 ** ceil(-6 * random());
    const saw = (t / sawPeriod) % 1;
    const t0 = saw * sawPeriod;
    const p = 2 * PI * fc * t0;
    const m0 = exp(-20 * t0) * sin(3.595 * p) + 1.2 * saw * sin(p / 8);
    const a0 = 0.25 * (1 - cos(t / 20)) * (1 - cos(5 * PI * t));
    const m = 0.6 * (1 - a0) * exp(-2 * t0) * sin(4.278 * p + m0);
    const b0 = 0.2 * (cos(0.994 * p) - cos(1.006 * p));
    const b = amps[n] * min(t0 / 2e-3, 1 - saw) * (sin(p + m) + b0);
    for (let ch = 2; ch--; ) data[ch][i] += sqrt(ch ? pan : 1 - pan) * b;
  }
  for (let i = 0, t = 0; i < dur * fs; i++, t = i / fs) {
    for (let n = 8; n--; ) syn(i, t, n, 300 * 2 ** (n / 5), 1 + n / 5, n / 7);
    for (let ch = 2; ch--; ) data[ch][i] += 0.2 * data[ch ^ 1].at(i - fs / 12);
    for (let ch = 2; ch--; ) data[ch][i] += 0.6 * data[ch ^ 1].at(i - 2 * fs);
    for (let ch = 2; ch--; ) data[ch][i] *= min(1, (dur - t) / 5);
  }
}

function normalizeAudio(data) {
  let peak = 0;
  for (const ch of data) for (const v of ch) peak = max(peak, abs(v));
  // console.log({ peak });

  const m = 10 ** (-1 / 20) / peak;
  for (const ch of data) for (let i = fs * dur; i--; ) ch[i] *= m;
}
function drawLevel(lvl, t, w, lowerList, currentList) {
  fill(lerpColor(...cols, am(lvl / numLvl, t)));

  const r = 0.04 * w * zoom * (1 - (lvl - 1) / numLvl) * exp((numVert - 2) / 9);
  const d = 3 * r + isEnvEnabled * 0.1 * lvl * eg(t) * r;
  const pRev = (0.04 / zoom) * (-1) ** lvl * lvl ** 2 * t + HALF_PI;
  const pPm = (numVert == 3 ? 16 : 2) * zoom * pRev;

  const ampPm = isEnvEnabled * (lvl ** 4 / 500);
  const ampPmX = ampPm * eg((5 / 6) * t, 4 / 60); 
  const ampPmY = ampPm * eg((5 / 7) * t, 4 / 70);

  for (let i = 0, k = 0, jl = numVert ** (lvl - 1); i < numVert; i++) {
    const p = pRev + TAU * (i / numVert);
    const tx = d * cos(p + ampPmX * cos(pPm));
    const ty = d * sin(p + ampPmY * sin(pPm / 4));

    for (let j = 0; j < jl; j++) {
      const c = currentList[k++];
      const x = (c.x = lowerList[j].x + tx);
      const y = (c.y = lowerList[j].y + ty);
      if (x < -r || +width + r < x) continue;
      if (y < -r || height + r < y) continue;

      // Replacing circle function with image function
      image(img, x - r, y - r, 2 * r, 2 * r);
    }
  }
}

