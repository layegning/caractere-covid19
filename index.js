import * as THREE from './build/three.module.js'; 
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js'; 
import TWEEN from './build/tween.esm.js';

let mixers = [];
let scene, gameover, start, camera, renderer;

//#region STATES + SCENES
 
start = new THREE.Scene();
scene = new THREE.Scene();
gameover = new THREE.Scene();

let GAME_STATE = "MAIN"; // Default -> Start screen

switch (GAME_STATE) {
    // Game States
    /*
    "START" -> start,
    "MAIN" -> scene  
    "GAMEOVER" -> gameover
    */
    case "START":
        start.visible = true; 
        scene.visible = false;
        gameover.visible = false;
        break;
    case "MAIN":
        start.visible = false; 
        scene.visible = true;
        gameover.visible = false;
            break;
    case "GAMEOVER":
        start.visible = false; 
        scene.visible = false;
        gameover.visible = true;
        break;
    default:
        break;
}

//#endregion 

//#region Camera Manager
camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
let camera_target = new THREE.Vector3(0,0,0);
//#endregion

//#region Renderer Settings
renderer = new THREE.WebGLRenderer();
renderer.antialias = true;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.capabilities.getMaxAnisotropy();
document.body.appendChild(renderer.domElement); 
//#endregion

//Create a empty parent to attach the GLTF File
let Player_GameObject = new THREE.Group();

//#region classes and in-game components
let corona_movement_speed = 0.25/2; 

let spawn_points = [
    {
        x: 2, y: 0, z: -30
    },
    {
        x: 0, y: 0, z: -35
    },
    {
        x: -2, y: 0, z: -40
    },
]

for (let i = 0; i < spawn_points.length; i++) {
    let obj_geo = new THREE.SphereGeometry(0.5,32,32); 
    let obj_mat = new THREE.MeshLambertMaterial({color: 0xffffff});
    let obj_mesh = new THREE.Mesh(obj_geo, obj_mat);
    obj_mesh.scale.set(0.25,0.25,0.25);
    obj_mesh.position.set(spawn_points[i].x, spawn_points[i].y, spawn_points[i].z);
    scene.add(obj_mesh);
}

let attack_player = true;

class Corona {
    constructor(x, y, z){
         var loader = new GLTFLoader();
        loader.load( 
            'assets/corona_gltf.gltf', 
            function (gltf) {
                gltf.scene.traverse( function(child) {
                if (child instanceof THREE.Mesh) { 
                    // apply custom material
                    child.material = new THREE.MeshToonMaterial({color: 0xff2643});  
                    // enable casting shadows
                    child.castShadow = true;
                    child.receiveShadow = true;
                    }
                });

                gltf.scene.position.set(x, y, z);
                gltf.scene.name = "Corona";   
                gltf.scene.scale.set(0.1,0.1,0.1); 
                scene.add(gltf.scene);
             }
        );
    }
}

function move_corona(obj){
    obj.position.z += corona_movement_speed;
    if(obj.position.z >= 5){
        reset_position(obj);
    }
}

function reset_position(obj){
    let spawn_index = Math.floor(Math.random() * spawn_points.length); 
    obj.position.set(
        spawn_points[spawn_index].x,
        spawn_points[spawn_index].y,
        spawn_points[spawn_index].z
        );
} 
//#endregion

//#region Lights & Helpers
var hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.45); 
scene.add( hemisphereLight ); 

var light = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( light );
light.intensity = 0.15;
 
//#endregion

//#region Instantiate enemies + Player + Floor
for (let i = 0; i < 10; i++) {  
    let spawn_index = Math.floor(Math.random() * spawn_points.length); 
    let corona  = new Corona(
        spawn_points[spawn_index].x,
        spawn_points[spawn_index].y,
        spawn_points[spawn_index].z + (i*-50)
        );
}

let loader = new GLTFLoader(); 
loader.load( 
    'assets/bottle.gltf', 
    function (gltf) {

        gltf.scene.name = "Player";   
        gltf.scene.scale.set(0.004,0.004,0.004);  
        gltf.scene.rotation.set(0,Math.PI/2,0); 
       
        gltf.scene.traverse((child)=>{
              // enable casting shadows
              child.castShadow = false;
              child.receiveShadow = false;
        })

        let mixer = new THREE.AnimationMixer(gltf.scene); 
        mixer.clipAction(gltf.animations[0]).setDuration(0.35).play();
        mixers.push(mixer);

        Player_GameObject.add(gltf.scene); 

    }
);

let floor_tex = new THREE.TextureLoader().load("./assets/floor.png");
floor_tex.wrapS = THREE.RepeatWrapping;
floor_tex.wrapT = THREE.RepeatWrapping;
floor_tex.repeat.set( 8, 8 );

let plane_geometry = new THREE.PlaneGeometry(30,30);
let plane_material = new THREE.MeshBasicMaterial({
    map: floor_tex, 
    side: THREE.DoubleSide
});

let floor = new THREE.Mesh(plane_geometry,plane_material);
floor.rotation.set(Math.PI/2,0,0);
floor.scale.set(3,3,3);
floor.position.set(0,-3,0);
scene.add(floor);

scene.add(Player_GameObject);

//#endregion  

//#region Input Manager
let paths = [
    { x : -2, y: 0 },
    { x : 0, y: 0 },
    { x : 2, y: 0 }
] 

window.addEventListener("keydown", (event) => {
    if(event.key == "ArrowLeft"){
        // Where is the current position of the player
            //If the player is in the middle -> Go 2 unit in the left side 
            if(Player_GameObject.position.x == 0){
                MovePlayer(Player_GameObject.position, paths[0]);
            }
            //If the player is in the third path on the right-> Go 2 unit to the middle
            else if(Player_GameObject.position.x == 2){
                MovePlayer(Player_GameObject.position, paths[1]); 
            }
            //If the player is in the left side -> Return 
            else if(Player_GameObject.position.x == -2){
                return;
            }
    } 

    if(event.key == "ArrowRight"){
         // Where is the current position of the player
            //If the player is in the middle -> Go 2 unit in the right side 
            if(Player_GameObject.position.x == 0){
                MovePlayer(Player_GameObject.position, paths[2]);
            }
            //If the player is in the third path on the left -> Go 2 unit to the middle
            else if(Player_GameObject.position.x == -2){
                MovePlayer(Player_GameObject.position, paths[1]);
            }
            //If the player is in the right side -> Return 
            else if(Player_GameObject.position.x == 2){
                return;
            }
    }
});

function MovePlayer(start, destination){
    var tween = new TWEEN.Tween(start).to(destination, 300);
    tween.onUpdate(function(){
        Player_GameObject.position.x = start.x;
        Player_GameObject.position.y = start.y;
    }); 
    tween.easing(TWEEN.Easing.Cubic.InOut);
    tween.start();
}
 
//#endregion

let clock = new THREE.Clock();  
 
//#region GUI
var controls = new function() {
    this.cameraX = 0.5;
    this.cameraY = 3;
    this.cameraZ = 3;  

    this.camera_target_x = 0;
    this.camera_target_y = 0; 
    this.camera_target_z = 0;
}

let skyColor_rgb = new function(){
    this.r = 0.5;
    this.g = 0.5;
    this.b = 0.5;
}

let groundColor_rgb = new function(){
    this.r = 1;
    this.g = 1;
    this.b = 1;
}

let gui = new dat.GUI();

gui.hide();

let skyColor = gui.addFolder("skyColor");
skyColor.add(skyColor_rgb, "r", 0, 1);
skyColor.add(skyColor_rgb, "b", 0, 1);
skyColor.add(skyColor_rgb, "g", 0, 1);
 
let groundColor = gui.addFolder("groundColor");
groundColor.add(groundColor_rgb, "r", 0, 1);
groundColor.add(groundColor_rgb, "b", 0, 1);
groundColor.add(groundColor_rgb, "g", 0, 1);
 
let camera_pos = gui.addFolder("camera_pos");
camera_pos.add(controls, 'cameraX', 0, 30);
camera_pos.add(controls, 'cameraY', 0, 30);
camera_pos.add(controls, 'cameraZ', 0, 30);  

let camera_target_pos = gui.addFolder("camera_target");
camera_target_pos.add(controls, 'camera_target_x', -30, 30);
camera_target_pos.add(controls, 'camera_target_y', -30, 30);
camera_target_pos.add(controls, 'camera_target_z', -30, 30);  

//#endregion

function animate() { 
    TWEEN.update();
    floor_tex.offset.y -= 0.05;
 
    hemisphereLight.color.r = skyColor_rgb.r;
    hemisphereLight.color.g = skyColor_rgb.g;
    hemisphereLight.color.b = skyColor_rgb.b;

    hemisphereLight.groundColor.r = groundColor_rgb.r;
    hemisphereLight.groundColor.g = groundColor_rgb.g;
    hemisphereLight.groundColor.b = groundColor_rgb.b;

    requestAnimationFrame(animate); 

    // Collision-ish detection
    scene.children.forEach(child => {
        if(child.name == "Corona"){
            if(attack_player){
                move_corona(child);
            }
            if(Player_GameObject != undefined){
                let dist = Player_GameObject.position.distanceTo(child.position);
                if(dist <= 0.85){
                    console.log("You lose !");
                }
            } 
        }
    });
 
    var delta = clock.getDelta();

    for ( var i = 0; i < mixers.length; i ++ ) { 
        mixers[i].update(delta); 
    }

    camera.position.x = controls.cameraX;
    camera.position.y = controls.cameraY;
    camera.position.z = controls.cameraZ;

    
    camera_target.set(
        controls.camera_target_x,
        controls.camera_target_y,
        controls.camera_target_z,
    );
    
    
    camera.lookAt(camera_target);
    
    //corona.move(); 

    renderer.render(scene, camera);
}; 
animate();

 