# --- Imagen base con Node ---
FROM node:20-slim

# --- Instalar Python + herramientas de compilación ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

# --- Directorio de trabajo ---
WORKDIR /app

# --- Copiar solo package.json/package-lock para aprovechar caché ---
COPY package*.json ./

# Instalar dependencias de Node
RUN npm install

# --- Crear venv de Python e instalar pandas (y lo que necesites) ---
RUN python3 -m venv /app/.venv \
  && /app/.venv/bin/pip install --upgrade pip \
  && /app/.venv/bin/pip install pandas

# Si luego necesitas más librerías, agrega aquí, por ejemplo:
# && /app/.venv/bin/pip install pdfplumber camelot-py openpyxl

# --- Copiar el resto del código ---
COPY . .

# --- Compilar TypeScript ---
RUN npm run build

# --- Variables de entorno internas del contenedor ---
ENV NODE_ENV=production
ENV PYTHON_BIN=/app/.venv/bin/python

# --- Puerto expuesto (el que usa tu server) ---
EXPOSE 8080

# --- Comando por defecto: levantar el backend ---
CMD ["node", "dist/server.js"]
