'use strict';

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// shim layer with setTimeout fallback
window['requestAnimFrame'] = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 1000 / 60);
          };
})();

var projector, renderer, scene, light, camera,
		initScene, render, main, updateBoxes,
		createBox, now, lastbox = 0, boxes = [];
var collisionConfiguration, dispatcher, overlappingPairCache, solver, // Ammo world
			ground, groundShape, groundTransform, groundMass, localInertia, motionState, rbInfo, groundAmmo;

// Setup Three with a Projector, Renderer, Scene and Light
projector = new THREE.Projector();

renderer = new THREE.WebGLRenderer({antialias:true});
	renderer.shadowMapEnabled = true;
	renderer.shadowMapSoft = true;
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

scene = new THREE.Scene();

light = new THREE.DirectionalLight(0xFFFFFF);
	light.position.set(40,40,25);
	light.target.position.copy(scene.position);
	light.castShadow = true;
	light.shadowCameraLeft = -25;
	light.shadowCameraRight = -25;
	light.shadowCameraTop = -25;
	light.shadowCameraBottom = -25;
	light.shadowBias = -.0001;
	scene.add(light);

// Ammo world for physics;
	collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
	dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
	overlappingPairCache = new Ammo.btDbvtBroadphase();
	solver = new Ammo.btSequentialImpulseConstraintSolver();
	scene.world = new Ammo.btDiscreteDynamicsWorld(dispatcher,
		overlappingPairCache, solver, collisionConfiguration);
	scene.world.setGravity(new Ammo.btVector3(0, -12 , 0));

camera = new THREE.PerspectiveCamera(
	30, 
	window.innerWidth / window.innerHeight, 
	1, 
	1000);
	camera.position.set(60,50,60);
	camera.lookAt(scene.position);
	scene.add(camera);


// Ground
var ground_geom = new THREE.PlaneGeometry(50,50, 75, 75);
	for (var i = 0; i < ground_geom.vertices.length; i++){
		var vertex = ground_geom.vertices[i];
		vertex.z = 1.5 * Math.random();
	}
	ground_geom.computeFaceNormals();
	ground_geom.computeVertexNormals();

	// Materials
	var ground_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'images/grass.png' ) }),
		.8, // high friction
		.4 // low restitution
	);
	// ground = new Physijs.HeightfieldMesh(
	// 	ground_geom,
	// 	ground_material,
	// 	0,
	// 	50,
	// 	50);
ground = new THREE.Mesh(
	ground_geom,
	new THREE.MeshLambertMaterial({color: 0xCCCCCC})
	);
	ground.receiveShadow = true;
	ground.rotation.x = -Math.PI / 2;
	scene.add(ground);

	// Ground physics
	groundShape = new Ammo.btBoxShape(new Ammo.btVector3(25,1,25));
	groundTransform = new Ammo.btTransform(groundTransform);
	groundTransform.setIdentity();
	groundTransform.setOrigin(new Ammo.btVector3(0, -1, 0));

	groundMass = 0;
	localInertia = new Ammo.btVector3(0, 0, 0);
	motionState = new Ammo.btDefaultMotionState(groundTransform);
	rbInfo = new Ammo.btRigidBodyConstructionInfo(groundMass, motionState,
			groundShape, localInertia);
	groundAmmo = new Ammo.btRigidBody(rbInfo);
	scene.world.addRigidBody(groundAmmo);

var cubegeom = new THREE.CubeGeometry(2,2,2,2,2);
var spheregeom = new THREE.SphereGeometry(0.5,1,5);
var material = new THREE.MeshLambertMaterial({color: 0xEEEEEE, ambient: 0x00474f});
var spherematerial = new THREE.MeshLambertMaterial({color: 0x3def66, ambient:0xFFFFFF});
	var cube = new THREE.Mesh(cubegeom, material);
	cube.position.y=4
	var sphere = new THREE.Mesh(spheregeom, spherematerial);
	scene.add(cube);
	scene.add(sphere);

createBox = function() {
		var box, position_x, position_z,
			mass, startTransform, localInertia, boxShape, motionState, rbInfo, boxAmmo;
		
		position_x = Math.random() * 10 - 5;
		position_z = Math.random() * 10 - 5;
		
		// Create 3D box model
		box = new THREE.Mesh(
			new THREE.CubeGeometry( 3, 3, 3),
			new THREE.MeshLambertMaterial({ opacity: 0, transparent: true })
		);
		box.material.color.setRGB( Math.random() * 100 / 100, Math.random() * 100 / 100, Math.random() * 100 / 100 );
		box.castShadow = true;
		box.receiveShadow = true;
		box.useQuaternion = true;
		scene.add( box );
		
		new TWEEN.Tween(box.material).to({opacity: 1}, 500).start();
		
		// Create box physics model
		mass = 3 * 3 * 3;
		startTransform = new Ammo.btTransform();
		startTransform.setIdentity();
		startTransform.setOrigin(new Ammo.btVector3( position_x, 20, position_z ));
		
		localInertia = new Ammo.btVector3(0, 0, 0);
		
		boxShape = new Ammo.btBoxShape(new Ammo.btVector3( 1.5, 1.5, 1.5 ));
		boxShape.calculateLocalInertia( mass, localInertia );
		
		motionState = new Ammo.btDefaultMotionState( startTransform );
		rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, boxShape, localInertia );
		boxAmmo = new Ammo.btRigidBody( rbInfo );
		scene.world.addRigidBody( boxAmmo );
		
		boxAmmo.mesh = box;
		boxes.push( boxAmmo );
	};
	
	updateBoxes = function() {
		scene.world.stepSimulation( 1 / 60, 5 );
		var i, transform = new Ammo.btTransform(), origin, rotation;
		
		for ( i = 0; i < boxes.length; i++ ) {
			boxes[i].getMotionState().getWorldTransform( transform );
			
			origin = transform.getOrigin();
			boxes[i].mesh.position.x = origin.x();
			boxes[i].mesh.position.y = origin.y();
			boxes[i].mesh.position.z = origin.z();
			
			rotation = transform.getRotation();
			boxes[i].mesh.quaternion.x = rotation.x();
			boxes[i].mesh.quaternion.y = rotation.y();
			boxes[i].mesh.quaternion.z = rotation.z();
			boxes[i].mesh.quaternion.w = rotation.w();
		};
	};


render = function render() {
	renderer.render(scene, camera);
	}

main = function main(){
	requestAnimationFrame(main);
	render();

	now = new Date().getTime();
	if ( now - lastbox > 1000){
		createBox();
		lastbox = now;
	}
	updateBoxes();
}
main();

	window.onload = function() {
		TWEEN.start();
		requestAnimFrame(main);
	}