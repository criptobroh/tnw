# Integraciones TNW

TNW mantiene sus datos en una base propia. Una variable presente informa configuración, no una prueba de que un servicio esté sano ni de que esté recibiendo datos del negocio. La comprobación final debe hacer una operación real y verificar su resultado guardado.

## PostgreSQL

- Variable: `DATABASE_URL`.
- Cliente: paquete `postgres`, inicialización diferida en `src/lib/db.ts`, pool de hasta cinco conexiones, timeouts y TLS verificado en conexiones remotas.
- Esquema: se prepara con `npm run db:migrate`, no por petición ni durante el build.
- Datos operativos: tabla `records` con tipo de entidad, UUID, JSON validado, versión y fechas. Auditoría, usuarios, sesiones y metadatos de archivos tienen tablas independientes.
- Recursos: la base y su usuario son exclusivos de TNW. Los entornos de prueba no deben apuntar a producción. No reutilizar tablas ni roles de IEB o Alynk.

## Archivos de evidencia

- Variable prevista por el código de integración: `BLOB_READ_WRITE_TOKEN` de un almacén privado de Vercel Blob dedicado a TNW.
- Contrato del producto: `POST /api/upload`, formulario multipart con `file`, JPEG/PNG/WebP de hasta 4 MB; responde `{url, sha256}`. Lectura autorizada mediante `/api/files?path=...`.
- El registro de evidencia conserva ruta privada y huella SHA-256. La tabla `uploads` conserva ruta, huella, actor y momento de carga.
- La subida decodifica la imagen, limita a 32 megapíxeles, corrige su orientación, reduce a un máximo de 2560 × 2560 y guarda WebP. Elimina metadatos EXIF. La huella corresponde al WebP guardado, no al archivo original; TNW no conserva el original en este flujo.
- Cada uso de un archivo debe comprobar su pertenencia al almacenamiento TNW y que exista en metadatos. Una URL introducida manualmente no demuestra que el archivo sea válido ni esté disponible.
- Los vídeos, streams de cámara, antivirus externo y procesamiento automático de barrido no forman parte del contrato de imágenes. No describir una foto como streaming en vivo.

La configuración necesita validación extremo a extremo: subir una imagen, registrar la evidencia, volver a abrirla con permiso, y comprobar que una solicitud sin permiso no puede leerla. Las imágenes no deben publicarse en un contenedor abierto para simplificar el acceso.

## Telemetría de un reproductor

- Variable: `TNW_TELEMETRY_TOKEN`, secreto compartido exclusivamente entre un emisor autorizado y TNW.
- Contrato: `POST /api/telemetry`, encabezado `Authorization: Bearer <token>` y JSON con `eventId`, `screenId`, `observedAt`, `status`, más `plays` y `campaignId` cuando correspondan.
- Cada evento necesita un ID estable. La tabla `telemetry_events` guarda `event_id`, fecha recibida y `payload_hash` para distinguir un reintento idéntico de una colisión con contenido diferente.
- Usar timestamps ISO con zona. Conservar por separado el momento observado y el recibido; no desplazar el estado actual hacia atrás por recibir un evento atrasado.
- Las reproducciones del player ingresan por esta integración autenticada. El CRUD e importador normal no permiten crear evidencia con fuente player ni modificar sus campos de reproducción, pantalla, campaña, fecha o fuente.
- Se aceptan observaciones de las últimas 24 horas y una tolerancia máxima de cinco minutos hacia el futuro. Los eventos que incluyen reproducciones requieren campaña y generan evidencia pendiente de revisión; no se suman como verificados hasta que operaciones la revise.

Ejemplo de forma del mensaje, con valores de ejemplo que **no deben enviarse como actividad real**:

```json
{
  "eventId": "id-unico-del-evento-del-reproductor",
  "screenId": "UUID_DE_UNA_PANTALLA_REAL",
  "observedAt": "2026-09-22T15:30:00-03:00",
  "status": "online",
  "plays": 1,
  "campaignId": "UUID_DE_LA_CAMPAÑA_REAL"
}
```

El token acredita el emisor autorizado, no la audiencia de la pantalla. El endpoint por sí solo no instala un agente en el reproductor. El adaptador físico debe obtener eventos comprobables del equipo o su CMS y enviar reintentos con el mismo ID. No existe un historial de uptime demostrado por una única señal reciente.

## Asistente

- Credenciales reconocidas: `OPENAI_API_KEY` para OpenAI directo; alternativamente `AI_GATEWAY_API_KEY` o identidad Vercel mediante `VERCEL_OIDC_TOKEN` para Gateway. El código prioriza OpenAI directo cuando existe su clave. Para llamar al proveedor también se requiere `TNW_AI_ENABLED=true`; `TNW_AI_MODEL` permite elegir el modelo. El valor por defecto del código es `openai/gpt-5.4-mini`.
- Contrato: `POST /api/assistant`, `{message, history?}`, responde `{answer, mode}`. `mode: 'ai'` identifica el uso del proveedor; `mode: 'local'` identifica ayuda determinista.
- Acceso de solo lectura sobre información autorizada de TNW. No debe ejecutar cambios en campañas, compras, precios o usuarios a partir de una conversación.
- No reutilizar índices, documentos, herramientas financieras, prompts con datos privados ni claves de proyecto de otros clientes.
- La ausencia de credenciales o un fallo del proveedor se debe explicar con claridad. Una respuesta de ayuda local no se rotula como análisis de un modelo remoto.
- El contexto remoto incluye un resumen global y hasta 100 pantallas, 50 campañas y 50 incidencias abiertas. No garantiza responder sobre todos los detalles cuando se supera ese tamaño. El contrato admite `history`, pero el handler actual responde usando la pregunta actual y el contexto de la base, sin incorporar el historial recibido.

Comprobar disponibilidad del modelo y cupo del proyecto mediante una petición real antes de declarar la integración operativa. Los datos del modo demo no acreditan conectividad con el proveedor.

## LatinAd y otros CMS

LatinAd requiere acceso autorizado y documentación del proveedor. En el bootstrap implementado `latinAd` es `false`. No hay una sincronización activa de inventario, reproducción, precios o cámaras con ese CMS.

Para conectar el CMS hacen falta documentación auténtica, autorización de lectura, identificadores reales y un ejemplo comprobado. No inventar URLs de API. El adaptador debe documentar:

1. Qué datos lee, unidad y zona horaria de cada campo.
2. Cómo se vinculan IDs externos a pantallas y campañas TNW.
3. Cómo pagina, deduplica y reintenta sin inventar eventos.
4. Qué datos puede sobrescribir y qué correcciones locales preserva.
5. Fecha del último intento, último éxito y error operativo sin secretos.
6. Pruebas con una pantalla reconocible, sin mutaciones comerciales externas.

Crear o aceptar una propuesta TNW no compra espacios externos. Cambiar una campaña a activa no publica su creatividad en LatinAd. Mientras falta integración, TNW sirve como backoffice y la operación del CMS sigue realizándose por el canal real del operador.

## Acceso externo por reporte

`POST /api/share` permite a Administración o Comercial generar un enlace con `{campaignId, days}`. La vigencia es de 1 a 30 días, con 7 por defecto. `DELETE /api/share` con `{campaignId}` revoca todos los enlaces de esa campaña. Crear un enlace no envía mensajes a terceros.

La tabla `shared_reports` guarda el hash del token, fecha de expiración y revocación. `/reports/{token}` consulta vigencia y campaña en cada lectura. `/api/report-file/{token}?id=...` solo sirve imágenes de evidencias verificadas incluidas en esa campaña. El enlace funciona como credencial: cualquiera que lo posea podría ver su alcance hasta que venza o se revoque.

Un cliente externo no debe recibir usuario interno con rol Lectura. El portal compartido debe mostrar únicamente la campaña autorizada y sus pantallas/evidencias permitidas, sin exportar la base completa, precios internos, costos, otros clientes o auditoría general.

## Cámaras, mapas y correo

- Cámaras: la instalación no incluye dispositivos ni streams conectados. Captura automática, instalación física, alimentación solar y corrección del barrido son trabajos externos o futuras integraciones.
- Inventario geográfico: las ubicaciones reales deben cargarse o importarse desde una fuente comprobada; un mapa de demostración no prueba cobertura comercial.
- Correo: el acceso implementado usa contraseña. No incluye recuperación por correo, envío de propuestas ni invitaciones automáticas. La entrega de credenciales o reportes a terceros requiere una acción explícita y un canal autorizado.

## Comprobaciones de despliegue

No incluir secretos en Git, archivos públicos, documentación ni PDFs. Configurar variables por entorno y mantener aislamiento de producción. Tras desplegar: comprobar dominio y HTTPS, login, rol de lectura sin escritura, persistencia de un registro, imagen privada, intento repetido de telemetría y expiración/revocación de un enlace compartido. Registrar cuáles de estas comprobaciones efectivamente pasaron; las tablas preparadas o credenciales presentes no equivalen a integración probada.

`GET /api/health` solo confirma que el servicio HTTP responde e informa la versión. No consulta PostgreSQL, Blob, IA ni un reproductor: no utilizarlo como prueba de salud de esas integraciones.
