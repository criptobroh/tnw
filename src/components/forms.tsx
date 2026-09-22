'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, Trash2, Upload, X } from 'lucide-react';
import type { Entities, Kind, WorkspaceData } from '@/lib/types';
import { evidenceMatchesCampaign, findCapacityConflict, quoteTotals, screenCompatibilityIssue } from '@/lib/domain';

type Field = { key:string; label:string; type?:'text'|'email'|'number'|'date'|'datetime-local'|'textarea'|'select'|'screens'; required?:boolean; options?:[string,string][]; ref?:'clients'|'screens'|'operators'|'campaigns'; min?:number; max?:number; integer?:boolean; positive?:boolean; hint?:string };
const num=(key:string,label:string,min=0,max=1e12,integer=false):Field=>({key,label,type:'number',min,max,integer,required:true});
const select=(key:string,label:string,options:[string,string][]):Field=>({key,label,type:'select',options,required:true});
const currency=select('currency','Moneda',[['ARS','ARS · Peso argentino'],['USD','USD · Dólar estadounidense']]);
export const labels:Record<Kind,string>={screens:'Pantalla',clients:'Cliente',operators:'Operador',campaigns:'Campaña',evidence:'Evidencia',incidents:'Incidencia',opportunities:'Oportunidad',quotes:'Cotización'};
export const statusLabels:Record<string,string>={online:'Operativa',offline:'Fuera de servicio',maintenance:'Mantenimiento',unknown:'Sin confirmar',own:'Propia',partner:'Asociada',outdoor:'Exterior',indoor:'Interior',agency:'Agencia',direct:'Directo',prospect:'Por contactar',contacted:'Contactado',negotiating:'En negociación',active:'Activa',draft:'Borrador',scheduled:'Programada',completed:'Finalizada',paused:'Pausada',pending:'Por revisar',verified:'Verificada',rejected:'Rechazada',manual:'Carga manual',camera:'Cámara',player:'Reproductor',low:'Baja',medium:'Media',high:'Alta',critical:'Crítica',open:'Abierta',in_progress:'En curso',resolved:'Resuelta',idea:'Idea',survey:'Relevamiento',permits:'Habilitaciones',installation:'Instalación',live:'En operación',sent:'Enviada',accepted:'Aceptada',declined:'Rechazada',admin:'Administrador',operations:'Operaciones',sales:'Comercial',viewer:'Solo lectura'};
export const fields:Record<Kind,Field[]>={
 screens:[{key:'name',label:'Nombre de la pantalla',required:true},{key:'city',label:'Ciudad',required:true},{key:'province',label:'Provincia',required:true},{key:'address',label:'Dirección',required:true},num('latitude','Latitud',-90,90),num('longitude','Longitud',-180,180),select('ownership','Propiedad',[['own','Propia'],['partner','Asociada']]),select('environment','Entorno',[['outdoor','Exterior'],['indoor','Interior']]),select('status','Estado declarado',[['unknown','Sin confirmar'],['online','Operativa (declarado)'],['offline','Fuera de servicio'],['maintenance','Mantenimiento']]),{key:'operatorId',label:'Operador',type:'select',ref:'operators'},{...num('width','Ancho (m)',0,200),positive:true},{...num('height','Alto (m)',0,200),positive:true},{key:'resolution',label:'Resolución (px)',hint:'Ej.: 1920 × 1080'},num('slotSeconds','Duración del spot (seg.)',1,300,true),num('loopSeconds','Duración del loop (seg.)',1,3600,true),num('operatingHours','Horas operativas / día',0,24),num('monthlyRate','Tarifa mensual'),num('monthlyCost','Costo mensual'),currency,{key:'externalId',label:'ID del reproductor / externo'},{key:'notes',label:'Notas operativas',type:'textarea'}],
 clients:[{key:'company',label:'Empresa / agencia',required:true},{key:'name',label:'Nombre del contacto',required:true},{key:'email',label:'Email',type:'email'},{key:'phone',label:'Teléfono'},select('type','Tipo de cliente',[['agency','Agencia'],['direct','Anunciante directo']]),{key:'notes',label:'Notas comerciales',type:'textarea'}],
 operators:[{key:'name',label:'Nombre del operador',required:true},{key:'city',label:'Ciudad',required:true},{key:'contact',label:'Persona de contacto'},{key:'email',label:'Email',type:'email'},{key:'phone',label:'Teléfono'},select('status','Etapa comercial',[['prospect','Por contactar'],['contacted','Contactado'],['negotiating','En negociación'],['active','Activo']]),{key:'notes',label:'Acuerdos y próximos pasos',type:'textarea'}],
 campaigns:[{key:'name',label:'Nombre de la campaña',required:true},{key:'clientId',label:'Cliente',type:'select',ref:'clients',required:true},{key:'screenIds',label:'Pantallas de la campaña',type:'screens',required:true},{key:'startDate',label:'Fecha de inicio',type:'date',required:true},{key:'endDate',label:'Fecha de finalización',type:'date',required:true},select('status','Estado',[['draft','Borrador'],['scheduled','Programada'],['active','Activa'],['paused','Pausada'],['completed','Finalizada']]),num('budget','Presupuesto'),currency,num('spotSeconds','Duración del spot (seg.)',1,300,true),num('playsTarget','Reproducciones objetivo',0,1e10,true),{key:'notes',label:'Condiciones y notas',type:'textarea'}],
 evidence:[{key:'screenId',label:'Pantalla',type:'select',ref:'screens',required:true},{key:'campaignId',label:'Campaña',type:'select',ref:'campaigns'},{key:'capturedAt',label:'Fecha y hora de captura',type:'datetime-local',required:true},select('source','Origen',[['manual','Carga manual'],['camera','Cámara'],['player','Reproductor']]),select('status','Revisión',[['pending','Por revisar'],['verified','Verificada'],['rejected','Rechazada']]),{key:'notes',label:'Observaciones',type:'textarea'}],
 incidents:[{key:'title',label:'Qué necesita atención',required:true},{key:'screenId',label:'Pantalla',type:'select',ref:'screens',required:true},select('priority','Prioridad',[['low','Baja'],['medium','Media'],['high','Alta'],['critical','Crítica']]),select('status','Estado',[['open','Abierta'],['in_progress','En curso'],['resolved','Resuelta']]),{key:'assignee',label:'Responsable'},{key:'dueDate',label:'Fecha límite',type:'date'},{key:'notes',label:'Detalle y resolución',type:'textarea'}],
 opportunities:[{key:'name',label:'Nombre del proyecto',required:true},{key:'city',label:'Ciudad',required:true},{key:'address',label:'Dirección / zona'},select('stage','Etapa',[['idea','Idea'],['survey','Relevamiento'],['permits','Habilitaciones'],['installation','Instalación'],['live','En operación']]),{key:'owner',label:'Responsable'},num('investment','Inversión inicial estimada'),num('monthlyRevenue','Ingresos mensuales estimados'),num('monthlyCost','Costos mensuales estimados'),currency,{key:'notes',label:'Supuestos, permisos y próximos pasos',type:'textarea'}],
 quotes:[{key:'name',label:'Nombre de la propuesta',required:true},{key:'clientId',label:'Cliente',type:'select',ref:'clients',required:true},{key:'screenIds',label:'Pantallas incluidas',type:'screens',required:true},{key:'startDate',label:'Desde',type:'date',required:true},{key:'endDate',label:'Hasta',type:'date',required:true},num('baseAmount','Precio base'),num('adjustmentPercent','Ajuste de precio (%)',0,500),num('agencyPercent','Comisión de agencia (%)',0,100),num('serviceAmount','Servicios y soporte'),num('taxPercent','Impuestos (%)',0,100),currency,select('status','Estado',[['draft','Borrador'],['sent','Enviada'],['accepted','Aceptada'],['declined','Rechazada']]),{key:'notes',label:'Condiciones de la propuesta',type:'textarea'}]
};
export const money=(amount:number,currency='ARS')=>new Intl.NumberFormat('es-AR',{style:'currency',currency,minimumFractionDigits:0,maximumFractionDigits:2}).format(amount);
export function quoteMath(q:Record<string,unknown>){const n=(key:string)=>Number(q[key]||0);const totals=quoteTotals({baseAmount:n('baseAmount'),adjustmentPercent:n('adjustmentPercent'),agencyPercent:n('agencyPercent'),serviceAmount:n('serviceAmount'),taxPercent:n('taxPercent')});return {...totals,adjusted:totals.adjustedBase};}

/** datetime-local uses the device's clock; slicing a UTC ISO string changes the instant. */
export function toDateTimeLocal(value:string|Date=new Date()) {
 const date=new Date(value); if(!Number.isFinite(date.getTime()))return '';
 const pad=(n:number)=>String(n).padStart(2,'0');
 return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function fieldValidationErrors(kind:Kind,values:Record<string,unknown>):string[] {
 const errors:string[]=[];
 for(const field of fields[kind]) {
  const value=values[field.key];
  const empty=value===undefined||value===null||(typeof value==='string'&&!value.trim())||(Array.isArray(value)&&!value.length);
  if(empty){if(field.required)errors.push(`Completá ${field.label.toLowerCase()}.`);continue;}
  if(field.type==='number') {
   if(typeof value!=='number'||!Number.isFinite(value))errors.push(`${field.label}: ingresá un número válido, con punto decimal.`);
   else if(field.integer&&!Number.isInteger(value))errors.push(`${field.label}: ingresá un número entero.`);
   else if(field.positive&&value<=0)errors.push(`${field.label}: debe ser mayor que cero.`);
   else if((field.min!==undefined&&value<field.min)||(field.max!==undefined&&value>field.max))errors.push(`${field.label}: el valor está fuera del rango permitido.`);
  }
  if(field.options&&!field.options.some(([key])=>key===value))errors.push(`${field.label}: seleccioná una opción válida.`);
  if(field.type==='date') {
   const text=String(value);const date=/^\d{4}-\d{2}-\d{2}$/.test(text)?new Date(`${text}T00:00:00.000Z`):new Date(NaN);
   if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==text)errors.push(`${field.label}: usá una fecha válida con formato AAAA-MM-DD.`);
  }
  if(field.type==='datetime-local'&&!Number.isFinite(Date.parse(String(value))))errors.push(`${field.label}: ingresá una fecha y hora válidas.`);
  if(field.type==='email'&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))||String(value).length>200))errors.push(`${field.label}: ingresá un correo válido.`);
  const maxLength=field.type==='textarea'?6000:['name','city','title'].includes(field.key)?160:300;
  if(typeof value==='string'&&value.trim().length>maxLength)errors.push(`${field.label}: el máximo es ${maxLength} caracteres.`);
  if(['name','city','title'].includes(field.key)&&String(value).trim().length<2)errors.push(`${field.label}: ingresá al menos 2 caracteres.`);
  if(field.type==='screens'&&(!Array.isArray(value)||value.length>200))errors.push(`${field.label}: seleccioná hasta 200 pantallas.`);
 }
 if((kind==='campaigns'||kind==='quotes')&&String(values.endDate)<String(values.startDate))errors.push('La fecha de finalización debe ser igual o posterior al inicio.');
 if(kind==='screens'&&Number(values.slotSeconds)>Number(values.loopSeconds))errors.push('El spot no puede durar más que el loop.');
 return errors;
}

function defaults(kind:Kind){const obj:Record<string,unknown>={};fields[kind].forEach(f=>obj[f.key]=f.type==='number'?Math.max(f.min||0,0):f.type==='screens'?[]:f.options?f.options[0][0]:'');if(kind==='screens')Object.assign(obj,{lastSeen:'',slotSeconds:10,loopSeconds:120,operatingHours:18,latitude:'',longitude:'',width:'',height:''});if(kind==='evidence')Object.assign(obj,{fileUrl:'',sha256:'',plays:0,capturedAt:toDateTimeLocal()});if(kind==='campaigns')obj.spotSeconds=10;return obj;}
export function Modal({title,subtitle,onClose,children,wide=false}:{title:string;subtitle?:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;const el=ref.current;el?.querySelector<HTMLElement>('input,button,select,textarea')?.focus();const fn=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();if(event.key==='Tab'&&el){const items=Array.from(el.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select,textarea,[tabindex="0"]'));if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0]?.focus();}}};document.addEventListener('keydown',fn);const original=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',fn);document.body.style.overflow=original;previous?.focus();};},[onClose]);
 return <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div role="dialog" aria-modal="true" aria-label={title} className={`modal ${wide?'modal-wide':''}`} ref={ref}><div className="modal-heading"><div><span className="eyebrow">TNW / ESPACIO DE TRABAJO</span><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={20}/></button></div>{children}</div></div>;
}
export function RecordEditor({kind,record,data,demo,onClose,onSave,onDelete}:{kind:Kind;record?:Entities[Kind];data:WorkspaceData;demo:boolean;onClose:()=>void;onSave:(values:Record<string,unknown>)=>Promise<void>;onDelete?:()=>Promise<void>}){
 const [values,setValues]=useState<Record<string,unknown>>(()=>({...defaults(kind),...record,...(kind==='evidence'&&record?{capturedAt:toDateTimeLocal((record as Entities['evidence']).capturedAt)}:{})}));const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [confirm,setConfirm]=useState(false);const [uploading,setUploading]=useState(false);
 const evidenceRecord=kind==='evidence'&&record?record as Entities['evidence']:undefined;
 const playerRecord=evidenceRecord?.source==='player';
 const locked=(key:string)=>!!playerRecord&&['screenId','campaignId','capturedAt','source'].includes(key);
 const change=(key:string,value:unknown)=>setValues(v=>({...v,[key]:value}));
 async function upload(file?:File){if(!file||playerRecord)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>4*1024*1024){setError('Elegí una imagen JPG, PNG o WebP de hasta 4 MB.');return;}setUploading(true);setError('');try{if(demo){const reader=new FileReader();await new Promise<void>((resolve,reject)=>{reader.onload=()=>{change('fileUrl',reader.result);resolve();};reader.onerror=reject;reader.readAsDataURL(file);});change('sha256','');}else{const form=new FormData();form.append('file',file);const res=await fetch('/api/upload',{method:'POST',body:form});const body=await res.json();if(!res.ok)throw new Error(body.error||'No se pudo subir la imagen.');setValues(v=>({...v,fileUrl:body.url,sha256:body.sha256}));}}catch(e){setError(e instanceof Error?e.message:'No se pudo subir el archivo.');}finally{setUploading(false);}}
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy||uploading)return;setError('');
  try {
   const errors=fieldValidationErrors(kind,values);if(errors.length)throw new Error(errors[0]);
   const payload={...values};
   for(const field of fields[kind]) {
    if(typeof payload[field.key]==='string'&&field.type!=='datetime-local')payload[field.key]=String(payload[field.key]).trim();
    if(field.ref&&payload[field.key]&&!data[field.ref].some(item=>item.id===payload[field.key]))throw new Error(`${field.label}: el registro ya no existe. Actualizá los datos.`);
   }
   if(kind==='campaigns'||kind==='quotes') {
    const screenIds=[...new Set(payload.screenIds as string[])];payload.screenIds=screenIds;
    const selected=screenIds.map(id=>data.screens.find(screen=>screen.id===id));
    if(selected.some(screen=>!screen))throw new Error('Una pantalla seleccionada ya no existe. Actualizá los datos.');
    if(selected.some(screen=>screen?.currency!==payload.currency))throw new Error('Las pantallas y la propuesta o campaña deben usar la misma moneda.');
    if(kind==='campaigns') {
     const campaign=payload as unknown as Entities['campaigns'];
     if(selected.some(screen=>screen&&campaign.spotSeconds>screen.slotSeconds))throw new Error('El spot excede la duración admitida por alguna pantalla.');
     for(const screen of selected){if(!screen)continue;const conflict=findCapacityConflict(screen,[...data.campaigns.filter(item=>item.id!==record?.id),campaign]);if(conflict)throw new Error(`${screen.name}: el loop no alcanza para las campañas del ${conflict.date}.`);}
     if(record&&data.evidence.some(evidence=>evidence.campaignId===record.id&&!evidenceMatchesCampaign(evidence,campaign)))throw new Error('El cambio dejaría evidencias fuera de las pantallas o fechas de la campaña.');
    }
   }
   if(kind==='screens') {
    if(payload.externalId&&data.screens.some(screen=>screen.id!==record?.id&&screen.externalId===payload.externalId))throw new Error('Este identificador externo ya está asignado a otra pantalla.');
    if(record){const issue=screenCompatibilityIssue({...payload,id:record.id} as unknown as Entities['screens'],data.campaigns,data.quotes);if(issue)throw new Error(issue);}
    else{payload.lastSeen='';if(payload.status==='online')payload.status='unknown';}
   }
   if(kind==='evidence') {
    payload.capturedAt=evidenceRecord&&String(values.capturedAt)===toDateTimeLocal(evidenceRecord.capturedAt)?evidenceRecord.capturedAt:new Date(String(values.capturedAt)).toISOString();
    if(playerRecord&&evidenceRecord)for(const key of ['screenId','campaignId','capturedAt','source','plays'] as const)payload[key]=evidenceRecord[key];
    if(!playerRecord&&payload.source==='player')throw new Error('Las reproducciones del player ingresan por telemetría autenticada.');
    if(!playerRecord&&!payload.fileUrl)throw new Error('Adjuntá una imagen para registrar evidencia visual.');
    if(Date.parse(String(payload.capturedAt))>Date.now()+5*60*1000)throw new Error('La captura no puede estar en el futuro.');
    if(payload.campaignId){const campaign=data.campaigns.find(item=>item.id===payload.campaignId);if(!campaign||!evidenceMatchesCampaign(payload as unknown as Entities['evidence'],campaign))throw new Error('La pantalla y la fecha de captura deben corresponder a la campaña. El período comercial se interpreta en horario de Buenos Aires.');}
   }
   setBusy(true);await onSave(payload);onClose();
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudieron guardar los cambios.');}finally{setBusy(false);}
 }

 const q=quoteMath(values);
 return <Modal title={`${record?'Editar':'Nueva'} ${labels[kind].toLowerCase()}`} subtitle={demo?'Demostración · Los cambios se guardan solo en este navegador.':'Los campos con * son obligatorios.'} onClose={onClose} wide><form onSubmit={submit}><div className="form-grid">{fields[kind].map(f=>{const FieldWrapper=f.type==='screens'?'div':'label';return <FieldWrapper key={f.key} className={f.type==='textarea'||f.type==='screens'?'full-span':''}><span>{f.label}{f.required?' *':''}</span>{f.type==='screens'?<div className="screen-picker">{data.screens.length?data.screens.map(s=><label key={s.id} className="check-row"><input type="checkbox" disabled={busy} checked={((values[f.key]||[]) as string[]).includes(s.id)} onChange={e=>change(f.key,e.target.checked?[...((values[f.key]||[]) as string[]),s.id]:((values[f.key]||[]) as string[]).filter(id=>id!==s.id))}/><span>{s.name}<small>{s.city} · {money(s.monthlyRate,s.currency)} / mes</small></span></label>):<p className="muted">Primero registrá una pantalla en Inventario.</p>}</div>:f.type==='select'?<select value={String(values[f.key]||'')} required={f.required} disabled={busy||locked(f.key)} onChange={e=>change(f.key,e.target.value)}>{f.ref&&<option value="">Seleccionar…</option>}{f.options?.filter(o=>!(kind==='evidence'&&f.key==='source'&&o[0]==='player'&&!playerRecord)&&!(kind==='screens'&&f.key==='status'&&o[0]==='online'&&(record as Entities['screens']|undefined)?.status!=='online')).map(o=><option key={o[0]} value={o[0]}>{o[1]}</option>)}{f.ref&&data[f.ref].map(r=><option key={r.id} value={r.id}>{'company'in r?r.company:r.name}</option>)}</select>:f.type==='textarea'?<textarea rows={3} maxLength={6000} disabled={busy} value={String(values[f.key]||'')} onChange={e=>change(f.key,e.target.value)}/>:<input type={f.type||'text'} disabled={busy||locked(f.key)} value={String(values[f.key]??'')} required={f.required} min={f.min} max={f.max} step={f.type==='number'?f.integer?1:'any':f.type==='datetime-local'?1:undefined} maxLength={f.type==='email'?200:f.type==='text'||!f.type?['name','city','title'].includes(f.key)?160:300:undefined} onChange={e=>change(f.key,f.type==='number'?e.target.value===''?'':Number(e.target.value):e.target.value)}/>} {f.hint&&<small>{f.hint}</small>}{f.type==='datetime-local'&&<small>Hora local del dispositivo: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Las campañas usan el período de Buenos Aires.</small>}</FieldWrapper>;})}
 {kind==='evidence'&&<div className="full-span">{playerRecord?<p className="form-note">Evento de telemetría: pantalla, campaña, captura, origen y reproducciones se conservan sin cambios. Podés revisar el estado y agregar observaciones.</p>:<label className="upload-zone"><Upload size={22}/><strong>{uploading?'Subiendo imagen…':values.fileUrl?'Reemplazar imagen':'Adjuntar evidencia visual'}</strong><span>JPG, PNG o WebP · Hasta 4 MB</span><input aria-label="Adjuntar evidencia visual" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading||busy} onChange={e=>void upload(e.target.files?.[0])}/></label>}{!!values.fileUrl&&<img className="evidence-preview" src={String(values.fileUrl)} alt="Vista previa de evidencia"/>}<p className="form-note">Una fotografía permite revisar contenido visible. No mide audiencia ni certifica todo el período de emisión.</p></div>}
 {kind==='screens'&&<p className="form-note full-span">Completá coordenadas y dimensiones verificadas. La señal en línea solo se confirma con telemetría recibida en los últimos 15 minutos.</p>}
 {kind==='quotes'&&<div className="quote-summary full-span"><div><span>Base ajustada</span><b>{money(q.adjusted,String(values.currency))}</b></div><div><span>Subtotal + servicios</span><b>{money(q.subtotal,String(values.currency))}</b></div><div><span>Impuestos</span><b>{money(q.tax,String(values.currency))}</b></div><div className="total"><span>Total al cliente</span><b>{money(q.total,String(values.currency))}</b></div><div><span>Comisión de agencia (interna)</span><b>{money(q.commission,String(values.currency))}</b></div><div><span>Neto antes de costos (interno)</span><b>{money(q.net,String(values.currency))}</b></div><small>La comisión se calcula sobre la base ajustada. Los impuestos se aplican al subtotal. Los importes internos no aparecen en la propuesta impresa.</small></div>}
 </div>{error&&<div className="error-box" role="alert">{error}</div>}<div className="modal-actions">{record&&onDelete&&(confirm?<button type="button" className="button danger" disabled={busy} onClick={async()=>{setBusy(true);try{await onDelete();onClose();}catch(e){setError(e instanceof Error?e.message:'No se pudo eliminar.');}finally{setBusy(false);}}}>Confirmar eliminación</button>:<button type="button" className="button text-danger" onClick={()=>setConfirm(true)}><Trash2 size={16}/>Eliminar</button>)}<span className="action-spacer"/><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary" disabled={busy||uploading}>{busy?<LoaderCircle className="spin" size={17}/>:<Check size={17}/>}Guardar {labels[kind].toLowerCase()}</button></div></form></Modal>;
}
