import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// ----------------------
// Scene
// ----------------------
const scene = new THREE.Scene()

const textureLoader = new THREE.TextureLoader()

textureLoader.load('/textures/road.jpg', (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace
  scene.background = texture
})

// ----------------------
// Camera
// ----------------------
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
////camera.position.set(0, 2, 6)
camera.position.set(3, 3, 6)
camera.lookAt(0, 2.2, 0)
// ----------------------
// Renderer
// ----------------------
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

// ----------------------
// Lighting (Studio Setup)
// ----------------------
const mainLight = new THREE.DirectionalLight(0xffffff, 3)
mainLight.position.set(2, 6, 10)
mainLight.castShadow = true
scene.add(mainLight)

const fillLight = new THREE.DirectionalLight(0xffffff, 8)
fillLight.position.set(-1, 5, -5)
scene.add(fillLight)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambientLight)

// ----------------------
// Ground (Shadow Catcher)
// ----------------------
const groundGeometry = new THREE.PlaneGeometry(50, 50)
const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.2 })

const ground = new THREE.Mesh(groundGeometry, groundMaterial)
ground.rotation.x = -Math.PI / 2
ground.position.y = -1
ground.receiveShadow = true
scene.add(ground)

// ----------------------
// Load BMW Model
// ----------------------
const loader = new GLTFLoader()

let carModel = null

loader.load(
  '/models/bmw/scene.gltf',
  (gltf) => {

    carModel = gltf.scene

    carModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(carModel)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    // Move model so its center is at world origin
    carModel.position.x -= center.x
    carModel.position.y -= center.y
    carModel.position.z -= center.z

    // Auto-scale
    const maxDim = Math.max(size.x, size.y, size.z)
    const desiredSize = 6
    const scale = desiredSize / maxDim
    carModel.scale.setScalar(scale)

    // Recompute box after scaling
    const newBox = new THREE.Box3().setFromObject(carModel)
    const newSize = newBox.getSize(new THREE.Vector3())

    // Place it properly on ground
    carModel.position.y += newSize.y / 2

    scene.add(carModel)
  }
)
// ----------------------
// Resize Handling
// ----------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ----------------------
// Animation Loop
// ----------------------
function animate() {
  requestAnimationFrame(animate)

  if (carModel) {
    carModel.rotation.y += 0.002
  }

  renderer.render(scene, camera)
}

animate()