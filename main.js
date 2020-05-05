// JavaScript file used to control the main movement in Jam Stage
// built off the Three.js example given here: https://threejs.org/examples/#webgl_geometry_hierarchy2

var SEPARATION = 90, AMOUNTX = 40, AMOUNTY = 40;

var container;
var camera, scene, renderer;

var particles, count = 0;

var mouseX = 0, mouseY = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

// loads a specific font -- I added this when I was trying to add words but will get back to this
//var loader = new THREE.FontLoader();
//loader.load( 'helvetiker_bold.typeface.json', function ( font ) {
//} );

var frequencyData = null;
var analyzer = null;
var activeParticles = null;
let basePositions = [];
let highestParticleY = 0;
let dir = 1;


// called when BEGIN button is clicked 
function begin() {
    //remove intro screen
    $('#intro-screen').fadeOut();

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

    //add fog to scene -- doesn't work because shader is incompatible
    var fogColor = new THREE.Color(0xffffff);
    scene.fog = new THREE.FogExp2(fogColor, 0.0025, 20 );

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
            basePositions.push(0)

            scales[ j ] = 1;

            i += 3;
            j ++;

        }

    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'scale', new THREE.BufferAttribute( scales, 1 ) );

    var material = new THREE.ShaderMaterial( {

        uniforms: {
            color: { value: new THREE.Color( 0xffffff ) },
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

function setupAudio(){
    
    // play audio in background
    var audio = document.getElementById('curr-audio')
    audio.load();
    audio.volume = .3
    audio.play();

    // set up audio analysis
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var audioSrc = ctx.createMediaElementSource(audio)
    analyzer = ctx.createAnalyser();

    audioSrc.connect(analyzer)
    audioSrc.connect(ctx.destination);
    ctx.resume();
    frequencyData = new Uint8Array(analyzer.frequencyBinCount)
}

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

    }

}
 

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

    // consolidate the frequency array by summing the amplitudes of nearby frequencies
    let avgData = []
    let sumAmplitude = 0;
    let groupSize = 1;
    for(start_i=0; start_i < frequencyData.length - groupSize - 1; start_i+=groupSize) {
        // add average amplitude for group of frequencies 
        let sum = frequencyData.slice(start_i, start_i + groupSize + 1).reduce((prev, curr) => prev + curr) 
        avgData.push(sum / groupSize)
        
        // add amplitude to total sum
        sumAmplitude += sum

        // increase group size for higher freequencies 
        if(start_i > 30) {
            groupSize+=2
        }
    }

    // determines the number of particles that move
    const amp_scale = sumAmplitude / 100000;
    const num_active = Math.round(amp_scale * AMOUNTY)

    // reposition particles
    highestParticleY = 0;
    lowestParticleY = 0;
    var all_pos = [];
    var i = 0, j = 0;
    for ( var ix = 0; ix < AMOUNTX; ix ++ ) {
        let volume_scale = avgData[ix]
        
        // if more particles should be active, choose new random active particles
       if(activeParticles[ix].length < num_active){
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
        

        for ( var iy = 0; iy < AMOUNTY; iy ++ ) {

            if(active.includes(iy)){
                // sets y position of particle
                positions[ i + 1 ] =  basePositions[ iy ] + ((volume_scale * volume_scale) / 300 * dir)
            }

            all_pos.push(positions[ i + 1 ])
            if(positions[ i + 1 ] > highestParticleY) {
                highestParticleY = positions[ i + 1 ]
            } else if (positions[ i + 1 ] < lowestParticleY) {
                lowestParticleY = positions[ i + 1 ]
            }
           
            // sets scale of particle 
            scales[ j ] = ( Math.sin( ( ix + count ) * 0.3 ) + 1 ) * 8 +
                            ( Math.sin( ( iy + count ) * 0.5 ) + 1 ) * 8;

            i += 3;
            j ++;
            

        }

    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.scale.needsUpdate = true;

    // swap directions if reached too high or low
    var mean = all_pos.reduce((prev, cur) => prev + cur) / all_pos.length
    if((mean > 3400 && dir == 1) || (mean < 2700 && dir == -1)) {
        console.log("SWITCHING TO ", dir)
        dir *= -1;
    } 
    
    // pan scene up based on y of highest particle
    top_particle_within_view = highestParticleY <= (scene.position.y + window.innerHeight)
    bottom_particle_within_view = lowestParticleY >= (scene.position.y)
    mean_particle_within_view = mean >= scene.position.y && mean 

    if(dir == 1) {
        console.log(dir)
        const diff = (Math.abs(scene.position.y) + window.innerHeight) - Math.abs(highestParticleY)
        if(diff > 0) {
             scene.position.y -= (dir * ((amp_scale + 1)*(amp_scale + 1) - .5));
        } else if (diff < 0) {
           scene.position.y -= (dir * ((amp_scale + 1)*(amp_scale + 1) + 1.5));
        }
    } else { 
        const diff = (Math.abs(scene.position.y)) - Math.abs(mean)
        if(diff > 0) {
             scene.position.y -= (dir * ((amp_scale + 1)*(amp_scale + 1) - .5));
        } else if (diff < 0) {
           dir *= 1;
        }
    }
    
    renderer.render( scene, camera );

    // DETERMINES SPEED IF USING SIN(default is 0.1)
    count += 0.1;
}