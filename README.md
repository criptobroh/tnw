# TNW · Network operations

Plataforma en español para gestionar una red de pantallas LED: inventario propio y asociado, mapa, operadores, clientes, campañas, cotizaciones, evidencias privadas, incidencias y expansión.

[Abrir TNW](https://tnw.lol) · [Demo interactiva](https://tnw.lol/demo) · [Manual](https://tnw.lol/manual-tnw.pdf)

## Aplicación

- `/`: presentación del producto.
- `/demo`: demostración interactiva con datos sintéticos y almacenamiento local del navegador.
- `/login` y `/app`: espacio real autenticado; no se cargan ejemplos en producción.
- `/reports/:token`: reporte temporal de una campaña, con evidencias verificadas y sin datos financieros internos.
- `/manual-tnw.pdf`: manual de uso de 19 páginas.

La aplicación **no sustituye el CMS de reproducción**. LatinAd requiere credenciales y contrato de API reales. TNW recibe eventos de player mediante su propio contrato documentado y permite carga manual de fotos. No procesa cobros, envía comunicaciones o mide audiencia.

## Desarrollo

Node.js 24 y npm.

```sh
npm ci
cp .env.example .env.local
# Configurar una base PostgreSQL exclusiva de TNW.
npm run db:migrate
# Proporcionar TNW_ADMIN_EMAIL, TNW_ADMIN_NAME y TNW_ADMIN_PASSWORD
# como variables de entorno privadas o la contraseña por stdin.
npm run db:admin
npm run dev
```

El constructor de base es diferido. Las migraciones son explícitas; no se ejecutan dentro de una petición. PostgreSQL usa TLS con verificación de certificado en hosts remotos. Las sesiones se almacenan como hashes y las contraseñas con scrypt. El rol se consulta nuevamente al autorizar operaciones.

## Configuración

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | PostgreSQL persistente propio |
| `BLOB_READ_WRITE_TOKEN` | Almacenamiento Vercel Blob **privado** |
| `NEXT_PUBLIC_APP_URL` | Origen canónico de la aplicación |
| `TNW_TELEMETRY_TOKEN` | Secreto Bearer para el adaptador de player |
| `TNW_AI_ENABLED` | `true` para habilitar generación de IA |
| `TNW_AI_MODEL` | Modelo; valor probado: `openai/gpt-5.4-mini` |
| `OPENAI_API_KEY` | Proveedor directo opcional |
| `AI_GATEWAY_API_KEY` / `VERCEL_OIDC_TOKEN` | Alternativa Vercel AI Gateway |

Ningún secreto lleva prefijo `NEXT_PUBLIC_`. Cuando falta IA o falla el proveedor, el asistente informa su modo local y responde con reglas. En demos no se consume la API de producción.

## Validación

```sh
npm test
npm run typecheck
npm run build
```

Las pruebas de dominio cubren comisiones y redondeo, capacidad por intervalos inclusivos, conversión de fechas de negocio, señal vencida, permisos e importación. Las pruebas que requieren DB o HTTP son optativas y limpian exclusivamente sus propios registros. Consultar sus cabeceras antes de ejecutarlas.

## Despliegue

Proyecto Next.js en Vercel, región `gru1`, repositorio `criptobroh/tnw`, rama `main`. Configurar las variables para el entorno objetivo y ejecutar las migraciones antes de desplegar cambios de esquema. Los entornos preview no reciben automáticamente acceso a la base productiva.

```sh
vercel link
vercel env pull .env.local
npm run db:migrate
npm run build
vercel --prod
```

`/api/health` comprueba que la aplicación responde; no prueba conectividad de proveedores. Verificar una sesión autenticada, lectura/escritura y acceso privado a imágenes tras cada despliegue.

## Datos y alcance

- La señal del player vence a los 15 minutos. Online no implica verificación visual.
- Las fotos se convierten a WebP, se quita EXIF y se calcula SHA-256 sobre el archivo guardado. No se conserva el original.
- La suma de spots de campañas programadas/activas no puede superar el loop en días superpuestos. No es una reserva en un proveedor externo.
- La evidencia de player entra solo por telemetría; los eventos son idempotentes y no permiten modificar conteos recibidos.
- El rol viewer es interno y tiene lectura global. Los clientes externos usan enlaces de campaña, temporales y revocables.
- El respaldo JSON preserva registros y referencias. No contiene usuarios, secretos ni binarios; restauración web únicamente sobre espacio vacío y archivos existentes verificados.
- Importar CSV crea nuevos registros; no hace upsert ni restaura identificadores.

## Documentación

- [Despliegue y DNS](docs/deployment.md)
- [Operación y recuperación](docs/operations.md)
- [Contrato de integraciones](docs/integrations.md)
- [Manual PDF](public/manual-tnw.pdf)
- [Contrato interno de interfaz](docs/interface-contract.md)

Los patrones de autorización, validación y almacenamiento se adaptaron de aplicaciones existentes de NoCoda/IEB. No se incorporaron sus bases, clientes ni documentos privados. Las fuentes locales se distribuyen con sus licencias OFL.

Para regenerar el manual: instalar `reportlab` en Python y ejecutar `python3 scripts/build-manual.py`. Revisar el PDF renderizado antes de reemplazar el archivo público.
