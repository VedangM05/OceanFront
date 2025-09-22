import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Droplets, Wind, Thermometer } from "lucide-react"

export function InsightsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span>Current Conditions Summary</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Thermometer className="h-4 w-4 text-chart-1" />
              <span className="text-sm font-medium">Temperature</span>
            </div>
            <div className="text-2xl font-bold text-chart-1">20.3°C</div>
            <Badge variant="secondary" className="bg-secondary/10 text-secondary">
              +0.8°C from avg
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Wind className="h-4 w-4 text-chart-2" />
              <span className="text-sm font-medium">Current Speed</span>
            </div>
            <div className="text-2xl font-bold text-chart-2">2.1 m/s</div>
            <Badge variant="secondary" className="bg-chart-3/10 text-chart-3">
              Moderate
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Droplets className="h-4 w-4 text-chart-3" />
              <span className="text-sm font-medium">Salinity</span>
            </div>
            <div className="text-2xl font-bold text-chart-3">35.2 PSU</div>
            <Badge variant="secondary" className="bg-muted/50 text-muted-foreground">
              Normal
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-chart-4" />
              <span className="text-sm font-medium">Data Quality</span>
            </div>
            <div className="text-2xl font-bold text-chart-4">98%</div>
            <Badge variant="secondary" className="bg-secondary/10 text-secondary">
              Excellent
            </Badge>
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-semibold mb-2">Key Insights</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Sea surface temperature is 0.8°C above seasonal average</li>
            <li>• Current patterns indicate strengthening El Niño conditions</li>
            <li>• Thermocline depth has increased by 15m over the past week</li>
            <li>• Model confidence remains high for next 6-hour predictions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
