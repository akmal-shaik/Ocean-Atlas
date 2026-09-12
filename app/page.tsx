import Explorer from "../components/Explorer";
import { aiAvailable } from "../server/config";
export const dynamic = "force-dynamic";
export default function Page() {
  return <Explorer aiEnabled={aiAvailable()} />;
}
