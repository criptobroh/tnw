# Operación de TNW

Esta guía describe el código implementado de TNW. El brief registra ideas y requisitos del negocio; no sustituye a una comprobación de las integraciones. Los registros reales empiezan vacíos. Los ejemplos de `/demo` son datos de demostración y no se cargan en PostgreSQL.

## Acceso y alcance

`/login` inicia una sesión con correo y contraseña. La cookie es HTTP-only, SameSite Lax, segura en producción y dura siete días. El servidor guarda únicamente un hash del token; cada solicitud consulta si el usuario continúa activo y cuál es su rol actual. Cambiar la contraseña, desactivar un usuario o cambiar su rol revoca sus sesiones existentes.

| Rol interno | Lectura | Escritura |
| --- | --- | --- |
| Administración | Todo el espacio de trabajo | Todas las entidades y usuarios |
| Operaciones | Todo el espacio de trabajo | Pantallas, operadores, evidencias e incidencias |
| Comercial | Todo el espacio de trabajo | Clientes, operadores, campañas, propuestas y expansión |
| Lectura | Todo el espacio de trabajo | Ninguna |

**El rol Lectura es interno.** No debe entregarse a un cliente que solo puede conocer sus campañas, porque permite consultar y exportar el espacio completo. El acceso de cliente se realiza mediante el reporte compartido de su campaña, no creando un usuario interno.

Las contraseñas tienen entre 12 y 128 caracteres, se derivan con scrypt y usan sal aleatoria. El login limita intentos por correo y por IP en PostgreSQL, de forma que el límite funciona entre distintas instancias. Las mutaciones HTTP exigen un origen autorizado además de la sesión.

## Preparar una instalación

1. Crear el proyecto Vercel y una base PostgreSQL exclusivos de TNW. Configurar `DATABASE_URL` en el entorno correspondiente. La conexión remota usa TLS con verificación de certificado.
2. Configurar `NEXT_PUBLIC_APP_URL` con el origen público, por ejemplo `https://tnw.lol`. No copiar archivos `.env` de otros proyectos.
3. Instalar dependencias con `npm ci` y ejecutar `npm run db:migrate`. Las migraciones son explícitas: una solicitud web nunca crea tablas y `next build` no aplica migraciones automáticamente.
4. Definir `TNW_ADMIN_EMAIL`, opcionalmente `TNW_ADMIN_NAME`, y una contraseña única en `TNW_ADMIN_PASSWORD`. Ejecutar `npm run db:admin`. La contraseña también puede llegar por stdin. No incluirla en argumentos visibles, tickets, capturas, Git o documentación.
5. Si el correo ya existe, el script no cambia su contraseña ni lo asciende de rol. Las modificaciones posteriores se hacen mediante Administración.
6. Ejecutar `npm test`, `npm run typecheck` y `npm run build`. Verificar el login y la persistencia mediante una operación real en el entorno de prueba antes de habilitar usuarios.
7. Configurar las integraciones opcionales según [integrations.md](./integrations.md). La falta de una credencial no debe presentarse como una conexión exitosa.

Las migraciones `001_tnw_core` y `002_tnw_integrations` se registran en `schema_migrations`. La primera prepara usuarios, sesiones, límites, registros, auditoría y eventos. La segunda agrega metadatos de archivos, control de colisiones de eventos y enlaces de reportes. Las migraciones corren con un lock transaccional y pueden ejecutarse otra vez sin volver a crear una versión aplicada.

Para QA de desarrollo, con el servidor ya activo en `http://localhost:3000`, ejecutar `TNW_HTTP_TEST=1 npx tsx scripts/http-smoke.ts`. El script solo admite un origen local, necesita las integraciones reales configuradas, crea usuarios y entidades temporales propios y los limpia al terminar, incluidos sus archivos Blob. Guarda únicamente resultados resumidos en `output/qa/http-smoke.json`. El modo `TNW_HTTP_PHASE=remaining` sirve para continuar el bloque final después de un pase parcial documentado; comprueba que los requisitos previos ya hayan pasado y mantiene esa procedencia en el informe.

## Flujo de trabajo recomendado

1. **Operadores y clientes:** cargar contactos comprobados. El estado de prospección no demuestra autorización comercial ni disponibilidad contratada.
2. **Pantallas:** cargar ubicación, especificaciones, propiedad, operador, moneda y tarifas. Un identificador externo se asigna a una sola pantalla. Mantener diferenciados costo y precio de venta.
3. **Propuesta:** elegir cliente, pantallas, período y moneda. Revisar base, ajuste, servicios, comisión e impuestos. El sistema no convierte divisas; pantallas y propuesta deben tener la misma moneda.
4. **Campaña:** definir fechas y pantallas. Una campaña programada o activa necesita cliente y al menos una pantalla. La duración del spot no puede superar el tamaño admitido por una pantalla. Las campañas programadas y activas reservan un spot por loop: su suma simultánea no puede superar el loop de la pantalla, incluyendo el día inicial y el final. Los borradores, pausadas y completadas no consumen ese cupo local.
5. **Operación:** registrar incidencias, prioridad, responsable y vencimiento. Un cambio de estado en TNW organiza el trabajo local; no programa un reproductor ni publica contenido en un CMS externo.
6. **Evidencia:** subir el archivo privado, elegir pantalla, campaña y momento de captura, revisar la evidencia y decidir su estado. La pantalla debe pertenecer a la campaña y la captura debe estar dentro del período. No ingresar capturas futuras.
7. **Expansión:** registrar oportunidades, responsable, etapa e importes estimados. Pasar una oportunidad a una etapa no obtiene permisos ni confirma una instalación física.

Los formularios usan una versión del registro para detectar edición simultánea. Si otra persona guardó primero, aparece un conflicto: actualizar los datos y revisar el cambio antes de guardar otra vez. No se elimina una entidad que aún tiene referencias; primero hay que resolver sus relaciones.

Al editar una pantalla, tampoco se permite dejar incompatibles la moneda, la duración admitida o el loop con sus campañas y propuestas vinculadas. Las capturas se relacionan con el día comercial en `America/Argentina/Buenos_Aires`, independientemente del offset con que llegó el timestamp. El cupo calculado es de TNW: no confirma ni reserva disponibilidad en LatinAd u otro CMS.

## Interpretar los números

- Estado operativo: una observación de más de 15 minutos se considera desconocida; mantenimiento es una decisión operativa diferenciada. Una pantalla recién registrada no está en línea por el hecho de existir.
- Reproducciones previstas por día: `horas operativas × 3600 / segundos del loop`, redondeado hacia abajo. Es una estimación del plan, no reproducción medida ni audiencia.
- Reproducciones registradas: provienen de evidencia con fuente player y estado verificado. Una foto manual no se convierte en eventos de reproducción.
- Cotización: base ajustada = base × (1 + ajuste / 100); subtotal = base ajustada + servicios; comisión = base ajustada × comisión / 100; impuestos = subtotal × impuestos / 100; total = subtotal + impuestos; neto antes de costos = subtotal − comisión. Los resultados monetarios se redondean a dos decimales.
- El neto antes de costos no es beneficio contable: faltan costos operativos, pagos, impuestos efectivamente devengados y otros compromisos. Una propuesta aceptada no es una factura ni un cobro.
- El ajuste de precio y la comisión de agencia son parámetros editables de cada propuesta, no reglas universales.

## Usuarios

Administración puede crear usuarios con nombre, correo, rol y contraseña, y cambiar nombre, rol, contraseña o estado activo. El correo identifica de forma única al usuario y no se cambia por el endpoint de actualización. No se permite desactivar el propio acceso ni quitarse el rol de administrador, y debe quedar al menos un administrador activo.

La API de usuarios es `/api/users` y `/api/users/{id}`. No hay envío automático de invitaciones ni recuperación por correo en el núcleo implementado. Las contraseñas iniciales deben entregarse por un canal privado elegido por el responsable del sistema.

## Exportación y recuperación

`GET /api/export?kind=screens` y sus equivalentes descargan CSV por entidad. `GET /api/export` descarga un respaldo JSON con fecha y formato `tnw-backup-v1`: registros de negocio, metadatos de archivos y claves de eventos recibidos en los últimos dos días para evitar duplicados. Las exportaciones requieren sesión y no contienen claves de integraciones ni hashes de contraseñas.

`POST /api/restore` permite a Administración restaurar ese respaldo únicamente sobre un espacio sin registros de negocio. Conserva IDs, versiones, fechas y relaciones; valida el conjunto dentro de una transacción. Acepta como máximo 1.000 registros, 50 imágenes y un cuerpo de 4 MB. Los archivos referidos deben existir en el almacenamiento privado conectado; se comprueban sus bytes y huella SHA-256 antes de restaurar. No sobrescribe un espacio en uso. Los respaldos mayores requieren restauración asistida.

**El JSON no es una copia completa de recuperación de infraestructura.** No incluye usuarios, sesiones, auditoría, enlaces compartidos ni los bytes de imágenes. Para recuperación completa se necesita una copia PostgreSQL y una copia del almacenamiento, y probar ambas en una instalación aislada. La restauración de negocio no reemplaza ese procedimiento.

La API de importación recibe `{kind, records}` con entre 1 y 200 registros y crea el lote dentro de una transacción. Si una fila no cumple validaciones o referencia una entidad inexistente, el lote falla sin dejar una importación parcial. La importación no actualiza registros existentes ni resuelve de forma automática IDs de otro espacio de trabajo.

## Problemas frecuentes

| Situación | Qué revisar |
| --- | --- |
| No puede verificarse la sesión | Conexión a PostgreSQL, `DATABASE_URL`, estado de la base y usuario activo. Sin base disponible el sistema no confía en permisos antiguos. |
| Demasiados intentos | Esperar 15 minutos desde la ventana del límite y revisar el correo. No quitar el límite para resolver un error de contraseña. |
| Sin permiso | Rol actual; un cambio de rol puede requerir iniciar sesión otra vez. |
| Conflicto al guardar | Otra persona cambió el registro. Actualizar y comparar antes de reenviar. |
| No permite eliminar | Campañas, pantallas, evidencias u otras entidades siguen vinculadas. |
| Archivo no disponible | Configuración y acceso de Blob, metadatos en PostgreSQL y estado de la sesión/reporte compartido. |
| Sin telemetría o estado desconocido | Momento de la última observación y funcionamiento del emisor; no sustituir la ausencia de señal por “en línea”. |

No publicar mensajes técnicos con URL de base, contraseñas, cookies, tokens o contenido privado. Antes de reportar un incidente, conservar hora, acción intentada e identificador del registro, sin credenciales.
