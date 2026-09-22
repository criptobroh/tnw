from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT
from xml.sax.saxutils import escape

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'output/pdf/manual-tnw.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
for name,file in [('DM','dm-sans-regular.ttf'),('DMBold','dm-sans-bold.ttf'),('Manrope','manrope-extra-bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(ROOT/'public/fonts'/file)))
pdfmetrics.registerFontFamily('DM',normal='DM',bold='DMBold',italic='DM',boldItalic='DMBold')
INK=HexColor('#222923'); LIME=HexColor('#d7f765'); PAPER=HexColor('#f5f5ed'); MUTED=HexColor('#65705f'); LINE=HexColor('#d4dacb')
W,H=595.28,841.89
styles={
 'body':ParagraphStyle('body',fontName='DM',fontSize=9.8,leading=14.6,textColor=INK,spaceAfter=9),
 'small':ParagraphStyle('small',fontName='DM',fontSize=8.5,leading=12.4,textColor=MUTED),
 'label':ParagraphStyle('label',fontName='DMBold',fontSize=9,leading=12,textColor=MUTED),
 'h2':ParagraphStyle('h2',fontName='Manrope',fontSize=14,leading=19,textColor=INK,spaceAfter=8),
 'table':ParagraphStyle('table',fontName='DM',fontSize=8.8,leading=12.5,textColor=INK),
}
pages=[]
def page(title,sub,blocks): pages.append((title,sub,blocks))
def p(text): return ('p',text)
def h(text): return ('h',text)
def note(text): return ('note',text)
def steps(items): return ('steps',items)
def table(headers,rows,widths=None):return ('table',(headers,rows,widths))

page('Empezá por lo real.', '01 / PUESTA EN MARCHA',[
 p('TNW reúne inventario, campañas, cotizaciones, evidencias e incidencias de una red de pantallas. Este manual describe las funciones implementadas y sus límites: no presupone que haya pantallas conectadas ni contenidos publicados en un reproductor.'),
 h('Primer recorrido, en orden'),
 steps(['Abrí la aplicación y elegí <b>Explorar demo</b> para recorrer ejemplos. La demo guarda cambios en tu navegador; no modifica la operación real.','Ingresá a <b>/login</b> con el correo y la contraseña entregados por administración. Las credenciales se entregan aparte de este PDF.','En <b>Configuración</b>, revisá las conexiones y creá accesos para el equipo con el rol necesario.','Cargá operadores y clientes. Después registrá pantallas en <b>Inventario</b> y comprobá su ubicación en <b>Mapa de la red</b>.','Prepará una cotización y una campaña. Adjuntá una evidencia real, revisala y generá un reporte de esa campaña para el cliente.']),
 note('El espacio real comienza vacío. Las ubicaciones, empresas, importes y señales de la demo son ficticios. No uses la demo para almacenar información de clientes ni como respaldo operativo.'),
 h('Dónde encontrar ayuda'),
 p('La sección <b>Ayuda</b> enlaza este manual. El botón del asistente responde consultas sobre lo registrado. Los errores de guardado se muestran en el formulario: corregilos antes de volver a intentar.')])

page('Una red, varias pruebas.', '02 / QUÉ SIGNIFICA CADA DATO',[
 p('La precisión del tablero depende de distinguir un dato cargado por una persona de una señal técnica. Estos conceptos no son intercambiables.'),
 table(['Concepto','Qué acredita','Qué no acredita'],[
 ['Pantalla registrada','Existe una ficha en el inventario.','Que esté instalada, disponible o encendida.'],
 ['Señal reciente','El player informó su estado recientemente.','Que la superficie LED muestre correctamente el contenido.'],
 ['Foto verificada','El equipo revisó una captura en un instante.','Que toda la campaña se haya emitido sin interrupciones.'],
 ['Reproducciones del player','Eventos del reproductor autenticados y revisados.','Personas, impactos publicitarios o audiencia.'],
 ['Proyección de reproducciones','Estimación según loop y horas operativas.','Una medición real ni una garantía comercial.'],
 ['Campaña activa','Estado administrativo en TNW.','Publicación o reserva confirmada en LatinAd.']], [120,174,181]),
 h('Vigencia de la señal'),p('Se considera reciente una observación de los últimos <b>15 minutos</b>. Sin observaciones o con señal vencida, no se presenta la pantalla como online confirmada. Mantenimiento es un estado operativo separado. Revisá siempre la fecha de la última señal.'),
 note('Las fechas comerciales se interpretan con el calendario de Buenos Aires. Los instantes de captura y telemetría se guardan con zona horaria. Al cargar una foto, comprobá la hora que muestra el formulario.')])

page('Cada persona, su acceso.', '03 / EQUIPO Y PERMISOS',[
 p('En <b>Configuración → Equipo y permisos</b>, administración crea usuarios internos. No se envía un correo de invitación automáticamente. El acceso se crea con una contraseña inicial de al menos 12 caracteres.'),
 table(['Rol','Puede modificar'],[
 ['Administración','Todas las secciones, usuarios, enlaces de cliente y restauración.'],
 ['Operaciones','Pantallas, operadores, evidencias e incidencias.'],
 ['Comercial','Clientes, operadores, campañas, cotizaciones, expansión y enlaces de reporte.'],
 ['Solo lectura','Consulta y exportación del espacio interno. No modifica registros.']], [125,350]),
 steps(['Elegí <b>Crear acceso</b>, ingresá nombre, correo, rol y contraseña inicial.','Entregá las credenciales por un canal privado. No las escribas en notas de campañas, archivos CSV o cotizaciones.','Para cambiar nombre, rol o contraseña, usá <b>Editar</b>. Cambiar permisos o contraseña invalida sesiones existentes.','Desactivá el acceso de una persona que ya no necesita entrar. El sistema impide quitar tu propio rol de administrador o dejar el espacio sin administración activa.']),
 note('<b>Solo lectura es un rol interno con acceso al espacio completo.</b> Para un cliente externo usá un enlace de reporte limitado a su campaña; no le crees un usuario interno de lectura global.'),
 p('Las sesiones vencen a los 7 días y pueden revocarse. El servidor verifica usuario activo y rol vigente; ocultar un botón no es la única protección. El inicio de sesión tiene límites de intentos.')])

page('Inventario que sirve.', '04 / PANTALLAS Y MAPA',[
 steps(['En <b>Inventario</b>, elegí <b>Agregar pantalla</b>. Usá un nombre reconocible: ubicación y referencia física.','Completá ciudad, provincia, dirección y coordenadas decimales. Confirmá el punto en el mapa; TNW no geocodifica una dirección automáticamente.','Indicá si es propia o asociada, interior o exterior. Para una pantalla de terceros, vinculá su operador previamente registrado.','Cargá dimensiones físicas, resolución, duración de spot, duración del loop y horas operativas por día. El spot no puede superar el loop.','Ingresá tarifa, costo mensual y moneda. ARS y USD se conservan separados: no hay conversión automática.','Guardá y abrí la ficha. Buscá por ubicación, filtrá por propiedad o ciudad y alterná con el mapa.']),
 h('Identificador externo'),p('El ID externo permite documentar la referencia del reproductor/proveedor y no puede repetirse en otra pantalla. La recepción de telemetría usa el <b>UUID interno de TNW</b>, disponible en la exportación CSV.'),
 h('Cambios con dependencias'),p('Si una pantalla participa en campañas o cotizaciones, no se permite convertir sus datos en incompatibles: por ejemplo, cambiar la moneda o reducir el spot por debajo de una pauta vinculada. Tampoco se elimina una pantalla referenciada por campañas, propuestas, evidencias o incidencias.'),
 note('Cambiar un estado declarado no fabrica una señal del reproductor. Una pantalla puede estar inventariada y aún no tener telemetría. El mapa usa OpenStreetMap; requiere conexión para cargar sus teselas y mantiene su atribución.')])

page('Cargá una vez. Revisá antes.', '05 / IMPORTACIÓN Y EXPORTACIÓN CSV',[
 steps(['Entrá a la sección que querés cargar y elegí <b>Importar CSV</b>. Descargá la plantilla de esa misma sección.','Usá UTF-8 y coma como separador. Conservá los nombres internos de las columnas. No cambies los estados por sus etiquetas traducidas.','Completá los valores numéricos sin símbolo de moneda ni separador de miles: por ejemplo, 650000 y -34.6037.','Para relaciones, usá UUID internos: operatorId, clientId, screenId o campaignId. En screenIds separá varios UUID con el carácter |.','Seleccioná el archivo y revisá la vista previa y los errores. El límite es de 200 filas por importación y 2 MB en la interfaz.','Confirmá. Se crean nuevos registros: importar un CSV no actualiza por nombre ni sincroniza con otra plataforma.']),
 h('Orden recomendado'),p('<b>Operadores y clientes → Pantallas → Campañas y cotizaciones → Incidencias.</b> Las evidencias visuales requieren una imagen privada cargada desde su formulario; no alcanza con importar una URL externa.'),
 table(['Dato','Ejemplo de valor interno'],[['Propiedad / entorno','own, partner / outdoor, indoor'],['Moneda','ARS o USD'],['Campaña','draft, scheduled, active, paused, completed'],['Fecha comercial','2026-10-01'],['Etapa de operador','prospect, contacted, negotiating, active']], [165,310]),
 note('La importación de producción es atómica: una fila inválida cancela el lote. Exportar a CSV incluye identificadores; el importador ignora los metadatos al crear nuevos registros. Para conservar IDs y relaciones usá el respaldo JSON y su restauración sobre un espacio vacío.')])

page('De la ciudad al acuerdo.', '06 / OPERADORES Y CLIENTES',[
 h('Directorio de operadores'),
 p('Usá <b>Operadores</b> para registrar cobertura de terceros y contactos que todavía están en negociación. Un contacto en una ciudad no equivale a inventario contratado ni a disponibilidad confirmada.'),
 steps(['Creá el operador con nombre, ciudad, contacto, email y teléfono.','Elegí la etapa: Por contactar, Contactado, En negociación o Activo.','Documentá en notas qué falta: ubicación exacta, medidas, spot, tarifa, disponibilidad, autorización comercial y fecha de actualización.','Cuando la ubicación esté relevada, creá su pantalla como Asociada y vinculá ese operador.','Antes de cotizar, reconfirmá precio, período y condiciones con el operador. Registrá el resultado y la fecha en sus notas.']),
 h('Agencias y anunciantes'),p('En <b>Clientes</b> registrá empresa, persona de contacto y tipo: agencia o anunciante directo. Las campañas y cotizaciones se vinculan al cliente. El tipo no aplica automáticamente una comisión: ese porcentaje se define en cada propuesta.'),
 note('Los botones de email abren el cliente de correo del dispositivo. TNW no envía propuestas, avisos ni comunicaciones automáticamente. Los datos de contacto permanecen dentro del espacio autenticado.'),
 h('Rutina semanal'),p('Filtrá operadores por etapa, completá fichas sin contacto y revisá las ciudades que faltan para campañas abiertas. Mantené separada la etapa comercial del operador del estado técnico de cada pantalla.')])

page('La pauta bajo control.', '07 / CAMPAÑAS Y CAPACIDAD',[
 steps(['Creá primero el cliente y las pantallas. En <b>Campañas</b>, elegí nueva campaña.','Ingresá nombre, cliente, pantallas y fechas inclusivas de inicio y fin. La moneda debe coincidir con la de las pantallas seleccionadas.','Definí la duración del spot, presupuesto y objetivo de reproducciones. El objetivo es un plan; no se transforma en medición.','Guardá como Borrador mientras faltan acuerdos o material. Usá Programada o Activa cuando corresponda a tu operación.','Registrá evidencias e incidencias vinculadas. Al cerrar el período, revisá la entrega antes de cambiar a Finalizada.']),
 table(['Estado','Efecto dentro de TNW'],[['Borrador','Organización preliminar; no consume capacidad programada.'],['Programada / Activa','Participa en la validación de capacidad de las pantallas.'],['Pausada / Finalizada','No se considera reserva activa en el cálculo de capacidad.']], [160,315]),
 h('Cómo se comprueba el cupo'),p('Por pantalla y por cada día de solapamiento, la suma de los segundos de spot de campañas Programadas o Activas no puede superar el loop. El sistema también comprueba que cada spot sea compatible con el máximo de la pantalla. El día de fin se cuenta dentro del período.'),
 note('Esta validación organiza el inventario registrado en TNW. No representa contratos de terceros que no estén cargados ni confirma una reserva en LatinAd. La publicación de archivos creativos y la programación física siguen en el CMS del proveedor hasta disponer de su integración real.')])

page('Precio claro. Margen visible.', '08 / COTIZACIONES',[
 p('En <b>Cotizaciones</b>, elegí cliente, pantallas, período y moneda. Completá los importes como números sin separador de miles. Los porcentajes de ajuste, comisión e impuestos son editables; no constituyen una recomendación fiscal.'),
 table(['Cálculo','Fórmula'],[['Base ajustada','Base × (1 + ajuste / 100)'],['Subtotal','Base ajustada + servicios'],['Comisión de agencia','Base ajustada × comisión / 100'],['Impuestos','Subtotal × impuestos / 100'],['Total al cliente','Subtotal + impuestos'],['Neto antes de costos','Subtotal - comisión']], [155,320]),
 h('Ejemplo ilustrativo en ARS'),p('Con base 600.000, ajuste 40%, servicios 100.000, comisión 15% e impuestos 0%: base ajustada <b>840.000</b>, subtotal y total <b>940.000</b>, comisión <b>126.000</b> y neto antes de costos <b>814.000</b>. No se descuentan aquí costos de pantallas, instalación u otros gastos.'),
 steps(['Revisá el resumen antes de guardar. El ajuste no se aplica al servicio y la comisión no se calcula sobre impuestos.','Usá la acción de imprimir/descargar de la propuesta. Elegí Guardar como PDF en el diálogo del navegador.','Revisá el PDF antes de enviarlo. La propuesta impresa excluye comisión interna y neto antes de costos.','Cambiá el estado a Enviada, Aceptada o Rechazada según lo ocurrido. Cambiar el estado no envía un correo ni crea una campaña.']),
 note('Las monedas no se suman entre sí. La cotización no procesa pagos ni genera facturas. Los importes se redondean a dos decimales; validá el tratamiento impositivo con quien gestione la facturación.')])

page('Evidencia, con contexto.', '09 / FOTOS Y REPRODUCCIONES',[
 steps(['En <b>Evidencias</b>, seleccioná pantalla y, si corresponde, campaña. La pantalla debe pertenecer a esa campaña.','Cargá fecha y hora de captura: debe ser el momento de la observación, no el de la visita al portal. Para campañas, la fecha debe estar dentro de su período.','Elegí origen manual o cámara. Adjuntá JPG, PNG o WebP de hasta 4 MB; se rechazan archivos que no sean imágenes válidas.','Dejá el registro Por revisar. Una persona de operaciones debe comprobar encuadre, contenido, pantalla y fecha antes de marcarlo Verificado.','Si no permite acreditar el contenido, marcá Rechazada y explicá qué falta. Si muestra una falla, abrí una incidencia relacionada.']),
 h('Qué conserva el archivo'),p('El servidor genera una versión WebP de hasta 2560 píxeles y elimina metadatos EXIF. La huella SHA-256 corresponde exactamente a esa versión guardada. El archivo original no se conserva; si tu proceso exige originales, retenelos en el archivo documental correspondiente.'),
 h('Eventos del reproductor'),p('Los registros de origen Player entran únicamente por la API de telemetría autenticada. Quedan pendientes de revisión. No se puede crear manualmente una reproducción ni modificar el conteo, pantalla, campaña o instante de un evento ya recibido.'),
 note('Solo las evidencias verificadas aparecen en el reporte para el cliente. Las imágenes se guardan en almacenamiento privado y se sirven mediante rutas autorizadas. Una captura manual no incrementa el contador de reproducciones.')])

page('Que la falla tenga dueño.', '10 / INCIDENCIAS Y MANTENIMIENTO',[
 steps(['En <b>Incidencias</b>, registrá un título concreto: qué falla y en qué pantalla.','Asigná una prioridad: Baja, Media, Alta o Crítica. Usá el impacto real sobre la campaña para decidirla.','Indicá responsable y fecha límite. El responsable es un campo de texto; escribir un nombre no envía una asignación o notificación.','Pasá de Abierta a En curso cuando haya trabajo iniciado. Guardá diagnóstico, acciones y próximos pasos en notas.','Antes de marcar Resuelta, verificá el funcionamiento. Adjuntá la captura posterior como evidencia y documentá la comprobación en la incidencia.']),
 h('Rutina al iniciar el día'),p('Revisá las incidencias abiertas y las pantallas sin señal reciente. Una ausencia de señal puede deberse a conectividad, un player detenido o falta de integración: no alcanza para diagnosticar el hardware. Cruzá el dato con fotos, mantenimiento y contacto local.'),
 h('Vencimientos y avisos'),p('El tablero permite consultar fechas y prioridades. Esta versión no envía alertas por email, WhatsApp o Slack ni abre tickets automáticamente cuando se pierde una señal. El equipo debe revisar el centro de control y actualizar la información.'),
 note('Mantenimiento es un estado operativo. La aplicación no reinicia players, cambia contenidos ni realiza tareas sobre equipos físicos. Anotá la intervención y comprobá el resultado mediante el proceso técnico real.')])

page('Compartí solo esa campaña.', '11 / REPORTE PARA CLIENTES',[
 steps(['Abrí el detalle de una campaña desde <b>Campañas</b>. Revisá que las pantallas y las fechas sean correctas.','Elegí <b>Compartir reporte</b>. Administración y Comercial pueden crear el enlace. Su vigencia predeterminada es de 7 días.','Copiá el enlace generado y compartilo por tu canal habitual. TNW no lo envía automáticamente.','Abrilo en una ventana sin sesión para revisar lo que recibirá el cliente. Solo expone esa campaña, ubicaciones y evidencias verificadas.','Si hubo un error de destinatario o cambió el acceso requerido, usá <b>Revocar enlaces</b> en la campaña. Todos sus enlaces dejan de funcionar.']),
 table(['Se muestra','No se muestra'],[['Nombre y período de campaña','Costos internos de pantallas'],['Cliente y ubicaciones de esa campaña','Comisiones, margen y cotizaciones'],['Capturas verificadas y sus fechas','Contactos de operadores y notas internas'],['Reproducciones de player verificadas','Evidencia pendiente/rechazada u otras campañas']], [237,238]),
 h('PDF del reporte'),p('El destinatario puede usar Imprimir → Guardar como PDF. El documento refleja el estado al abrir el enlace. Una descarga ya compartida no puede revocarse desde TNW.'),
 note('El enlace es una credencial de acceso: cualquiera que lo tenga puede verlo hasta su vencimiento o revocación. No lo publiques en redes abiertas. El reporte no equivale a una certificación contractual de todo el período.')])

page('Expandí con supuestos claros.', '12 / OPORTUNIDADES DE EXPANSIÓN',[
 p('La sección <b>Expansión</b> registra posibles nuevas ubicaciones. Sirve para ordenar relevamiento, permisos e instalación antes de convertir una oportunidad en una pantalla operativa.'),
 table(['Etapa','Información que conviene registrar'],[['Idea','Ciudad, zona, motivo de interés y responsable.'],['Relevamiento','Dimensiones, visibilidad, energía, conectividad y acceso técnico.'],['Habilitaciones','Estado del trámite, responsables y documentación pendiente.'],['Instalación','Cronograma, equipos, costos y tareas restantes.'],['En operación','Puesta en marcha comprobada y ficha de pantalla creada.']], [145,330]),
 steps(['Creá un proyecto con nombre, ciudad y dirección o zona.','Indicá responsable, inversión inicial, ingreso mensual estimado, costo mensual estimado y moneda.','Documentá supuestos y fecha de actualización. Incluí lo que todavía no fue confirmado.','Actualizá la etapa a medida que avance el trabajo. Al entrar en operación, creá la pantalla en Inventario; la conversión no es automática.']),
 h('Estimaciones, no promesas'),p('Si hay recupero simple mostrado, se calcula como inversión dividida por ingreso mensual menos costo mensual. No incorpora impuestos, estacionalidad, financiación, inflación ni valor residual. Si el flujo es cero o negativo, no existe un recupero positivo bajo esos supuestos.'),
 note('Las habilitaciones y acuerdos con socios se documentan como estados y notas. TNW no tramita permisos, firma contratos ni aprueba inversiones.')])

page('Consultá sin perder el control.', '13 / ASISTENTE',[
 p('El asistente es de solo lectura. Puede ayudarte a interpretar los datos registrados y orientar el próximo paso, sin modificar precios, cerrar acuerdos, reservar inventario ni enviar comunicaciones.'),
 h('Preguntas útiles'),
 steps(['“¿Qué pantallas tenemos en Córdoba?”','“¿Cuáles son las tarifas registradas?”','“¿Qué incidencias necesitan atención?”','“¿Qué evidencias tenemos y cuántas reproducciones están verificadas?”']),
 h('Dos modos visibles'),p('<b>IA:</b> usa el proveedor configurado y un contexto acotado del espacio. <b>Local:</b> responde con reglas sobre los registros cuando no hay IA disponible o estás en la demo. La interfaz identifica el modo; no se presenta una respuesta local como una generación de IA.'),
 h('Alcance del contexto'),p('La IA recibe un resumen de la red y hasta 100 pantallas, 50 campañas y 50 incidencias abiertas por consulta. No busca en internet ni consulta LatinAd. No recibe la imagen de la evidencia para certificarla. El contexto operativo excluye teléfonos y correos de clientes y operadores.'),
 note('Comprobá las cifras y condiciones en la ficha antes de comprometer una venta. La IA puede interpretar mal una consulta; las reglas de guardado y permisos siguen en el servidor. Límite operativo: 30 consultas por usuario por hora.'),
 p('Si una respuesta no encuentra datos, primero revisá si están cargados. Ningún asistente puede deducir disponibilidad real, audiencias o funcionamiento físico de una pantalla a partir de una ficha vacía.')])

page('Conectar requiere una fuente.', '14 / TELEMETRÍA Y LATINAD',[
 p('En Configuración, “Configurada” indica que existe la credencial necesaria. No prueba por sí sola que haya tráfico o que el proveedor esté disponible. Una integración ausente se muestra como no conectada.'),
 h('Recepción de player'),p('La ruta <b>POST /api/telemetry</b> usa Authorization: Bearer con TNW_TELEMETRY_TOKEN. El secreto vive en variables de entorno del servidor, nunca en el navegador, este manual o el repositorio.'),
 table(['Campo','Contenido'],[['eventId','Identificador único y estable para reintentos.'],['screenId','UUID interno de la pantalla en TNW.'],['observedAt','Fecha ISO 8601 con zona; últimas 24 horas, tolerancia futura 5 minutos.'],['status','online, offline, maintenance o unknown.'],['plays / campaignId','Incremento de reproducciones y UUID de campaña. El conteo requiere campaña.']], [130,345]),
 p('Un reintento idéntico no duplica reproducciones. Reutilizar el mismo eventId con otro contenido devuelve conflicto. Una observación anterior no reemplaza una señal más reciente. Los conteos recibidos quedan pendientes de revisión.'),
 h('LatinAd'),p('La conexión directa requiere documentación y acceso de API del proveedor, inventario autorizado e IDs reales. No se inventaron endpoints ni se activó una sincronización ficticia. Mientras tanto, usá importación CSV, gestión manual y el adaptador de recepción de player.'),
 note('El backend TNW no transmite creatividades ni altera la programación del CMS. La documentación técnica del repositorio incluye contrato de telemetría y pruebas de integración. No publiques la clave de player en enlaces o CSV.')])

page('La cámara también se prueba.', '15 / PUESTA EN MARCHA VISUAL',[
 p('La captura automática depende de hardware instalado y de una integración que todavía debe conectarse al origen real. Registrar una evidencia con origen Cámara no instala una cámara ni activa una captura periódica.'),
 steps(['Relevá encuadre, anclaje, energía, conectividad, acceso para mantenimiento y autorización de instalación.','Probá con la pantalla real y varios contenidos: texto fino, zonas oscuras, movimiento y fondos brillantes.','Comprobá exposición, reflejos, enfoque y bandas de barrido en distintos horarios. Conservá muestras antes de definir hardware.','Si aparece barrido, ensayá configuraciones de obturación y frecuencia compatibles con cámara y display. No asumas que un filtro de IA puede reconstruir contenido que no se capturó.','Acordá una frecuencia de captura, responsable de revisión, conservación y tratamiento de imágenes con el equipo correspondiente.','Conectá el flujo autenticado solo después de verificar hora, pantalla y permisos. Documentá cada problema como incidencia.']),
 h('Qué priorizar en el encuadre'),p('El objetivo del producto es comprobar la pantalla y el contenido. Reducí la presencia innecesaria de personas, vehículos y espacios privados. Las necesidades de aviso, autorización y conservación deben revisarse según el lugar y el uso concreto.'),
 note('TNW no incluye reconocimiento de personas o patentes, vigilancia de terceros, corrección automática de barrido ni un servicio de transmisión RTSP. La revisión de imágenes en esta versión es humana.')])

page('Respaldo con límites conocidos.', '16 / PORTABILIDAD Y RESTAURACIÓN',[
 steps(['En <b>Configuración → Portabilidad y respaldo</b>, descargá el JSON de producción. Guardalo en una ubicación privada.','Conservá además una estrategia de respaldo de base de datos y almacenamiento del proveedor. El JSON de TNW no contiene los binarios de las fotos.','Para restaurar registros, un administrador debe usar un espacio vacío y un archivo con formato tnw-backup-v1.','Seleccioná el JSON, revisá la cantidad de registros y confirmá la restauración. El servidor conserva IDs y relaciones y valida la información antes de completar el proceso.','Si las fotos referidas ya no existen en el almacenamiento conectado, restaurá esos archivos primero. Un respaldo de metadatos no recrea imágenes eliminadas.']),
 table(['Incluye el JSON de producción','No incluye'],[['Registros de las ocho secciones','Usuarios, contraseñas y sesiones'],['IDs, versiones y marcas de fecha','Secretos de servicios'],['Referencias y huellas de archivos','Archivos originales o binarios de fotos'],['Eventos recientes para controlar duplicados','Enlaces de reporte y configuración externa']], [237,238]),
 h('Protección ante errores'),p('La restauración no sobrescribe un espacio con registros existentes. Un error de referencia cancela la transacción completa. La restauración web admite hasta 1.000 registros, 50 imágenes y un JSON de 4 MB; para volúmenes mayores se necesita recuperación técnica. La importación CSV es otro flujo: crea IDs nuevos y no restaura relaciones de un respaldo.'),
 note('El respaldo puede contener datos comerciales y de contacto. No lo adjuntes a issues públicos o tickets abiertos. La demo genera una exportación marcada como demo; no es un respaldo restaurable del espacio real.')])

page('Resolver sin adivinar.', '17 / PROBLEMAS FRECUENTES',[
 table(['Lo que ves','Qué hacer'],[['No puedo entrar','Revisá email/contraseña. Si hubo varios intentos, esperá 15 minutos. Pedí a administración que confirme acceso activo.'],['Otro usuario modificó el registro','Cerrá el formulario, actualizá el espacio y reabrí la ficha. Volvé a aplicar el cambio sobre la versión vigente.'],['No puedo eliminar','Hay una relación vigente. Revisá campañas, cotizaciones, evidencias e incidencias antes de quitarla.'],['No puedo programar una campaña','Revisá moneda, spot, fechas y cupo de todas las pantallas seleccionadas.'],['La foto no sube','Usá JPG/PNG/WebP válido, hasta 4 MB y 32 megapíxeles. Probá una imagen más pequeña.'],['Sin señal reciente','Comprobá la última observación y el player real. Un estado declarado no genera telemetría.'],['No aparece en reporte cliente','La evidencia debe estar verificada, vinculada a esa campaña y dentro de su período.'],['El enlace venció o se revocó','Generá otro desde la campaña y entregalo por el canal correcto.'],['El asistente responde en modo local','El proveedor no está disponible/configurado o estás en demo. Revisá los datos directamente.'],['El mapa no muestra el punto','Comprobá latitud/longitud, filtros y conectividad a las teselas de OpenStreetMap.']], [168,307]),
 note('Cuando reportes un problema, incluí sección, acción, hora, mensaje visible e ID del registro. No compartas contraseñas, tokens ni variables de entorno. Las notas operativas del repositorio explican despliegue, migraciones y recuperación.')])

page('Una rutina sostenible.', '18 / OPERACIÓN Y ALCANCE',[
 table(['Frecuencia','Revisión recomendada'],[['Diaria','Señales recientes, campañas activas, incidencias abiertas y evidencias pendientes.'],['Semanal','Tarifas y disponibilidad de terceros, avances comerciales y próximos vencimientos.'],['Por campaña','Cliente, fechas, pantallas, cupo, cotización, evidencia y acceso al reporte.'],['Mensual','Usuarios activos, permisos, respaldos, enlaces compartidos e integraciones.']], [115,360]),
 h('Qué está disponible'),p('Aplicación responsive, demostración aislada, acceso por roles, ocho secciones con edición persistente, mapa, búsqueda y filtros, importación CSV, cotizador imprimible, imágenes privadas, auditoría, asistente de consulta, telemetría autenticada y reportes temporales por campaña.'),
 h('Qué requiere completar fuera del software'),p('Cargar el inventario, clientes y tarifas reales; instalar y probar cámaras; conseguir acceso y contrato de API de LatinAd; conectar players; cerrar acuerdos y habilitaciones; establecer el proceso comercial y de mantenimiento. La plataforma organiza y recibe información, pero no ejecuta esas tareas físicas o contractuales.'),
 h('Qué no incluye esta versión'),p('No hay checkout, cobros o facturación electrónica; envío automático de mensajes; integración LatinAd activa; captura RTSP programada; análisis visual automático; métricas de audiencia; publicación de creatividades ni un sistema de contratos.'),
 note('Versión del manual: 1.0 · 22 de septiembre de 2026. Referencia funcional: código TNW entregado con esta versión. Los límites de servicios externos y sus tarifas dependen de cada proveedor.'),
 p('<b>La regla de operación:</b> cada promesa comercial debe apoyarse en datos vigentes; cada evidencia debe conservar su origen; cada acceso debe corresponder a la persona y campaña adecuadas.')])

c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1)
c.setTitle('TNW | Manual de uso y operación');c.setAuthor('TNW / NoCoda');c.setSubject('Manual de plataforma TNW v1.0')

def para(text,x,y,width,style='body'):
    obj=Paragraph(text,styles[style]);_,height=obj.wrap(width,H);obj.drawOn(c,x,y-height);return y-height

def footer(n):
    c.setStrokeColor(LINE);c.line(60,58,W-60,58);c.setFont('DM',8);c.setFillColor(MUTED);c.drawString(60,41,'TNW / MANUAL DE USO');c.drawRightString(W-60,41,f'{n:02d} / {len(pages)+1:02d}')

# Editorial cover.
c.setFillColor(INK);c.rect(0,0,W,H,fill=1,stroke=0)
c.setFillColor(LIME);c.setFont('Manrope',59);c.drawString(57,731,'tnw.')
c.setFont('DMBold',10);c.drawString(61,700,'TU RED, A LA VISTA.')
c.setFillColor(white);c.setFont('Manrope',46)
for i,t in enumerate(['Todo lo que','necesitás para','operar tu red.']):c.drawString(57,580-i*59,t)
c.setFillColor(HexColor('#b9c3b2'));c.setFont('DM',13);c.drawString(60,359,'Manual de uso y operación');c.drawString(60,335,'Inventario · Campañas · Evidencias · Negocio')
# Network graphic: explicit illustration, no real site data.
nodes=[(75,209),(190,248),(301,194),(440,250),(515,168),(372,118),(200,135)]
c.setStrokeColor(HexColor('#657347'));c.setLineWidth(.7)
for a,b in [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,0),(1,6),(2,5)]:c.line(*nodes[a],*nodes[b])
for x,y in nodes:c.setFillColor(LIME);c.circle(x,y,4,fill=1,stroke=0)
c.setFont('DM',9);c.setFillColor(HexColor('#b9c3b2'));c.drawString(60,59,'VERSIÓN 1.0 / SEPTIEMBRE 2026');c.drawRightString(W-60,59,'tnw.lol');c.showPage()

for idx,(title,sub,blocks) in enumerate(pages,2):
    c.bookmarkPage(f'chapter-{idx}');c.addOutlineEntry(title,f'chapter-{idx}',level=0)
    c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFont('Manrope',21);c.setFillColor(INK);c.drawString(60,H-62,'tnw.')
    c.setFont('DMBold',8);c.setFillColor(MUTED);c.drawRightString(W-60,H-57,sub)
    c.setFillColor(LIME);c.rect(60,H-90,34,4,fill=1,stroke=0)
    y=H-114
    title_style=ParagraphStyle('title',fontName='Manrope',fontSize=29,leading=34,textColor=INK)
    tp=Paragraph(title,title_style);_,th=tp.wrap(W-120,100);tp.drawOn(c,60,y-th);y-=th+18
    for typ,data in blocks:
        if typ=='p':y=para(data,60,y,W-120)-9
        elif typ=='h':y-=8;y=para(data,60,y,W-120,'h2')-7
        elif typ=='steps':
            for n,text in enumerate(data,1):
                c.setFillColor(LIME);c.circle(68,y-7,9,fill=1,stroke=0);c.setFillColor(INK);c.setFont('DMBold',8);c.drawCentredString(68,y-10,str(n));y=para(text,88,y+1,W-148)-9
        elif typ=='note':
            pp=Paragraph(data,styles['small']);_,hh=pp.wrap(W-150,H);c.setFillColor(HexColor('#e7ecd9'));c.roundRect(60,y-hh-26,W-120,hh+24,5,fill=1,stroke=0);pp.drawOn(c,75,y-hh-12);y-=hh+33
        elif typ=='table':
            headers,rows,widths=data
            cells=[[Paragraph('<b>'+escape(str(t))+'</b>',styles['table']) for t in headers]]+[[Paragraph(escape(str(t)),styles['table']) for t in row] for row in rows]
            widths=widths or [(W-120)/len(headers)]*len(headers)
            widths=[v*(W-120)/sum(widths) for v in widths]
            t=Table(cells,colWidths=widths,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),LIME),('ROWBACKGROUNDS',(0,1),(-1,-1),[HexColor('#f0f2e8'),PAPER]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,-1),(-1,-1),.5,LINE)]));_,hh=t.wrap(W-120,H);t.drawOn(c,60,y-hh);y-=hh+18
        if y<78:raise RuntimeError(f'Page {idx} overflow ({y:.1f}): {title}')
    footer(idx);c.showPage()
c.save()
(ROOT/'public/manual-tnw.pdf').write_bytes(OUT.read_bytes())
print(f'Manual generado: {len(pages)+1} páginas')
