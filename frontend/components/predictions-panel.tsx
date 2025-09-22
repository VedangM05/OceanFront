"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Mock prediction data
const predictionData = [
  { time: "Now", actual: 20.3, predicted: 20.3, confidence: 100 },
  { time: "+1h", actual: null, predicted: 20.8, confidence: 95 },
  { time: "+2h", actual: null, predicted: 21.2, confidence: 92 },
  { time: "+4h", actual: null, predicted: 21.8, confidence: 88 },
  { time: "+6h", actual: null, predicted: 22.1, confidence: 85 },
  { time: "+12h", actual: null, predicted: 21.5, confidence: 78 },
  { time: "+24h", actual: null, predicted: 20.9, confidence: 70 },
]

export function PredictionsPanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-chart-3" />
              <span>Temperature Predictions</span>
            </div>
            <Badge variant="secondary" className="bg-secondary/10 text-secondary">
              ML Model: LSTM
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={predictionData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value, name) => [`${value}°C`, name === "actual" ? "Actual" : "Predicted"]}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--chart-1))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-chart-4" />
            <span>Prediction Confidence</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Next Hour</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-muted rounded-full h-2">
                  <div className="bg-secondary h-2 rounded-full" style={{ width: "95%" }} />
                </div>
                <span className="text-sm text-muted-foreground">95%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Next 6 Hours</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-muted rounded-full h-2">
                  <div className="bg-chart-3 h-2 rounded-full" style={{ width: "85%" }} />
                </div>
                <span className="text-sm text-muted-foreground">85%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Next 24 Hours</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-muted rounded-full h-2">
                  <div className="bg-chart-4 h-2 rounded-full" style={{ width: "70%" }} />
                </div>
                <span className="text-sm text-muted-foreground">70%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
