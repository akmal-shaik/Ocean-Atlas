"use client";
import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { species, type SpeciesId } from "../lib/corpus";
const sphere = new THREE.SphereGeometry(1, 12, 8);
const eyeMat = new THREE.MeshStandardMaterial({
  color: "#041422",
  roughness: 0.2,
});
const whiteMat = new THREE.MeshStandardMaterial({
  color: "#e4efdc",
  roughness: 0.65,
});
const finGeometry = new THREE.BufferGeometry();
finGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute([0, 0, 0, -0.18, 0.23, 0, -0.24, 0, 0], 3),
);
finGeometry.computeVertexNormals();
function bodyGeometry(shark: boolean) {
  const rings = shark
    ? [
        [-0.34, 0.025],
        [-0.23, 0.06],
        [-0.04, 0.115],
        [0.2, 0.13],
        [0.39, 0.115],
        [0.49, 0.085],
        [0.5, 0],
      ]
    : [
        [-0.34, 0.018],
        [-0.24, 0.065],
        [-0.06, 0.13],
        [0.17, 0.14],
        [0.36, 0.085],
        [0.5, 0],
      ];
  const vertices: number[] = [];
  const indices: number[] = [];
  const segments = 12;
  rings.forEach(([x, r]) => {
    for (let j = 0; j < segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      vertices.push(
        x,
        Math.cos(a) * r,
        Math.sin(a) * r * (shark ? 1.35 : 0.65),
      );
    }
  });
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < segments; j++) {
      const a = i * segments + j,
        b = i * segments + ((j + 1) % segments),
        c = a + segments,
        d = b + segments;
      indices.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
const fishBody = bodyGeometry(false),
  sharkBody = bodyGeometry(true);
const tailGeometry = new THREE.BufferGeometry();
tailGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      0, 0, 0, -0.16, 0.18, 0, -0.1, 0.025, 0, 0, 0, 0, -0.1, -0.025, 0, -0.16,
      -0.16, 0,
    ],
    3,
  ),
);
tailGeometry.computeVertexNormals();
const squidMantle = new THREE.ConeGeometry(0.07, 0.28, 12);
squidMantle.rotateZ(-Math.PI / 2);
const tentacleGeometry = new THREE.CylinderGeometry(0.002, 0.012, 1, 6);
tentacleGeometry.rotateZ(Math.PI / 2);
const jellyBell = new THREE.SphereGeometry(
  0.5,
  16,
  8,
  0,
  Math.PI * 2,
  0,
  Math.PI / 2,
);
const jellyRing = new THREE.TorusGeometry(0.095, 0.012, 5, 12);
export const explorePositions: [number, number, number][] = [
  [-5.2, 3.3, 0.7],
  [4.6, 3.1, -2.4],
  [-1.3, 0.2, -0.8],
  [4.2, -2.5, 1.4],
  [-4.6, -2.7, 0.8],
  [0.4, -3.6, -1.8],
];
export const exploreLengths = [3.5, 4.8, 9.2, 5.7, 3.4, 2.5];
export function Animal({
  id,
  index,
  selected = false,
  focused = false,
  reduced = false,
  preview = false,
  onSelect,
}: {
  id: SpeciesId;
  index: number;
  selected?: boolean;
  focused?: boolean;
  reduced?: boolean;
  preview?: boolean;
  onSelect?: (id: SpeciesId) => void;
}) {
  const data = species[index];
  const group = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const arms = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  const flippers = useRef<THREE.Group>(null);
  const t = useRef(index * 2);
  const [hover, setHover] = useState(false);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: data.colour,
        roughness: 0.5,
        metalness: 0.12,
        flatShading: true,
        side: THREE.DoubleSide,
        emissive: new THREE.Color("#24898f"),
        emissiveIntensity: selected ? 0.23 : hover || focused ? 0.15 : 0,
      }),
    [data.colour, selected, hover, focused],
  );
  const finMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: id === "tuna" ? "#d4be69" : data.colour,
        side: THREE.DoubleSide,
        roughness: 0.65,
        flatShading: true,
      }),
    [data.colour, id],
  );
  const length = preview ? 3 : exploreLengths[index];
  const labelY = -0.55 - length * 0.13;
  useFrame((_, delta) => {
    if (!group.current) return;
    const moving = !preview && !reduced && !selected;
    t.current += moving ? Math.min(delta, 0.05) : 0;
    const base = preview ? [0, 0, 0] : explorePositions[index];
    group.current.position.set(
      base[0] + (moving ? Math.sin(t.current * 0.22) * 0.6 : 0),
      base[1] + (moving ? Math.sin(t.current * 0.45) * 0.15 : 0),
      base[2],
    );
    if (tail.current)
      tail.current.rotation.y = moving ? Math.sin(t.current * 2) * 0.22 : 0;
    if (arms.current)
      arms.current.children.forEach((arm, i) => {
        arm.rotation.y = moving ? Math.sin(t.current * 1.4 + i) * 0.025 : 0;
      });
    if (flippers.current)
      flippers.current.children.forEach((flipper, i) => {
        flipper.rotation.x = moving
          ? Math.sin(t.current * 1.6 + i * Math.PI) * 0.18
          : 0;
      });
    if (model.current)
      model.current.scale.setScalar(
        length *
          (id === "moon-jelly" && moving
            ? 1 + Math.sin(t.current * 1.8) * 0.035
            : 1),
      );
  });
  function choose(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect?.(id);
  }
  return (
    <group ref={group} position={preview ? [0, 0, 0] : explorePositions[index]}>
      <group
        ref={model}
        scale={length}
        onClick={onSelect ? choose : undefined}
        onPointerOver={
          onSelect
            ? (e) => {
                e.stopPropagation();
                setHover(true);
                document.body.style.cursor = "pointer";
              }
            : undefined
        }
        onPointerOut={
          onSelect
            ? () => {
                setHover(false);
                document.body.style.cursor = "auto";
              }
            : undefined
        }
      >
        {id === "squid" ? (
          <>
            <mesh
              geometry={squidMantle}
              material={material}
              position={[0.36, 0, 0]}
            />
            <mesh
              geometry={sphere}
              material={material}
              position={[0.18, 0, 0]}
              scale={[0.06, 0.055, 0.055]}
            />
            <mesh
              geometry={finGeometry}
              material={material}
              position={[0.48, 0, 0]}
              scale={[0.7, 0.48, 1]}
            />
            <mesh
              geometry={finGeometry}
              material={material}
              position={[0.48, 0, 0]}
              scale={[0.7, -0.48, 1]}
            />
            <group ref={arms}>
              {Array.from({ length: 10 }, (_, i) => {
                const long = i >= 8;
                const l = long ? 0.66 : 0.28;
                const a = (i / 8) * Math.PI * 2;
                return (
                  <group
                    key={i}
                    position={[0.16, Math.cos(a) * 0.035, Math.sin(a) * 0.035]}
                  >
                    <mesh
                      geometry={tentacleGeometry}
                      material={material}
                      position={[-l / 2, 0, 0]}
                      scale={[l, long ? 0.55 : 0.75, long ? 0.55 : 0.75]}
                      rotation={[0, 0, Math.cos(a) * 0.06]}
                    />
                    {long && (
                      <mesh
                        geometry={sphere}
                        material={material}
                        position={[-0.63, 0, 0]}
                        scale={[0.027, 0.012, 0.012]}
                      />
                    )}
                  </group>
                );
              })}
            </group>
            {[1, -1].map((s) => (
              <mesh
                key={s}
                geometry={sphere}
                material={whiteMat}
                position={[0.2, 0.012, s * 0.047]}
                scale={[0.021, 0.024, 0.013]}
              >
                <mesh
                  geometry={sphere}
                  material={eyeMat}
                  position={[0, 0, s * 0.65]}
                  scale={0.63}
                />
              </mesh>
            ))}
          </>
        ) : id === "green-turtle" ? (
          <>
            <mesh
              geometry={sphere}
              material={material}
              scale={[0.4, 0.1, 0.3]}
            />
            <mesh
              geometry={sphere}
              material={whiteMat}
              position={[0, -0.055, 0]}
              scale={[0.32, 0.055, 0.23]}
            />
            <mesh
              geometry={sphere}
              material={material}
              position={[0.4, 0.005, 0]}
              scale={[0.105, 0.075, 0.08]}
            />
            <mesh
              geometry={sphere}
              material={eyeMat}
              position={[0.46, 0.035, 0.065]}
              scale={0.012}
            />
            <group ref={flippers}>
              {[1, -1].map((side) => (
                <group key={side}>
                  <mesh
                    geometry={finGeometry}
                    material={material}
                    position={[0.13, -0.02, side * 0.25]}
                    rotation={[side * 0.35, side * 0.25, -0.25]}
                    scale={[1.25, 1.4, 1]}
                  />
                  <mesh
                    geometry={finGeometry}
                    material={material}
                    position={[-0.25, -0.015, side * 0.19]}
                    rotation={[side * 0.2, side * 0.35, 2.8]}
                    scale={[0.65, 0.75, 1]}
                  />
                </group>
              ))}
            </group>
          </>
        ) : id === "moon-jelly" ? (
          <>
            <mesh
              geometry={jellyBell}
              material={material}
              rotation={[0, 0, Math.PI]}
              scale={[1, 0.5, 1]}
            />
            {Array.from({ length: 4 }, (_, i) => (
              <mesh
                key={i}
                geometry={jellyRing}
                material={whiteMat}
                position={[
                  Math.cos((i / 4) * Math.PI * 2) * 0.13,
                  -0.035,
                  Math.sin((i / 4) * Math.PI * 2) * 0.13,
                ]}
                rotation={[Math.PI / 2, 0, 0]}
              />
            ))}
            <group ref={arms}>
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2;
                return (
                  <mesh
                    key={i}
                    geometry={tentacleGeometry}
                    material={material}
                    position={[Math.cos(a) * 0.22, -0.28, Math.sin(a) * 0.22]}
                    rotation={[0, 0, -Math.PI / 2]}
                    scale={[0.42, 0.45, 0.45]}
                  />
                );
              })}
            </group>
          </>
        ) : (
          <>
            <mesh
              geometry={id === "whale-shark" ? sharkBody : fishBody}
              material={material}
              scale={[1, id === "salmon" ? 0.72 : 1, 1]}
            />
            <mesh
              geometry={sphere}
              material={whiteMat}
              position={[0.05, -0.05, 0]}
              scale={[
                0.32,
                id === "salmon" ? 0.04 : 0.065,
                id === "whale-shark" ? 0.12 : 0.065,
              ]}
            />
            <group ref={tail} position={[-0.34, 0, 0]}>
              <mesh geometry={tailGeometry} material={material} />
            </group>
            <mesh
              geometry={finGeometry}
              material={material}
              position={[0.1, id === "salmon" ? 0.08 : 0.12, 0]}
              scale={[0.7, id === "whale-shark" ? 0.7 : 0.65, 1]}
            />
            {[1, -1].map((s) => (
              <group key={s}>
                <mesh
                  geometry={finGeometry}
                  material={material}
                  position={[0.18, -0.035, s * 0.075]}
                  rotation={[(s * Math.PI) / 2, 0, 0.3]}
                  scale={[0.8, 0.75, 1]}
                />
                <mesh
                  geometry={sphere}
                  material={eyeMat}
                  position={[
                    id === "whale-shark" ? 0.42 : 0.37,
                    0.022,
                    s * (id === "whale-shark" ? 0.132 : 0.05),
                  ]}
                  scale={[0.013, 0.015, 0.009]}
                />
              </group>
            ))}
            {id === "tuna" &&
              Array.from({ length: 6 }, (_, i) => (
                <mesh
                  key={i}
                  geometry={finGeometry}
                  material={finMaterial}
                  position={[-0.08 - i * 0.043, 0.09 - i * 0.012, 0]}
                  scale={[0.15, 0.16, 1]}
                />
              ))}
            {id === "salmon" &&
              Array.from({ length: 15 }, (_, i) => (
                <mesh
                  key={i}
                  geometry={sphere}
                  material={eyeMat}
                  position={[
                    0.28 - (i % 5) * 0.1,
                    0.018 + Math.floor(i / 5) * 0.024,
                    0.075 - Math.floor(i / 5) * 0.013,
                  ]}
                  scale={0.006}
                />
              ))}
            {id === "whale-shark" &&
              Array.from({ length: 65 }, (_, i) => {
                const x = 0.38 - (i % 13) * 0.038,
                  a = (Math.floor(i / 13) - 2) * 0.46;
                const r =
                  x < -0.04
                    ? 0.115 + (x + 0.04) * (0.055 / 0.19)
                    : x < 0.2
                      ? 0.115 + (x + 0.04) * (0.015 / 0.24)
                      : 0.13 - (x - 0.2) * (0.015 / 0.19);
                return (
                  <mesh
                    key={i}
                    geometry={sphere}
                    material={whiteMat}
                    position={[
                      x,
                      Math.cos(a) * r * 0.99,
                      Math.sin(a) * r * 1.35,
                    ]}
                    scale={0.006}
                  />
                );
              })}
          </>
        )}
      </group>
      {!preview && (selected || hover || focused) && (
        <Html
          center
          position={[0, labelY, 0]}
          zIndexRange={[5, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className={`scene-label ${selected ? "chosen" : ""}`}>
            {data.name}
          </span>
        </Html>
      )}
    </group>
  );
}
