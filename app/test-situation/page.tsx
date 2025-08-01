import { MemeCardDemo } from "@/components/meme-card-demo";
import { SituationDisplayDemo } from "@/components/situation-display-demo";

export default function TestSituationPage() {
  return (
    <div className="min-h-screen bg-background">
      <SituationDisplayDemo />
      <MemeCardDemo />
    </div>
  );
}
