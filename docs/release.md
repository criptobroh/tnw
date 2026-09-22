# TNW 1.0 — verificación de entrega

22 de septiembre de 2026.

## Resultado

Aplicación desplegada en [tnw.lol](https://tnw.lol), con [tnw.vercel.app](https://tnw.vercel.app) como alias alternativo, con PostgreSQL propio, archivos privados, usuarios por rol y asistente de consulta conectado a OpenAI. Producción comienza sin datos operativos; la demo mantiene ejemplos sintéticos en el navegador.

## Evidencia

- 15 pruebas unitarias aprobadas: contraseñas, CSRF, lectura JSON limitada, protección del último administrador, permisos, cálculo monetario, CSV, fechas, señal, intervalos de capacidad y validación.
- Prueba de integración PostgreSQL ejecutada con transacción revertida: roles actuales, referencias, capacidad, modificaciones inversas y fechas de evidencia.
- 24 verificaciones HTTP consolidadas aprobadas. El informe distingue la corrida inicial del seguimiento focalizado; no representa una única corrida ininterrumpida. Incluye subida real a Blob, verificación SHA-256, acceso privado, reintentos de telemetría, aislamiento y revocación de reportes, IA real y sesiones. Limpieza de fixtures comprobada.
- 9 verificaciones en la URL pública de producción: autorización, login seguro, PostgreSQL, creación/lectura/eliminación, proveedor IA, PDF publicado y logout.
- 6 verificaciones adicionales del dominio canónico: HTTPS, login con su origen, consulta autenticada de PostgreSQL, PDF idéntico, logout y redirección HTTPS 308 de `www` al dominio principal.
- 6 comprobaciones de respaldo en producción: espacio vacío, exportación con relaciones, coordenadas numéricas en CSV, rollback ante referencia inválida, restauración exacta y limpieza posterior.
- Navegador de escritorio y móvil 390 × 844: navegación, formularios, demo persistente, filtros, rol de lectura y cierre de sesión. Navegador de producción: portada, demo, mapa y evidencias; cero errores o advertencias de consola observados.
- Manual PDF de 19 páginas y 18 marcadores. Todas las páginas renderizadas y revisadas; copia publicada idéntica a la entregable.
- `npm audit --omit=dev`: cero vulnerabilidades informadas en la revisión. TypeScript y build de producción correctos.
- Revisión de archivos a publicar: sin credenciales, base de datos, transcripción ni documentos privados de origen.
- GitHub `main`: revisión `46e5408` con CI aprobado. El despliegue de Vercel se realizó mediante CLI; la integración automática con GitHub continúa pendiente.

Informes reproducibles y sanitizados: `output/qa/http-smoke.json`, `production.json`, `restore.json`, `browser.json` y `domain.json`. El script HTTP requiere habilitación explícita y limpia solo los fixtures que crea.

## Dependencias externas pendientes

El dominio canónico y su HTTPS ya están operativos. La publicación automática desde GitHub requiere instalar o autorizar la [GitHub App de Vercel](https://github.com/apps/vercel) y vincular el repositorio al proyecto. La API de vinculación respondió HTTP 400 con esa dependencia; no se presenta como una conexión habilitada. El despliegue manual por CLI funciona. Los registros DNS actuales y el procedimiento están documentados en [deployment.md](./deployment.md).

No se recibió inventario real ni acceso autenticado a LatinAd o cámaras. No se declaró conectividad física ni métricas de audiencia. TNW permite operar manualmente y dispone del contrato autenticado de telemetría; la puesta en marcha de cada equipo requiere validar su emisor real. El manual explica ese procedimiento y las limitaciones.
