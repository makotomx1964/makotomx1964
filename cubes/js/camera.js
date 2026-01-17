const SIZE = 180;
const OUT  = 180;

const MODE = {
  LIVE: "live",
  CAPTURED: "captured",
  CROPPING: "cropping",
  ANALYZED: "analyzed"
};
let mode = MODE.LIVE;

const video   = document.getElementById("video");
const view    = document.getElementById("view");
const overlay = document.getElementById("overlay");
const ctx     = overlay.getContext("2d");
const vctx    = view.getContext("2d");
const result  = document.getElementById("result");
const analysisDiv = document.getElementById("analysis");

let stream = null;
let capturedCanvas = null;
let dragging = false;
let sx, sy, ex, ey;

//  初期サイズ
view.width  = SIZE;
view.height = SIZE;
overlay.width  = SIZE;
overlay.height = SIZE;
result.width  = SIZE;
result.height = SIZE;


// --- camera ---
async function startCamera() {
  if (stream) return; // 二重起動防止

  console.log("startCamera");
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }, // 背面カメラ優先
      audio: false
    });

    const video = $("#video")[0];
    video.srcObject = stream;

    // iOS 対策：明示的に play()
    await video.play();

  } catch (e) {
    console.error("Camera start failed:", e);
    stream = null;
  }
}

function stopCamera() 
{
    if (!stream) return;
    try{
        console.log("stopCamera");
        stream.getTracks().forEach(t => t.stop());
        stream = null;

        const video = $("#video")[0];
        video.pause();
        video.srcObject = null;
    }catch(e){
        console.log(e);        
    }
}

/*
navigator.mediaDevices.getUserMedia({ video:true }).then(s=>{
    console.log(`navigator.mediaDevices.getUserMedia`);
    stream = s;
    video.srcObject = s;
});
*/

// --- capture ---
function capture() {
  if (!stream) {
    console.log("No camera stream");
    return;
  }

  if (mode !== MODE.LIVE) {
    console.log("capture ignored (already captured)");
    return;
  }
  mode = MODE.CAPTURED;

  stream.getTracks().forEach(t => t.enabled = false);

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const side = Math.min(vw, vh);
  const srcX = (vw - side) / 2;
  const srcY = (vh - side) / 2;

  vctx.clearRect(0,0,SIZE,SIZE);
  vctx.drawImage(video, srcX, srcY, side, side, 0, 0, SIZE, SIZE);

  video.style.display = "none";
  view.style.display  = "block";
  capturedCanvas = view;

  ctx.clearRect(0,0,SIZE,SIZE);
}

// --- retake ---
function retake() {
  if (!stream) return;

  if (mode !== MODE.CAPTURED) 
    return;

  mode = MODE.LIVE;
  stream.getTracks().forEach(t => t.enabled = true);

  video.style.display = "block";
  view.style.display  = "none";
  capturedCanvas = null;

  ctx.clearRect(0,0,SIZE,SIZE);
  analysisDiv.innerHTML = "";
}

// --- crop drag ---
let suppressClick = false;

overlay.onmousedown = e => {
  if (!capturedCanvas) return;
  if (mode !== MODE.CAPTURED) return;

  console.log("Start cropping");
  suppressClick = true;
  mode = MODE.CROPPING;

  dragging = true;
  sx = e.offsetX;
  sy = e.offsetY;
  console.log(`(sx,sy)=(${sx},${sy})`);
};

overlay.onmousemove = e => {
  if (!dragging) return;
  ex = e.offsetX;
  ey = e.offsetY;

  ctx.clearRect(0,0,SIZE,SIZE);
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;
  ctx.strokeRect(sx, sy, ex - sx, ey - sy);
  //console.log(`(sx,sy)=(${sx},${sy}) (x-size,y-size)=(${ex-sx},${ey-sy})`);
};

overlay.onmouseup = () => {
  if (!dragging) return;
  dragging = false;
  const iscrop = perspectiveCrop();
  
  // Crop 完了 → CAPTURED に戻す
  mode = MODE.CAPTURED;  
  console.log("End cropping");

  // click 抑止を次の tick まで維持
  if(!iscrop){
    suppressClick = false;
    return; //  Click扱い
  }

  //  Click扱い抑止
  setTimeout(() => {
    console.log("Suppress click released");
    suppressClick = false;
  }, 0);  
};

// --- perspective ---
function perspectiveCrop() {
  let x1 = Math.min(sx, ex);
  let y1 = Math.min(sy, ey);
  let x2 = Math.max(sx, ex);
  let y2 = Math.max(sy, ey);

  //console.log(`perspectiveCrop:(sx,sy)=(${x1},${y1}) (x-size,y-size)=(${x2-x1},${y2-y1})`);
  if (x2-x1 < 20 || y2-y1 < 20) 
    return false;

  let src = cv.imread(capturedCanvas);

  let srcPts = cv.matFromArray(4,1,cv.CV_32FC2,[
    x1,y1, x2,y1, x2,y2, x1,y2
  ]);
  let dstPts = cv.matFromArray(4,1,cv.CV_32FC2,[
    0,0, OUT,0, OUT,OUT, 0,OUT
  ]);

  let M = cv.getPerspectiveTransform(srcPts, dstPts);
  let dst = new cv.Mat();

  cv.warpPerspective(src, dst, M, new cv.Size(OUT,OUT));

  result.width = OUT;
  result.height = OUT;
  cv.imshow(result, dst);

  src.delete(); srcPts.delete(); dstPts.delete(); M.delete();

  analyzeCubeFace(result);

  dst.delete();
  return true;
}

// ---------- HSV & Cube Color ----------
/*
const COLOR_NAME = {
    U: "white", // 白(TOP)
    R: "blue", // 青(RIGHT)
    F: "red", // 赤(FRONT)
    D: "yellow", // 黄(DOWN)
    L: "green", // 緑(LEFT)
    B: "orange"  // オレンジ(BACK)
};

const COLORS = ["W","Y","R","O","B","G"];
const FACES = ["U", "R", "F", "D", "L", "B"];
*/

function rgbToHsv(r,g,b){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  const d=max-min;
  let h=0;
  if(d){
    if(max===r) h=((g-b)/d)%6;
    else if(max===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h*=60; if(h<0)h+=360;
  }
  return {h,s:max?d/max:0,v:max};
}

const cubeColors = [
  { key: "white", face: "U", label: "白", css: "white" },
  { key: "red",   face: "F", label: "赤", css: "red" },
  { key: "blue",  face: "R", label: "青", css: "blue" },
  { key: "orange",face: "B", label: "橙", css: "orange" },
  { key: "green", face: "L", label: "緑", css: "green" },
  { key: "yellow",face: "D", label: "黄", css: "gold" }
];

const cubeColorMap = Object.fromEntries(
  cubeColors.map(c => [c.key, c])
);

function hsvToCubeColor({ h, s, v }) {
  if (s < 0.20 && v > 0.80) return cubeColorMap.white;
  if (h >= 45  && h < 75)  return cubeColorMap.yellow;
  if (h < 15   || h >= 345)return cubeColorMap.red;
  if (h >= 15  && h < 45)  return cubeColorMap.orange;
  if (h >= 80  && h < 160) return cubeColorMap.green;
  if (h >= 180 && h < 260) return cubeColorMap.blue;
  return null;
}


function analyzeCubeFace(canvas){
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  const cw = w / 3, ch = h / 3;
  let facetype = "";

  //console.log(`analyzeCubeFace: w=${w}, h=${h}, cw=${cw}, ch=${ch}`);

  let html = `<table id="faces" style="border-collapse:collapse;background:#111;">`;
  let faceIndex = 0;

  for(let r = 0; r < 3; r++){
    html += `<tr>`;
    for(let c = 0; c < 3; c++){
      const img = ctx.getImageData(c * cw, r * ch, cw, ch).data;

      let hs = 0, ss = 0, vs = 0, n = 0;

      for(let i = 0; i < img.length; i += 4){
        if(img[i+3] < 200) continue;

        const hsv = rgbToHsv(img[i], img[i+1], img[i+2]);
        if(hsv.v < 0.15) continue;

        hs += hsv.h;
        ss += hsv.s;
        vs += hsv.v;
        n++;
      }

      const hsv = {
        h: n ? hs / n : 0,
        s: n ? ss / n : 0,
        v: n ? vs / n : 0
      };

      //const cubeColor = hsvToCubeColor(hsv);
      const cubeColor = hsvToCubeColor(hsv) || cubeColorMap.white;
      const facePosition = faceIndex===4 ? "center" : "not";
      if(facePosition === "center"){
        facetype = cubeColor.face;
        $("#facetype")
        .attr("data-face", facetype)
        .text(facetype);
      }      

      //console.log(faceIndex,"-",facePosition);
      faceIndex++;

      html += `
        <td
          class="cube-cell"
          data-color="${cubeColor.key}"
          data-face="${cubeColor.face}"
          data-faceid=${facePosition}
          style="
            width:40px;
            height:40px;
            border:1px solid #555;
            text-align:center;
            vertical-align:middle;
            cursor:pointer;
          "
        >
          <div class="cube-label" style="font-size:22px;font-weight:bold;color:${cubeColor.css}">
            ${cubeColor.face}(<span style="color:${cubeColor.css}">${cubeColor.label}</span>)
          </div>
          <!--
          <div>H:${hsv.h.toFixed(0)}</div>
          <div>S:${hsv.s.toFixed(2)}</div>
          <div>V:${hsv.v.toFixed(2)}</div>
          -->
        </td>`;
    }
    html += `</tr>`;
  }
  //html += `<tr style="border:none"><td colspan="3"><button onclick="save()">save</button></td></tr>`;
  html += `
    <tr class="save-row" onclick="save()" style="cursor:pointer;background:#222;">
      <td colspan="3" style="height:30px;border:1px solid #555;text-align:center;font-size:18px;font-weight:bold;color:#0f0;">💾 SAVE</td>
    </tr>`;
  html += `</table>`;
  analysisDiv.innerHTML = html;
}

function save(){
    console.log(`request save`);
	const index_list = { 
		U:0,
		R:9,
		F:18,
		D:27,
		L:36,
		B:45
	}

    const cubeJson = extractCubeTable();
    const id = cubeJson.id;
    const faces = cubeJson.cells;
    let index = index_list[id];
    console.log(`update face is ${id}`);
      for (const face of faces) {
        const cube_id = `STK-${id}${index}`;
        const paint_cube_colors = face.color;
        console.log(`Update sticker: ${cube_id}-->${paint_cube_colors}`);
        $(`#${cube_id}`).css("background-color", paint_cube_colors);
        $(`#${cube_id}`).attr("data-color", paint_cube_colors);        
        index++;
    }
}

analysisDiv.addEventListener("click", e => {
  const cell = e.target.closest(".cube-cell");
  if (!cell) return;

  const currentKey = cell.dataset.color;
  const faceType = cell.dataset.faceid;
  const index = cubeColors.findIndex(c => c.key === currentKey);
  const next = cubeColors[(index + 1) % cubeColors.length];

  console.log(`cell.dataset.faceid:[${faceType}]`);

  // data-color 更新
  cell.dataset.color = next.key;
  cell.dataset.face = next.face;

  // 表示更新
  const label = cell.querySelector(".cube-label");
  label.innerHTML =
    `${next.face}(<span style="color:${next.css}">${next.label}</span>)`;
  label.style.color = next.css;

    if(faceType === "center"){
        const facetype = next.face;
        $("#facetype")
        .attr("data-face", facetype)
        .text(facetype);
    }      
});

const resultCanvas = document.getElementById("result");
const videoCanvas = document.getElementById("overlay");


function rotateCanvas90Right(canvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  // 元画像をオフスクリーン canvas に退避
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  src.getContext("2d").drawImage(canvas, 0, 0);

  // canvas サイズ変更（90度回転なので入れ替え）
  canvas.width = h;
  canvas.height = w;

  // 回転描画
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(h, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  ctx.restore();
}

videoCanvas.addEventListener("click", () => {

  // drag 由来 click は完全無視
  if (suppressClick) {
    console.log("click suppressed");
    return;
  }

  // Crop 中は完全無視
  if (mode === MODE.CROPPING) {
    console.log("click ignored (cropping)");
    return;
  }

  // Live → Capture
  if (mode === MODE.LIVE) {
    console.log("click --> capture");
    capture();
    return;
  }

  // Capture 後 → Retake
  if (mode === MODE.CAPTURED) {
    console.log("click --> retake");
    retake();
  }  

});

resultCanvas.addEventListener("click", () => {
  console.log("Rotate 90° Right");
  rotateCanvas90Right(resultCanvas);

  // 回転後に再解析
  analyzeCubeFace(resultCanvas);
});

function extractCubeTable() {
  const result = {
    cells: []
  };

  const faces = [];
  let id = "";

  $("#faces tr").each(function (rowIndex) {

    // SAVE 行など cube-cell を含まない行はスキップ
    const $cells = $(this).find(".cube-cell");
    if ($cells.length === 0) return;

    $cells.each(function (colIndex) {
      const $td = $(this);
      const color = $td.attr("data-color");
      const face  = $td.attr("data-face");
      let position = $td.attr("data-faceid");
      faces.push(face);

      if(position==="center")
        id = face;

      result.cells.push({
        color: color,
        face: face,
        position: position
      });
    });
  });
  
  result.id = id;
  result.faces = faces;
  return result;
}


