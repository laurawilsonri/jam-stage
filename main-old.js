// JavaScript file used to control the main movement in Jam Stage
// built off the Three.js example given here: https://threejs.org/examples/#webgl_geometry_hierarchy2

var SEPARATION = 100, AMOUNTX = 40, AMOUNTY = 40;

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

let frequencyData = null;
let timeDomainData = null;
let analyzer = null;
let bufferLength = 0;
let geometry = null;


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

    var i = 0, j = 0;

    for ( var ix = 0; ix < AMOUNTX; ix ++ ) {

        for ( var iy = 0; iy < AMOUNTY; iy ++ ) {

            positions[ i ] = ix * SEPARATION - ( ( AMOUNTX * SEPARATION ) / 2 ); // x
            positions[ i + 1 ] = 0; // y
            positions[ i + 2 ] = iy * SEPARATION - ( ( AMOUNTY * SEPARATION ) / 2 ); // z

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

    

    //

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
    bufferLength = analyzer.frequencyBinCount;
    frequencyData = new Uint8Array(analyzer.frequencyBinCount)
    timeDomainData= new Uint8Array(analyzer.fftSize);
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
    analyzer.getByteTimeDomainData(timeDomainData);
    //console.log(timeDomainData)

    // set camera position
    camera.position.x += ( mouseX - camera.position.x ) * .05;
    camera.position.y += ( - mouseY - camera.position.y ) * .05;
    camera.lookAt( scene.position );

    var positions = particles.geometry.attributes.position.array;
    var scales = particles.geometry.attributes.scale.array;
   // var colors = particles.geometry.attributes.color.array;

    var i = 0, j = 0;

    // consolidate the frequency array by summing the amplitudes of nearby frequencies
    let avgData = []
    let groupSize = 1;
    for(start_i=1; start_i < frequencyData.length - groupSize - 1; start_i+=groupSize) {
        avgData.push(frequencyData.slice(start_i, start_i + groupSize + 1).reduce((prev, curr) => prev + curr) / groupSize)
        if(start_i > 20) {
            groupSize+=2
        }
    }

    // determines volume of movement 
    var volume_scale = 100 

    for ( var ix = 0; ix < AMOUNTX; ix ++ ) {
        volume_scale = avgData[ix]

        for ( var iy = 0; iy < AMOUNTY; iy ++ ) {
            
           // volume_scale = frequencyData[iy] 
           // console.log(volume_scale)
           //  positions[ i + 1 ] = ( Math.sin( ( ix + count ) * 0.3 ) * volume_scale ) +
           //                  ( Math.sin( ( iy + count ) * 0.5 ) * volume_scale );
           // positions[ i + 1 ] = Math.sin((ix + count)*.3) * volume_scale

            positions[ i + 1 ] = volume_scale

        
           // scales[ j ] = ( Math.sin( ( ix + count ) * 0.3 ) + 1 ) * 8 +
           //                 ( Math.sin( ( iy + count ) * 0.5 ) + 1 ) * 8;

           scales[ j ] = (volume_scale / 280) * 25


          // colors[ j ] = .5

            i += 3;
            j ++;

        }

    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.scale.needsUpdate = true;
   // particles.geometry.attributes.color.needsUpdate = true;

   // renderer.render( scene, camera );

    // DETERMINES SPEED (default is 0.1)
    count += 0.1;

    
    //console.log(frequencyData)
}