import Link from "next/link";
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleDot,
  FileCheck2,
  Layers3,
  MapPin,
  Monitor,
  MoveUpRight,
  Network,
  Radio,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import styles from "./landing.module.css";

const capabilities = [
  {
    number: "01",
    icon: MapPin,
    title: "Toda la red.\nUn solo lugar.",
    description:
      "Pantallas propias y de terceros, ubicaciones, operadores y fichas técnicas. Encontrá el espacio para cada campaña.",
    tags: ["Inventario", "Mapa", "Operadores"],
  },
  {
    number: "02",
    icon: Layers3,
    title: "De la propuesta\na la campaña.",
    description:
      "Armá propuestas con precios y comisiones visibles. Organizá fechas, pantallas y materiales sin perder el contexto.",
    tags: ["Propuestas", "Campañas", "Clientes"],
  },
  {
    number: "03",
    icon: FileCheck2,
    title: "Cada evidencia\nen su lugar.",
    description:
      "Relacioná fotos, revisiones e incidencias con su pantalla y campaña. Compartí con el cliente lo que ya está aprobado.",
    tags: ["Evidencias", "Incidencias", "Portal"],
  },
];

function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className={`${styles.brand} ${inverted ? styles.brandInverted : ""}`}>
      tnw<span className={styles.brandDot} />
      <span className={styles.brandName}>TIME<br />NETWORK</span>
    </span>
  );
}

function NetworkMap({ light = false }: { light?: boolean }) {
  return (
    <svg className={`${styles.networkMap} ${light ? styles.mapLight : ""}`} viewBox="0 0 680 550" fill="none" aria-hidden="true">
      <defs>
        <pattern id={light ? "city-blocks-light" : "city-blocks"} x="0" y="0" width="72" height="54" patternUnits="userSpaceOnUse" patternTransform="rotate(-31 340 275)">
          <rect x="5" y="5" width="62" height="44" rx="3" fill="currentColor" fillOpacity=".035" stroke="currentColor" strokeOpacity=".08" />
          <path d="M0 0h72v54" stroke="currentColor" strokeOpacity=".12" strokeWidth="2" />
        </pattern>
        <linearGradient id={light ? "river-light" : "river"} x1="630" y1="0" x2="470" y2="500" gradientUnits="userSpaceOnUse">
          <stop stopColor={light ? "#e0e8dc" : "#353d33"} />
          <stop offset="1" stopColor={light ? "#cedcca" : "#242b24"} />
        </linearGradient>
      </defs>
      <rect width="680" height="550" fill={light ? "#eaece5" : "#242824"} />
      <rect width="680" height="550" fill={`url(#${light ? "city-blocks-light" : "city-blocks"})`} />
      <path d="M552-20c-5 83 24 121 15 184s-67 112-70 182 40 133-20 224h223V-20Z" fill={`url(#${light ? "river-light" : "river"})`} />
      <path d="m-42 354 381-238 240-166M107 579l176-317L481-17M-19 465l414-222 142 233M-39 216l422 161 153 158" stroke="currentColor" strokeOpacity={light ? ".2" : ".14"} strokeWidth="12" />
      <path d="m-42 354 381-238 240-166M107 579l176-317L481-17M-19 465l414-222 142 233M-39 216l422 161 153 158" stroke={light ? "#f8f9f3" : "#414940"} strokeWidth="3" />
      <path d="m122 354 139-149 152 79-98 123-193-53Z" stroke={light ? "#55652b" : "#d6fa52"} strokeWidth="1.5" strokeDasharray="5 6" strokeOpacity=".6" />
      <path d="m261 205 54 202M122 354l291-70" stroke={light ? "#55652b" : "#d6fa52"} strokeWidth="1" strokeOpacity=".22" />
      {[[122, 354], [261, 205], [413, 284], [315, 407], [355, 137], [199, 447], [199, 129], [429, 414], [86, 240], [375, 340], [289, 320], [430, 189]].map(([x, y], index) => (
        <g key={`${x}-${y}`}>
          {[0, 1, 2, 3].includes(index) && <circle cx={x} cy={y} r="20" fill="#d6fa52" fillOpacity={light ? ".28" : ".07"} />}
          <circle cx={x} cy={y} r={index < 4 ? "7" : "4"} fill={index < 4 ? "#d6fa52" : light ? "#697361" : "#77826c"} stroke={light ? "#4f613a" : "#202321"} strokeWidth="2.5" />
        </g>
      ))}
      <text x="300" y="240" fill="currentColor" opacity=".3" fontSize="10" letterSpacing="3" fontFamily="sans-serif">CENTRO</text>
      <text x="117" y="411" fill="currentColor" opacity=".3" fontSize="9" letterSpacing="2" fontFamily="sans-serif">ZONA OESTE</text>
      <text x="452" y="89" fill="currentColor" opacity=".3" fontSize="9" letterSpacing="2" fontFamily="sans-serif">ZONA NORTE</text>
    </svg>
  );
}

function HeroVisual() {
  return (
    <figure className={styles.heroVisual} aria-label="Vista conceptual de la red. Las doce ubicaciones son ilustrativas.">
      <NetworkMap />
      <div className={styles.visualTopline}><span><span className={styles.tinySquare} />NETWORK OVERVIEW</span><span>DEMO / 01</span></div>
      <div className={styles.mapCompass}><span>N</span><MoveUpRight size={19} aria-hidden="true" /></div>
      <div className={styles.screenMarker}>
        <div className={styles.screenArtwork}><span>EL MUNDO<br />ES TU<br /><em>PANTALLA.</em></span><span className={styles.artworkMini}>TNW / OUT OF HOME</span></div>
        <div className={styles.screenStand} />
        <div className={styles.markerCaption}><Monitor size={13} aria-hidden="true" /><span>Centro · Pantalla de ejemplo</span></div>
      </div>
      <div className={styles.mapMiniCard}><span className={styles.miniCardIcon}><Network size={17} aria-hidden="true" /></span><div><strong>12 pantallas</strong><span>Inventario de demostración</span></div><ArrowUpRight size={18} aria-hidden="true" /></div>
      <div className={styles.visualBottomline}><span>UNA RED. MUCHAS POSIBILIDADES.</span><span>↗</span></div>
      <figcaption className={styles.visualDisclaimer}>Visualización conceptual · Datos ilustrativos</figcaption>
    </figure>
  );
}

function DashboardPreview() {
  return (
    <figure className={styles.dashboardFigure}>
      <div className={styles.dashboard} aria-hidden="true">
        <aside className={styles.dashSidebar}>
          <div className={styles.dashLogo}>tnw<span /></div>
          <span className={styles.dashWorkspace}>TU ESPACIO DE TRABAJO</span>
          <div className={styles.dashNavSelected}><Network size={15} /><span>Vista general</span></div>
          <div className={styles.dashNav}><Monitor size={15} /><span>Red de pantallas</span></div>
          <div className={styles.dashNav}><Layers3 size={15} /><span>Campañas</span></div>
          <div className={styles.dashNav}><FileCheck2 size={15} /><span>Evidencias</span></div>
          <div className={styles.dashNav}><ArrowUpRight size={15} /><span>Expansión</span></div>
          <div className={styles.dashSidebarBottom}><span className={styles.dashAvatar}>T</span><div><strong>Espacio demo</strong><small>Datos ilustrativos</small></div></div>
        </aside>
        <div className={styles.dashMain}>
          <div className={styles.dashTopbar}><span>Workspace <ChevronRight size={12} /> Vista general</span><span className={styles.dashDemo}>MODO DEMO</span></div>
          <div className={styles.dashContent}>
            <div className={styles.dashTitle}><div><span>EL PULSO DE TU RED</span><h3>Todo, en perspectiva.</h3></div><span className={styles.dashDate}>Vista de demostración <ArrowDown size={12} /></span></div>
            <div className={styles.dashStats}>
              <div><span>Inventario total <Monitor size={14} /></span><strong>12<small>pantallas</small></strong><p>8 propias <span>·</span> 4 de terceros</p></div>
              <div><span>Campañas <Layers3 size={14} /></span><strong>04<small>en la demo</small></strong><p>Todo tu trabajo, conectado</p></div>
              <div><span>Evidencias <ScanLine size={14} /></span><strong>08<small>de ejemplo</small></strong><p>Con su fecha y origen</p></div>
            </div>
            <div className={styles.dashBottom}>
              <div className={styles.dashMap}><div className={styles.dashPanelHeading}><strong>Tu red, en el mapa</strong><span>12 ubicaciones ilustrativas</span></div><div className={styles.dashMapCanvas}><NetworkMap light /><span className={styles.dashMapTag}><span />Inventario de ejemplo</span></div></div>
              <div className={styles.dashActivity}><div className={styles.dashPanelHeading}><strong>El próximo paso</strong><ArrowUpRight size={15} /></div><div className={styles.activityItem}><span className={styles.activityIcon}><FileCheck2 size={16} /></span><div><strong>Revisar evidencia</strong><p>Campaña de ejemplo · Centro</p><small>OPERACIONES</small></div></div><div className={styles.activityItem}><span className={styles.activityIcon}><Layers3 size={16} /></span><div><strong>Preparar propuesta</strong><p>Solicitud de cobertura demo</p><small>COMERCIAL</small></div></div><div className={styles.activityItem}><span className={styles.activityIcon}><MapPin size={16} /></span><div><strong>Validar una ubicación</strong><p>Oportunidad de expansión</p><small>DESARROLLO DE RED</small></div></div><div className={styles.activityFooter}><span>El contexto que necesitás.</span><ArrowRight size={14} /></div></div>
            </div>
          </div>
        </div>
      </div>
      <figcaption>Una vista conceptual de la plataforma. Las cantidades, ubicaciones y actividades son ilustrativas.</figcaption>
    </figure>
  );
}

export function Landing() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#contenido">Saltar al contenido</a>
      <header className={styles.header}>
        <Link href="/" aria-label="TNW, inicio"><Brand /></Link>
        <nav className={styles.nav} aria-label="Navegación principal"><a href="#plataforma">La plataforma</a><a href="#operacion">Cómo funciona</a><a href="/manual-tnw.pdf" target="_blank" rel="noreferrer">Manual <ArrowUpRight size={12} aria-hidden="true" /></a></nav>
        <Link href="/login" className={styles.loginLink}>Ingresar <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </header>

      <main id="contenido">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}><span className={styles.smallLine} />OUTDOOR NETWORK CONTROL</div>
            <h1 id="hero-title">Tu red.<br />Bajo <span className={styles.controlWord}>control<svg viewBox="0 0 315 16" aria-hidden="true"><path d="M2 11C73 0 199 1 310 7" fill="none" stroke="currentColor" strokeWidth="8" /></svg></span>.</h1>
            <p className={styles.heroDescription}>Las pantallas están en la calle.<br />Tu operación, en un solo lugar.</p>
            <p className={styles.heroDetail}>Conectá inventario, campañas y evidencias. Dale a tu equipo una visión completa de la red y espacio para hacerla crecer.</p>
            <div className={styles.heroActions}><Link className={styles.primaryButton} href="/demo">Explorar la plataforma <ArrowUpRight size={20} aria-hidden="true" /></Link><span>Recorré la demo.<br />Sin crear una cuenta.</span></div>
            <a href="#plataforma" className={styles.scrollLink}><span><ArrowDown size={15} aria-hidden="true" /></span>Conocé una nueva forma de operar</a>
          </div>
          <HeroVisual />
        </section>

        <div className={styles.manifestoStrip}><span>DE LA UBICACIÓN A LA EVIDENCIA.</span><div><span>INVENTARIO</span><span className={styles.stripPlus}>+</span><span>COMERCIAL</span><span className={styles.stripPlus}>+</span><span>OPERACIÓN</span><span className={styles.stripPlus}>+</span><span>EXPANSIÓN</span></div></div>

        <section className={styles.platformSection} id="plataforma" aria-labelledby="platform-title">
          <div className={styles.sectionIntro}><div><div className={styles.eyebrow}><span className={styles.smallLine} />01 / LA PLATAFORMA</div><h2 id="platform-title">Más visión.<br />Menos vueltas.</h2></div><p>Una pantalla es mucho más que una ubicación.<br />Es una propuesta, una campaña, un cliente y un próximo paso. TNW mantiene todo conectado.</p></div>
          <div className={styles.capabilities}>{capabilities.map(({ number, icon: Icon, title, description, tags }) => <article className={styles.capability} key={number}><div className={styles.capabilityTop}><span>{number}</span><Icon size={24} strokeWidth={1.4} aria-hidden="true" /></div><h3>{title.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h3><p>{description}</p><div className={styles.tags}>{tags.map(tag => <span key={tag}>{tag}</span>)}</div></article>)}</div>
        </section>

        <section className={styles.controlSection} aria-labelledby="control-title">
          <div className={styles.controlIntro}><div className={styles.eyebrow}><span className={styles.smallLine} />EL BACKOFFICE DE TU RED</div><div><h2 id="control-title">La calle se mueve.<br /><span>Vos tenés el panorama.</span></h2><Link href="/demo" className={styles.lightButton}>Entrar a la demo <ArrowUpRight size={18} aria-hidden="true" /></Link></div></div>
          <DashboardPreview />
          <div className={styles.controlPromises}><p><CircleDot size={18} aria-hidden="true" />Estado y fuente de cada dato</p><p><ShieldCheck size={18} aria-hidden="true" />Accesos según cada rol</p><p><Network size={18} aria-hidden="true" />Tu equipo, en el mismo contexto</p></div>
        </section>

        <section className={styles.workflowSection} id="operacion" aria-labelledby="workflow-title">
          <div className={styles.workflowIntro}><div className={styles.eyebrow}><span className={styles.smallLine} />02 / ASÍ SE TRABAJA</div><h2 id="workflow-title">Del primer pedido<br />al último reporte.</h2><p>Cada etapa deja el contexto que necesita la siguiente. Un flujo simple para el trabajo de todos los días.</p><ArrowDownLeft size={68} strokeWidth={1} className={styles.workflowArrow} aria-hidden="true" /></div>
          <ol className={styles.workflowList}><li><span>01</span><div><h3>Armá tu red</h3><p>Registrá o importá pantallas y operadores. Completá ubicaciones, especificaciones y condiciones comerciales.</p></div></li><li><span>02</span><div><h3>Convertí el pedido en un plan</h3><p>Seleccioná inventario, prepará una propuesta y organizá la campaña con fechas y responsables claros.</p></div></li><li><span>03</span><div><h3>Operá con evidencia</h3><p>Cargá fotos, revisá incidencias y aprobá evidencias. Cada registro conserva su origen y su momento.</p></div></li><li><span>04</span><div><h3>Compartí. Aprendé. Expandí.</h3><p>Dale visibilidad al cliente y convertí los pedidos de nuevas ciudades en oportunidades de cobertura.</p></div></li></ol>
        </section>

        <section className={styles.honestySection} aria-labelledby="honesty-title"><span className={styles.honestyIcon}><Radio size={27} strokeWidth={1.3} aria-hidden="true" /></span><div><h2 id="honesty-title">Datos con contexto. Decisiones con respaldo.</h2><p>Los estados operativos dependen de su fuente. Las integraciones indican si están conectadas. Y una evidencia aprobada conserva su fecha y origen. Así sabés qué estás mirando.</p></div><span className={styles.honestyLabel}><Check size={13} aria-hidden="true" />CLARIDAD POR DISEÑO</span></section>

        <section className={styles.finalCta} aria-labelledby="cta-title"><div className={styles.eyebrow}><span className={styles.smallLine} />THE NEXT WAY TO WORK</div><div className={styles.finalCtaMain}><h2 id="cta-title">La próxima pantalla.<br />El próximo paso<span>.</span></h2><Link href="/demo" className={styles.ctaCircle} aria-label="Explorar la demo de TNW"><ArrowUpRight size={51} strokeWidth={1.3} aria-hidden="true" /><span>EXPLORAR TNW</span></Link></div><div className={styles.finalCtaBottom}><p>Conocé el espacio donde tu red se convierte en equipo.</p><Link href="/login">Ya tengo acceso <ArrowRight size={17} aria-hidden="true" /></Link></div></section>
      </main>

      <footer className={styles.footer}><Link href="/" aria-label="TNW, inicio"><Brand inverted /></Link><span>El control de tu red empieza acá.</span><div><a href="/manual-tnw.pdf" target="_blank" rel="noreferrer">Manual de uso <ArrowUpRight size={13} aria-hidden="true" /></a><Link href="/login">Acceso al equipo <ArrowUpRight size={13} aria-hidden="true" /></Link></div><small>© {new Date().getFullYear()} TNW · Time Network</small></footer>
    </div>
  );
}
