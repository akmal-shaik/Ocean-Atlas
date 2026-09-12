import { notFound } from "next/navigation";
import { Guide } from "../../../components/Explorer";
export default function GuideTest() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <main style={{ maxWidth: 480, margin: "40px auto", padding: 24 }}>
      <h1>Development test fixture</h1>
      <p>
        Mock failure only. No model or paid API calls. This page is unavailable
        in production.
      </p>
      <Guide id="salmon" available endpoint="/dev/guide/api" />
    </main>
  );
}
