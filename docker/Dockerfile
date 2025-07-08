FROM node:18-alpine

LABEL maintainer = "Enhanced Revit Viewer"
LABEL description = "Secure SVF to glTF conversion"
LABEL version = "1.0.0"

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

RUN npm install -g svf-utils@7.0.0 gltf-pipeline@4.0.1 \
    && npm cache clean --force

COPY convert-script.js /app/
RUN chown -R appuser:appgroup /app

RUN mkdir -p /app/output && chown -R appuser:appgroup /app/output

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

