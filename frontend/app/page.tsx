import { FiltersPanel } from "@/components/filters-panel"
import { DataVisualization } from "@/components/data-visualization"
import { PredictionsPanel } from "@/components/predictions-panel"
import { InsightsPanel } from "@/components/insights-panel"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <FiltersPanel />

        <main className="flex-1 p-6 space-y-6">
          <InsightsPanel />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataVisualization />
            <PredictionsPanel />
          </div>
        </main>
      </div>
    </div>
  )
}
