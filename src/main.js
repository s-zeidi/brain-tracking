import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

// ============================
// SCENE
// ============================

const scene = new THREE.Scene()

const textureLoader = new THREE.TextureLoader()
textureLoader.load('/textures/road.jpg', (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace
  scene.background = texture
    const groundGeo = new THREE.PlaneGeometry(0, 0)
    const groundMat = new THREE.MeshStandardMaterial({
      map: textureLoader.load('/textures/road.jpg')
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1.5
    scene.add(ground)
})

// ============================
// CAMERA
// ============================

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)

camera.position.set(0, 1.6, 5)
camera.lookAt(0, 0.8, 0)

let basePosition = new THREE.Vector3().copy(camera.position)

// ============================
// RENDERER
// ============================

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement)

// ============================
// CONTROLS (NO MOUSE INTERACTION)
// ============================

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.07
controls.enablePan = false
controls.enableZoom = false
controls.enableRotate = false   // 🔥 Disable rotation completely

controls.minDistance = 4.85
controls.maxDistance = 5.57

// ============================
// LIGHT
// ============================

scene.add(new THREE.AmbientLight(0xffffff, 0.7))

const dir = new THREE.DirectionalLight(0xffffff, 2)
dir.position.set(2, 6, 8)
scene.add(dir)

// ============================
// LOAD CAR
// ============================

const loader = new GLTFLoader()
let car

loader.load('/models/bmw/scene.gltf', (gltf) => {

  car = gltf.scene

  const box = new THREE.Box3().setFromObject(car)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  car.position.sub(center)

  const scale = 5 / Math.max(size.x, size.y, size.z)
  car.scale.setScalar(scale)

  const newBox = new THREE.Box3().setFromObject(car)
  const newSize = newBox.getSize(new THREE.Vector3())

  car.position.y += newSize.y / 2 - 1.5

  scene.add(car)

  setupUI()
})

// ============================
// UI SLIDERS (MODEL ONLY)
// ============================

function setupUI() {

  const posX = document.getElementById("posX")
  const posY = document.getElementById("posY")
  const posZ = document.getElementById("posZ")
  const scaleSlider = document.getElementById("scale")
  const rotY = document.getElementById("rotY")

  posX.addEventListener("input", () => {
    car.position.x = parseFloat(posX.value)
    document.getElementById("posXVal").innerText = posX.value
  })

  posY.addEventListener("input", () => {
    car.position.y = parseFloat(posY.value)
    document.getElementById("posYVal").innerText = posY.value
  })

  posZ.addEventListener("input", () => {
    car.position.z = parseFloat(posZ.value)
    document.getElementById("posZVal").innerText = posZ.value
  })

  scaleSlider.addEventListener("input", () => {
    const s = parseFloat(scaleSlider.value)
    car.scale.set(s, s, s)
    document.getElementById("scaleVal").innerText = scaleSlider.value
  })

  rotY.addEventListener("input", () => {
    car.rotation.y = THREE.MathUtils.degToRad(parseFloat(rotY.value))
    document.getElementById("rotYVal").innerText = rotY.value + "°"
  })
}

// ============================
// HEAD TRACKING
// ============================

const video = document.getElementById("webcam")

let smoothX = 0
let smoothY = 0
let smoothZ = 0

async function initWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true })
  video.srcObject = stream
  await video.play()
}

async function initTracking() {

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  )

  const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    },
    runningMode: "VIDEO",
    numFaces: 1
  })

  function detect() {

    const results = faceLandmarker.detectForVideo(video, performance.now())

    if (results.faceLandmarks.length > 0) {

      const nose = results.faceLandmarks[0][1]

      const centerX = nose.x - 0.5
      const centerY = nose.y - 0.5
      const depth = nose.z

      const deadZone = 0.01
      const targetX = Math.abs(centerX) < deadZone ? 0 : centerX
      const targetY = Math.abs(centerY) < deadZone ? 0 : centerY
      const targetZ = -depth

      const alpha = 0.06
      smoothX = alpha * targetX + (1 - alpha) * smoothX
      smoothY = alpha * targetY + (1 - alpha) * smoothY
      smoothZ = alpha * targetZ + (1 - alpha) * smoothZ
    }

    requestAnimationFrame(detect)
  }

  detect()
}

// ============================
// ANIMATION LOOP
// ============================

function animate() {

  requestAnimationFrame(animate)

  controls.update()

  const offsetX = THREE.MathUtils.clamp(smoothX * 2, -1.2, 1.2)
  const offsetY = THREE.MathUtils.clamp(-smoothY * 1.5, -0.8, 0.8)

  const depthScale = 12

  let newZ = basePosition.z - smoothZ * depthScale

  newZ = THREE.MathUtils.clamp(
    newZ,
    controls.minDistance,
    controls.maxDistance
  )

  camera.position.x = basePosition.x - offsetX * 3
  camera.position.y = basePosition.y + offsetY * 2
  camera.position.z = newZ

  renderer.render(scene, camera)
}

animate()
initWebcam().then(initTracking)