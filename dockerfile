FROM node:20-slim

# 1) Dependencias del sistema para Python + Camelot + Tabula
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    ghostscript \
    default-jre \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2) Node
COPY package*.json ./
RUN npm install

# 3) Python env + libs
RUN python3 -m venv /app/.venv \
  && /app/.venv/bin/pip install --upgrade pip \
  && /app/.venv/bin/pip install \
       pandas \
       camelot-py \
       tabula-py \
       pdfminer.six \
       PyPDF2 \
       numpy

# 4) Código
COPY . .

# 5) Build TS
RUN npm run build

# 6) Env internos
ENV NODE_ENV=production
ENV PYTHON_BIN=/app/.venv/bin/python

EXPOSE 8080
CMD ["node", "dist/server.js"]
