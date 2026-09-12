"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { Animal, exploreLengths, explorePositions } from "./Animals";
import { species, type SpeciesId } from "../lib/corpus";
type Props = {
  selected: SpeciesId | null;
  focused: SpeciesId | null;
  reset: number;
  reduced: boolean;
  onSelect: (id: SpeciesId) => void;
  onError: () => void;
};
declare global {
  interface Window {
    __oceanFrames?: {
      remaining: number;
      values: number[];
      renderer: string;
      triangles: number;
      calls: number;
    };
  }
}
function CameraRig({ selected, reset, reduced }: Props) {
  const controls = useRef<OrbitControlsImpl>(null);
  const goal = useRef(new THREE.Vector3());
  const destination = useRef(new THREE.Vector3());
  const moving = useRef(true);
  const { camera, size } = useThree();
  useEffect(() => {
    const index = species.findIndex((s) => s.id === selected);
    const point = index >= 0 ? explorePositions[index] : [0, 0, 0];
    goal.current.set(...(point as [number, number, number]));
    const aspect = size.width / size.height;
    const distance =
      index >= 0
        ? Math.max(9, exploreLengths[index] * 1.45, 11 / aspect)
        : Math.max(16, 18 / aspect);
    destination.current
      .copy(goal.current)
      .add(new THREE.Vector3(0, 1, distance));
    moving.current = true;
  }, [selected, reset, size.width, size.height]);
  useFrame((state, delta) => {
    if (controls.current && moving.current) {
      const a = reduced ? 1 : 1 - Math.exp(-delta * 4);
      camera.position.lerp(destination.current, a);
      controls.current.target.lerp(goal.current, a);
      controls.current.update();
      if (camera.position.distanceTo(destination.current) < 0.01)
        moving.current = false;
    }
    const sample = window.__oceanFrames;
    if (sample && sample.remaining > 0) {
      sample.values.push(delta * 1000);
      sample.remaining -= delta;
      sample.calls = state.gl.info.render.calls;
      sample.triangles = state.gl.info.render.triangles;
    }
  });
  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping={!reduced}
      minDistance={5}
      maxDistance={100}
      minPolarAngle={Math.PI * 0.25}
      maxPolarAngle={Math.PI * 0.75}
      minAzimuthAngle={-Math.PI * 0.45}
      maxAzimuthAngle={Math.PI * 0.45}
      onStart={() => {
        moving.current = false;
      }}
    />
  );
}
function Particles({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(180 * 3);
    for (let i = 0; i < a.length; i++)
      a[i] = ((Math.sin(i * 127.1 + 42) * 43758.5453) % 1) * 18;
    return a;
  }, []);
  useFrame((_, delta) => {
    if (ref.current && !reduced) ref.current.rotation.y += delta * 0.008;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color="#a0d6dd"
        transparent
        opacity={0.38}
        depthWrite={false}
      />
    </points>
  );
}
const sceneryMaterial = new THREE.MeshStandardMaterial({
  color: "#16463f",
  roughness: 0.9,
  flatShading: true,
});
const coralMaterial = new THREE.MeshStandardMaterial({
  color: "#a35f65",
  roughness: 0.85,
  flatShading: true,
});
const schoolMaterial = new THREE.MeshStandardMaterial({
  color: "#79aeb2",
  roughness: 0.7,
  flatShading: true,
});
const seaweedGeometry = new THREE.CylinderGeometry(0.025, 0.08, 1, 5);
const coralGeometry = new THREE.CylinderGeometry(0.06, 0.12, 1, 6);
const seabedGeometry = new THREE.PlaneGeometry(38, 7, 1, 1);
const schoolGeometry = new THREE.ConeGeometry(0.08, 0.3, 5);
schoolGeometry.rotateZ(-Math.PI / 2);
const ignoreRaycast = () => null;
function Scenery({ reduced }: Pick<Props, "reduced">) {
  const weeds = useRef<THREE.Group>(null);
  const school = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (reduced) return;
    elapsed.current += Math.min(delta, 0.05);
    weeds.current?.children.forEach((weed, i) => {
      weed.rotation.z = Math.sin(elapsed.current * 0.7 + i * 0.8) * 0.08;
    });
    if (school.current) {
      school.current.position.x = -1 + Math.sin(elapsed.current * 0.12) * 1.2;
      school.current.position.y = -0.3 + Math.sin(elapsed.current * 0.3) * 0.18;
    }
  });
  return (
    <group>
      <mesh
        geometry={seabedGeometry}
        material={sceneryMaterial}
        position={[0, -8.2, -3.5]}
        rotation={[-Math.PI / 2.05, 0, 0]}
        raycast={ignoreRaycast}
      />
      <group ref={weeds} position={[0, -5.8, -2.5]}>
        {[-8.8, -7.9, -7.1, 7.2, 8.1, 8.8].map((x, i) => (
          <mesh
            key={x}
            geometry={seaweedGeometry}
            material={sceneryMaterial}
            position={[x, 0.45 + (i % 3) * 0.18, -1 - (i % 2)]}
            scale={[1, 1.4 + (i % 3) * 0.45, 1]}
            raycast={ignoreRaycast}
          />
        ))}
      </group>
      {[-8.2, 7.8].map((x, cluster) => (
        <group key={x} position={[x, -5.9, -3.2]}>
          {Array.from({ length: 5 }, (_, i) => (
            <mesh
              key={i}
              geometry={coralGeometry}
              material={coralMaterial}
              position={[(i - 2) * 0.22, 0.28 + (i % 2) * 0.18, (i % 3) * 0.12]}
              rotation={[0, 0, (i - 2) * 0.12 + (cluster ? -0.08 : 0.08)]}
              scale={[1, 0.55 + (i % 3) * 0.25, 1]}
              raycast={ignoreRaycast}
            />
          ))}
        </group>
      ))}
      <group ref={school} position={[-7, 0.4, -8]}>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh
            key={i}
            geometry={schoolGeometry}
            material={schoolMaterial}
            position={[
              (i % 4) * 0.45,
              Math.floor(i / 4) * 0.34,
              (i % 3) * 0.32,
            ]}
            scale={0.9 - (i % 3) * 0.12}
            raycast={ignoreRaycast}
          />
        ))}
      </group>
    </group>
  );
}
export default function OceanScene(props: Props) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1, 24], fov: 45, near: 0.1, far: 150 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      fallback={
        <p className="scene-fallback">
          Interactive 3D exhibit. Use the species buttons to read the
          collection.
        </p>
      }
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", props.onError, {
          once: true,
        });
      }}
    >
      <fog attach="fog" args={["#031d30", 30, 95]} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[2, 8, 10]} intensity={2.8} color="#b8eff3" />
      <directionalLight
        position={[-10, 0, -4]}
        intensity={1.8}
        color="#338ab8"
      />
      <Particles reduced={props.reduced} />
      <Scenery reduced={props.reduced} />
      {species.map((s, i) => (
        <Animal
          key={s.id}
          id={s.id}
          index={i}
          selected={props.selected === s.id}
          focused={props.focused === s.id}
          reduced={props.reduced}
          onSelect={props.onSelect}
        />
      ))}
      <CameraRig {...props} />
    </Canvas>
  );
}
