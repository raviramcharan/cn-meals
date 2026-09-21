import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Ambient field of oat flakes, seeds and berries drifting in space.
 * Reacts to pointer (parallax) and scroll (the field sinks and spreads).
 */
export default function Hero3D() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      return // no WebGL: the hero still works without the scene
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 14)

    scene.add(new THREE.HemisphereLight(0xfff6e0, 0x1b3a2e, 1.6))
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(4, 6, 8)
    scene.add(key)

    const group = new THREE.Group()
    scene.add(group)

    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    const wide = el.clientWidth > 700

    type Kind = { geo: THREE.BufferGeometry; mat: THREE.Material; count: number; scale: [number, number] }
    const flake = new THREE.SphereGeometry(1, 20, 12)
    flake.scale(1, 0.28, 0.78)
    const kinds: Kind[] = [
      { geo: flake, mat: new THREE.MeshStandardMaterial({ color: 0xe8d3a2, roughness: 0.85 }), count: wide ? 90 : 45, scale: [0.22, 0.42] },
      { geo: flake, mat: new THREE.MeshStandardMaterial({ color: 0xc79a3e, roughness: 0.7 }), count: wide ? 26 : 14, scale: [0.18, 0.3] },
      { geo: new THREE.IcosahedronGeometry(1, 3), mat: new THREE.MeshStandardMaterial({ color: 0x3f5fb8, roughness: 0.35 }), count: wide ? 16 : 8, scale: [0.16, 0.26] },
      { geo: new THREE.IcosahedronGeometry(1, 3), mat: new THREE.MeshStandardMaterial({ color: 0xc2405f, roughness: 0.3 }), count: wide ? 14 : 7, scale: [0.14, 0.24] },
      { geo: new THREE.SphereGeometry(1, 10, 8), mat: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6 }), count: wide ? 50 : 24, scale: [0.04, 0.07] },
    ]

    const dummy = new THREE.Object3D()
    const meshes: { mesh: THREE.InstancedMesh; data: { p: THREE.Vector3; r: THREE.Euler; s: number; spin: THREE.Vector3; phase: number }[] }[] = []
    for (const k of kinds) {
      const mesh = new THREE.InstancedMesh(k.geo, k.mat, k.count)
      const data = Array.from({ length: k.count }, () => ({
        p: new THREE.Vector3(rand(-11, 11), rand(-6, 6), rand(-6, 3)),
        r: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)),
        s: rand(...k.scale),
        spin: new THREE.Vector3(rand(-0.4, 0.4), rand(-0.4, 0.4), rand(-0.4, 0.4)),
        phase: rand(0, Math.PI * 2),
      }))
      meshes.push({ mesh, data })
      group.add(mesh)
    }

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / innerWidth - 0.5) * 2
      pointer.ty = (e.clientY / innerHeight - 0.5) * 2
    }
    addEventListener('pointermove', onMove, { passive: true })

    const onResize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(el)

    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(el)

    const clock = new THREE.Clock()
    let raf = 0
    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      const t = clock.getElapsedTime()
      const scroll = Math.min(scrollY / el.clientHeight, 1.2)
      pointer.x += (pointer.tx - pointer.x) * 0.04
      pointer.y += (pointer.ty - pointer.y) * 0.04
      group.rotation.y = pointer.x * 0.18
      group.rotation.x = pointer.y * 0.1 + scroll * 0.3
      camera.position.z = 14 + scroll * 5
      camera.position.y = -scroll * 2.5
      for (const { mesh, data } of meshes) {
        data.forEach((d, i) => {
          dummy.position.set(d.p.x, d.p.y + Math.sin(t * 0.5 + d.phase) * 0.35, d.p.z)
          dummy.rotation.set(d.r.x + t * d.spin.x, d.r.y + t * d.spin.y, d.r.z + t * d.spin.z)
          dummy.scale.setScalar(d.s)
          dummy.updateMatrix()
          mesh.setMatrixAt(i, dummy.matrix)
        })
        mesh.instanceMatrix.needsUpdate = true
      }
      renderer.render(scene, camera)
    }
    if (reduced) {
      clock.stop()
      frame()
      cancelAnimationFrame(raf)
      renderer.render(scene, camera)
    } else {
      frame()
    }

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', onMove)
      ro.disconnect()
      io.disconnect()
      kinds.forEach((k) => {
        k.geo.dispose()
        k.mat.dispose()
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={ref} aria-hidden className="absolute inset-0" />
}
