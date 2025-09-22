"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Calendar, MapPin, Layers, Filter } from "lucide-react"

export function FiltersPanel() {
  const [region, setRegion] = useState("")
  const [timeRange, setTimeRange] = useState("")
  const [depth, setDepth] = useState("")

  const handleApplyFilters = () => {
    // This would trigger the API calls with the selected filters
    console.log("Applying filters:", { region, timeRange, depth })
  }

  return (
    <aside className="w-80 bg-sidebar border-r border-sidebar-border p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-primary" />
            <span>Data Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="region" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Region</span>
            </Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indian-ocean">Indian Ocean</SelectItem>
                <SelectItem value="pacific-ocean">Pacific Ocean</SelectItem>
                <SelectItem value="atlantic-ocean">Atlantic Ocean</SelectItem>
                <SelectItem value="arctic-ocean">Arctic Ocean</SelectItem>
                <SelectItem value="southern-ocean">Southern Ocean</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-range" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Time Range</span>
            </Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-24h">Last 24 Hours</SelectItem>
                <SelectItem value="last-7d">Last 7 Days</SelectItem>
                <SelectItem value="last-30d">Last 30 Days</SelectItem>
                <SelectItem value="last-90d">Last 90 Days</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="depth" className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span>Depth Range</span>
            </Label>
            <Select value={depth} onValueChange={setDepth}>
              <SelectTrigger>
                <SelectValue placeholder="Select depth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="surface">Surface (0-10m)</SelectItem>
                <SelectItem value="shallow">Shallow (10-50m)</SelectItem>
                <SelectItem value="medium">Medium (50-200m)</SelectItem>
                <SelectItem value="deep">Deep (200-1000m)</SelectItem>
                <SelectItem value="abyssal">Abyssal (1000m+)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleApplyFilters} className="w-full" disabled={!region || !timeRange || !depth}>
            Apply Filters
          </Button>
        </CardContent>
      </Card>
    </aside>
  )
}
