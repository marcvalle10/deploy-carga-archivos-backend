import { spawn } from "child_process";
import path from "path";

export interface PythonPlanResult {
  ok: boolean;
  parsed?: any;
  warnings?: string[];
}

export async function runPythonPlan(opts: {
  pdfPath: string;
  debug?: boolean;
  ocr?: boolean;
}): Promise<PythonPlanResult> {
  return new Promise((resolve, reject) => {
    // 1. Permitir configuración del binario desde variables de entorno
    const PYTHON_BIN = process.env.PYTHON_BIN || "python3";

    const scriptPath = path.resolve(__dirname, "../scripts/plan_estudio.py");

    const args = [scriptPath, opts.pdfPath];

    if (opts.debug) args.push("--debug");
    if (opts.ocr) args.push("--ocr");

    console.log("Ejecutando Python:", PYTHON_BIN, args);

    const child = spawn(PYTHON_BIN, args);

    let stdoutData = "";
    let stderrData = "";

    child.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    child.on("error", (err) => {
      console.error("❌ Error al ejecutar Python:", err);
      reject(err);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error("❌ Python terminó con error:", stderrData);
        return reject(
          new Error(`Python exited with code ${code}: ${stderrData}`)
        );
      }

      try {
        const parsed = JSON.parse(stdoutData);
        resolve({
          ok: true,
          parsed,
        });
      } catch (err) {
        console.error("❌ Error parseando salida de Python:", err);
        reject(err);
      }
    });
  });
}
