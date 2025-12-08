// src/services/ingestaPlan.ts
import { AppDataSource } from "../config/data-source";
import { PlanEstudio } from "../entities/PlanEstudio";
import { Materia } from "../entities/Materia";
import { AuditoriaCargas } from "../entities/AuditoriaCargas";

type PlanMateria = {
  codigo: string;
  nombre: string;
  creditos: number;
  tipo?: "OBLIGATORIA" | "OPTATIVA" | string | null;
  semestre?: number | null;
};

export type PlanPayload = {
  ok: boolean;
  plan: {
    nombre: string;
    version: string;
    total_creditos?: number;
    semestres_sugeridos?: number;
  };
  materias: PlanMateria[];
  warnings?: string[];
};

function canonTipo(raw?: string | null): "OBLIGATORIA" | "OPTATIVA" {
  const s = (raw || "").toUpperCase().normalize("NFC");
  if (/(OP|OPT|OPTATIVA|ELECTIVA|ELE|SEL)/.test(s)) return "OPTATIVA";
  return "OBLIGATORIA";
}

function normCodigo(c: string): string {
  const digits = (c || "").match(/\d+/)?.[0] ?? "";
  if (!digits) return "";
  return digits.length < 5 ? digits.padStart(5, "0") : digits;
}

function normNombre(n: string): string {
  return (n || "").replace(/\s{2,}/g, " ").trim();
}

function saneaCreditos(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n <= 0 || n > 30) return null;
  return Math.trunc(n);
}

export async function ingestaPlan(payload: PlanPayload, archivoId: number) {
  const ds = AppDataSource;
  const warnings: string[] = [];

  // --- 1) Normaliza y deduplica payload por código ---
  type InMateriaTmp = {
    codigo: string;
    nombre: string;
    creditos: number | null;
    tipo: "OBLIGATORIA" | "OPTATIVA";
    semestre: number | null;
  };

  const inMateriasTmp: InMateriaTmp[] = (payload.materias ?? []).map((m) => ({
    codigo: normCodigo(m.codigo),
    nombre: normNombre(m.nombre),
    creditos: saneaCreditos(m.creditos),
    tipo: canonTipo(m.tipo as any),
    semestre: m.semestre ?? null,
  }));

  // filtra las que queden sin créditos válidos
  const inMateriasRaw: InMateriaTmp[] = inMateriasTmp.filter(
    (m) => m.codigo && m.nombre && m.creditos !== null
  );

  // Dedupe por código (prefiere nombre más largo)
  const dedupe = new Map<string, InMateriaTmp>();
  for (const m of inMateriasRaw) {
    const prev = dedupe.get(m.codigo);
    if (!prev) {
      dedupe.set(m.codigo, m);
    } else if ((m.nombre || "").length > (prev.nombre || "").length) {
      dedupe.set(m.codigo, m);
    }
  }

  // Ahora sí: conviértelas a PlanMateria (creditos ya no es null)
  const materiasInput: PlanMateria[] = Array.from(dedupe.values()).map((m) => ({
    codigo: normCodigo(m.codigo),
    nombre: m.nombre,
    creditos: m.creditos as number,
    tipo: m.tipo, // OBLIGATORIA/OPTATIVA
    semestre: m.semestre ?? null,
  }));

  // --- 2) Transacción para upsert atómico + materia_plan ---
  return await ds.transaction(async (trx) => {
    const planRepo = trx.getRepository(PlanEstudio);
    const matRepo = trx.getRepository(Materia);
    const audRepo = trx.getRepository(AuditoriaCargas);

    const planNombre = payload.plan.nombre || "Ingeniería en Sistemas de Información";
    const planVersion = payload.plan.version || "N/A";
    const totalCreditos =
      payload.plan?.total_creditos ??
      materiasInput.reduce((acc, m) => acc + (m.creditos || 0), 0);
    const semestresSugeridos = payload.plan?.semestres_sugeridos ?? 0;

    // === 2.1 Upsert de plan_estudio ===
    let plan: PlanEstudio;

    const existente = await planRepo.findOne({
      where: { nombre: planNombre, version: planVersion } as any,
    });

    if (existente) {
      existente.totalCreditos =
        totalCreditos || existente.totalCreditos || 0;
      existente.semestresSugeridos =
        semestresSugeridos ?? existente.semestresSugeridos ?? 0;
      plan = await planRepo.save(existente);
    } else {
      const draft: Partial<PlanEstudio> = {
        nombre: planNombre,
        version: planVersion,
        totalCreditos,
        semestresSugeridos,
      };
      const nuevoPlan = planRepo.create(draft);
      plan = await planRepo.save(nuevoPlan);
    }

    // === 2.2 Trae materias existentes por código (UNIQUE global) ===
    const cods = materiasInput.map((m) => m.codigo);
    const existentesMaterias = cods.length
      ? await matRepo
          .createQueryBuilder("m")
          .where("m.codigo IN (:...cods)", { cods })
          .getMany()
      : [];

    const byCodigo = new Map(existentesMaterias.map((m) => [m.codigo, m]));

    let added = 0;
    let updated = 0;
    let unchanged = 0;
    let relacionesCreadas = 0;

    for (const m of materiasInput) {
      const prev = byCodigo.get(m.codigo);
      let materia: Materia;

      if (!prev) {
        // === 2.3 Crear materia global nueva (codigo único) ===
        const nueva = matRepo.create({
          codigo: m.codigo,
          nombre: m.nombre,
          creditos: m.creditos as number,
          tipo: (m.tipo ?? "OBLIGATORIA") as string,
          // Por compatibilidad con el esquema actual: asignamos este plan
          // como "plan_estudio_id" principal, pero la verdadera relación
          // n:m estará en materia_plan.
          plan_estudio_id: plan.id,
        });

        materia = await matRepo.save(nueva);
        byCodigo.set(m.codigo, materia);
        added++;
      } else {
        // === 2.4 Actualizar materia existente (sin moverla de plan) ===
        const before = JSON.stringify({
          nombre: prev.nombre,
          creditos: prev.creditos,
          tipo: prev.tipo,
          plan_estudio_id: prev.plan_estudio_id,
        });

        if (m.nombre && m.nombre !== prev.nombre) prev.nombre = m.nombre;
        if (
          m.creditos !== null &&
          m.creditos !== undefined &&
          m.creditos !== prev.creditos
        ) {
          prev.creditos = m.creditos!;
        }
        if (m.tipo && m.tipo !== prev.tipo) {
          prev.tipo = m.tipo as string;
        }

        // 👇 YA NO reasignamos prev.plan_estudio_id = plan.id
        //     De esta forma, no "movemos" la materia entre planes.
        //     El plan real se modela en materia_plan.

        const after = JSON.stringify({
          nombre: prev.nombre,
          creditos: prev.creditos,
          tipo: prev.tipo,
          plan_estudio_id: prev.plan_estudio_id,
        });

        if (before !== after) {
          materia = await matRepo.save(prev);
          updated++;
        } else {
          materia = prev;
          unchanged++;
        }
      }

      // === 2.5 Asegurar relación en materia_plan ===
      // IMPORTANTE: necesitas haber creado previamente la tabla:
      //   CREATE TABLE public.materia_plan (
      //     materia_id int NOT NULL,
      //     plan_estudio_id int NOT NULL,
      //     PRIMARY KEY (materia_id, plan_estudio_id),
      //     FOREIGN KEY (materia_id) REFERENCES public.materia(id),
      //     FOREIGN KEY (plan_estudio_id) REFERENCES public.plan_estudio(id)
      //   );
      const res = await trx.query(
        `
        INSERT INTO public.materia_plan (materia_id, plan_estudio_id)
        VALUES ($1, $2)
        ON CONFLICT (materia_id, plan_estudio_id) DO NOTHING
        RETURNING materia_id
        `,
        [materia.id, plan.id]
      );

      if (Array.isArray(res) && res.length > 0) {
        relacionesCreadas++;
      }
    }

    const totalInput = materiasInput.length;
    const noChanges = added === 0 && updated === 0 && relacionesCreadas === 0;

    await audRepo.save(
      audRepo.create({
        archivo_id: archivoId,
        etapa: "INGESTA",
        estado: "OK",
        detalle: `Plan ${plan.nombre} v${plan.version} | input=${totalInput} | addedMaterias=${added} | updatedMaterias=${updated} | unchangedMaterias=${unchanged} | relacionesMateriaPlanCreadas=${relacionesCreadas}${
          warnings.length ? ` | warnings=${warnings.length}` : ""
        }`,
      })
    );

    return {
      planId: plan.id,
      materiasInput: totalInput,
      added,
      updated,
      unchanged,
      relacionesMateriaPlanCreadas: relacionesCreadas,
      warnings,
      action: noChanges ? "SKIPPED_NO_CHANGES" : "UPSERTED",
    };
  });
}
