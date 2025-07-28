import { QuickPlayDemo } from "@/components/quick-play-demo";

export default function QuickPlayDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Quick Play Card Demo
        </h1>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          This demonstrates the custom QuickPlayCard component with different
          variants, sizes, and configurations. The component is fully responsive
          and follows the project's design patterns.
        </p>
        <QuickPlayDemo />
      </div>
    </div>
  );
}
