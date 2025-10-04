DATA INGESTION LAYER:
Buoy Network → MQTT/Kafka → Data Validator → XARRAY/Pandas Processing
                                                    ↓
                                              ├─→ S3 (raw NetCDF)
                                              └─→ RDB (processed)

STORAGE LAYER:
├── S3: Raw NetCDF files, model artifacts
├── RDB (TimescaleDB): Time-series oceanographic data
├── Vector DB (Pinecone): Embeddings for semantic search
└── Redis: Cache + session storage

AI PROCESSING LAYER:
User Query → Session Manager → API Gateway → MCP (Orchestrator)
                                                ↓
                    ┌──────────────────────────┴──────────────┐
                    ↓                                          ↓
              NLP Engine                              Prediction Models
         (Query Understanding)                    (Temp, Current, Depth)
                    ↓                                          ↓
              Vector DB Search  ←───────────────────→    RDB Query
                    └──────────────────┬───────────────────────┘
                                       ↓
                              Response Generator
                                       ↓
                             Session Manager → Frontend

OBSERVABILITY LAYER (Parallel):
All components → OpenTelemetry → Grafana/Prometheus
