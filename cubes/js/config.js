/*
const faceConfig = {
  U: { axis: "y", layer:  1, dir: -1 },
  D: { axis: "y", layer: -1, dir:  1 },
  F: { axis: "z", layer:  1, dir: -1 },
  B: { axis: "z", layer: -1, dir:  1 },
  R: { axis: "x", layer:  1, dir: -1 },
  L: { axis: "x", layer: -1, dir:  1 },

  // --- middle slices ---
  M: { axis: "x", layer: 0, dir: -1 }, // L と同方向
  E: { axis: "y", layer: 0, dir: -1 }, // D と同方向
  S: { axis: "z", layer: 0, dir:  1 }  // F と同方向  
};
*/

const faceConfig = {
  /*
  U: { axis: "y", layer:  1, dir:  1 },
  D: { axis: "y", layer: -1, dir: -1 },
  F: { axis: "z", layer:  1, dir:  1 },
  B: { axis: "z", layer: -1, dir: -1 },
  R: { axis: "x", layer:  1, dir:  1 },
  L: { axis: "x", layer: -1, dir: -1 },
  */
  U: { axis: "y", layer:  1, dir: -1 },
  D: { axis: "y", layer: -1, dir:  1 },
  F: { axis: "z", layer:  1, dir: -1 },
  B: { axis: "z", layer: -1, dir:  1 },
  R: { axis: "x", layer:  1, dir: -1 },
  L: { axis: "x", layer: -1, dir:  1 },

  // --- middle slices (cube.js 準拠) ---
  M: { axis: "x", layer: 0, dir:  1 }, // L'
  E: { axis: "y", layer: 0, dir:  1 }, // D'
//S: { axis: "z", layer: 0, dir:  1 }  // F
  S: { axis: "z", layer: 0, dir: -1 }
};


const faceStickerMap = {

  // ===== U (y = +1, 上から見て左上→右下) =====
  U: [
    {x:-1,y:1,z:-1,m:2}, {x:0,y:1,z:-1,m:2}, {x:1,y:1,z:-1,m:2},
    {x:-1,y:1,z: 0,m:2}, {x:0,y:1,z: 0,m:2}, {x:1,y:1,z: 0,m:2},
    {x:-1,y:1,z: 1,m:2}, {x:0,y:1,z: 1,m:2}, {x:1,y:1,z: 1,m:2},
  ],

  // ===== R (x = +1, 右面を正面から見て左上→右下) =====
  R: [
    {x:1,y:1,z: 1,m:0}, {x:1,y:1,z: 0,m:0}, {x:1,y:1,z:-1,m:0},
    {x:1,y:0,z: 1,m:0}, {x:1,y:0,z: 0,m:0}, {x:1,y:0,z:-1,m:0},
    {x:1,y:-1,z:1,m:0}, {x:1,y:-1,z:0,m:0}, {x:1,y:-1,z:-1,m:0},
  ],

  // ===== F (z = +1, 正面から見て左上→右下) =====
  F: [
    {x:-1,y:1,z:1,m:4}, {x:0,y:1,z:1,m:4}, {x:1,y:1,z:1,m:4},
    {x:-1,y:0,z:1,m:4}, {x:0,y:0,z:1,m:4}, {x:1,y:0,z:1,m:4},
    {x:-1,y:-1,z:1,m:4}, {x:0,y:-1,z:1,m:4}, {x:1,y:-1,z:1,m:4},
  ],

  // ===== D (y = -1, 下から見て左上→右下) =====
  D: [
    {x:-1,y:-1,z: 1,m:3}, {x:0,y:-1,z: 1,m:3}, {x:1,y:-1,z: 1,m:3},
    {x:-1,y:-1,z: 0,m:3}, {x:0,y:-1,z: 0,m:3}, {x:1,y:-1,z: 0,m:3},
    {x:-1,y:-1,z:-1,m:3}, {x:0,y:-1,z:-1,m:3}, {x:1,y:-1,z:-1,m:3},
  ],

  // ===== L (x = -1, 左面を正面から見て左上→右下) =====
  L: [
    {x:-1,y:1,z:-1,m:1}, {x:-1,y:1,z: 0,m:1}, {x:-1,y:1,z: 1,m:1},
    {x:-1,y:0,z:-1,m:1}, {x:-1,y:0,z: 0,m:1}, {x:-1,y:0,z: 1,m:1},
    {x:-1,y:-1,z:-1,m:1}, {x:-1,y:-1,z:0,m:1}, {x:-1,y:-1,z:1,m:1},
  ],

  // ===== B (z = -1, 背面を正面から見て左上→右下) =====
  B: [
    {x:1,y:1,z:-1,m:5}, {x:0,y:1,z:-1,m:5}, {x:-1,y:1,z:-1,m:5},
    {x:1,y:0,z:-1,m:5}, {x:0,y:0,z:-1,m:5}, {x:-1,y:0,z:-1,m:5},
    {x:1,y:-1,z:-1,m:5}, {x:0,y:-1,z:-1,m:5}, {x:-1,y:-1,z:-1,m:5},
  ],
};

/* ===========================
   cube.js
=========================== */
let cube = null;  //  new Cube(); // solved state

/* ===========================
   three.js
=========================== */
let scene, camera, renderer, controls;
let cubelets = [];
let cube_colors_map = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let animating = false;

let defaultCameraPos;
let defaultTarget;


const colorY = 0xffff00;    //  黄
const colorB = 0x0000ff;    //  Blue
const colorR = 0xff0000;    //  RED
const colorG = 0x00ff00;    //  Green
const colorO = 0xff8000     //  オレンジ（0xff4400 --> 0xff8000)
const colorW = 0xffffff;    //  Wgite
const colorE = 0x000000;    //  Black(Edge用)


const COLOR = {
    U: colorW, // 白(TOP)
    R: colorB, // 青(RIGHT)
    F: colorR, // 赤(FRONT)
    D: colorY, // 黄(DOWN)
    L: colorG, // 緑(LEFT)
    B: colorO  // オレンジ(BACK)
};

//const colors = ["white", "red", "blue", "orange", "green", "yellow"]
const COLOR_NAME = {
    U: "white", // 白(TOP)
    R: "blue", // 青(RIGHT)
    F: "red", // 赤(FRONT)
    D: "yellow", // 黄(DOWN)
    L: "green", // 緑(LEFT)
    B: "orange"  // オレンジ(BACK)
};

const MOVETABLE ={
    //  Center Click
    F22 : "clear",
    U4  : "clear",
    R13 : "clear",
    B49  : "clear",
    L40  : "clear",
    D31  : "clear",

    // Front					
    "F18-F20":"U'",	"F18-F19":"U'",	"F19-F20":"U'",	"F20-F18":"U",	"F20-F19":"U",	"F19-F18":"U",
    "F24-F26":"D",	"F24-F25":"D",	"F25-F26":"D",	"F26-F24":"D'",	"F26-F25":"D'",	"F25-F24":"D'",
    "F18-F24":"L",	"F18-F21":"L",	"F21-F24":"L",	"F24-F18":"L'",	"F24-F21":"L'",	"F21-F18":"L'",
    "F20-F26":"R'",	"F20-F23":"R'",	"F23-F26":"R'",	"F26-F20":"R",	"F26-F23":"R",	"F23-F20":"R",

    // Right					
    "R9-R11":"U'",	"R9-R10":"U'",	"R10-R11":"U'",	"R11-R9":"U",	"R11-R10":"U",	"R10-R9":"U",                        
    "R15-R17":"D",	"R15-R16":"D",	"R16-R17":"D",	"R17-R15":"D'",	"R17-R16":"D'",	"R16-R15":"D'",
    "R9-R15":"F",	"R9-R12":"F",	"R12-R15":"F",	"R15-R9":"F'",	"R15-R12":"F'",	"R12-R9":"F'",
    "R11-R17":"B'",	"R11-R14":"B'",	"R14-R17":"B'",	"R17-R11":"B",	"R17-R14":"B",	"R14-R11":"B",
 
    // BACK					
    "B45-B47":"U'",	"B45-B46":"U'",	"B46-B47":"U'",	"B47-B45":"U",	"B47-B46":"U",	"B46-B45":"U",                       
    "B51-B53":"D",	"B51-B52":"D",	"B52-B53":"D",	"B53-B51":"D'",	"B53-B52":"D'",	"B52-B51":"D'",
    "B45-B51":"R",	"B45-B48":"R",	"B48-B51":"R",	"B51-B45":"R'",	"B51-B48":"R'",	"B48-B45":"R'",
    "B47-B53":"L'",	"B47-B50":"L'",	"B50-B53":"L'",	"B53-B47":"L",	"B53-B50":"L",	"B50-B47":"L",

    // UPPER					
    "U6-U8":"F",	"U6-U7":"F",	"U7-U8":"F",	"U8-U6":"F'",	"U8-U7":"F'",	"U7-U6":"F'",                        
    "U0-U2":"B'",	"U0-U1":"B'",	"U1-U2":"B'",	"U2-U0":"B",	"U2-U1":"B",	"U1-U0":"B",
    "U6-U0":"L'",	"U6-U3":"L'",	"U3-U0":"L'",	"U0-U6":"L",	"U0-U3":"L",	"U3-U6":"L",
    "U8-U2":"R",	"U8-U5":"R",	"U5-U2":"R",	"U2-U8":"R'",	"U2-U5":"R'",	"U5-U8":"R'",

    //LEFT					
    "L36-L38":"U'",	"L36-L37":"U'",	"L37-L38":"U'",	"L38-L36":"U",	"L38-L37":"U",	"L37-L36":"U",                        
    "L42-L44":"D",	"L42-L43":"D",	"L43-L44":"D",	"L44-L42":"D'",	"L44-L43":"D'",	"L43-L42":"D'",
    "L36-L42":"B",	"L36-L39":"B",	"L39-L42":"B",	"L42-L36":"B'",	"L42-L39":"B'",	"L39-L36":"B'",
    "L38-L44":"F'",	"L38-L41":"F'",	"L41-L44":"F'",	"L44-L38":"F",	"L44-L41":"F",	"L41-L38":"F",

    // DOWN					
    "D27-D29":"F",	"D27-D28":"F",	"D28-D29":"F",	"D29-D27":"F'",	"D29-D28":"F'",	"D28-D27":"F'",                        
    "D33-D35":"B",	"D33-D34":"B",	"D34-D35":"B",	"D35-D33":"B'",	"D35-D34":"B'",	"D34-D33":"B'",
    "D27-D33":"L",	"D27-D30":"L",	"D30-D33":"L",	"D33-D27":"L'",	"D33-D30":"L'",	"D30-D27":"L'",
    "D29-D35":"R'",	"D29-D32":"R'",	"D32-D35":"R'",	"D35-D29":"R",	"D35-D32":"R",	"D32-D29":"R",

    // F Face		
    "F20-R9":"U'",		"R9-F20":"U",
    "F26-R15":"D",		"R15-F26":"D'",
    "F20-U8":"R",		"U8-F20":"R'",
    "F26-D29":"R'",		"D29-F26":"R'",
    "F18-L38":"U",		"L38-F18":"U'",
    "F18-U6":"L'",		"U6-F18":"L",
    "F24-L44":"D'",		"L44-F24":"D",
    "F24-D27":"L",		"D27-F24":"L'",

    // R Face		
    "R11-B45":"U'",		"B45-R11":"U",
    "R17-B51":"D",		"B51-R17":"D'",
    "R11-U2":"B",		"U2-R11":"B'",
    "R17-D35":"B'",		"D35-R17":"B",
    "R9-F20":"U",		"F20-R9":"U'",
    "R9-U8":"F'",		"U8-R9":"F",
    "R15-F26":"D'",		"F26-R15":"D",
    "R15-D29":"F",		"D29-R15":"F'",

    // B Face
    "B47-L36":"U'",		"L36-B47":"U",
    "B53-L42":"D",		"L42-B53":"D'",
    "B47-U0":"L",		"U0-B47":"L'",
    "B53-D33":"L'",		"D33-B53":"L",
    "B45-R11":"U",		"R11-B45":"U'",
    "B45-U2":"R'",		"U2-B45":"R",
    "B51-R17":"D'",		"R17-B51":"D",
    "B51-D35":"R",		"D35-B51":"R'",

    //  Center Move(S)
    "U5-R10"   : "S",
    "L37-U3"   : "S",
    "R16-D32"  : "S",
    "D30-L43"  : "S",

    "R10-U5"   : "S'",
    "D32-R16"  : "S'",
    "U3-L37"   : "S'",
    "L43-D30"  : "S'",

    //  Center Move(E)
    "F23-R12"   : "E",
    "L41-F21"   : "E",
    "B50-L39"   : "E",
    "R14-B48"   : "E",

    "R12-F23"   : "E'",
    "F21-L41"   : "E'",
    "L39-B50"   : "E'",
    "B48-R14"   : "E'",
     
    //  Center Move(M)
    "U7-F19"    : "M",
    "F25-D28"   : "M",
    "B46-U1"    : "M",
    "D34-B52"   : "M",

    "F19-U7"    : "M'",
    "D28-F25"   : "M'",
    "U1-B46"    : "M'",
    "B52-D34"   : "M'",
  
					
};

