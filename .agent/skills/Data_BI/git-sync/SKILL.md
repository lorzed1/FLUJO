---
name: git-sync
description: Skill para saber cómo realizar pull y push, commit, y sincronizar (sync) el repositorio GitHub del proyecto Data BI. Activador principal: "sync".
---

# 🔄 Skill: Git Sync (Pull & Push)

Esta skill define el estándar y flujo correcto para sincronizar el estado local del repositorio con la rama principal (`main`) en GitHub utilizando las herramientas disponibles.

## 🎯 Objetivo de la Skill
Asegurar que al solicitar la ejecución de procesos de versionamiento (pull o push), se sigan un conjunto de buenas prácticas: verificar antes de actuar, generar mensajes de commit descriptivos y minimizar conflictos.

## ⚙️ Pasos a seguir para ejecutar un Push

Cuando el usuario pida "realiza un push", "guarda los cambios en git", o algo similar, sigue estos pasos:

1. **Revisar estado:**
   Ejecuta el comando en terminal: `git status -s` o `git status`.
   *Propósito:* Esto te permitirá saber qué archivos han sido modificados, eliminados o creados.
   
2. **Evaluar y agrupar los cambios:**
   Si hay muchos archivos cambiados, analízalos rápidamente para poder armar un mensaje coherente. No comiteas archivos temporales innecesarios o basuras (como `tmp_*`, `__pycache__`, etc.), a no ser que el usuario lo solicite. Si hay archivos basura, podrías agregarlos al `.gitignore` o solo hacer add de las carpetas/archivos importantes (como `src/`, etc.). Si todo es código y documentación válida, procede al siguiente paso.

3. **Stage, Commit y Push (Comando Condensado):**
   Usa un mensaje de commit claro y en **español** que resuma las características, mejoras, correcciones o módulos modificados en los archivos evaluados.
   Ejecuta el siguiente comando (o secuencias de comandos), reemplazando el mensaje según aplique:
   ```bash
   git add . ; git commit -m "🚀 Funcionalidad/Corrección: Actualización de [Resumen de los módulos o vistas modificadas]" ; git push origin main
   ```
   *Nota:* Puedes omitir archivos temporales usando un comando más específico en vez del `.` si es estrictamente necesario, pero usualmente `git add .` funcionará en un entorno limpio.
   
4. **Validación Visual (Command Status):**
   Verifica mediante el background command status que el push haya finalizado con éxito (con el mensaje indicando progreso y finalmente delta updates completados al branch).
   
5. **Confirmar al Usuario (en Español):**
   Informa al usuario qué fue exactamente lo que preparaste en el commit y confirma que ha subido a GitHub sin inconvenientes.

## ⚙️ Pasos a seguir para ejecutar un Pull

Cuando el usuario pida "realiza un pull", "saca los cambios de git", etc:

1. **Revisar estado (Opcional pero recomendado):**
   Revisa si el working directory está limpio antes de hacer pull. 

2. **Ejecutar Pull:**
   Haz pull desde el repositorio remoto en la rama local principal:
   ```bash
   git pull origin main
   ```

3. **Verificar el Resultado:**
   - Si sale `Already up to date` o los archivos se descargan correctamente, informa al usuario del éxito de la operación.
   - Si se presentan *conflictos* (merge conflict), NO intentes resolverlos automáticamente con comandos agresivos de forma autónoma. Detente, informa al usuario sobre cuáles son los archivos con conflicto y pídele indicaciones de cómo resolverlos, o bríndale opciones.

## 📋 Ejemplos de Mensajes de Commit Estándar

- "Refactorización de formularios y consolidación de componentes UI"
- "Agregada nueva vista de calendario para Presupuestos"
- "Corrección de errores en sync con Firebase y actualización de lógica de propinas"
- "Actualización de docs. de ingeniería de datos y esquemas de Base de Datos"

> Recuerda seguir las reglas globales: Piensa y responde siempre en español. No corras simuladores de browser para hacer pruebas si no se pide.
