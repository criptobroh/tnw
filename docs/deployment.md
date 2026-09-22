# Despliegue de TNW

## Recursos

- Producción canónica: [tnw.lol](https://tnw.lol).
- Alias alternativo: [tnw.vercel.app](https://tnw.vercel.app).
- `www.tnw.lol` redirige con HTTP 308 a `tnw.lol`.
- Vercel: proyecto `tnw`, equipo `nocoda`, región de funciones `gru1`.
- GitHub: [criptobroh/tnw](https://github.com/criptobroh/tnw), rama `main`.
- PostgreSQL: recurso Neon exclusivo `tnw-database`.
- Evidencias: almacén Vercel Blob privado exclusivo `tnw-evidence`.
- Manual: [manual-tnw.pdf](https://tnw.lol/manual-tnw.pdf), 19 páginas.

El acceso operativo requiere una cuenta TNW; la portada y la demostración son públicas. Los enlaces de despliegue individuales pueden requerir autenticación Vercel; utilizar el alias público indicado arriba.

## Dominio y DNS configurados

Verificación del 22 de septiembre de 2026: `https://tnw.lol` responde por HTTPS y permite iniciar sesión, consultar el espacio autenticado, descargar el PDF y cerrar sesión. `https://www.tnw.lol` redirige con HTTP 308 al dominio canónico. Las seis comprobaciones quedaron registradas en `output/qa/domain.json`.

Registros configurados en Namecheap para `tnw.lol`:

| Tipo | Host | Valor |
| --- | --- | --- |
| A | `@` | `216.150.1.1` |
| A | `@` | `216.150.16.1` |
| CNAME | `www` | `1986dc47e22fa2c2.vercel-dns-016.com.` |

La redirección de `www` al dominio principal está configurada en Vercel. El estado del dominio se consulta en [Vercel → TNW → Domains](https://vercel.com/nocoda/tnw/settings/domains). El alias `tnw.vercel.app` permanece disponible como alternativa.

## Publicación y conexión con GitHub

El despliegue de producción se realizó mediante Vercel CLI. La publicación automática desde GitHub **no está habilitada**: el intento de vincular el repositorio por la API de Vercel devolvió HTTP 400, indicando que primero se debe instalar o autorizar la [GitHub App de Vercel](https://github.com/apps/vercel). Después corresponde vincular `criptobroh/tnw` al proyecto y verificar un despliegue automático.

GitHub Actions sí ejecutó correctamente el CI de la revisión `46e5408` de `main`. Ese resultado verifica los controles del repositorio; no implica que Vercel esté conectado a GitHub ni que cada push publique automáticamente. Hasta completar esa conexión, las actualizaciones se despliegan explícitamente mediante CLI.

## Mantenimiento

La configuración sensible vive en las variables privadas de Vercel. No copiar contraseñas ni tokens a este repositorio. Aplicar migraciones explícitamente antes de desplegar cambios de esquema. Usar recursos separados si se habilitan entornos preview con datos persistentes.

Antes de publicar una actualización: `npm test`, `npm run build` y `npm run typecheck`. Las pruebas HTTP integrales generan y eliminan únicamente fixtures identificados; requieren habilitación explícita. No ejecutar pruebas contra datos de negocio sin revisar su alcance.

Los resultados sanitizados de esta entrega se conservan en `output/qa/`. La verificación HTTP de producción acredita login, lectura/escritura persistente, IA real, manual publicado y cierre de sesión. La salud de cámaras o CMS necesita pruebas con equipos reales; el endpoint `/api/health` no las realiza.
