"use client";

import { ComponentDefinition } from "@/data/components";
import VariationCard from "./VariationCard";

interface VariationGridProps {
  components: ComponentDefinition[];
  onComponentClick: (component: ComponentDefinition) => void;
}

/**
 * VariationGrid
 * Grid of component variation cards
 */
export default function VariationGrid({
  components,
  onComponentClick,
}: VariationGridProps) {
  // Group by type
  const universalComponents = components.filter((c) => c.type === "universal");
  const uniqueComponents = components.filter((c) => c.type === "unique");

  return (
    <div className="space-y-10">
      {/* Universal Components */}
      {universalComponents.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold">Universal Components</h2>
            <span className="px-2 py-0.5 text-xs bg-scai-surface border border-scai-border rounded-full text-scai-text-sec">
              {universalComponents.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {universalComponents.map((component) => (
              <VariationCard
                key={component.id}
                component={component}
                onClick={() => onComponentClick(component)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Unique Components */}
      {uniqueComponents.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold">Unique Components</h2>
            <span className="px-2 py-0.5 text-xs bg-scai-surface border border-scai-border rounded-full text-scai-text-sec">
              {uniqueComponents.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniqueComponents.map((component) => (
              <VariationCard
                key={component.id}
                component={component}
                onClick={() => onComponentClick(component)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
