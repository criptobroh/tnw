# Despliegue de TNW

## Recursos

- Producción pública: https://tnw.vercel.app
- Dominio previsto: https://tnw.lol
- Vercel: proyecto `tnw`, equipo `nocoda`, región de funciones `gru1`.
- GitHub: https://github.com/criptobroh/tnw, rama `main`.
- PostgreSQL: recurso Neon exclusivo `tnw-database`.
- Evidencias: almacén Vercel Blob privado exclusivo `tnw-evidence`.
- Manual: `/manual-tnw.pdf`, 19 páginas.

El acceso operativo requiere una cuenta TNW; la portada y la demostración son públicas. Los enlaces de despliegue individuales pueden requerir autenticación Vercel; utilizar el alias público indicado arriba.

## DNS pendiente

Verificación del 22 de septiembre de 2026: `tnw.lol` está asociado al proyecto, pero el DNS continúa con la IP de estacionamiento `162.255.119.23` y servidores `dns1.registrar-servers.com` / `dns2.registrar-servers.com`.

En Namecheap → Domain List → `tnw.lol` → Advanced DNS:

1. Quitar el registro de estacionamiento o redirección del host `@`.
2. Configurar un registro **A**, host **@**, valor **76.76.21.21**, TTL automático. Es el registro indicado por `vercel domains inspect` para este dominio.
3. Conservar los registros de correo, TXT y subdominios ajenos a este cambio.
4. Revisar el estado en https://vercel.com/nocoda/tnw/settings/domains y esperar verificación DNS/certificado.

No es necesario cambiar los nameservers. El acceso autenticado a Namecheap no estaba disponible durante la entrega; no se modificó el DNS externo ni se afirmó que el dominio estuviera operativo. Mientras tanto, la plataforma funciona en `tnw.vercel.app`.

## Mantenimiento

La configuración sensible vive en las variables privadas de Vercel. No copiar contraseñas ni tokens a este repositorio. Aplicar migraciones explícitamente antes de desplegar cambios de esquema. Usar recursos separados si se habilitan entornos preview con datos persistentes.

Antes de publicar una actualización: `npm test`, `npm run build` y `npm run typecheck`. Las pruebas HTTP integrales generan y eliminan únicamente fixtures identificados; requieren habilitación explícita. No ejecutar pruebas contra datos de negocio sin revisar su alcance.

Los resultados sanitizados de esta entrega se conservan en `output/qa/`. La verificación HTTP de producción acredita login, lectura/escritura persistente, IA real, manual publicado y cierre de sesión. La salud de cámaras o CMS necesita pruebas con equipos reales; el endpoint `/api/health` no las realiza.
