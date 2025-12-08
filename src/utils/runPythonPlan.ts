import { spawn } from "child_process";
import path from "path";

/**
 * Ejecuta plan_estudio.py sobre el PDF indicado y devuelve
 * el JSON que escupe Python (lo tratamos como PlanPayload).
 */
export async function runPythonPlan(
  pdfPath: string,
  opts?: { debug?: boolean; ocr?: boolean }
): Promise<any> {
  return new Promise((resolve, reject) => {
    // Binario de Python configurable; por defecto usamos "python"
    const PYTHON_BIN = process.env.PYTHON_BIN || "python";

    // 👇 IMPORTANTE: apuntar a src/scripts/plan_estudio.py, no a dist
    const scriptPath = path.resolve(
      process.cwd(),
      "src/scripts/plan_estudio.py"
    );

    const args = [scriptPath, pdfPath];

    if (opts?.debug) args.push("--debug");
    if (opts?.ocr) args.push("--ocr");

    console.log("[runPythonPlan] Ejecutando:", PYTHON_BIN, args);

    const child = spawn(PYTHON_BIN, args);

    let stdoutData = "";
    let stderrData = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutData += text;
      console.log("[runPythonPlan][stdout]", text.trim());
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderrData += text;
      console.error("[runPythonPlan][stderr]", text.trim());
    });

    child.on("error", (err) => {
      console.error("[runPythonPlan] Error al spawn de Python:", err);
      reject(err);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error(
          `[runPythonPlan] Python terminó con código ${code}. STDERR:\n${stderrData}`
        );
        return reject(
          new Error(
            `Python exited with code ${code}. Stderr: ${
              stderrData || "sin salida"
            }`
          )
        );
      }

      try {
        const parsed = JSON.parse(stdoutData);
        resolve(parsed); // debe tener .ok, .plan, .materias, etc.
      } catch (err) {
        console.error(
          "[runPythonPlan] Error parseando JSON de Python. stdout crudo:",
          stdoutData
        );
        reject(err);
      }
    });
  });
}
