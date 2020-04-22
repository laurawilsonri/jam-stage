// JavaScript file used to control the main movement in Jam Stage
// built off the Three.js example given here: https://threejs.org/examples/#webgl_geometry_hierarchy2

var SEPARATION = 100, AMOUNTX = 50, AMOUNTY = 50;

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


    // CODE TO ADD TEXT .... DOESN"T CURRENTLY WORK BUT WILL TRY TO RESSURECT SOON

    /*
    var geometry = new THREE.TextBufferGeometry( 'three.js', {

        font: font,

        size: 50,
        height: 15,
        curveSegments: 10,

        bevelThickness: 5,
        bevelSize: 1.5,
        bevelEnabled: true,
        bevelSegments: 10,

    } );

        geometry.center();

        var count = geometry.attributes.position.count;

        var displacement = new THREE.Float32BufferAttribute( count * 3, 3 );
        geometry.setAttribute( 'displacement', displacement );

        var customColor = new THREE.Float32BufferAttribute( count * 3, 3 );
        geometry.setAttribute( 'customColor', customColor );

        var color = new THREE.Color( 0xffffff );

        for ( var i = 0, l = customColor.count; i < l; i ++ ) {

        color.setHSL( i / l, 0.5, 0.5 );
        color.toArray( customColor.array, i * customColor.itemSize );

        }*/
    

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

    var i = 0, j = 0;

    // determines volume of movement 
    var volume_scale = 100

    for ( var ix = 0; ix < AMOUNTX; ix ++ ) {

        for ( var iy = 0; iy < AMOUNTY; iy ++ ) {

            positions[ i + 1 ] = ( Math.sin( ( ix + count ) * 0.3 ) * volume_scale ) +
                            ( Math.sin( ( iy + count ) * 0.5 ) * volume_scale );

        
            scales[ j ] = ( Math.sin( ( ix + count ) * 0.3 ) + 1 ) * 8 +
                            ( Math.sin( ( iy + count ) * 0.5 ) + 1 ) * 8;

            i += 3;
            j ++;

        }

    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.scale.needsUpdate = true;

    renderer.render( scene, camera );

    // DETERMINES SPEED (default is 0.1)
    count += 0.1;

    
    //console.log(frequencyData)
}