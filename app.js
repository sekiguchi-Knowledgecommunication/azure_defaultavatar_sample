const bg = document.getElementById("bg");
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");

const faceVideo = document.getElementById("faceVideo");
const playBtn = document.getElementById("playBtn");

const sliders = {
  x: document.getElementById("x"),
  y: document.getElementById("y"),
  w: document.getElementById("w"),
  h: document.getElementById("h"),
  r: document.getElementById("r"),
  zoom: document.getElementById("zoom"),
  panx: document.getElementById("panx"),
  pany: document.getElementById("pany"),
  blur: document.getElementById("blur"),
  alpha: document.getElementById("alpha"),
  sat: document.getElementById("sat"),
};

const labels = {
  x: document.getElementById("xv"),
  y: document.getElementById("yv"),
  w: document.getElementById("wv"),
  h: document.getElementById("hv"),
  r: document.getElementById("rv"),
  zoom: document.getElementById("zoomv"),
  panx: document.getElementById("panxv"),
  pany: document.getElementById("panyv"),
  blur: document.getElementById("blurv"),
  alpha: document.getElementById("alphav"),
  sat: document.getElementById("satv"),
};

// 背景画像の「顔中心」：背景表示サイズに対して割合で初期推定
// だいたい “中央・上から30%” に顔がある想定。合わなければ X/Y で調整。
let anchor = { cx: 0, cy: 0 };

let params = {
  offX: Number(sliders.x.value),
  offY: Number(sliders.y.value),

  w: Number(sliders.w.value),
  h: Number(sliders.h.value),
  rotDeg: Number(sliders.r.value),

  zoom: Number(sliders.zoom.value),
  panX: Number(sliders.panx.value),
  panY: Number(sliders.pany.value),

  blurPx: Number(sliders.blur.value),
  alpha: Number(sliders.alpha.value),
  sat: Number(sliders.sat.value),
};

function updateUI() {
  params.offX = Number(sliders.x.value);
  params.offY = Number(sliders.y.value);

  params.w = Number(sliders.w.value);
  params.h = Number(sliders.h.value);
  params.rotDeg = Number(sliders.r.value);

  params.zoom = Number(sliders.zoom.value);
  params.panX = Number(sliders.panx.value);
  params.panY = Number(sliders.pany.value);

  params.blurPx = Number(sliders.blur.value);
  params.alpha = Number(sliders.alpha.value);
  params.sat = Number(sliders.sat.value);

  labels.x.textContent = params.offX;
  labels.y.textContent = params.offY;
  labels.w.textContent = params.w;
  labels.h.textContent = params.h;
  labels.r.textContent = params.rotDeg;

  labels.zoom.textContent = params.zoom.toFixed(2);
  labels.panx.textContent = params.panX.toFixed(2);
  labels.pany.textContent = params.panY.toFixed(2);

  labels.blur.textContent = params.blurPx;
  labels.alpha.textContent = params.alpha.toFixed(2);
  labels.sat.textContent = params.sat.toFixed(2);
}

Object.values(sliders).forEach((el) => el.addEventListener("input", updateUI));

function resizeCanvasToBg() {
  const rect = bg.getBoundingClientRect();

  cv.width = Math.round(rect.width * devicePixelRatio);
  cv.height = Math.round(rect.height * devicePixelRatio);
  cv.style.width = rect.width + "px";
  cv.style.height = rect.height + "px";

  // CSSピクセル座標系で描けるよう変換
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  // 顔中心の初期アンカー（表示サイズ比）
  anchor.cx = rect.width * 0.50;
  anchor.cy = rect.height * 0.30;
}

window.addEventListener("resize", resizeCanvasToBg);

// 再生ボタン（ユーザー操作で音あり再生を試す）
playBtn.addEventListener("click", async () => {
  try {
    faceVideo.muted = false;
    await faceVideo.play();
    playBtn.style.display = "none";
  } catch (e) {
    // だめならミュート継続
    faceVideo.muted = true;
    await faceVideo.play();
    playBtn.textContent = "🔇 ミュート再生中";
  }
});

function computeSourceRectCoverWithZoomPan(vw, vh, targetW, targetH, zoom, panX, panY) {
  const targetAR = targetW / targetH;
  const videoAR = vw / vh;

  // cover になる基準トリム
  let sx = 0, sy = 0, sw = vw, sh = vh;
  if (videoAR > targetAR) {
    sw = vh * targetAR;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / targetAR;
    sy = (vh - sh) / 2;
  }

  // zoom > 1 でズームイン（= トリムを小さく）
  const z = Math.max(0.1, zoom);
  const sw2 = sw / z;
  const sh2 = sh / z;

  // pan: -0.5〜0.5 想定。動かせる範囲は (sw - sw2), (sh - sh2)
  const cx = sx + sw / 2 + panX * (sw - sw2);
  const cy = sy + sh / 2 + panY * (sh - sh2);

  sx = cx - sw2 / 2;
  sy = cy - sh2 / 2;
  sw = sw2;
  sh = sh2;

  // クランプ
  sx = Math.max(0, Math.min(sx, vw - sw));
  sy = Math.max(0, Math.min(sy, vh - sh));

  return { sx, sy, sw, sh };
}

function drawFrame() {
  const rect = bg.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (faceVideo.readyState >= 2) {
    const cx = anchor.cx + params.offX;
    const cy = anchor.cy + params.offY;

    const w = params.w;
    const h = params.h;
    const rot = (params.rotDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    // クリップ（楕円マスク）
    // ctx.beginPath();
    // ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    // ctx.closePath();
    // ctx.clip();

    // クリップ（四角マスク：角丸なし）
   // クリップ（角丸四角）
    const radius = 18; // 好みで 0〜40 くらい
    roundRectPath(ctx, -w / 2, -h / 2, w, h, radius);
    ctx.clip();

    // なじませ
    ctx.globalAlpha = params.alpha;
    ctx.filter = `blur(${params.blurPx}px) saturate(${params.sat})`;

    // 動画→枠に cover + zoom/pan
    const vw = faceVideo.videoWidth;
    const vh = faceVideo.videoHeight;

    function roundRectPath(ctx, x, y, w, h, r) {
        const rr = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
      }
      
    const { sx, sy, sw, sh } = computeSourceRectCoverWithZoomPan(
      vw, vh, w, h, params.zoom, params.panX, params.panY
    );

    ctx.drawImage(faceVideo, sx, sy, sw, sh, -w / 2, -h / 2, w, h);

    ctx.restore();

    // 念のため戻す
    ctx.globalAlpha = 1.0;
    ctx.filter = "none";
  }

  requestAnimationFrame(drawFrame);
}

// 初期化
bg.addEventListener("load", () => {
  resizeCanvasToBg();
  updateUI();

  // まずはミュートで回し始める（ユーザーがボタン押したら音あり試行）
  faceVideo.muted = true;
  faceVideo.play().catch(() => { /* autoplay blocked */ });

  drawFrame();
});
