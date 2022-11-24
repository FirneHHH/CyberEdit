const Keys = {};
window.addEventListener('keydown', ev => {
  Keys[ev.code] = true;
});
window.addEventListener('keyup', ev => {
  Keys[ev.code] = false;
});



// 2D grid in the top-right
const gc = document.getElementById('grid');
const ctx = gc.getContext('2d');

gc.width = gc.height = 16 * 20;

ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = '14px monospace';

// Compass
const compass = document.getElementById("compass");
const context = compass.getContext('2d');
compass.width = compass.height = 50;
context.lineWidth = 5;
context.strokeStyle = 'white';


// HTML selection stuffs
const toolselect = document.getElementById('toolselect');
const toolamount = document.getElementById('toolamount');
const layerselect = document.getElementById("layerselect");
const entityselect = document.getElementById("entityselect");
const heightselect = document.getElementById("heightselect");


layerselect.addEventListener( 'change', () => {
  if ( layerselect.value == 'height' ) {
    heightselect.classList.remove('hidden');
    entityselect.classList.add('hidden');
  } else {
    heightselect.classList.add('hidden');
    entityselect.classList.remove('hidden');
  }
});


// Three.js has forced my hand and now I shan't use require() in this project.
import * as THREE from './lib/three.js';

const scene =  new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60, // FOV
  window.innerWidth / window.innerHeight, // Aspect
  0.1, 100 // Near/Far clipping plane
);

const CamDist = 25;
let   CamRot  = 0;

camera.position.y = 15;
camera.position.z = CamDist;
camera.lookAt( 0, 0, 0 );



const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


// why do there need to be 2 textures...
const TexLoad = new THREE.TextureLoader();
const SmallTileTex = TexLoad.load( "./assets/tile.png" );
SmallTileTex.magFilter = THREE.NearestFilter;
const SmallTileMat = new THREE.MeshBasicMaterial({
  map: SmallTileTex
});
const TallTileTex = TexLoad.load( "./assets/tile.png" );
TallTileTex.wrapS = TallTileTex.wrapT = THREE.RepeatWrapping;
TallTileTex.repeat.set( 1, 10 );
TallTileTex.magFilter = THREE.NearestFilter;
const TallTileMat = new THREE.MeshBasicMaterial({
  map: TallTileTex
});

// Shared tile shit
const tileGeo = new THREE.BoxGeometry(1, 10, 1);
// PATCH OUT TILEMAT FOR THIS
function TopTile ( ttm ) {
  return [
    TallTileMat,
    TallTileMat,
    ttm,
    SmallTileMat,
    TallTileMat,
    TallTileMat,
  ]
}



// ALL the entity materials
// Also inneficient
const EntityGeo = new THREE.PlaneGeometry( 1, 1 );

const EntityMats = {};
for ( const type of [ 'stairs', 'jump', 'hideous', 'melee', 'projectile' ] ) {
  const tmp = new THREE.MeshBasicMaterial({
    map: TexLoad.load( `./assets/${type}.png` )
  });
  tmp.map.magFilter = THREE.NearestFilter;
  tmp.transparent = true;
  tmp.side = THREE.DoubleSide;
  EntityMats[ type ] = tmp;
}



const TileThreshold = 0.05; // Distance when tile snaps out of easing and into position

// I actually quite like the idea of classes that extend THREE.Mesh. Use this more often.
class Tile extends THREE.Mesh {
  constructor( x, y ) {
    super( tileGeo, TopTile( SmallTileMat ) );

    // Tile XY on grid (it should technically be XZ but idgas)
    this.x = x;
    this.y = y;

    // Replace the tilesHeight with this
    this.h = 0;

    this.position.set(
      7.5-x,
      -5,
      7.5-y
    );
    this.rotation.y = Math.PI; // i dont remember why i did this but im scared to remove it (and too lazy)

    this.sprite = null; // Sprite mesh
    this.entity = "0";  // Entity ID on tile

    scene.add( this ); // exists so i dont have to repeat code lmaooo
  }
  
  onBeforeRender() {
    // Height management
    const toY = this.h / 2 - 5; // Target Y
    if ( this.position.y == toY ) return; // If already in place
    if ( Math.abs( this.position.y - toY ) <= TileThreshold ) return this.position.y = toY; // If within threshold, snap to position
    this.position.y += DeltaT * ( toY - this.position.y ) / 300; // Ease into position
  }

  changeTopTile( mat ) {
    this.material = TopTile( EntityMats[ mat ] );
  }

  addSprite( type ) {
    // Create and add entity
    this.sprite = new THREE.Mesh( EntityGeo, EntityMats[ type ] );
    this.add( this.sprite );

    this.sprite.position.y = 5.5;
    this.sprite.rotateY( Math.PI ); 

    // cant do this in the tile beforerender but this works too
    this.sprite.onBeforeRender = () => this.sprite.lookAt( camera.position );
  }

  removeSprite() {
    // dont do anything if entity doesn't exist
    if ( this.sprite == null ) return;

    // Safely dispose of entity
    this.sprite.removeFromParent();
    this.sprite = null;
  }

  changeEntity( type ) {
    // Remove because it will be replaced later
    this.removeSprite();
    this.entity = type;

    // Set the top tile to the default to save code lool
    this.material = TopTile( SmallTileMat );

    switch ( type ) {
      case 's':
        this.changeTopTile( 'stairs' );
        break;
      case 'J':
        this.changeTopTile( 'jump' );
        break;
      case 'n':
        this.addSprite( 'melee' );
        break;
      case 'p':
        this.addSprite( 'projectile' );
        break;
      case 'H':
        this.addSprite( 'hideous' );
        break;
    }
  }
}

// Array of tiles for everything else to interface with
/**
 * @type {Array<Tile>}
 */
const tile = [];
for (let x=0; x<16; x++)
  for (let y=0; y<16; y++)
    tile[ x*16+y ] = new Tile( x, y );



// Enemy "zap" plane
const ZapMat = new THREE.MeshBasicMaterial({
  color: 0xff3030,
  opacity: 0.5,
  transparent: true
});
const ZapGeo = new THREE.PlaneGeometry( 18, 18 );
// MUST.. RESIST THE URGE TO MERGE THE MAT/GEO INTO THE MESH
const ZapPlane = new THREE.Mesh(
  ZapGeo, ZapMat
);
ZapPlane.rotateX( -Math.PI/2 );
// Place it at -4.25 units (to fix z-fighting)
ZapPlane.translateZ( -2.125 );
scene.add( ZapPlane );



// Cam pointerlock
let Pointlocked = false;
renderer.domElement.addEventListener( 'mousedown', ev => {
  //                     you never know
  if ( ev.button != 0 || Pointlocked ) return;
  
  Pointlocked = true;
  renderer.domElement.requestPointerLock();
});
renderer.domElement.addEventListener( 'mouseup', ev => {
  if ( ev.button != 0 || !Pointlocked ) return;

  Pointlocked = false;
  document.exitPointerLock();
});

// Cam rotation
renderer.domElement.addEventListener( 'mousemove', ev => {
  if ( !Pointlocked ) return;

  CamRot -= ev.movementX / 300;
  CamRot = CamRot % ( 2 * Math.PI );
});
// Cam vertical movement
renderer.domElement.addEventListener( 'wheel', ev => {
  camera.position.y -= ev.deltaY / 300;
});


console.log(EntityMats);

// Grid logic
let tileHover  = -1;
let lastTile   = -1;

function MoveTile( selector ) {
  const amount = parseInt( toolamount.value );

  if ( layerselect.value == 'height' ) {
    if ( toolselect.value == 'add' ) {
      tile[ selector ].h += amount;
    } else {
      tile[ selector ].h  = amount;
    }
  } else {
    tile[ selector ].changeEntity( entityselect.value );
  }
}

gc.addEventListener( 'mousemove', ev => {
  // this isn't how client coords are supposed to work.
  const cellX = Math.floor( (ev.clientX-960) / 20 );
  const cellY = Math.floor(  ev.clientY      / 20 );
  tileHover = cellX * 16 + cellY;

  if ( tileHover != lastTile ) {
    lastTile = tileHover;

    // if main button down
    if ( ev.buttons % 2 == 1 ) {
      MoveTile( tileHover );
    }
  }
});

gc.addEventListener( 'mousedown', ev => {
  if ( ev.button == 0 ) {
    MoveTile( tileHover );
  }
});

gc.addEventListener( 'mouseleave', () => {
  tileHover = -1;
});



document.getElementById('expbut').addEventListener( 'click', () => {
  let exported = "";
  for (let y=0; y<16; y++) {
    for (let x=0; x<16; x++) {
      const curNum = String(tile[ x*16+y ].h);
      exported += ( curNum.length > 1 ) ? `(${curNum})` : curNum;
    }
    exported += '\n';
  }
  exported += '\n';
  for (let y=0; y<16; y++) {
    for (let x=0; x<16; x++) {
      const curNum = tile[ x*16+y ].entity;
      exported += curNum;
    }
    exported += '\n';
  }

  const selector = document.createElement('input');
  selector.type="file";
  selector.nwworkingdir="C:\\Program Files (x86)\\Steam\\steamapps\\common\\ULTRAKILL\\Cybergrind\\Patterns\\";
  selector.nwsaveas="Pattern.cgp";
  selector.addEventListener( 'change', () => {
    require('fs').writeFileSync(selector.value, exported);
    alert("File saved!");
  });
  selector.click();
});

document.getElementById('impbut').addEventListener( 'click', () => {
  const selector = document.createElement('input');
  selector.type="file";
  selector.nwworkingdir="C:\\Program Files (x86)\\Steam\\steamapps\\common\\ULTRAKILL\\Cybergrind\\Patterns\\";
  selector.accept=".cgp";
  selector.addEventListener('change', () => {
    const file = require('fs').readFileSync(selector.value).toString().split("");

    let line  = 0;
    let index = 0;
    let tracking = false;
    let current = "";
  
    for ( const char of file ) {
      // i kinda blacked out while writing this code
      switch ( char ) {
        case '\n':
          line++;
          index = 0;
          break;
        case '(':
          tracking = true;
          break;
        case ')':
          tracking = false;
          tile[index*16+line].h = parseInt(current);
          current = "";
          index++;
          break;
        default:
          if ( tracking ) { current += char; index--; }
          else if ( line < 16 ) tile[index*16+line].h = parseInt( char );
          else tile[index*16+line-17].changeEntity( char );
          index++;
          break;
      }
    }
  });
  selector.click();
});



// keep time
let LastTime = Date.now();
let DeltaT = 0;

function animate() {
  // Milliseconds between the gaming
  DeltaT = Date.now() - LastTime;
  LastTime += DeltaT;

  // ZapPlane.rotateX( -0.01 );
  // ZapPlane.translateZ( -0.05 );


  // Draw the grid

  for (let x=0; x<16; x++) {
    for (let y=0; y<16; y++) {
      if (  x * 16 + y == tileHover ) ctx.fillStyle = 'white'
      else                            ctx.fillStyle = 'gray'
      
      ctx.fillRect( x*20, y*20, 20, 20 );

      ctx.fillStyle = 'black';
      ctx.fillText(
        ( layerselect.value == 'height' ) ?
          String( tile[x*16+y].h ) :
          tile[x*16+y].entity,
        x*20+10,
        y*20+10,
      )
    }
  }



  // Ease cam back to 0 (using compass instead)
  // if ( !Pointlocked ) {
  //   CamRot -= ( CamRot/300 ) * DeltaT;
  // }

  camera.position.x = -Math.sin(CamRot) * CamDist;
  camera.position.z = -Math.cos(CamRot) * CamDist;
  camera.lookAt( 0, 0, 0 );
  
  context.clearRect( 0, 0, 50, 50 );
  context.beginPath();
  context.moveTo( 25, 25 );
  context.lineTo( 25+Math.sin(-CamRot)*-25, 25+Math.cos(-CamRot)*-25 );
  context.stroke();

	renderer.render( scene, camera );
	requestAnimationFrame( animate );
}
animate();