// JavaScript file used to control the main movement in Jam Stage
// built off the Three.js example given here: https://threejs.org/examples/#webgl_geometry_hierarchy2

var SEPARATION = 90, AMOUNTX = 40, AMOUNTY = 40;
let R_FACTOR = .15, G_FACTOR = .01, B_FACTOR = .2;

var container;
var camera, scene, renderer;

var particles, count = 0;

var mouseX = 0, mouseY = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var frequencyData = null;
var timeData = null;
var analyzer = null;
var activeParticles = null;
let basePositions = [];
let highestParticleY = 0;
let prevAmp = 0; // tracks the last total sum amplitude of the frequencies

/*** SETUP *****/

//add back button interaction
$(document).ready(function() {
    $('#back-btn').hide()

    // make brighter on hover
    $('#back-btn').hover(
        function() { 
            $(this).css({color: "white"}) }, 
        function() { 
            $(this).css({color: "gray"})  
        });

    // on click, go back to home screen
    $('#back-btn').click(
        function() { 
            exit();
        });
});


// called when BEGIN button is clicked 
function begin() {
    //remove intro screen
    $('#intro-screen').fadeOut();
    $('#back-btn').fadeIn();

    // start visualization
    init();
    animate();
}


/* 
* Set up initial visuals and connect to audio input 
*/
function init() {
    
    setupAudio();

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 1000;

    scene = new THREE.Scene();

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    var numParticles = AMOUNTX * AMOUNTY;

    var positions = new Float32Array( numParticles * 3 );
    var scales = new Float32Array( numParticles );
    activeParticles = {}

    var i = 0, j = 0;

    for ( var ix = 0; ix < AMOUNTX; ix ++ ) {
        activeParticles[ix] = [] // no active particles for this row yet

        for ( var iy = 0; iy < AMOUNTY; iy ++ ) {

            positions[ i ] = ix * SEPARATION - ( ( AMOUNTX * SEPARATION ) / 2 ); // x
            positions[ i + 1 ] = 0; // y
            positions[ i + 2 ] = iy * SEPARATION - ( ( AMOUNTY * SEPARATION ) / 2 ); // z
           
            basePositions.push(0) // base y position

            scales[ j ] = 1;

            i += 3;
            j ++;

        }

    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'scale', new THREE.BufferAttribute( scales, 1 ) );
    
    // add color!
    var colors = new Float32Array ( numParticles * 3 );
    for ( var ic = 0; ic < colors.length / 3; ic++) {
        colors[ic*3] = (Math.sin(i) + 1) / 2
        colors[ic*3+1] = (Math.sin(i) + 1) / 2
        colors[ic*3+2] = (Math.sin(i) + 1) / 2
    }
    geometry.setAttribute( 'customColor', new THREE.BufferAttribute( colors, 3 ) );

    var material = new THREE.ShaderMaterial( {

        uniforms: {
            color: { value: new THREE.Color(1, 1 , 1)},
        },
        vertexShader: document.getElementById( 'vertexshader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
        depthWrite: false,
        blending:THREE.AdditiveBlending,
        

    } );

    particles = new THREE.Points( geometry, material );
    scene.add( particles );


    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );


    // camera movement on hover
    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'touchstart', onDocumentTouchStart, false );
    document.addEventListener( 'touchmove', onDocumentTouchMove, false );

    // window responsiveness
    window.addEventListener( 'resize', onWindowResize, false );

}

/******  AUDIO CONTROLS  *******/ 

$('#audio-file-uploader').change(selectAudio);

function selectAudio(event) {
    var files = event.target.files;
    var audio = document.getElementById('curr-audio')
    audio.src = URL.createObjectURL(files[0]);
    audio.onend = function(e) {
        URL.revokeObjectURL(this.src);
    }
}

function exit() {
    // go back to intro screen
    $('#intro-screen').hide();
    $('#intro-screen').fadeIn();
    ctx.close()
    document.getElementById('curr-audio').remove();
    $('#back-btn').fadeOut();
}

function setupAudio(){
    
    // play audio in background
    var audio = document.getElementById('curr-audio')

    audio.load();
    audio.volume = .5
    audio.play();

    // set up audio analysis
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    var audioSrc = ctx.createMediaElementSource(audio)
    analyzer = ctx.createAnalyser();

    audioSrc.connect(analyzer)
    audioSrc.connect(ctx.destination);
    ctx.resume();
    frequencyData = new Uint8Array(analyzer.frequencyBinCount)
    timeData = new Uint8Array(analyzer.fftSize);
}


/****** RESPONSIVENESS AND MOUSE INTERACTION ******/ 

function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

// move camera on mouse move
function onDocumentMouseMove( event ) {
    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;
}

function onDocumentTouchStart( event ) {

    if ( event.touches.length === 1 ) {

        event.preventDefault();

        mouseX = event.touches[ 0 ].pageX - windowHalfX;
        mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

}

function onDocumentTouchMove( event ) {

    if ( event.touches.length === 1 ) {

        event.preventDefault();

        mouseX = event.touches[ 0 ].pageX - windowHalfX;
        mouseY = event.touches[ 0 ].pageY - windowHalfY;

         // hide back button
       //  $('#back-btn').fadeOut()

    }

}
 
/*********** PARTICLE ANIMATION **********/

// controls the animation
function animate() {

    requestAnimationFrame( animate );
    render();

}

function render() {

    analyzer.getByteFrequencyData(frequencyData)

    // set camera position
    camera.position.x += ( mouseX - camera.position.x ) * .05;
    camera.position.y += ( - mouseY - camera.position.y ) * .05;
    camera.lookAt( scene.position );

    var positions = particles.geometry.attributes.position.array;
    var scales = particles.geometry.attributes.scale.array;
    var colors = particles.geometry.attributes.customColor.array;

    // consolidate the frequency array by summing the amplitudes of nearby frequencies
    let avgData = []
    sumAmp = 0;
    let groupSize = 1;
    for(start_i=0; start_i < frequencyData.length - groupSize - 1; start_i+=groupSize) {
        // add average amplitude for group of frequencies 
        let sum = frequencyData.slice(start_i, start_i + groupSize + 1).reduce((prev, curr) => prev + curr) 
        avgData.push(sum / groupSize)
        
        // add amplitude to total sum
        sumAmp += sum

        // increase group size for higher freequencies 
        if(start_i > 30) {
            groupSize+=2
        }
    }

    var loudness = avgData.reduce((prev, cur) => prev + cur) /  avgData.length

    // determines rate of color change
    var speed_count = Math.abs(sumAmp - prevAmp) / 10000

    // determines the number of particles that move
    const amp_scale = sumAmp / 100000;
    const num_active = Math.floor(amp_scale * AMOUNTY)

    // min and max for sin x and z motion
    MIN_X_PERCENT = .7;
    MAX_X_PERCENT = 1;
    MIN_Z_PERCENT = 0;
    MAX_Z_PERCENT = amp_scale;

    // reposition particles
    highestParticleY = 0;
    lowestParticleY = 0;
    var all_pos = [];
    var i = 0, j = 0;
    for ( var ix = 0; ix < AMOUNTX; ix ++ ) {
        let volume_scale = avgData[ix]
        
       // if a different number of particles should be active, choose new random active particles
       if(Math.abs(activeParticles[ix].length - num_active) > 2){
            // store all positions in basePositions
            activeParticles[ix].forEach(
                (index) => basePositions[index] = positions[index*3 + 1]);
            activeParticles[ix] = []
            for(let x = 0; x < num_active; x++){
                let randIndex = Math.floor(Math.random() * (AMOUNTY + 1))
                activeParticles[ix].push(randIndex)
            }
        }
        let active = activeParticles[ix]
        
        var max_x = (ix * SEPARATION - ( ( AMOUNTX * SEPARATION ) / 2 )) * MAX_X_PERCENT
        var min_x = (ix * SEPARATION - ( ( AMOUNTX * SEPARATION ) / 2 ))  * MIN_X_PERCENT

        for ( var iy = 0; iy < AMOUNTY; iy ++ ) {

            var max_z = (iy * SEPARATION - ( ( AMOUNTY * SEPARATION ) / 2 )) * MAX_Z_PERCENT
            var min_z = (iy * SEPARATION - ( ( AMOUNTY * SEPARATION ) / 2 )) * MIN_Z_PERCENT;

             // sets x and z position of particle
             positions[ i ] =  ((Math.sin((count + amp_scale) / 3) + 1.0) / 2.0) * (max_x - min_x) + min_x; // x
             positions[ i + 2 ] = ((Math.sin((count + amp_scale) / 3) + 1.0) / 2.0) * (max_z - min_z) + min_z; // z

             // alter y if particle is on the deemed active particles
            if(active.includes(iy)){
                // sets y position of particle
                positions[ i + 1 ] =  basePositions[ iy ] + ((volume_scale * volume_scale) / 2000)

                // sets color of particle
                colors[i] = Math.min(1, (Math.sin(i + (Math.random()* speed_count * (volume_scale/250))) + 1) /  2 + R_FACTOR)
                colors[i+1] = Math.min(1, (Math.sin(i + (Math.random()* speed_count * (volume_scale/250))) + 1) / 2 + G_FACTOR)
                colors[i+2] = Math.min(1, (Math.sin(i + (Math.random()* speed_count * (volume_scale/250))) + 1) / 2 + B_FACTOR)
            }

            all_pos.push(positions[ i + 1 ])
           
            scales[j] = ( Math.sin( ( ix + count ) * 0.3 ) + 1 ) * (loudness*loudness) / 1000 +
                 ( Math.sin( ( iy + count ) * 0.5 ) + 1 ) * (loudness*loudness) / 1000; 
                 

            i += 3;
            j ++;
            

        }

    }

    // move all particles down by the mean y value so camera follows movement
    const mean = all_pos.reduce((prev, cur) => prev + cur) / all_pos.length
    for (let yi = 1; yi < AMOUNTY * AMOUNTX * 3; yi += 3 ) {
        positions[yi] = positions[yi] - mean;
    }

    // update render
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.scale.needsUpdate = true;
    particles.geometry.attributes.customColor.needsUpdate = true;
    
    renderer.render( scene, camera );

    // speed of re-scaling particles
    count += 0.1;
    prevAmp = sumAmp
}