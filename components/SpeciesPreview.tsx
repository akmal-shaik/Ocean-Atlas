"use client";
import { Canvas } from "@react-three/fiber";
import { Animal } from "./Animals";
import { species, type SpeciesId } from "../lib/corpus";

export default function SpeciesPreview({ id }: { id: SpeciesId }) {
  const index = species.findIndex((item) => item.id === id);
  const item = species[index]!;
  return (
    <div
      className="comparison-preview"
      role="img"
      aria-label={`${item.name} stylised preview`}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.4, 4.5], fov: 42, near: 0.1, far: 20 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        <ambientLight intensity={1.8} />
        <directionalLight
          position={[3, 5, 6]}
          intensity={2.5}
          color="#b8eff3"
        />
        <Animal id={id} index={index} preview reduced />
      </Canvas>
      <span>Not to scale</span>
    </div>
  );
}
