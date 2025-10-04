**DATA INGESTION:**
Buoys send real-time ocean data → Message queue (MQTT/Kafka) buffers it → Validator checks quality → XARRAY/Pandas processes it → Splits into raw files (S3) and structured metrics (database)

**STORAGE:**
- **S3**: Original NetCDF files + ML models
- **TimescaleDB**: Structured time-series data (temperature, depth over time)
- **Vector DB**: AI embeddings for smart search
- **Redis**: Fast cache for frequent queries + user sessions

**AI PROCESSING:**
User asks question → Session Manager tracks conversation → API Gateway routes request → MCP decides what to do → Splits between NLP (understands question, searches similar data) and Prediction Models (calculates forecasts) → Both pull relevant data → Combines results → Sends back to user

**OBSERVABILITY:**
Every component reports health/performance metrics → OpenTelemetry collects → Grafana/Prometheus displays dashboards

**Key Flow:** Data flows in from buoys → Gets stored → User queries trigger AI to search stored data + generate predictions → Results returned to user. Monitoring runs in parallel watching everything.
