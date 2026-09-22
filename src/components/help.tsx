import { ArrowUpRight, BookOpen, CircleHelp, FileCheck2, FileSpreadsheet, Layers3, MapPin, Monitor, ShieldCheck } from 'lucide-react';

const guides = [
  {
    number: '01',
    icon: Monitor,
    title: 'Registrar una pantalla',
    body: 'Entrá a Inventario y elegí Agregar pantalla. Completá nombre, ciudad, dirección y coordenadas verificadas. Indicá si es propia o asociada y vinculá al operador cuando corresponda.',
    detail: 'Revisá dimensiones, duración del spot, loop, horas de operación, moneda, tarifa y costo. El estado declarado describe tu registro operativo; no crea una señal de telemetría.',
  },
  {
    number: '02',
    icon: Layers3,
    title: 'Organizar una campaña',
    body: 'Registrá primero el cliente y las pantallas. En Campañas, creá el registro, seleccioná cliente e inventario y definí fechas, presupuesto, duración del spot y objetivo de reproducciones.',
    detail: 'Usá la misma moneda de las pantallas seleccionadas y una duración de spot compatible. Cambiar el estado en TNW organiza el trabajo local; no publica ni reserva espacio en el CMS del operador.',
  },
  {
    number: '03',
    icon: FileCheck2,
    title: 'Cargar y revisar evidencia',
    body: 'En Evidencias, seleccioná pantalla y, si corresponde, campaña. Indicá la fecha y hora de captura, el origen y las observaciones. Adjuntá una imagen JPG, PNG o WebP de hasta 4 MB.',
    detail: 'La pantalla y fecha deben corresponder a la campaña. Mantené Por revisar hasta comprobar el material; después marcá Verificada o Rechazada. Las reproducciones del player ingresan por telemetría autenticada.',
  },
  {
    number: '04',
    icon: FileSpreadsheet,
    title: 'Preparar una cotización',
    body: 'En Cotizaciones, elegí cliente, pantallas, período y moneda. Completá precio base, ajuste, servicios, comisión de agencia e impuestos. Revisá el desglose antes de guardar o imprimir.',
    detail: 'El ajuste modifica la base. La comisión se calcula sobre esa base ajustada y los impuestos sobre el subtotal con servicios. El neto mostrado es anterior a costos: no equivale a utilidad. El estado Enviada no manda un correo.',
  },
];

const faqs = [
  {
    question: '¿Qué diferencia hay entre una señal reciente y el estado declarado?',
    answer: 'El estado declarado es un dato operativo registrado por el equipo. La señal se considera reciente durante 15 minutos desde la última observación recibida por telemetría. Sin una observación válida o cuando vence esa ventana, no se confirma que la pantalla esté en línea. Mantenimiento puede seguir visible como condición declarada. Revisá siempre la fecha y fuente: el último estado no prueba disponibilidad histórica.',
  },
  {
    question: '¿Las reproducciones estimadas son emisiones comprobadas?',
    answer: 'No. La estimación utiliza el loop y las horas de operación declaradas para calcular una planificación teórica. El objetivo de una campaña es una meta cargada por el equipo. Las reproducciones registradas requieren eventos del player recibidos por el canal autenticado. Ninguno de esos valores mide personas alcanzadas ni audiencia; esa medición necesita una fuente y metodología propias.',
  },
  {
    question: '¿Qué demuestra una foto verificada?',
    answer: 'Permite documentar y revisar lo visible en una pantalla en un momento determinado, con su origen y fecha de captura. Una foto no demuestra por sí sola la emisión durante todo el período contratado, la cantidad de reproducciones ni la audiencia. La fecha de captura y la fecha de carga son conceptos diferentes.',
  },
  {
    question: '¿Cómo importo inventario por CSV?',
    answer: 'Abrí Importar en la sección correspondiente y descargá la plantilla. Usá CSV separado por comas, codificado en UTF-8, de hasta 2 MB y 200 registros por archivo. Conservá los encabezados de la plantilla. Los campos de estado usan valores internos, las referencias usan IDs existentes y las listas de pantallas se separan con |. Revisá la vista previa y corregí todos los errores antes de confirmar. La importación crea registros nuevos: no actualiza ni deduplica por nombre. Para importar evidencias visuales, necesitás cargar sus imágenes mediante el formulario de evidencia.',
  },
  {
    question: '¿Qué contiene el respaldo JSON?',
    answer: 'El respaldo de producción conserva los registros, sus IDs y asociaciones, además de metadatos de archivos y telemetría. No contiene imágenes binarias, usuarios ni contraseñas. Administración puede restaurarlo desde Configuración exclusivamente sobre un espacio vacío; los archivos deben seguir en el mismo almacenamiento privado. Revisá el conteo y confirmá la restauración. El respaldo de la demo es local y no se restaura en producción.',
  },
  {
    question: '¿Cómo comparto un reporte con un cliente?',
    answer: 'Administración y Comercial pueden abrir una campaña y elegir Crear enlace de reporte. El enlace dura 7 días y muestra únicamente esa campaña y sus evidencias verificadas, sin costos, contactos ni notas internas. Quien posea el enlace puede consultarlo. Copialo y compartilo por tu canal acordado; TNW no envía mensajes. Revocar enlaces invalida todos los accesos compartidos de esa campaña. La función está disponible en el espacio real.',
  },
  {
    question: '¿TNW ya está conectado a LatinAd o a las cámaras?',
    answer: 'La conexión con LatinAd está pendiente de acceso y documentación del proveedor. Una credencial configurada no prueba una sincronización exitosa. Consultá Configuración para ver qué servicios tienen configuración disponible. Seleccionar Cámara como origen de una foto identifica su procedencia; no instala una cámara, abre una transmisión en vivo ni conecta automáticamente un dispositivo.',
  },
  {
    question: '¿Qué pasa con las cámaras y la privacidad?',
    answer: 'Usá las capturas para documentar las pantallas y limitá el encuadre al material necesario. Definí con tu equipo quién puede acceder, qué se conserva y por cuánto tiempo. TNW no realiza reconocimiento de personas ni determina si una instalación o captura cumple la normativa aplicable. Las autorizaciones y condiciones de uso deben resolverse para cada ubicación antes de operar cámaras.',
  },
  {
    question: '¿El asistente modifica datos o conoce disponibilidad externa?',
    answer: 'El asistente sirve para consultar información del espacio; no modifica registros. Puede responder mediante el modo de ayuda local o con inteligencia artificial cuando esa conexión esté configurada. No confirma disponibilidad comercial del operador, reservas ni programación del CMS. Contrastá los datos de una respuesta con los registros y sus fuentes.',
  },
  {
    question: '¿Aceptar una propuesta activa una campaña o envía un mensaje?',
    answer: 'El cambio de estado queda registrado en TNW. No confirma disponibilidad externa, publica contenidos en una pantalla, crea automáticamente una campaña ni envía un correo. El equipo debe completar esos pasos mediante los canales acordados y mantener actualizados los registros correspondientes.',
  },
  {
    question: '¿Por qué no puedo eliminar o guardar un registro?',
    answer: 'La plataforma protege las relaciones: una pantalla vinculada a una campaña o evidencia no se puede eliminar mientras conserve esos vínculos. También puede rechazar fechas, monedas o referencias incompatibles. Si otra persona modificó el mismo registro, actualizá los datos y revisá su versión antes de volver a guardar.',
  },
  {
    question: '¿Los cambios de la demo llegan al espacio real?',
    answer: 'No. Los registros de demostración son ejemplos y se guardan en el navegador. No se sincronizan con producción ni acreditan actividad del negocio. Podés reiniciar la demostración desde Configuración. Los usuarios simulados de la demo solo sirven durante esa sesión y no reciben acceso real.',
  },
];

export default function Help() {
  return <div className="help-grid">
    <section className="panel">
      <div className="panel-header"><div><span className="eyebrow">EMPEZAR CON TNW</span><h2>Tu primera vuelta por la red</h2></div><BookOpen size={23} aria-hidden="true" /></div>
      <div className="panel-body">
        <p className="muted">TNW organiza la operación comercial y técnica de tu red de pantallas. El espacio real comienza con tus registros; los ejemplos viven por separado en la demo.</p>
        <ol className="help-step"><li><strong>Prepará la base.</strong> Registrá operadores, pantallas y clientes antes de relacionarlos con una campaña.</li><li><strong>Definí el trabajo.</strong> Prepará cotizaciones y campañas con fechas, moneda y condiciones claras.</li><li><strong>Dejá evidencia.</strong> Cargá imágenes, revisá su origen y documentá incidencias con un responsable.</li><li><strong>Revisá el siguiente paso.</strong> Usá Expansión para seguir ubicaciones potenciales, supuestos de inversión y permisos pendientes.</li></ol>
        <a className="button secondary" href="/manual-tnw.pdf" target="_blank" rel="noreferrer"><BookOpen size={17} aria-hidden="true" />Abrir manual de uso PDF<ArrowUpRight size={15} aria-hidden="true" /></a>
      </div>
    </section>

    <section className="panel">
      <div className="panel-header"><div><span className="eyebrow">CADA PERSONA, SU ALCANCE</span><h2>Roles y permisos</h2></div><ShieldCheck size={23} aria-hidden="true" /></div>
      <div className="panel-body"><dl className="help-step"><div><dt><strong>Administración</strong></dt><dd>Gestiona los registros y los accesos del equipo.</dd></div><div><dt><strong>Operaciones</strong></dt><dd>Edita pantallas, operadores, evidencias e incidencias.</dd></div><div><dt><strong>Comercial</strong></dt><dd>Edita clientes, operadores, campañas, cotizaciones y oportunidades de expansión.</dd></div><div><dt><strong>Solo lectura</strong></dt><dd>Consulta el espacio sin modificar registros. No es un acceso aislado por cliente.</dd></div></dl><p className="muted">Los roles corresponden al equipo que trabaja dentro del mismo espacio. La creación de un acceso es directa y no envía una invitación por correo.</p></div>
    </section>

    {guides.map(({ number, icon: Icon, title, body, detail }) => <section className="panel" key={number}><div className="panel-header"><div><span className="eyebrow">GUÍA {number}</span><h2>{title}</h2></div><Icon size={23} aria-hidden="true" /></div><div className="panel-body"><p>{body}</p><p className="muted">{detail}</p></div></section>)}

    <section className="panel" style={{ gridColumn: '1 / -1' }}>
      <div className="panel-header"><div><span className="eyebrow">RESPUESTAS PARA OPERAR</span><h2>Lo que conviene tener claro</h2></div><CircleHelp size={23} aria-hidden="true" /></div>
      <div className="panel-body"><div className="info-banner"><MapPin size={22} aria-hidden="true" /><p>Una ubicación en el mapa, una propuesta guardada o una etapa de expansión no prueban disponibilidad comercial, permisos de instalación ni una reserva externa. Registrá las confirmaciones del operador en el contexto de cada trabajo.</p></div><div className="help-faq">{faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p className="muted">{faq.answer}</p></details>)}</div></div>
    </section>
  </div>;
}
