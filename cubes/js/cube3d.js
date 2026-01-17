let   cubeContainer;
let   cube_state = null;
const labelsVisible = false;  //  ステッカー番号表示
const stickerIndexMap = {}; // key = "x,y,z,m" → { face, index }
const solvedList = [];  //  解決手順
const solvedListReverse = [];  //  解決手順

$(document).on("pagecreate", "#cubePage", function () {
  console.log("Cube Page Create");
});

$(document).on("pagebeforehide", "#two", function () {
  console.log("Camera page hide");
  stopCamera();
});

let initialized = false;
$(document).on("pageshow", "[data-role='page']", function () {
    console.log(`ページ${this.id}が表示されます（pageshow）`);
    if(this.id == "two"){
        // Sticker 初期化
        if (!initialized)
            initStickers();
        initStickers2();
        initStickers3();

        //  カメラ起動
        startCamera();
        return;
    } else{
        stopCamera();   //  fail-Safe
    }

    if (initialized) return;

    try{
        initStickers2();
        initStickers3();
        init();

        initialized = true;
        animate();
    } catch (e) {

    }
});

let stepMoveIndex = 0;
let stepMove = false;

$(document).on("click", "#setting", function (e) {
  e.preventDefault();
  $("#right-menu").panel("close");

  // 再設定処理 
  resolve();
  console.log("設定クリック");
  stepMoveIndex = 0;
  stepMove = true;
});


let moveNextStepQueue = Promise.resolve();

function moveNextStep(key) {
  moveNextStepQueue = moveNextStepQueue.then(() => moveNextStepMain(key));
  return moveNextStepQueue;
}

function moveNextStepMain(key) {
    if(key === "S")
        moveNextStepSub();
    if(key === "B")
        movePrevStepSub();
}

async function moveNextStepSub(){
    console.log(`stepMove: ${stepMove}, stepMoveIndex: ${stepMoveIndex}`);
    if(!stepMove) return;
    if(stepMoveIndex >= solvedList.length){
        return;
    }
    const m = solvedList[stepMoveIndex];
    console.log(`moveNextStep: ${m}`);
    document.getElementById("info3").innerHTML = moveProgress(stepMoveIndex,solvedList);  //`move ${index}: ${m}`;
    await rotate(m, { baseDuration: 400, easing: "easeOut", fastmove: true });
    stepMoveIndex++;
}

async function movePrevStepSub(){
    console.log(`movePrevStep: ${stepMove}, stepMoveIndex: ${stepMoveIndex}`);
    if(!stepMove) return;
    if(stepMoveIndex == 0){
        // 何もせず
        return;
    }
    const m = solvedList[stepMoveIndex-1];
    const prevM = Cube.inverse(m);

    console.log(`movePrevStep: ${m}-->${prevM}`);
    await rotate(prevM, { baseDuration: 400, easing: "easeOut", fastmove: true });
    stepMoveIndex--;
    document.getElementById("info3").innerHTML = moveProgress(stepMoveIndex,solvedList);  //`move ${index}: ${m}`;
}


$(document).on("click", "#reverse", async function (e) {
  e.preventDefault();
  $("#right-menu").panel("close");

  // 再設定処理
  for (const [index, m] of solvedListReverse.entries()) {
    //document.getElementById("info3").innerHTML = moveProgress(index,solvedListReverse);  //`move ${index}: ${m}`;
    await rotate(m, { baseDuration: 400, easing: "easeOut" ,fastmove:true});
  }
});

/* ===========================
   初期化
=========================== */
function init() {
  //  Stiicker Index Map 作成
  for (const face of Object.keys(faceStickerMap)) {
    faceStickerMap[face].forEach((s, i) => {
      const key = `${s.x},${s.y},${s.z},${s.m}`;
      stickerIndexMap[key] = {
        face,
        sticker: i
      };
    });
  }

  // Sticker 初期化
  initStickers();

  //  Cube初期化
  console.log(`[initSolver]Start...`);    
  Cube.initSolver();
  cube = new Cube(); // solved state
  cube_state = Cube.fromString( cube.asString());   //  cube state 保存

  console.log(`[initSolver]Finish...`);    

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.set(6,6,6);

  renderer = new THREE.WebGLRenderer({antialias:true});
  //renderer.setSize(window.innerWidth, window.innerHeight);

  cubeContainer = document.getElementById("cubeContainer");
  cubeContainer.appendChild(renderer.domElement);
  cubeContainer.style.touchAction = "none";
  cubeContainer.addEventListener("pointerdown", onClick);

  renderer.setSize(
    cubeContainer.clientWidth,
    cubeContainer.clientHeight
  );


  
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;   // 拡大・縮小禁止
  controls.enablePan  = false;   // 平行移動禁止（任意）
  controls.enableRotate = true;  // 回転のみ許可


  scene.add(new THREE.AmbientLight(0xffffff,0.6));
  const light = new THREE.DirectionalLight(0xffffff,0.8);
  light.position.set(5,10,7);
  scene.add(light);

  createCubelets();
  applyState(cube.asString());
  addStickerNumbers(cubelets,labelsVisible);

  window.addEventListener("resize", onResize);

  document.getElementById("scramble").onclick = scramble;
  document.getElementById("solved").onclick = requestSolution;
  document.getElementById("resetView").onclick = resetView;

  controls.target.set(0, -1.2, 0); // ★ 少し上を見る
  controls.update();

  // ★ 初期値を保存
  defaultCameraPos = camera.position.clone();
  defaultTarget    = controls.target.clone();

  const EPS = 0.01;
  let startSpherical = new THREE.Spherical();
  controls.addEventListener('start', () => {
      startSpherical.setFromVector3(
          camera.position.clone().sub(controls.target)
      );
  });
  controls.addEventListener('end', () => {
      const end = new THREE.Spherical().setFromVector3(
          camera.position.clone().sub(controls.target)
      );
      const rotated =
          Math.abs(startSpherical.theta - end.theta) > EPS ||
          Math.abs(startSpherical.phi   - end.phi)   > EPS;
      if (rotated) {
          console.log('ユーザー回転操作');
          document.getElementById("info2").innerText =`faceClicked: null (マウスドラッグ完了（操作終了）) `;
          faceClicked = null;  // クリア
      } else {
          console.log('クリックのみ');
      }
  });
}

function resetView() {
  camera.position.copy(defaultCameraPos);
  controls.target.copy(defaultTarget);
  controls.update(); // ★ 必須
}

$(document).on("click", "#reset", async function (e) 
{
  cube = new Cube();
  cube_state = Cube.fromString( cube.asString());   //  cube state 保存

  applyState(cube.asString());  

  const {solution, solvesInverse} = solvesCube();

  //  コマンドをリスト化
  solvedList.length = 0;  // クリア
  solvedList.push(...solution.split(" "));

  //  逆順リスト化  
  solvedListReverse.length = 0;  // クリア
  solvedListReverse.push(...solvesInverse.split(" "));

});


/* ===========================
   Cubelets
=========================== */
function createCubelets() {
  const geo = new THREE.BoxGeometry(0.95,0.95,0.95);

  for (let x=-1;x<=1;x++) {
    for (let y=-1;y<=1;y++) {
      for (let z=-1;z<=1;z++) {
        const mats = Array(6).fill().map(
          () => new THREE.MeshLambertMaterial({color:0x111111})
        );
        const m = new THREE.Mesh(geo, mats);
        m.position.set(x,y,z);
        m.userData.coord = {x,y,z};
        cubelets.push(m);
        scene.add(m);
      }
    }
  }
}

/* ===========================
   state → 3D
=========================== */
// cube.js URFDLB 完全対応
// 各要素 = { x, y, z, m }  (m = material index)
function applyState(state) {
    console.log("applyState:",state);

    //cubelets.forEach(c =>
    for(const c of cubelets){
        //c.material.forEach(m => {
        for(const m of c.material){ 
            m.color.set(0x111111);
            m.userData = null; // ★ 一度クリア
        }
    }
    cube_colors_map.length = 0;

    let p = 0;
    const order = ["U","R","F","D","L","B"];
    for (const f of order) {
        //faceStickerMap[f].forEach((s, localIndex) => {
        let localIndex = 0;
        for(const s of faceStickerMap[f]) {

            const cubelet = cubelets.find(c =>
                c.position.x === s.x &&
                c.position.y === s.y &&
                c.position.z === s.z
            );
            const globalIndex = p;
            cubelet.material[s.m].color.set(COLOR[state[p]]);
            cubelet.material[s.m].userData = {
                face: f,
                local: localIndex,
                global: globalIndex
            };
            //console.log(`${f}${p} : color -> ${COLOR_NAME[state[p]]}`);
            cube_colors_map.push({
                face: `${f}${p}`,
                color: COLOR[state[p]],
                colorName: COLOR_NAME[state[p]]
            });
            p++;
            localIndex++;
        }
    }
    //console.log("applyState Fin: ",p);   
    //console.log("applyState done:",JSON.stringify(cube_colors_map,null,2  ));
    initStickers(cube_colors_map);
}

/* ===========================
   Click → Move
=========================== */
let faceClicked = null;
async function onClick(e) {
  if (animating) return;

  const rect = cubeContainer.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const hit = raycaster.intersectObjects(cubelets, false)[0];
  if (!hit || !hit.face) return;

  const mesh = hit.object;
  const faceIndex = hit.face.materialIndex;
  const info = hit.object.material[faceIndex].userData;
  const id = info ? `${info.face}${info.global}` : "none";
  let move = MOVETABLE[id] ?? "none";       // null または undefined のとき "none"
  console.log(`faceClicked(id):${id} mouse(x,y) = (${mouse.x},${mouse.y})`);


  if (info) {
    document.getElementById("info").innerText =`FaceID: ${id} | MoveCmd: ${move} | Cubelet: (${mesh.position.x},${mesh.position.y},${mesh.position.z})`;
  }
  if(move === "clear"){
    //  Center Click 無効化
    faceClicked = null;
    document.getElementById("info2").innerText =`faceClicked: null (center click) `;
    return;
  }

  if(faceClicked === null){
    //  初回クリック
    faceClicked = id;
    document.getElementById("info2").innerText =`faceClicked: ${id} `;
    console.log(`faceClicked:${faceClicked}`);
    return
  } else {
    //  2回目以降のクリック
    faceClicked = `${faceClicked}-${id}`;
    console.log(`faceClicked:${faceClicked}`);
  }

  console.log(`MOVETABLE[${faceClicked}]:${MOVETABLE[faceClicked]}`);
  move = MOVETABLE[faceClicked] ?? "none";       // null または undefined のとき "none"
  document.getElementById("info2").innerText =`faceClicked: ${faceClicked} 2nd click | MoveCmd: ${move} `;
  faceClicked = null;  // クリア

  /* === Move 判定 === */
  if(move === "none")
    return;

  /* === Move  === */
  await rotate(move, {
    baseDuration: 350,
    easing: "easeInOut"
  });

  // cube 更新
  //    solvesCube();
}

let keypreQueue = Promise.resolve();

function keyPress(move, options = {}) {
  keypreQueue = keypreQueue.then(() => keyPressHandler(move, options));
  return keypreQueue;
}

async function keyPressHandler(e) {
    // "S" または "s"
    if (e.key === "s" || e.key === "S") {
        await keyPress(e)
    }
    if (e.key === "b" || e.key === "B") {
        await keyPress(e)
    }
}

$(document).on("keydown", async function (e) {
    // "S" または "s"
    if (e.key === "s" || e.key === "S") {
        console.log("Sキーが押されました");
        await moveNextStep("S");
    }
    if (e.key === "b" || e.key === "B") {
        console.log("Bキーが押されました");
        await moveNextStep("B");
    }
});

/* ===========================
   cube.js 回転
=========================== */
let rotateQueue = Promise.resolve();

async function rotate(move, options = {}) {
  rotateQueue = rotateQueue.then(() => rotateInternal(move, options));
  return rotateQueue;
}

//async function rotate(move,{ baseDuration = 300, easing = "easeInOut", fastmove = false}) 
async function rotateInternal(move, { baseDuration = 300, easing = "easeInOut", fastmove = false }) 
{
  const isTwice = fastmove === true ? false : move.includes("2");
  const moveList = [];

  if (!isTwice) {
    moveList.push({move, baseDuration, easing});
  } else {
    // Ex. "R2" → "R"
    const singleMove = move.replace("2", "");
    moveList.push({move: singleMove, baseDuration: 300, easing: "easeOut"});      //  １回目
    moveList.push({move: singleMove, baseDuration: 600, easing: "easeInOut"});    //  ２回目(ややおそく)
  }
  
  for (const m of moveList) {
    console.log(`rotate: ${m.move}, duration: ${m.baseDuration}, easing: ${m.easing}`);
    await animateRotation(m.move, {
        baseDuration: m.baseDuration,
        easing: m.easing
    });
    cube.move(m.move);
    applyState(cube.asString());
    addStickerNumbers(cubelets,labelsVisible);
  }
}


/* ===========================
   Scramble
=========================== */
async function scramble(){
  //現在値
  const before = cube.asString();

  //  Solver生成
  const solver = new Cube();
  const state = Cube.fromString( cube.asString()); 

  //  初期化
  solver.init(state); //  Cube複製   
  solver.randomize(); //  シャッフル

  const {solution, solvesInverse} = solvesCube(solver);
  //  逆順リスト化  
  solvedListReverse.length = 0;  // クリア
  solvedListReverse.push(...solvesInverse.split(" "));

  //  コマンドをリスト化
  solvedList.length = 0;  // クリア
  solvedList.push(...solution.split(" "));

  for (const [index, m] of solvedListReverse.entries()) {
    document.getElementById("info3").innerHTML = moveProgress(index,solvedListReverse);  //`move ${index}: ${m}`;
    await rotate(m, { baseDuration: 400, easing: "easeOut" ,fastmove:true});
  }
  document.getElementById("info3").innerText =`solution: ${solver.solve()} `;
  cube_state = Cube.fromString( cube.asString());   //  cube state 保存

}

/*
function invertMove(m) {
  if (m.endsWith("2")) return m;        // 180度はそのまま
  if (m.endsWith("'")) return m[0];     // R' → R
  return m + "'";                       // R → R'
}

function reverseSolution(solution) {
  return solution
    .trim()
    .split(/\s+/)
    .reverse()
    .map(invertMove)
    .join(" ");
}
*/

// 解法生成
/* ===========================
   Solved
=========================== */
async function requestSolution(){
  const {solution, solvesInverse} = solvesCube();

  //  コマンドをリスト化
  solvedList.length = 0;  // クリア
  solvedList.push(...solution.split(" "));

  //  逆順リスト化  
  solvedListReverse.length = 0;  // クリア
  solvedListReverse.push(...solvesInverse.split(" "));

  //  cube更新
  //for (const m of solution.split(" ")) {
  document.getElementById("info2").innerText =`solution: ${solution} `;

  //  解決前の cube state 保存
  cube_state = Cube.fromString( cube.asString());   //  cube state 保存

  for (const [index, m] of solvedList.entries()) {
    document.getElementById("info3").innerHTML = moveProgress(index,solvedList);  //`move ${index}: ${m}`;
    await rotate(m, { baseDuration: 400, easing: "easeOut" });
  }
}

function solvesCube(myCube = cube)
{
  const solution = myCube.solve();    //  Solution作成
  const solvesInverse = Cube.inverse(solution);
  
  document.getElementById("inverse").innerHTML = `solvesInverse:${solvesInverse}`;  //`move ${index}: ${m}`;
  document.getElementById("solves").innerHTML = `solves:${solution}`;  //`move ${index}: ${m}`;
  return{solution, solvesInverse};
}

//  状態復帰
/* ===========================
   Re:Solved
=========================== */
async function resolve(){

  //  cube状態を復帰
  cube.init(cube_state);   
  applyState(cube.asString());
}


function moveProgress(current,list){
  let label = "";
  for (const [index, m] of list.entries()) {
    const cmd = index === current ? `<span class="highlight-m">${m}</span>` : `${m}`; 
    label = `${label}${cmd} `;
  }
  return label;
}

/* ===========================
   Common
=========================== */
function onResize() {
  /*
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  */
  const w = cubeContainer.clientWidth;
  const h = cubeContainer.clientHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

const Easing = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => 1 - Math.pow(1 - t, 2),
  easeInOut: t =>
    t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2
};

async function animateRotation(move,
  {
    baseDuration = 300,        // 90度あたりの基準時間(ms)
    easing = "easeInOut"       // linear / easeIn / easeOut / easeInOut
  } = {}
) {
  return new Promise(resolve => {
    animating = true;

    /* ===========================
       Move parse
    =========================== */
    const face  = move[0];
    const prime = move.includes("'");
    const twice = move.includes("2");
    const { axis, layer, dir } = faceConfig[face];
    const sign = (prime ? -1 : 1) * dir;
    const turns = twice ? 2 : 1;
    const angle90 = Math.PI / 2;
    const totalAngle = angle90 * sign * turns;

    /* ===========================
       Duration (角度比例)
    =========================== */
    const duration = baseDuration * turns;

    /* ===========================
       Target cubelets
    =========================== */
    const targets = cubelets.filter(c =>
      Math.round(c.position[axis]) === layer
    );

    const pivot = new THREE.Group();
    scene.add(pivot);
    targets.forEach(c => pivot.add(c));

    const start = performance.now();
    const easeFn = Easing[easing] || Easing.linear;

    /* ===========================
       Animation loop
    =========================== */
    function tick(now) {
      const rawT = Math.min((now - start) / duration, 1);
      const t = easeFn(rawT);

      pivot.rotation[axis] = totalAngle * t;
      if (rawT < 1) {
        requestAnimationFrame(tick);
        return;
      }

      /* ===========================
         Fix transform
      =========================== */
      pivot.rotation[axis] = totalAngle;
      pivot.updateMatrixWorld(true);

      while (pivot.children.length) {
        const c = pivot.children[0];
        c.applyMatrix4(pivot.matrix);
        scene.add(c);

        // 浮動誤差対策
        c.position.x = Math.round(c.position.x);
        c.position.y = Math.round(c.position.y);
        c.position.z = Math.round(c.position.z);
        c.rotation.set(0, 0, 0);
      }

      scene.remove(pivot);
      animating = false;
      resolve();
    }

    requestAnimationFrame(tick);
  });
}

//  Sprite 生成ユーティリティ
function createNumberSprite(text, color = "#FFFF") {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  ctx.font = "bold 48px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);

  sprite.scale.set(0.4, 0.4, 0.4);
  return sprite;
}

function clearStickerNumbers(cubelets) {
  cubelets.forEach(cubelet => {
    cubelet.children = cubelet.children.filter(child => {
      if (child.userData?.isStickerNumber) {
        child.material.map.dispose();
        child.material.dispose();
        return false; // 削除
      }
      return true;
    });
  });
}


//  各 cubelet の外側面に番号 Sprite を配置
function addStickerNumbers(cubelets, visible=false) {
  if (!visible) return;

  clearStickerNumbers(cubelets);
  cubelets.forEach(cubelet => {
    cubelet.material.forEach((mat, m) => {
      if (!mat.userData) return;

      const { face, global } = mat.userData;
      const label = `${face}${global}`;

      const normal = {
        0: new THREE.Vector3( 1, 0, 0),
        1: new THREE.Vector3(-1, 0, 0),
        2: new THREE.Vector3( 0, 1, 0),
        3: new THREE.Vector3( 0,-1, 0),
        4: new THREE.Vector3( 0, 0, 1),
        5: new THREE.Vector3( 0, 0,-1),
      }[m];

      const sprite = createNumberSprite(label);
      sprite.position.copy(normal).multiplyScalar(0.52);

      cubelet.add(sprite);
    });
  });
}
/*
===========================
   Sticker 初期化
=========================== 
    cube_colors_map.push({
        face: `${f}${p}`,
        color: COLOR[state[p]]
    });
*/

function getColorByFace(stateList, face) {
  const item = stateList?.find(e => e.face === face);
  return item ? item.colorName : null;
}

let paint_cube_colors = null;

function initStickers(colors_map = null) {
    const faceOrder = ["U", "R", "F", "D", "L", "B"];
    const faceInit = {
        U: Array(9).fill("white"),
        R: Array(9).fill("blue"),
        F: Array(9).fill("red"),
        D: Array(9).fill("yellow"),
        L: Array(9).fill("green"),
        B: Array(9).fill("orange")
    };
    const new_map = [];

    let faceIndex = 0;
    for(const face of faceOrder){
        //console.log(`Creating face: ${face}`);
        const container = document.getElementById(face);
        container.innerHTML = ""; // クリア
        const initColors = faceInit[face];

        initStickersSub(face,faceIndex,container,initColors,new_map,colors_map);
        faceIndex++;
    }
    createStateFromColorMap(new_map);
    createStateFromStickers();
}

function initStickersSub(face,faceIndex,container,initColors,new_map,colors_map) {
    const colors = ["white", "red", "blue", "orange", "green", "yellow"];
    for (let i = 0; i < 9; i++) {
        const sticker = document.createElement("div");
        const stickerId = `${face}${i + faceIndex*9}`;
        const color = getColorByFace(colors_map, stickerId) || initColors[i];
        const idx = colors.indexOf(color);

        sticker.className = "sticker";
        sticker.id = `STK-${stickerId}`;
        sticker.textContent = stickerId;
        sticker.dataset.colorIndex = idx;
        sticker.dataset.color = color;
        sticker.style.backgroundColor = color;

        if (i === 4) {
            // センターマス（U5, R5...）は固定
            sticker.classList.add("center");
        } else {
            sticker.addEventListener("click", () => {
                console.log(`Clicked on sticker: ${sticker.id}-->${paint_cube_colors}`);
                sticker.style.backgroundColor = paint_cube_colors;
                sticker.dataset.color = paint_cube_colors;
                createStateFromStickers();
            });
        }
        //console.log(`Sticker ${stickerId}: color=${color}, index=${idx}`);
        container.appendChild(sticker); 
        new_map.push({
            face: stickerId,
            color: color,
            colorName: color
        });         
    }
}


function initStickers2() {
    const colors = ["white", "red", "blue", "orange", "green", "yellow"];
    const colorCodes = {
        white: "U", yellow: "D", red: "F", orange: "B", green: "L", blue: "R"
    };

    const faceOrder = ["U2", "R2", "F2", "D2", "L2", "B2"];
    const faceInit = {
        U2: "white",
        R2: "blue",
        F2: "red",
        D2: "yellow",
        L2: "green",
        B2: "orange"
    };

    faceOrder.forEach((face, faceIndex) => {
        //console.log(`Creating face: ${face}`);
        const container = document.getElementById(`${face}`);
        container.innerHTML = ""; // クリア
        const initColors = faceInit[face];

        const sticker = document.createElement("div");
        const color = initColors;
        const colorName = color;

        sticker.className = "sticker";
        sticker.textContent = colorName;
        sticker.dataset.color = color;
        sticker.dataset.colorname = colorName;
        sticker.style.backgroundColor = color;

        if (faceIndex === 0) {
            // センターマス（U5, R5...）は固定
            sticker.classList.add("selected");
            paint_cube_colors = sticker.dataset.color;
        }
        sticker.addEventListener("click", () => {
            console.log(`Clicked on sticker: ${sticker.dataset.colorname}(${sticker.dataset.color})`);
            paint_cube_colors = sticker.dataset.color;
            initStickers3(sticker.dataset.color, sticker.dataset.colorname);

            // 既存の center をすべて解除
            $(".sticker.selected").removeClass("selected");

            sticker.classList.add("selected");
        });
        container.appendChild(sticker);
    });
}

function initStickers3(cube_colors = "white", colorName = "white") 
{
    //console.log(`Creating face: U3`);
    const container = document.getElementById(`U3`);
    container.innerHTML = ""; // クリア

    const sticker = document.createElement("div");
    sticker.className = "sticker";
    sticker.textContent = colorName;
    sticker.dataset.color = cube_colors;
    sticker.style.backgroundColor = cube_colors;
    sticker.classList.add("colorselected");
    container.appendChild(sticker);

}

function createStateFromColorMap(colors_map) 
{
    const colorCodes = { white: "U", yellow: "D", red: "F", orange: "B", green: "L", blue: "R"};
   
    let newState = "";
    for(const color of colors_map){
        newState += colorCodes[color.colorName]
    }
    console.log("createStateFromColorMap:",newState);
    return newState;
}

function createStateFromStickers() 
{
    const colorCodes = {
        white: "U", yellow: "D", red: "F",
        orange: "B", green: "L", blue: "R"
    };
    const faceOrder = ["U", "R", "F", "D", "L", "B"];
    const states = Array(54).fill(null);
    let new_map = "";

    faceOrder.forEach((face, faceIndex) => {
        for (let i = 0; i < 9; i++) {
          const stickerId = `${face}${i + faceIndex*9}`;
          const sticker_id = `STK-${stickerId}`;
          //const stk_color = $(`#${sticker_id}`).data("color");
          const el = document.getElementById(sticker_id);
          const stk_color = el?.dataset.color;

          const code = colorCodes[stk_color];
          //console.log(`Sticker ${sticker_id}: color=${stk_color}, code=${code}`);
          //new_map += code;
          states[i + faceIndex*9] = code;
        }
    });
    //console.log("createStateFromStickers(map):",new_map);
    //console.log("createStateFromStickers(array):",state);
    document.getElementById("info4").innerText = `cube state:${cube?.asString()}`;
    document.getElementById("info5").innerText = `maps state:${states.join("")}`;
    return {
        state: states.join(""),
        array: states
    };
}

function resetCubeState(){
    initStickers(); 
}

const COLORS = ["W","Y","R","O","B","G"];
const FACES = ["U", "R", "F", "D", "L", "B"];

function countFaces(state) {
  const count = { U:0, R:0, F:0, D:0, L:0, B:0 };
  state.forEach(f => { if (f) count[f]++; });
  return count;
}

function getMissingFaces(count) {
  const missing = [];
  const overflow = [];
  for (const c in count) {
    const deficit = 9 - count[c];
    console.log(`Face ${c} count: ${count[c]}, deficit: ${deficit}`);
    if( deficit < 0) {
        for (let i = 9; i < count[c]; i++) {
            overflow.push(c);
        }
        continue;
    }   
    for (let i = 0; i < deficit; i++) {
      missing.push(c);
    }
  }
  return {missing, overflow}; // 長さは必ず 9
}


function applyCubeStateTo3D(){
    //const cube_string = cube.asString();
    const state = createStateFromStickers();            //  state 生成
    const faceCount = countFaces(state.array);          //  face count 取得
    const missingFaces = getMissingFaces(faceCount);    //  missing faces 取得

    //  配色検証
    let validate = true
    const error = [];
 
    //  missing faces チェック
    if(missingFaces.missing.length !== 0){
        const missing = missingFaces.missing.join(",");
        const over = missingFaces.overflow.join(",");
        error.push(`補完条件を満たしていません missing fases:${missing} overflow faces:${over}`);
        validate = false;
    }
 
    const result = validateCubeStateFinal(state.state, error);
    if (!result.ok) {
        validate = false;
    } else {
        console.log("この配色は物理的に正しい:",cube_state);
    }

    if (!validate) {
        console.error("不正配色:",cube_state);
        result.errors.forEach(e => console.error(" - " + e));
        document.getElementById("info6").innerText = `${error[0]}`;       
        return;
    }
    document.getElementById("info6").innerText = `missing fases:none`;       
    try{
        const qube_state = Cube.fromString( state.state );
        cube.init( qube_state);   
        /*
        const cube_string = cube.asString();
        document.getElementById("info4").innerText = `cube state:${cube_string}`;
        if(cube_string !== state.state){
            throw new Error("この配色は物理的に不可能です");
        }
        cube.init( qube_state);   
        */
        applyState(cube.asString());
        $.mobile.changePage("#cubePage");
    } catch (e){
        console.error("Invalid cube state:", e);
        document.getElementById("info6").innerText = `Invalid cube state: ${e.message}`;       
    }

}

function validateCubeStateFinal(state,errors=[]) {
  //const errors = [];

  /* 0. 形式チェック */
  if (typeof state !== "string" || state.length !== 54) {
    errors.push(`state は 54 文字の文字列である必要があります(state.length=${state.length})`);
    return {
        ok: errors.length === 0,
        errors
    };
  }

  const FACES = ["U","R","F","D","L","B"];

  /* 1. 使用文字チェック */
  for (const c of state) {
    if (!FACES.includes(c)) {
      errors.push(`不正な文字が含まれています: ${c}`);
      break;
    }
  }

  /* 2. 色数チェック */
  const count = {};
  for (const c of state) count[c] = (count[c] || 0) + 1;
  for (const f of FACES) {
    if (count[f] !== 9) {
      errors.push(`色 ${f} の個数が ${count[f] ?? 0} 個（正しくは 9 個）`);
    }
  }

  /* 3. センター固定チェック（cube.js 前提） */
  const centers = [4,13,22,31,40,49].map(i => state[i]);
  const centerSet = new Set(centers);
  if (centerSet.size !== 6) {
    errors.push("センター色が重複しています");
  }

  /* 4. cube.js 正規化チェック（最重要） */
  try {
    const test_cube = new Cube(); // solved state
    const qube_state = Cube.fromString( state );
    test_cube.init( qube_state);   
    const normalized = test_cube.asString();
    if (normalized !== state) {
      errors.push(
        "cube.js により state が正規化されました（物理的に不正な配色）"
      );
    }
  } catch (e) {
    console.error("Cube.fromString error:",state,"-", e);
    errors.push("cube.js がこの state を解釈できません");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}


