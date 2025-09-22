"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { Activity, Thermometer } from "lucide-react"

// Mock data for demonstration
const temperatureData = [
  { time: "00:00", temperature: 18.5, depth: "Surface" },
  { time: "04:00", temperature: 18.2, depth: "Surface" },
  { time: "08:00", temperature: 19.1, depth: "Surface" },
  { time: "12:00", temperature: 20.3, depth: "Surface" },
  { time: "16:00", temperature: 21.2, depth: "Surface" },
  { time: "20:00", temperature: 19.8, depth: "Surface" },
]

const currentData = [
  { time: "00:00", speed: 0.8, direction: "NE" },
  { time: "04:00", speed: 1.2, direction: "E" },
  { time: "08:00", speed: 1.5, direction: "SE" },
  { time: "12:00", speed: 2.1, direction: "S" },
  { time: "16:00", speed: 1.8, direction: "SW" },
  { time: "20:00", speed: 1.3, direction: "W" },
]

export function DataVisualization() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Thermometer className="h-5 w-5 text-chart-1" />
            <span>Sea Surface Temperature</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={temperatureData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="temperature"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-chart-2" />
            <span>Ocean Current Speed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="speed"
                stroke="hsl(var(--chart-2))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
