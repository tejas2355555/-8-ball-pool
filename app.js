"use strict";

/* =========================================================
   CONSTANTS
========================================================= */

const R=0.0286;

const PLAY_W=1.12;
const PLAY_L=2.24;

const HALF_W=PLAY_W/2;
const HALF_L=PLAY_L/2;

const FRICTION=.72;
const BALL_REST=.94;
const CUSH_REST=.72;

const CORNER_GAP=.082;
const SIDE_GAP=.068;

const POCKETS=[
  {x: HALF_W+.008,z: HALF_L+.008,r:.071},
  {x:-HALF_W-.008,z: HALF_L+.008,r:.071},
  {x: HALF_W+.008,z:-HALF_L-.008,r:.071},
  {x:-HALF_W-.008,z:-HALF_L-.008,r:.071},
  {x: HALF_W+.028,z:0,r:.062},
  {x:-HALF_W-.028,z:0,r:.062}
];

const COLORS={
  1:'#f6c211',
  2:'#1558c0',
  3:'#d3251f',
  4:'#7a2f8f',
  5:'#ee720d',
  6:'#12874a',
  7:'#8a2b21',
  8:'#141418'
};

const RACK=[
  1,9,2,10,8,
  3,11,7,14,
  4,5,13,15,6,12
];

const clamp=THREE.MathUtils.clamp;


/* =========================================================
   AUDIO
========================================================= */

let AC=null;
let noiseBuf=null;
let master=null;

let lastClack=0;
let lastCush=0;

function initAudio(){

  if(!AC){

    AC=new(
      window.AudioContext||
      window.webkitAudioContext
    )();

    master=AC.createGain();

    master.gain.value=.55;

    master.connect(
      AC.destination
    );

    noiseBuf=
      AC.createBuffer(
        1,
        AC.sampleRate*.1|0,
        AC.sampleRate
      );

    const d=
      noiseBuf.getChannelData(0);

    for(let i=0;i<d.length;i++){
      d[i]=Math.random()*2-1;
    }
  }

  if(AC.state==='suspended'){
    AC.resume();
  }
}

function burst(vol,freq,dur,q){

  if(!AC || vol<=.01)
    return;

  const t=AC.currentTime;

  const src=
    AC.createBufferSource();

  src.buffer=noiseBuf;

  const f=
    AC.createBiquadFilter();

  f.type='bandpass';
  f.frequency.value=freq;
  f.Q.value=q||6;

  const g=
    AC.createGain();

  g.gain.setValueAtTime(
    vol,
    t
  );

  g.gain.exponentialRampToValueAtTime(
    .001,
    t+dur
  );

  src.connect(f);
  f.connect(g);
  g.connect(master);

  src.start(t);
  src.stop(t+dur+.02);
}

function clackS(v){

  const n=performance.now();

  if(n-lastClack<25)
    return;

  lastClack=n;

  burst(
    Math.min(.8,v*.33),
    2400+Math.random()*600,
    .05,
    8
  );
}

function cushionS(v){

  const n=performance.now();

  if(n-lastCush<40)
    return;

  lastCush=n;

  burst(
    Math.min(.5,v*.2),
    260,
    .09,
    3
  );
}

function pocketS(){

  burst(.5,520,.08,2);

  setTimeout(
    ()=>burst(.4,170,.15,2),
    60
  );

  setTimeout(
    ()=>burst(.2,300,.06,4),
    140
  );
}

function strikeS(v){
  burst(v,1600,.04,5);
}

document.addEventListener(
  'pointerdown',
  initAudio
);


/* =========================================================
   TEXTURES
========================================================= */

function feltTex(){

  const c=
    document.createElement('canvas');

  c.width=c.height=256;

  const g=c.getContext('2d');

  g.fillStyle='#087d38';

  g.fillRect(0,0,256,256);

  for(let i=0;i<9000;i++){

    g.fillStyle=
      Math.random()<.5
      ?
      'rgba(0,0,0,'+
      (.02+Math.random()*.05)+')'
      :
      'rgba(255,255,255,'+
      (.015+Math.random()*.04)+')';

    g.fillRect(
      Math.random()*256,
      Math.random()*256,
      1,
      1
    );
  }

  const t=
    new THREE.CanvasTexture(c);

  t.wrapS=
    t.wrapT=
    THREE.RepeatWrapping;

  t.repeat.set(6,12);

  t.encoding=
    THREE.sRGBEncoding;

  return t;
}

function woodTex(){

  const c=
    document.createElement('canvas');

  c.width=c.height=256;

  const g=c.getContext('2d');

  g.fillStyle='#71472a';

  g.fillRect(0,0,256,256);

  for(let i=0;i<70;i++){

    const y=Math.random()*256;

    g.strokeStyle=
      i%2
      ?
      'rgba(35,18,6,.1)'
      :
      'rgba(255,210,150,.07)';

    g.lineWidth=
      1+Math.random()*3;

    g.beginPath();

    g.moveTo(0,y);

    g.bezierCurveTo(
      64,
      y+Math.random()*10-5,
      192,
      y+Math.random()*10-5,
      256,
      y
    );

    g.stroke();
  }

  const t=
    new THREE.CanvasTexture(c);

  t.wrapS=
    t.wrapT=
    THREE.RepeatWrapping;

  t.encoding=
    THREE.sRGBEncoding;

  return t;
}

function cueTex(){

  const c=
    document.createElement('canvas');

  c.width=16;
  c.height=256;

  const g=c.getContext('2d');

  const gr=
    g.createLinearGradient(
      0,0,0,256
    );

  gr.addColorStop(0,'#e8cfa2');
  gr.addColorStop(.45,'#c49a63');
  gr.addColorStop(.60,'#241a10');
  gr.addColorStop(.78,'#4a2f16');
  gr.addColorStop(1,'#6b4423');

  g.fillStyle=gr;
  g.fillRect(0,0,16,256);

  const t=
    new THREE.CanvasTexture(c);

  t.encoding=
    THREE.sRGBEncoding;

  return t;
}

function ballTexture(n){

  const W=512;
  const H=256;

  const c=
    document.createElement('canvas');

  c.width=W;
  c.height=H;

  const g=c.getContext('2d');

  const solid=n<8;

  const col=
    COLORS[
      solid
      ?n
      :n-8
    ];

  g.fillStyle=
    solid||n===8
    ?col
    :'#f7f4ec';

  g.fillRect(0,0,W,H);

  if(!solid){

    g.fillStyle=col;

    g.fillRect(
      0,
      H*.30,
      W,
      H*.40
    );
  }

  for(const cx of[
    W*.25,
    W*.75
  ]){

    g.fillStyle='#f7f4ec';

    g.beginPath();

    g.arc(
      cx,
      H/2,
      38,
      0,
      Math.PI*2
    );

    g.fill();

    g.fillStyle='#17181c';

    g.font='bold 44px Arial';

    g.textAlign='center';
    g.textBaseline='middle';

    g.fillText(
      String(n),
      cx,
      H/2+2
    );
  }

  const t=
    new THREE.CanvasTexture(c);

  t.encoding=
    THREE.sRGBEncoding;

  return t;
}

function cueBallTexture(){

  const W=512;
  const H=256;

  const c=
    document.createElement('canvas');

  c.width=W;
  c.height=H;

  const g=c.getContext('2d');

  g.fillStyle='#f7f5ef';

  g.fillRect(
    0,
    0,
    W,
    H
  );

  g.fillStyle='#d23a2e';

  for(const p of[
    [.25,.5],
    [.75,.5],
    [.5,.18],
    [.5,.82]
  ]){

    g.beginPath();

    g.arc(
      W*p[0],
      H*p[1],
      10,
      0,
      Math.PI*2
    );

    g.fill();
  }

  const t=
    new THREE.CanvasTexture(c);

  t.encoding=
    THREE.sRGBEncoding;

  return t;
}


/* =========================================================
   THREE SCENE
========================================================= */

const wrap=
  document.getElementById(
    'three-wrap'
  );

const renderer=
  new THREE.WebGLRenderer({
    antialias:true
  });

renderer.shadowMap.enabled=true;

renderer.shadowMap.type=
  THREE.PCFSoftShadowMap;

renderer.outputEncoding=
  THREE.sRGBEncoding;

renderer.setPixelRatio(
  Math.min(
    window.devicePixelRatio||1,
    2
  )
);

wrap.appendChild(
  renderer.domElement
);

const scene=
  new THREE.Scene();

scene.background=
  new THREE.Color(
    0xeceff1
  );

const camera=
  new THREE.PerspectiveCamera(
    46,
    1,
    .1,
    50
  );

scene.add(
  new THREE.AmbientLight(
    0xffffff,
    .55
  )
);

scene.add(
  new THREE.HemisphereLight(
    0xffffff,
    0x335522,
    .22
  )
);

const dl=
  new THREE.DirectionalLight(
    0xffffff,
    .9
  );

dl.position.set(
  1.2,
  5,
  .8
);

dl.castShadow=true;

dl.shadow.mapSize.set(
  2048,
  2048
);

dl.shadow.camera.left=-1.9;
dl.shadow.camera.right=1.9;
dl.shadow.camera.top=2.7;
dl.shadow.camera.bottom=-2.7;
dl.shadow.camera.near=1;
dl.shadow.camera.far=12;

scene.add(dl);

const dl2=
  new THREE.DirectionalLight(
    0xffffff,
    .25
  );

dl2.position.set(
  -1,
  4,
  -1
);

scene.add(dl2);


/* =========================================================
   TABLE
========================================================= */

const feltT=feltTex();
const woodT=woodTex();

const feltMat=
  new THREE.MeshPhongMaterial({
    map:feltT,
    shininess:6
  });

const cushMat=
  new THREE.MeshPhongMaterial({
    map:feltT,
    color:0xd8e2d8,
    shininess:6
  });

const woodMat=
  new THREE.MeshPhongMaterial({
    map:woodT,
    shininess:14
  });

const table=
  new THREE.Group();

scene.add(table);

function box(
  w,h,d,
  mat,
  x,y,z,
  shadow
){

  const m=
    new THREE.Mesh(
      new THREE.BoxGeometry(
        w,h,d
      ),
      mat
    );

  m.position.set(
    x,y,z
  );

  m.receiveShadow=true;
  m.castShadow=!!shadow;

  table.add(m);

  return m;
}

box(
  PLAY_W+.11,
  .04,
  PLAY_L+.11,
  feltMat,
  0,-.02,0
);

box(
  .16,
  .055,
  PLAY_L+.34,
  woodMat,
  -.695,
  .0025,
  0,
  true
);

box(
  .16,
  .055,
  PLAY_L+.34,
  woodMat,
  .695,
  .0025,
  0,
  true
);

box(
  PLAY_W+.46,
  .055,
  .16,
  woodMat,
  0,
  .0025,
  -1.255,
  true
);

box(
  PLAY_W+.46,
  .055,
  .16,
  woodMat,
  0,
  .0025,
  1.255,
  true
);

const CUSH_D=.045;

const segL=
  HALF_L-
  CORNER_GAP-
  SIDE_GAP;

const segCz=
  SIDE_GAP+
  segL/2;

for(
  const sx of[-1,1]
){

  for(
    const sz of[-1,1]
  ){

    box(
      CUSH_D,
      .036,
      segL,
      cushMat,
      sx*(HALF_W+CUSH_D/2),
      .018,
      sz*segCz
    );
  }
}

for(
  const sz of[-1,1]
){

  box(
    PLAY_W-
    2*CORNER_GAP,
    .036,
    CUSH_D,
    cushMat,
    0,
    .018,
    sz*(HALF_L+CUSH_D/2)
  );
}


/* =========================================================
   POCKETS
========================================================= */

const pocketMat=
  new THREE.MeshBasicMaterial({
    color:0x060608
  });

const rimMat=
  new THREE.MeshPhongMaterial({
    color:0x2a1a0c,
    shininess:10
  });

for(const p of POCKETS){

  const cyl=
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        p.r*1.06,
        p.r*1.06,
        .062,
        26
      ),
      pocketMat
    );

  cyl.position.set(
    p.x,
    .001,
    p.z
  );

  table.add(cyl);

  const rim=
    new THREE.Mesh(
      new THREE.TorusGeometry(
        p.r*1.06,
        .006,
        8,
        32
      ).rotateX(Math.PI/2),
      rimMat
    );

  rim.position.set(
    p.x,
    .031,
    p.z
  );

  table.add(rim);
}


/* =========================================================
   DIAMONDS
========================================================= */

const diaGeo=
  new THREE.PlaneGeometry(
    .02,
    .02
  );

diaGeo.rotateZ(
  Math.PI/4
);

diaGeo.rotateX(
  -Math.PI/2
);

const diaMat=
  new THREE.MeshBasicMaterial({
    color:0xf5f2e8
  });

for(const sx of[-1,1]){

  for(
    const z of[-.84,-.28,.28,.84]
  ){

    const m=
      new THREE.Mesh(
        diaGeo,
        diaMat
      );

    m.position.set(
      sx*.695,
      .0315,
      z
    );

    table.add(m);
  }
}

for(const sz of[-1,1]){

  for(
    const x of[-.28,0,.28]
  ){

    const m=
      new THREE.Mesh(
        diaGeo,
        diaMat
      );

    m.position.set(
      x,
      .0315,
      sz*1.255
    );

    table.add(m);
  }
}


/* =========================================================
   GROUND
========================================================= */

const ground=
  new THREE.Mesh(
    new THREE.PlaneGeometry(
      8,
      8
    ).rotateX(-Math.PI/2),
    new THREE.ShadowMaterial({
      opacity:.16
    })
  );

ground.position.y=-.05;
ground.receiveShadow=true;

scene.add(ground);


/* =========================================================
   BALLS
========================================================= */

const ballGeo=
  new THREE.SphereGeometry(
    R,
    48,
    32
  );

const balls=[];
const byNum={};

function addBall(num,x,z){

  const mat=
    new THREE.MeshPhongMaterial({
      map:
        num===0
        ?cueBallTexture()
        :ballTexture(num),
      shininess:70,
      specular:0x555555
    });

  const mesh=
    new THREE.Mesh(
      ballGeo,
      mat
    );

  mesh.castShadow=true;

  mesh.position.set(
    x,
    R,
    z
  );

  scene.add(mesh);

  const b={
    num,
    x,
    z,
    vx:0,
    vz:0,
    active:true,
    potting:false,
    potT:0,
    fx:0,
    fz:0,
    pocket:null,
    isCue:num===0,
    spinSide:0,
    spinTop:0,
    spinApplied:true,
    shotDir:{x:0,z:1},
    mesh
  };

  balls.push(b);
  byNum[num]=b;

  return b;
}


/* =========================================================
   RACK
========================================================= */

function createRack(){

  let idx=0;

  const z0=
    HALF_L/2;

  for(
    let i=0;
    i<5;
    i++
  ){

    for(
      let j=0;
      j<=i;
      j++
    ){

      const x=
        (j-i/2)*
        (2*R+.0008);

      const z=
        z0+
        i*
        (2*R*.866+.0012);

      addBall(
        RACK[idx++],
        x,
        z
      );
    }
  }

  addBall(
    0,
    0,
    -HALF_L/2
  );
}

createRack();

function rackBalls(){

  let idx=0;

  const z0=
    HALF_L/2;

  for(
    let i=0;
    i<5;
    i++
  ){

    for(
      let j=0;
      j<=i;
      j++
    ){

      const b=
        byNum[RACK[idx++]];

      b.x=
        (j-i/2)*
        (2*R+.0008);

      b.z=
        z0+
        i*
        (2*R*.866+.0012);
    }
  }

  byNum[0].x=0;
  byNum[0].z=-HALF_L/2;

  for(const b of balls){

    b.vx=0;
    b.vz=0;

    b.active=true;
    b.potting=false;

    b.spinSide=0;
    b.spinTop=0;

    b.spinApplied=true;

    b.mesh.visible=true;

    b.mesh.scale.setScalar(1);

    b.mesh.position.set(
      b.x,
      R,
      b.z
    );

    b.mesh.rotation.set(
      Math.random()*6,
      Math.random()*6,
      Math.random()*6
    );
  }
}


/* =========================================================
   CUE
========================================================= */

const cueGroup=
  new THREE.Group();

cueGroup.rotation.order='YXZ';

scene.add(cueGroup);

const stickGroup=
  new THREE.Group();

cueGroup.add(
  stickGroup
);

{

  const stickT=
    cueTex();

  const shaft=
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        .0055,
        .0105,
        1.42,
        20
      ).rotateX(Math.PI/2),
      new THREE.MeshPhongMaterial({
        map:stickT,
        shininess:30
      })
    );

  shaft.position.z=
    -(0.71+.03);

  shaft.castShadow=true;

  stickGroup.add(
    shaft
  );

  const ferrule=
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        .0056,
        .0058,
        .024,
        16
      ).rotateX(Math.PI/2),
      new THREE.MeshPhongMaterial({
        color:0xf2ead8,
        shininess:50
      })
    );

  ferrule.position.z=-.018;

  stickGroup.add(
    ferrule
  );

  const tip=
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        .005,
        .0056,
        .007,
        16
      ).rotateX(Math.PI/2),
      new THREE.MeshPhongMaterial({
        color:0x4d6f9e,
        shininess:15
      })
    );

  tip.position.z=-.0025;

  stickGroup.add(
    tip
  );
}


/* =========================================================
   AIM HELPERS
========================================================= */

const aimLine=
  new THREE.Mesh(
    new THREE.CylinderGeometry(
      .002,
      .002,
      1,
      8
    ).translate(
      0,.5,0
    ),
    new THREE.MeshBasicMaterial({
      color:0xffffff,
      transparent:true,
      opacity:.55
    })
  );

aimLine.visible=false;

scene.add(
  aimLine
);

const targetLine=
  new THREE.Mesh(
    new THREE.CylinderGeometry(
      .0016,
      .0016,
      1,
      8
    ).translate(
      0,.5,0
    ),
    new THREE.MeshBasicMaterial({
      color:0xffffff,
      transparent:true,
      opacity:.4
    })
  );

targetLine.visible=false;

scene.add(
  targetLine
);

const ghost=
  new THREE.Mesh(
    new THREE.TorusGeometry(
      .027,
      .0022,
      8,
      32
    ).rotateX(Math.PI/2),
    new THREE.MeshBasicMaterial({
      color:0xffffff,
      transparent:true,
      opacity:.8
    })
  );

ghost.visible=false;

scene.add(ghost);

const ghostBall=
  new THREE.Mesh(
    new THREE.SphereGeometry(
      R,
      32,
      24
    ),
    new THREE.MeshPhongMaterial({
      color:0xffffff,
      transparent:true,
      opacity:.55
    })
  );

ghostBall.visible=false;

scene.add(
  ghostBall
);

const UP=
  new THREE.Vector3(0,1,0);

const tmpDir=
  new THREE.Vector3();

const tmpAxis=
  new THREE.Vector3();

function setLineMesh(
  mesh,
  x,y,z,
  dx,dz,
  len
){

  mesh.position.set(
    x,y,z
  );

  mesh.scale.set(
    1,
    Math.max(.001,len),
    1
  );

  tmpDir.set(
    dx,
    0,
    dz
  ).normalize();

  mesh.quaternion.setFromUnitVectors(
    UP,
    tmpDir
  );
}


/* =========================================================
   GAME STATE
========================================================= */

const HUMAN=0;
const COMPUTER=1;

let state='aim';

let currentPlayer=HUMAN;

let groups=[
  null,
  null
];

let powerVal=0;

let draggingPower=false;

let spin={
  x:0,
  y:0
};

let draggingSpin=false;

let aimAngle=0;

let shotT=0;

let shotPull0=0;

let shootingPower=0;

let rollTimer=0;

let pottedThisShot=[];

let cuePottedFlag=false;

let placePos={
  x:0,
  z:0
};

let placeOk=false;


/* =========================================================
   AI
========================================================= */

let aiTimer=null;

let aiLevel='medium';

const AI_LEVEL={

  easy:{
    accuracy:.68,
    powerMin:.25,
    powerMax:.55,
    thinking:1200
  },

  medium:{
    accuracy:.84,
    powerMin:.32,
    powerMax:.72,
    thinking:850
  },

  hard:{
    accuracy:.96,
    powerMin:.40,
    powerMax:.90,
    thinking:600
  }
};

const aiThinkingEl=
  document.getElementById(
    'aiThinking'
  );

const difficultyEl=
  document.getElementById(
    'difficulty'
  );

difficultyEl.addEventListener(
  'change',
  ()=>{
    aiLevel=
      difficultyEl.value;

    toast(
      'AI difficulty: '+
      aiLevel.toUpperCase(),
      1200
    );
  }
);

function isHumanTurn(){

  return currentPlayer===HUMAN;
}

function isAITurn(){

  return currentPlayer===COMPUTER;
}

function showAIThinking(show){

  aiThinkingEl.style.display=
    show
    ?'flex'
    :'none';
}


/* =========================================================
   AI TARGET SELECTION
========================================================= */

function aiTargetBalls(){

  const target=[];

  const g=
    groups[COMPUTER];

  for(const b of balls){

    if(
      !b.active||
      b.potting||
      b.isCue
    )
      continue;

    if(b.num===8){

      if(
        g &&
        groupRemaining(COMPUTER)===0
      ){
        target.push(b);
      }

      continue;
    }

    if(!g){

      target.push(b);

      continue;
    }

    if(
      groupOf(b.num)===g
    ){

      target.push(b);
    }
  }

  return target;
}

function nearestPocket(ball){

  let best=null;
  let score=Infinity;

  for(const p of POCKETS){

    const d=
      Math.hypot(
        p.x-ball.x,
        p.z-ball.z
      );

    /*
      Corner pockets are slightly
      easier than side pockets.
    */

    const penalty=
      Math.abs(p.x)<.2
      ?.035
      :0;

    const s=
      d+penalty;

    if(s<score){

      score=s;
      best=p;
    }
  }

  return best;
}

function aiShotDirection(
  cue,
  target,
  pocket
){

  let px=
    pocket.x-target.x;

  let pz=
    pocket.z-target.z;

  const plen=
    Math.hypot(px,pz)||1;

  px/=plen;
  pz/=plen;

  /*
    Ghost-ball center.
  */

  const gx=
    target.x-
    px*(R*2);

  const gz=
    target.z-
    pz*(R*2);

  let dx=
    gx-cue.x;

  let dz=
    gz-cue.z;

  const len=
    Math.hypot(dx,dz)||1;

  dx/=len;
  dz/=len;

  return{
    x:dx,
    z:dz,
    gx,
    gz
  };
}

function aiChooseTarget(){

  const cue=
    byNum[0];

  if(
    !cue ||
    !cue.active
  )
    return null;

  const targets=
    aiTargetBalls();

  if(!targets.length)
    return null;

  let best=null;
  let bestScore=Infinity;

  for(const ball of targets){

    const pocket=
      nearestPocket(ball);

    if(!pocket)
      continue;

    const cueDist=
      Math.hypot(
        ball.x-cue.x,
        ball.z-cue.z
      );

    const pocketDist=
      Math.hypot(
        pocket.x-ball.x,
        pocket.z-ball.z
      );

    let score=
      cueDist+
      pocketDist*.75;

    /*
      Prefer legal 8-ball.
    */

    if(ball.num===8)
      score-=.35;

    /*
      Randomness makes AI less robotic.
    */

    score+=
      Math.random()*.08;

    if(score<bestScore){

      bestScore=score;

      best={
        ball,
        pocket
      };
    }
  }

  return best;
}


/* =========================================================
   AI TURN
========================================================= */

function startAITurn(){

  if(
    !isAITurn()||
    state!=='aim'
  )
    return;

  showAIThinking(true);

  state='aiThinking';

  const level=
    AI_LEVEL[aiLevel];

  clearTimeout(aiTimer);

  aiTimer=
    setTimeout(
      ()=>{

        if(
          state!=='aiThinking'
        ){
          showAIThinking(false);
          return;
        }

        const shot=
          aiChooseTarget();

        if(!shot){

          /*
            Safety shot.
          */

          aimAngle+=
            Math.PI*.17;

          powerVal=.35;

          showAIThinking(false);

          state='aim';

          setTimeout(
            ()=>{
              if(
                state==='aim' &&
                isAITurn()
              ){
                beginShoot();
              }
            },
            150
          );

          return;
        }

        const cue=
          byNum[0];

        const dir=
          aiShotDirection(
            cue,
            shot.ball,
            shot.pocket
          );

        const error=
          (1-level.accuracy)*.20;

        const angle=
          Math.atan2(
            dir.x,
            dir.z
          );

        aimAngle=
          angle+
          (Math.random()-.5)*
          error;

        const cueDistance=
          Math.hypot(
            shot.ball.x-cue.x,
            shot.ball.z-cue.z
          );

        const pocketDistance=
          Math.hypot(
            shot.pocket.x-shot.ball.x,
            shot.pocket.z-shot.ball.z
          );

        let power=
          .28+
          cueDistance*.35+
          pocketDistance*.15;

        power=
          clamp(
            power,
            level.powerMin,
            level.powerMax
          );

        if(Math.random()<.12){

          power=
            Math.min(
              1,
              power+.12
            );
        }

        powerVal=power;

        setPowerUI();

        /*
          AI normally uses center-ball hit.
        */

        spin.x=0;
        spin.y=0;

        resetSpinUI();

        showAIThinking(false);

        state='aim';

        setTimeout(
          ()=>{
            if(
              state==='aim' &&
              isAITurn()
            ){
              beginShoot();
            }
          },
          180
        );

      },
      level.thinking
    );
}


/* =========================================================
   PHYSICS
========================================================= */

function maxBallSpeed(){

  let m=0;

  for(const b of balls){

    if(
      b.active &&
      !b.potting
    ){

      const s=
        Math.abs(b.vx)+
        Math.abs(b.vz);

      if(s>m)
        m=s;
    }
  }

  return m;
}

function cushions(b){

  const mx=
    HALF_W-R;

  const mz=
    HALF_L-R;

  const nearCornerZ=
    Math.abs(b.z)>
    HALF_L-
    CORNER_GAP-
    .02;

  const nearSide=
    Math.abs(b.z)<
    SIDE_GAP+
    .02;

  if(
    b.x>mx &&
    !(nearSide||nearCornerZ)
  ){

    b.x=mx;

    if(b.vx>0){

      const vn=b.vx;

      b.vx=
        -b.vx*
        CUSH_REST;

      if(
        b.isCue &&
        Math.abs(b.spinSide)>.02
      ){

        b.vz+=
          b.spinSide*
          vn*
          .7;

        b.spinSide*=.55;
      }

      cushionS(vn);
    }
  }

  if(
    b.x<-mx &&
    !(nearSide||nearCornerZ)
  ){

    b.x=-mx;

    if(b.vx<0){

      const vn=-b.vx;

      b.vx=
        -b.vx*
        CUSH_REST;

      if(
        b.isCue &&
        Math.abs(b.spinSide)>.02
      ){

        b.vz+=
          b.spinSide*
          vn*
          .7;

        b.spinSide*=.55;
      }

      cushionS(vn);
    }
  }

  const nearCornerX=
    Math.abs(b.x)>
    HALF_W-
    CORNER_GAP-
    .02;

  if(
    b.z>mz &&
    !nearCornerX
  ){

    b.z=mz;

    if(b.vz>0){

      const vn=b.vz;

      b.vz=
        -b.vz*
        CUSH_REST;

      if(
        b.isCue &&
        Math.abs(b.spinSide)>.02
      ){

        b.vx+=
          b.spinSide*
          vn*
          .7;

        b.spinSide*=.55;
      }

      cushionS(vn);
    }
  }

  if(
    b.z<-mz &&
    !nearCornerX
  ){

    b.z=-mz;

    if(b.vz<0){

      const vn=-b.vz;

      b.vz=
        -b.vz*
        CUSH_REST;

      if(
        b.isCue &&
        Math.abs(b.spinSide)>.02
      ){

        b.vx+=
          b.spinSide*
          vn*
          .7;

        b.spinSide*=.55;
      }

      cushionS(vn);
    }
  }
}

function pockets(b,h){

  for(const p of POCKETS){

    const dx=
      p.x-b.x;

    const dz=
      p.z-b.z;

    const d2=
      dx*dx+
      dz*dz;

    if(
      d2<
      p.r*p.r
    ){

      startPot(
        b,
        p
      );

      return;
    }

    const d=
      Math.sqrt(d2);

    if(
      d<
      p.r*2
    ){

      const g=
        2.4*
        (
          1-
          d/(p.r*2)
        );

      b.vx+=
        dx/d*g*h;

      b.vz+=
        dz/d*g*h;
    }
  }

  if(
    Math.abs(b.x)>
      HALF_W+.1 ||
    Math.abs(b.z)>
      HALF_L+.1
  ){

    let best=
      POCKETS[0];

    let bd=Infinity;

    for(const p of POCKETS){

      const d=
        (p.x-b.x)**2+
        (p.z-b.z)**2;

      if(d<bd){

        bd=d;
        best=p;
      }
    }

    startPot(
      b,
      best
    );
  }
}

function startPot(b,p){

  if(b.potting)
    return;

  b.potting=true;

  b.potT=0;

  b.fx=b.x;
  b.fz=b.z;

  b.pocket=p;

  b.vx=0;
  b.vz=0;

  if(b.isCue){

    cuePottedFlag=true;

  }else{

    pottedThisShot.push(
      b.num
    );
  }

  pocketS();
}

function applyCueSpinHit(
  b,
  vn
){

  if(
    b.isCue &&
    !b.spinApplied
  ){

    b.spinApplied=true;

    if(b.spinTop){

      b.vx+=
        b.shotDir.x*
        b.spinTop*
        vn*.55;

      b.vz+=
        b.shotDir.z*
        b.spinTop*
        vn*.55;
    }

    b.spinSide*=.4;
  }
}

function collide(a,b){

  const dx=
    b.x-a.x;

  const dz=
    b.z-a.z;

  const d2=
    dx*dx+
    dz*dz;

  const min=
    2*R;

  if(
    d2>=min*min||
    d2<1e-12
  )
    return;

  const d=
    Math.sqrt(d2);

  const nx=
    dx/d;

  const nz=
    dz/d;

  const ov=
    (min-d)/2;

  a.x-=nx*ov;
  a.z-=nz*ov;

  b.x+=nx*ov;
  b.z+=nz*ov;

  const vn=
    (a.vx-b.vx)*nx+
    (a.vz-b.vz)*nz;

  if(vn<=0)
    return;

  const imp=
    (1+BALL_REST)*
    vn/2;

  a.vx-=imp*nx;
  a.vz-=imp*nz;

  b.vx+=imp*nx;
  b.vz+=imp*nz;

  clackS(vn);

  applyCueSpinHit(
    a,
    vn
  );

  applyCueSpinHit(
    b,
    vn
  );
}

function physics(dt){

  const sub=
    clamp(
      Math.ceil(
        maxBallSpeed()*
        dt/
        (R*.5)
      ),
      1,
      10
    );

  const h=
    dt/sub;

  for(
    let s=0;
    s<sub;
    s++
  ){

    for(const b of balls){

      if(
        !b.active||
        b.potting
      )
        continue;

      if(
        b.vx||
        b.vz
      ){

        b.x+=b.vx*h;
        b.z+=b.vz*h;

        const sp=
          Math.hypot(
            b.vx,
            b.vz
          );

        const ns=
          Math.max(
            0,
            sp-
            FRICTION*h
          );

        if(ns<=.02){

          b.vx=0;
          b.vz=0;

        }else{

          const k=
            ns/sp;

          b.vx*=k;
          b.vz*=k;

          if(
            b.isCue &&
            Math.abs(b.spinSide)>.02 &&
            ns>.2
          ){

            const px=
              -b.vz/ns;

            const pz=
              b.vx/ns;

            b.vx+=
              px*
              b.spinSide*
              1.1*h;

            b.vz+=
              pz*
              b.spinSide*
              1.1*h;
          }
        }
      }

      cushions(b);
      pockets(b,h);
    }

    for(
      let i=0;
      i<balls.length;
      i++
    ){

      const a=balls[i];

      if(
        !a.active||
        a.potting
      )
        continue;

      for(
        let j=i+1;
        j<balls.length;
        j++
      ){

        const b=balls[j];

        if(
          !b.active||
          b.potting
        )
          continue;

        collide(
          a,
          b
        );
      }
    }
  }
}


/* =========================================================
   POT ANIMATION
========================================================= */

function updatePotAnims(dt){

  for(const b of balls){

    if(!b.potting)
      continue;

    b.potT+=
      dt/.33;

    const k=
      Math.min(
        1,
        b.potT
      );

    const e=k*k;

    b.x=
      b.fx+
      (b.pocket.x-b.fx)*
      e;

    b.z=
      b.fz+
      (b.pocket.z-b.fz)*
      e;

    b.mesh.position.set(
      b.x,
      R-.08*e,
      b.z
    );

    b.mesh.scale.setScalar(
      1-.45*e
    );

    if(k>=1){

      b.potting=false;
      b.active=false;

      b.mesh.visible=false;
    }
  }
}


/* =========================================================
   BALL ROLL
========================================================= */

function updateRoll(dt){

  for(const b of balls){

    if(
      !b.active||
      b.potting
    )
      continue;

    b.mesh.position.set(
      b.x,
      R,
      b.z
    );

    const sp=
      Math.hypot(
        b.vx,
        b.vz
      );

    if(sp>1e-4){

      tmpAxis.set(
        b.vz/sp,
        0,
        -(b.vx/sp)
      );

      b.mesh.rotateOnWorldAxis(
        tmpAxis,
        sp*dt/R
      );
    }
  }
}


/* =========================================================
   CUE UPDATE
========================================================= */

function updateCue(dt){

  if(!byNum[0].active){

    cueGroup.visible=false;

    return;
  }

  cueGroup.visible=true;

  cueGroup.position.set(
    byNum[0].x,
    R*.98,
    byNum[0].z
  );

  cueGroup.rotation.set(
    .055,
    aimAngle,
    0
  );

  let pull=
    .02+
    powerVal*.20;

  if(state==='shooting'){

    shotT+=
      dt/.07;

    const k=
      Math.min(
        1,
        shotT
      );

    pull=
      shotPull0*(1-k)-
      .028*k;

    if(shotT>=1)
      fire();
  }

  stickGroup.position.z=
    -(R+.006+
      Math.max(
        pull,
        -.03
      ));
}


/* =========================================================
   AIM CAST
========================================================= */

function castAim(
  cx,
  cz,
  dx,
  dz
){

  let tMin=Infinity;
  let hit=null;

  for(const b of balls){

    if(
      !b.active||
      b.potting||
      b.isCue
    )
      continue;

    const ex=
      cx-b.x;

    const ez=
      cz-b.z;

    const b1=
      ex*dx+
      ez*dz;

    const c=
      ex*ex+
      ez*ez-
      4*R*R;

    const disc=
      b1*b1-c;

    if(disc<=0)
      continue;

    const t=
      -b1-
      Math.sqrt(disc);

    if(
      t>.0005&&
      t<tMin
    ){

      tMin=t;
      hit=b;
    }
  }

  const tx=
    dx>1e-6
    ?
    (HALF_W-R-cx)/dx
    :
    (
      dx<-1e-6
      ?
      (-HALF_W+R-cx)/dx
      :
      Infinity
    );

  const tz=
    dz>1e-6
    ?
    (HALF_L-R-cz)/dz
    :
    (
      dz<-1e-6
      ?
      (-HALF_L+R-cz)/dz
      :
      Infinity
    );

  const tRail=
    Math.min(
      tx,
      tz
    );

  if(tRail<tMin){

    return{
      t:tRail,
      hit:null
    };
  }

  return{
    t:tMin,
    hit
  };
}


/* =========================================================
   AIM GUIDE
========================================================= */

function updateGuide(){

  if(
    state!=='aim'||
    !isHumanTurn()
  ){

    aimLine.visible=false;
    targetLine.visible=false;
    ghost.visible=false;

    return;
  }

  const cue=
    byNum[0];

  const d={
    x:Math.sin(aimAngle),
    z:Math.cos(aimAngle)
  };

  const res=
    castAim(
      cue.x,
      cue.z,
      d.x,
      d.z
    );

  const t=
    Math.max(
      .02,
      res.t
    );

  aimLine.visible=true;

  setLineMesh(
    aimLine,
    cue.x,
    R,
    cue.z,
    d.x,
    d.z,
    t
  );

  if(res.hit){

    const gx=
      cue.x+
      d.x*t;

    const gz=
      cue.z+
      d.z*t;

    ghost.visible=true;

    ghost.position.set(
      gx,
      .004,
      gz
    );

    const tx=
      res.hit.x-gx;

    const tz=
      res.hit.z-gz;

    const tl=
      Math.hypot(
        tx,
        tz
      )||1;

    targetLine.visible=true;

    setLineMesh(
      targetLine,
      gx,
      R,
      gz,
      tx/tl,
      tz/tl,
      Math.min(
        .32,
        tl+.02
      )
    );

  }else{

    ghost.visible=false;
    targetLine.visible=false;
  }
}


/* =========================================================
   SHOOTING
========================================================= */

function fire(){

  const cue=
    byNum[0];

  if(
    !cue||
    !cue.active
  )
    return;

  const p=
    shootingPower;

  const speed=
    1.2+
    p*5;

  cue.shotDir={
    x:Math.sin(aimAngle),
    z:Math.cos(aimAngle)
  };

  cue.vx=
    cue.shotDir.x*
    speed;

  cue.vz=
    cue.shotDir.z*
    speed;

  cue.spinTop=
    spin.y;

  cue.spinSide=
    spin.x;

  cue.spinApplied=false;

  cueGroup.visible=false;

  state='rolling';

  rollTimer=0;

  pottedThisShot=[];
  cuePottedFlag=false;

  resetPowerUI();
  resetSpinUI();

  strikeS(
    isAITurn()
    ? .42+p*.45
    : .30+p*.50
  );
}

function beginShoot(){

  if(
    state!=='aim'
  )
    return;

  if(
    !isHumanTurn() &&
    !isAITurn()
  )
    return;

  if(powerVal<.02){

    resetPowerUI();

    return;
  }

  state='shooting';

  shotT=0;

  shotPull0=
    .02+
    powerVal*.20;

  shootingPower=
    powerVal;

  document
    .getElementById('power')
    .classList.add('disabled');
}


/* =========================================================
   MOTION
========================================================= */

function anyMotion(){

  for(const b of balls){

    if(b.potting)
      return true;

    if(
      b.active &&
      (
        b.vx||
        b.vz
      )
    )
      return true;
  }

  return false;
}


/* =========================================================
   GROUPS
========================================================= */

function groupOf(n){

  if(n<8)
    return 'solid';

  if(n>8)
    return 'stripe';

  return null;
}

function groupRemaining(p){

  const g=
    groups[p];

  if(!g)
    return 99;

  let c=0;

  for(const b of balls){

    if(
      b.active&&
      !b.isCue&&
      groupOf(b.num)===g
    ){

      c++;
    }
  }

  return c;
}


/* =========================================================
   END SHOT
========================================================= */

function endShot(){

  if(state!=='rolling')
    return;

  const player=
    currentPlayer;

  const opponent=
    1-player;

  const name=
    p=>
      p===HUMAN
      ?'You'
      :'Computer';


  /* 8 + SCRATCH */

  if(
    cuePottedFlag&&
    pottedThisShot.includes(8)
  ){

    win(
      opponent,
      player===HUMAN
      ?
      'You scratched while potting the 8 ball.'
      :
      'Computer scratched while potting the 8 ball.'
    );

    return;
  }


  /* 8 BALL */

  if(
    pottedThisShot.includes(8)
  ){

    const cleared=
      groups[player] &&
      groupRemaining(player)===0;

    if(
      cleared &&
      !cuePottedFlag
    ){

      win(
        player,
        player===HUMAN
        ?
        'You cleared your balls and legally potted the 8!'
        :
        'Computer cleared the table!'
      );

    }else{

      win(
        opponent,
        player===HUMAN
        ?
        'You potted the 8 ball too early.'
        :
        'Computer potted the 8 ball too early.'
      );
    }

    return;
  }


  /* SCRATCH */

  if(cuePottedFlag){

    toast(
      name(player)+
      ' scratched — Ball in hand',
      2200
    );

    currentPlayer=
      opponent;

    updateHUD();

    respawnCue();

    return;
  }


  /* ASSIGN GROUPS */

  if(
    !groups[0] &&
    pottedThisShot.length
  ){

    const first=
      pottedThisShot.find(
        n=>groupOf(n)
      );

    if(first){

      groups[player]=
        groupOf(first);

      groups[opponent]=
        groups[player]==='solid'
        ?
        'stripe'
        :
        'solid';

      toast(
        name(player)+
        ' is '+
        (
          groups[player]==='solid'
          ?
          'SOLIDS'
          :
          'STRIPES'
        ),
        2200
      );
    }
  }


  /* CONTINUE */

  if(
    pottedThisShot.length
  ){

    const mine=
      pottedThisShot.some(
        n=>
          groups[player] &&
          groupOf(n)===
          groups[player]
      );

    if(mine){

      currentPlayer=
        player;

      toast(
        player===HUMAN
        ?
        'Nice pot! Your turn continues.'
        :
        'Computer made a pot and continues.',
        1800
      );

    }else{

      currentPlayer=
        opponent;
    }

  }else{

    currentPlayer=
      opponent;
  }

  updateHUD();

  state='aim';

  document
    .getElementById('power')
    .classList.remove(
      'disabled'
    );


  /* START AI */

  if(isAITurn()){

    setTimeout(
      startAITurn,
      400
    );
  }
}


/* =========================================================
   CUE BALL RESPawn
========================================================= */

function respawnCue(){

  const cue=
    byNum[0];

  cue.active=false;
  cue.potting=false;
  cue.mesh.visible=false;

  state='placing';

  ghostBall.visible=false;

  if(isHumanTurn()){

    toast(
      'Ball in hand — tap the table to place the cue ball',
      2600
    );

  }else{

    setTimeout(
      aiPlaceCueBall,
      450
    );
  }
}

function aiPlaceCueBall(){

  const cue=
    byNum[0];

  const candidates=[
    {x:0,z:-HALF_L/2+.18},
    {x:-.25,z:-HALF_L/2+.20},
    {x:.25,z:-HALF_L/2+.20},
    {x:0,z:-.55},
    {x:-.30,z:-.55},
    {x:.30,z:-.55}
  ];

  let selected=null;

  for(
    const pos of candidates
  ){

    let safe=true;

    for(
      const b of balls
    ){

      if(
        !b.active||
        b.isCue
      )
        continue;

      if(
        Math.hypot(
          b.x-pos.x,
          b.z-pos.z
        )
        <
        2*R+.015
      ){

        safe=false;
        break;
      }
    }

    if(safe){

      selected=pos;
      break;
    }
  }

  if(!selected){

    selected={
      x:0,
      z:-HALF_L/2+.18
    };
  }

  cue.x=
    selected.x;

  cue.z=
    selected.z;

  cue.vx=0;
  cue.vz=0;

  cue.active=true;
  cue.potting=false;

  cue.mesh.visible=true;

  cue.mesh.scale.setScalar(1);

  cue.mesh.position.set(
    cue.x,
    R,
    cue.z
  );

  ghostBall.visible=false;

  state='aim';

  toast(
    'Computer placed the cue ball',
    1200
  );

  setTimeout(
    startAITurn,
    300
  );
}


/* =========================================================
   WIN
========================================================= */

function win(
  p,
  reason
){

  state='over';

  clearTimeout(
    aiTimer
  );

  showAIThinking(false);

  cueGroup.visible=false;

  ghostBall.visible=false;

  updateGuide();

  document
    .getElementById('otitle')
    .textContent=
      p===HUMAN
      ?
      '🎉 You Win!'
      :
      '🤖 Computer Wins!';

  document
    .getElementById('osub')
    .textContent=
      reason;

  document
    .getElementById('overlay')
    .style.display=
      'flex';

  document
    .getElementById('power')
    .classList.add(
      'disabled'
    );
}


/* =========================================================
   RESET
========================================================= */

function resetMatch(){

  clearTimeout(
    aiTimer
  );

  showAIThinking(false);

  rackBalls();

  groups=[
    null,
    null
  ];

  currentPlayer=
    HUMAN;

  state='aim';

  cuePottedFlag=false;

  pottedThisShot=[];

  resetPowerUI();
  resetSpinUI();

  document
    .getElementById('overlay')
    .style.display='none';

  document
    .getElementById('power')
    .classList.remove(
      'disabled'
    );

  updateHUD();

  toast(
    'New game! You break first 🎱',
    1800
  );
}


/* =========================================================
   HUD
========================================================= */

const turnText=
  document.getElementById(
    'turnText'
  );

const turnBadge=
  document.getElementById(
    'turnBadge'
  );

const chip8=
  document.getElementById(
    'chip8'
  );

const row1=
  document.getElementById(
    'row1'
  );

const row2=
  document.getElementById(
    'row2'
  );

const chipEls=[
  [],
  []
];

(function buildChips(){

  [
    [1,7],
    [9,15]
  ].forEach(
    ([a,b],pi)=>{

      const cont=
        document.getElementById(
          'chips'+
          (pi+1)
        );

      for(
        let n=a;
        n<=b;
        n++
      ){

        const d=
          document.createElement(
            'div'
          );

        d.className='chip';

        const col=
          COLORS[
            n<8
            ?n
            :n-8
          ];

        if(n>8){

          d.classList.add(
            'stripe'
          );

          d.style.background=
            'linear-gradient('+
            '180deg,'+
            '#f8f6f0 0 24%,'+
            col+
            ' 24% 76%,'+
            '#f8f6f0 76%)';

        }else{

          d.style.background=
            col;
        }

        d.textContent=
          n;

        cont.appendChild(d);

        chipEls[pi].push({
          num:n,
          el:d
        });
      }
    }
  );
})();

function updateChips(){

  for(
    let pi=0;
    pi<2;
    pi++
  ){

    const g=
      groups[pi];

    for(
      const c of chipEls[pi]
    ){

      const b=
        byNum[c.num];

      c.el.classList.toggle(
        'gone',
        !b.active
      );

      c.el.classList.toggle(
        'unknown',
        !!g &&
        groupOf(c.num)!==g
      );
    }
  }

  const b8=
    byNum[8];

  chip8.classList.toggle(
    'gone',
    !b8.active
  );

  chip8.classList.toggle(
    'on8',
    !!(
      groups[currentPlayer] &&
      groupRemaining(
        currentPlayer
      )===0 &&
      b8.active
    )
  );
}

function updateHUD(){

  if(
    currentPlayer===
    HUMAN
  ){

    turnText.textContent=
      "Your turn";

    row1.classList.add(
      'active'
    );

    row2.classList.remove(
      'active'
    );

  }else{

    turnText.textContent=
      "Computer's turn";

    row1.classList.remove(
      'active'
    );

    row2.classList.add(
      'active'
    );
  }

  const rem=
    groupRemaining(
      currentPlayer
    );

  turnBadge.textContent=
    rem>90
    ?
    '7'
    :
    (
      rem===0
      ?
      '8'
      :
      String(rem)
    );

  updateChips();
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer=null;

function toast(
  msg,
  ms
){

  const t=
    document.getElementById(
      'toast'
    );

  t.textContent=
    msg;

  t.style.opacity=1;

  clearTimeout(
    toastTimer
  );

  toastTimer=
    setTimeout(
      ()=>{
        t.style.opacity=0;
      },
      ms||2000
    );
}


/* =========================================================
   INPUT
========================================================= */

const raycaster=
  new THREE.Raycaster();

const ndc=
  new THREE.Vector2();

const tablePlane=
  new THREE.Plane(
    new THREE.Vector3(
      0,1,0
    ),
    0
  );

const hitP=
  new THREE.Vector3();

function pointerToTable(e){

  const rect=
    renderer.domElement
      .getBoundingClientRect();

  ndc.x=
    (
      (e.clientX-rect.left)/
      rect.width
    )*2-1;

  ndc.y=
    -(
      (e.clientY-rect.top)/
      rect.height
    )*2+1;

  raycaster.setFromCamera(
    ndc,
    camera
  );

  return raycaster.ray.intersectPlane(
    tablePlane,
    hitP
  )
  ?
  hitP
  :
  null;
}


/* =========================================================
   POWER
========================================================= */

const powerEl=
  document.getElementById(
    'power'
  );

const pFill=
  document.getElementById(
    'pFill'
  );

const pKnob=
  document.getElementById(
    'pKnob'
  );

function setPowerUI(){

  pFill.style.height=
    (powerVal*100)+'%';

  pKnob.style.top=
    'calc('+
    (powerVal*100)+
    '% - '+
    (powerVal*9)+
    'px)';
}

function resetPowerUI(){

  powerVal=0;

  setPowerUI();
}

function setPowerFromEvent(e){

  const rect=
    powerEl.getBoundingClientRect();

  const pad=10;

  powerVal=
    clamp(
      (
        e.clientY-
        rect.top-
        pad
      )/
      (
        rect.height-
        2*pad
      ),
      0,
      1
    );

  setPowerUI();
}

powerEl.addEventListener(
  'pointerdown',
  e=>{

    if(
      state!=='aim'||
      !isHumanTurn()
    )
      return;

    draggingPower=true;

    powerEl.setPointerCapture(
      e.pointerId
    );

    setPowerFromEvent(e);
  }
);

powerEl.addEventListener(
  'pointermove',
  e=>{

    if(
      draggingPower &&
      isHumanTurn()
    ){

      setPowerFromEvent(e);
    }
  }
);

function powerRelease(){

  if(!draggingPower)
    return;

  draggingPower=false;

  if(isHumanTurn())
    beginShoot();
}

powerEl.addEventListener(
  'pointerup',
  powerRelease
);

powerEl.addEventListener(
  'pointercancel',
  powerRelease
);


/* =========================================================
   SPIN
========================================================= */

const padEl=
  document.getElementById(
    'spinpad'
  );

const dotEl=
  document.getElementById(
    'spinDot'
  );

function setSpinFromEvent(e){

  const rect=
    padEl.getBoundingClientRect();

  let nx=
    (
      e.clientX-
      (
        rect.left+
        rect.width/2
      )
    )/
    (rect.width/2);

  let ny=
    (
      e.clientY-
      (
        rect.top+
        rect.height/2
      )
    )/
    (rect.height/2);

  const l=
    Math.hypot(nx,ny);

  if(l>1){

    nx/=l;
    ny/=l;
  }

  spin.x=nx;
  spin.y=-ny;

  dotEl.style.left=
    (50+nx*36)+'%';

  dotEl.style.top=
    (50+ny*36)+'%';
}

function resetSpinUI(){

  spin.x=0;
  spin.y=0;

  dotEl.style.left='50%';
  dotEl.style.top='50%';
}

padEl.addEventListener(
  'pointerdown',
  e=>{

    if(!isHumanTurn())
      return;

    draggingSpin=true;

    padEl.setPointerCapture(
      e.pointerId
    );

    setSpinFromEvent(e);
  }
);

padEl.addEventListener(
  'pointermove',
  e=>{

    if(
      draggingSpin &&
      isHumanTurn()
    ){

      setSpinFromEvent(e);
    }
  }
);

function spinRelease(){

  draggingSpin=false;
}

padEl.addEventListener(
  'pointerup',
  spinRelease
);

padEl.addEventListener(
  'pointercancel',
  spinRelease
);


/* =========================================================
   TABLE AIM
========================================================= */

const cv=
  renderer.domElement;

function updateAimFromEvent(e){

  if(
    state!=='aim'||
    !isHumanTurn()
  )
    return;

  const p=
    pointerToTable(e);

  if(!p)
    return;

  aimAngle=
    Math.atan2(
      p.x-byNum[0].x,
      p.z-byNum[0].z
    );
}

function updatePlaceFromEvent(e){

  if(
    state!=='placing'||
    !isHumanTurn()
  )
    return;

  const p=
    pointerToTable(e);

  if(!p)
    return;

  const x=
    clamp(
      p.x,
      -HALF_W+R,
      HALF_W-R
    );

  const z=
    clamp(
      p.z,
      -HALF_L+R,
      HALF_L-R
    );

  placeOk=true;

  for(
    const b of balls
  ){

    if(
      !b.active||
      b.isCue
    )
      continue;

    if(
      (b.x-x)**2+
      (b.z-z)**2
      <
      (2*R+.002)**2
    ){

      placeOk=false;

      break;
    }
  }

  placePos={
    x,
    z
  };

  ghostBall.visible=true;

  ghostBall.position.set(
    x,
    R,
    z
  );

  ghostBall.material.color.set(
    placeOk
    ?
    0xffffff
    :
    0xff5555
  );
}

cv.addEventListener(
  'pointermove',
  e=>{

    if(
      state==='aim' &&
      isHumanTurn()
    ){

      updateAimFromEvent(e);

    }else if(
      state==='placing' &&
      isHumanTurn()
    ){

      updatePlaceFromEvent(e);
    }
  }
);

cv.addEventListener(
  'pointerdown',
  e=>{

    if(
      state==='aim' &&
      isHumanTurn()
    ){

      updateAimFromEvent(e);

    }else if(
      state==='placing' &&
      isHumanTurn()
    ){

      updatePlaceFromEvent(e);
    }
  }
);

cv.addEventListener(
  'pointerup',
  e=>{

    if(
      state==='placing' &&
      isHumanTurn() &&
      placeOk
    ){

      const cue=
        byNum[0];

      cue.x=
        placePos.x;

      cue.z=
        placePos.z;

      cue.vx=0;
      cue.vz=0;

      cue.active=true;

      cue.mesh.visible=true;

      cue.mesh.scale.setScalar(1);

      cue.mesh.position.set(
        cue.x,
        R,
        cue.z
      );

      ghostBall.visible=false;

      state='aim';

      document
        .getElementById('power')
        .classList.remove(
          'disabled'
        );

      toast(
        'Cue ball placed',
        1000
      );
    }
  }
);



/* =========================================================
   START LOBBY
========================================================= */
const startScreen=document.getElementById('startScreen');
const startBtn=document.getElementById('startBtn');
const startDifficulty=document.getElementById('startDifficulty');

startBtn.addEventListener('click',()=>{
  initAudio();
  aiLevel=startDifficulty.value;
  difficultyEl.value=aiLevel;
  resetMatch();
  startScreen.classList.add('hidden');
  setTimeout(()=>startScreen.remove(),500);
  toast('Break first — good luck! 🎱',1800);
});

/* =========================================================
   BUTTONS
========================================================= */

document
  .getElementById('closeBtn')
  .addEventListener(
    'click',
    resetMatch
  );

document
  .getElementById('obtn')
  .addEventListener(
    'click',
    resetMatch
  );

document
  .getElementById('backBtn')
  .addEventListener(
    'click',
    ()=>{
      toast(
        'Press ✕ to restart the match',
        1400
      );
    }
  );

document
  .getElementById('fsBtn')
  .addEventListener(
    'click',
    ()=>{

      if(
        document.fullscreenElement
      ){

        document.exitFullscreen();

      }else{

        if(
          document.documentElement
            .requestFullscreen
        ){

          document.documentElement
            .requestFullscreen();
        }
      }
    }
  );


/* =========================================================
   CAMERA
========================================================= */

function fitCamera(){

  const w=
    wrap.clientWidth||1;

  const h=
    wrap.clientHeight||1;

  renderer.setSize(
    w,
    h
  );

  camera.aspect=
    w/h;

  const vFov=
    THREE.MathUtils.degToRad(46);

  const tan=
    Math.tan(vFov/2);

  const dist=
    Math.max(
      1.5/tan,
      .95/
      (
        tan*
        camera.aspect
      )
    );

  camera.position.set(
    0,
    dist*.99,
    dist*.20
  );

  camera.lookAt(
    0,
    0,
    .02
  );

  camera.updateProjectionMatrix();
}

window.addEventListener(
  'resize',
  fitCamera
);

document.addEventListener(
  'fullscreenchange',
  ()=>{
    setTimeout(
      fitCamera,
      120
    );
  }
);

fitCamera();


/* =========================================================
   START
========================================================= */

updateHUD();

resetPowerUI();

resetSpinUI();

/* Initial instructions are now shown on the start lobby. */



/* =========================================================
   MAIN LOOP
========================================================= */

let lastT=
  performance.now();

function animate(now){

  requestAnimationFrame(
    animate
  );

  const dt=
    Math.min(
      .033,
      (now-lastT)/1000
    )||.016;

  lastT=now;


  if(state==='rolling'){

    physics(dt);

    rollTimer+=dt;
  }


  updatePotAnims(dt);


  if(state==='rolling'){

    updateRoll(dt);
  }


  if(
    state==='aim'||
    state==='shooting'
  ){

    updateCue(dt);
  }else{

    cueGroup.visible=false;
  }


  updateGuide();


  if(
    state==='rolling' &&
    rollTimer>.25 &&
    !anyMotion()
  ){

    endShot();
  }


  renderer.render(
    scene,
    camera
  );
}

requestAnimationFrame(
  animate
);
