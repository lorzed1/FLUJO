# Schemas JSON

Este documento define los schemas JSON utilizados por skill-creator.

---

## evals.json

Define los evals para una skill. Ubicado en `evals/evals.json` dentro del directorio de la skill.

```json
{
  "skill_name": "nombre-skill-ejemplo",
  "evals": [
    {
      "id": 1,
      "prompt": "Prompt de ejemplo del usuario",
      "expected_output": "Descripción del resultado esperado",
      "files": ["evals/files/muestra1.pdf"],
      "expectations": [
        "La salida incluye X",
        "La skill usó el script Y"
      ]
    }
  ]
}
```

**Campos:**
- `skill_name`: Nombre que coincide con el frontmatter de la skill
- `evals[].id`: Identificador entero único
- `evals[].prompt`: La tarea a ejecutar
- `evals[].expected_output`: Descripción legible por humanos del éxito
- `evals[].files`: Lista opcional de rutas de archivos de entrada (relativas a la raíz de la skill)
- `evals[].expectations`: Lista de afirmaciones verificables

---

## history.json

Rastrea la progresión de versiones en modo Mejorar. Ubicado en la raíz del workspace.

```json
{
  "started_at": "2026-01-15T10:30:00Z",
  "skill_name": "pdf",
  "current_best": "v2",
  "iterations": [
    {
      "version": "v0",
      "parent": null,
      "expectation_pass_rate": 0.65,
      "grading_result": "baseline",
      "is_current_best": false
    },
    {
      "version": "v2",
      "parent": "v1",
      "expectation_pass_rate": 0.85,
      "grading_result": "won",
      "is_current_best": true
    }
  ]
}
```

**Campos:**
- `started_at`: Timestamp ISO de cuándo comenzó la mejora
- `skill_name`: Nombre de la skill siendo mejorada
- `current_best`: Identificador de versión del mejor rendimiento
- `iterations[].version`: Identificador de versión (v0, v1, ...)
- `iterations[].parent`: Versión padre de la que derivó
- `iterations[].expectation_pass_rate`: Tasa de aprobación desde la calificación
- `iterations[].grading_result`: "baseline", "won", "lost", o "tie"
- `iterations[].is_current_best`: Si esta es la mejor versión actual

---

## grading.json

Salida del agente evaluador. Ubicado en `<run-dir>/grading.json`.

```json
{
  "expectations": [
    {
      "text": "La salida incluye el nombre 'Juan García'",
      "passed": true,
      "evidence": "Encontrado en la transcripción Paso 3: 'Nombres extraídos: Juan García, Ana López'"
    },
    {
      "text": "La hoja de cálculo tiene una fórmula SUMA en la celda B10",
      "passed": false,
      "evidence": "No se creó ninguna hoja de cálculo. La salida fue un archivo de texto."
    }
  ],
  "summary": {
    "passed": 2,
    "failed": 1,
    "total": 3,
    "pass_rate": 0.67
  },
  "execution_metrics": {
    "tool_calls": { "Read": 5, "Write": 2, "Bash": 8 },
    "total_tool_calls": 15,
    "total_steps": 6,
    "errors_encountered": 0,
    "output_chars": 12450,
    "transcript_chars": 3200
  },
  "timing": {
    "executor_duration_seconds": 165.0,
    "grader_duration_seconds": 26.0,
    "total_duration_seconds": 191.0
  },
  "claims": [
    {
      "claim": "El formulario tiene 12 campos rellenables",
      "type": "factual",
      "verified": true,
      "evidence": "Contados 12 campos en field_info.json"
    }
  ],
  "user_notes_summary": {
    "uncertainties": ["Se usaron datos de 2023, pueden estar desactualizados"],
    "needs_review": [],
    "workarounds": ["Se usó superposición de texto para campos no rellenables"]
  },
  "eval_feedback": {
    "suggestions": [
      {
        "assertion": "La salida incluye el nombre 'Juan García'",
        "reason": "Un documento alucinado que mencione el nombre también pasaría"
      }
    ],
    "overall": "Las assertions verifican presencia pero no corrección."
  }
}
```

**Campos:**
- `expectations[]`: Expectativas calificadas con evidencia
- `summary`: Conteos agregados de pass/fail
- `execution_metrics`: Uso de herramientas y tamaño de salida (desde metrics.json del ejecutor)
- `timing`: Tiempo de reloj de pared (desde timing.json)
- `claims`: Afirmaciones extraídas y verificadas de la salida
- `user_notes_summary`: Problemas señalados por el ejecutor
- `eval_feedback`: (opcional) Sugerencias de mejora para los evals

---

## metrics.json

Salida del agente ejecutor. Ubicado en `<run-dir>/outputs/metrics.json`.

```json
{
  "tool_calls": {
    "Read": 5, "Write": 2, "Bash": 8, "Edit": 1, "Glob": 2, "Grep": 0
  },
  "total_tool_calls": 18,
  "total_steps": 6,
  "files_created": ["formulario_lleno.pdf", "valores_campos.json"],
  "errors_encountered": 0,
  "output_chars": 12450,
  "transcript_chars": 3200
}
```

---

## timing.json

Tiempo de reloj de pared para un run. Ubicado en `<run-dir>/timing.json`.

**Cómo capturarlo:** Cuando una tarea de subagente se completa, la notificación incluye `total_tokens` y `duration_ms`. Guárdalos inmediatamente — no se persisten en ningún otro lugar.

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3,
  "executor_start": "2026-01-15T10:30:00Z",
  "executor_end": "2026-01-15T10:32:45Z",
  "executor_duration_seconds": 165.0,
  "grader_start": "2026-01-15T10:32:46Z",
  "grader_end": "2026-01-15T10:33:12Z",
  "grader_duration_seconds": 26.0
}
```

---

## benchmark.json

Salida del modo Benchmark. Ubicado en `benchmarks/<timestamp>/benchmark.json`.

```json
{
  "metadata": {
    "skill_name": "pdf",
    "skill_path": "/ruta/a/pdf",
    "executor_model": "claude-sonnet-4-20250514",
    "analyzer_model": "modelo-mas-capaz",
    "timestamp": "2026-01-15T10:30:00Z",
    "evals_run": [1, 2, 3],
    "runs_per_configuration": 3
  },
  "runs": [
    {
      "eval_id": 1,
      "eval_name": "Extraccion-de-tablas",
      "configuration": "with_skill",
      "run_number": 1,
      "result": {
        "pass_rate": 0.85,
        "passed": 6,
        "failed": 1,
        "total": 7,
        "time_seconds": 42.5,
        "tokens": 3800,
        "tool_calls": 18,
        "errors": 0
      },
      "expectations": [
        {"text": "...", "passed": true, "evidence": "..."}
      ],
      "notes": ["Se usaron datos de 2023, pueden estar desactualizados"]
    }
  ],
  "run_summary": {
    "with_skill": {
      "pass_rate": {"mean": 0.85, "stddev": 0.05, "min": 0.80, "max": 0.90},
      "time_seconds": {"mean": 45.0, "stddev": 12.0, "min": 32.0, "max": 58.0},
      "tokens": {"mean": 3800, "stddev": 400, "min": 3200, "max": 4100}
    },
    "without_skill": {
      "pass_rate": {"mean": 0.35, "stddev": 0.08, "min": 0.28, "max": 0.45},
      "time_seconds": {"mean": 32.0, "stddev": 8.0, "min": 24.0, "max": 42.0},
      "tokens": {"mean": 2100, "stddev": 300, "min": 1800, "max": 2500}
    },
    "delta": {
      "pass_rate": "+0.50",
      "time_seconds": "+13.0",
      "tokens": "+1700"
    }
  },
  "notes": [
    "La assertion 'La salida es un archivo PDF' pasa 100% en ambas configuraciones — puede no diferenciar el valor de la skill",
    "El eval 3 muestra alta varianza (50% ± 40%) — puede ser inestable o dependiente del modelo",
    "Los runs sin-skill fallan consistentemente en las expectativas de extracción de tablas",
    "La skill agrega 13s de tiempo promedio pero mejora la tasa de aprobación en un 50%"
  ]
}
```

**Importante:** El visor lee estos nombres de campo exactamente. Usar `config` en lugar de `configuration`, o poner `pass_rate` en el nivel superior de un run en lugar de anidado bajo `result`, hará que el visor muestre valores vacíos/cero. Siempre consulta este schema cuando generes benchmark.json manualmente.

---

## comparison.json

Salida del comparador ciego. Ubicado en `<grading-dir>/comparison-N.json`.

```json
{
  "winner": "A",
  "reasoning": "La salida A proporciona una solución completa con formato adecuado. A la salida B le falta el campo de fecha.",
  "rubric": {
    "A": {
      "content": {"correctness": 5, "completeness": 5, "accuracy": 4},
      "structure": {"organization": 4, "formatting": 5, "usability": 4},
      "content_score": 4.7,
      "structure_score": 4.3,
      "overall_score": 9.0
    },
    "B": {
      "content": {"correctness": 3, "completeness": 2, "accuracy": 3},
      "structure": {"organization": 3, "formatting": 2, "usability": 3},
      "content_score": 2.7,
      "structure_score": 2.7,
      "overall_score": 5.4
    }
  },
  "output_quality": {
    "A": {
      "score": 9,
      "strengths": ["Solución completa", "Bien formateada"],
      "weaknesses": ["Inconsistencia menor en el encabezado"]
    },
    "B": {
      "score": 5,
      "strengths": ["Salida legible"],
      "weaknesses": ["Falta campo de fecha", "Inconsistencias de formato"]
    }
  }
}
```

---

## analysis.json

Salida del analizador post-hoc. Ubicado en `<grading-dir>/analysis.json`.

```json
{
  "comparison_summary": {
    "winner": "A",
    "winner_skill": "ruta/a/skill/ganadora",
    "loser_skill": "ruta/a/skill/perdedora",
    "comparator_reasoning": "Resumen breve de por qué el comparador eligió al ganador"
  },
  "winner_strengths": [
    "Instrucciones paso a paso claras para manejar documentos de varias páginas"
  ],
  "loser_weaknesses": [
    "Instrucción vaga 'procesa el documento apropiadamente' llevó a comportamiento inconsistente"
  ],
  "instruction_following": {
    "winner": {"score": 9, "issues": ["Menor: omitió paso de logging opcional"]},
    "loser": {"score": 6, "issues": ["No usó la plantilla de formato de la skill"]}
  },
  "improvement_suggestions": [
    {
      "priority": "high",
      "category": "instructions",
      "suggestion": "Reemplaza instrucción vaga con pasos explícitos",
      "expected_impact": "Eliminaría la ambigüedad que causó comportamiento inconsistente"
    }
  ],
  "transcript_insights": {
    "winner_execution_pattern": "Lee skill -> Sigue proceso de 5 pasos -> Usa script de validación",
    "loser_execution_pattern": "Lee skill -> No tiene claro el enfoque -> Intenta 3 métodos diferentes"
  }
}
```
