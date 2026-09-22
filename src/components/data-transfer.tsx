'use client';
import { useRef, useState } from 'react';
import { Check, Download, FileSpreadsheet, Upload } from 'lucide-react';
import type { Kind, WorkspaceData } from '@/lib/types';
import { fields, fieldValidationErrors, labels, Modal } from './forms';

export function downloadFile(name:string,content:string,type='text/csv;charset=utf-8') {
 const url=URL.createObjectURL(new Blob([content],{type}));const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function csvCell(value:unknown) {
 let text=Array.isArray(value)?value.join('|'):String(value??'');
 if(typeof value!=='number'&&(/^[\u0000-\u0020]*[=+\-@]|^[\t\r\n]/.test(text)))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
export function exportCsv(kind:Kind,data:WorkspaceData) {
 const keys=['id',...fields[kind].map(field=>field.key)];const rows=data[kind] as unknown as Record<string,unknown>[];
 downloadFile(`tnw-${kind}-${new Date().toISOString().slice(0,10)}.csv`,'\uFEFF'+[keys.map(csvCell).join(','),...rows.map(row=>keys.map(key=>csvCell(row[key])).join(','))].join('\r\n'));
}
export function parseCSV(text:string):string[][] {
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closedQuote=false;
 function finishCell(){row.push(cell);cell='';closedQuote=false;}
 function finishRow(){finishCell();if(row.some(value=>value.trim()))rows.push(row);row=[];}
 for(let index=0;index<text.length;index++) {
  const char=text[index];
  if(quoted){if(char==='"'){if(text[index+1]==='"'){cell+='"';index++;}else{quoted=false;closedQuote=true;}}else cell+=char;continue;}
  if(char===',')finishCell();
  else if(char==='\n'||char==='\r'){if(char==='\r'&&text[index+1]==='\n')index++;finishRow();}
  else if(char==='"'){if(cell||closedQuote)throw new Error('El CSV contiene comillas en una posición inválida.');quoted=true;}
  else{if(closedQuote){if(char===' '||char==='\t')continue;throw new Error('Hay texto después del cierre de una celda entre comillas.');}cell+=char;}
 }
 if(quoted)throw new Error('El CSV contiene comillas sin cerrar.');finishRow();return rows;
}
const metadataColumns=['id','version','createdAt','updatedAt','lastSeen'];
export function readImportCSV(kind:Kind,text:string):{records:Record<string,unknown>[];errors:string[]} {
 if(kind==='evidence')throw new Error('Las evidencias visuales se cargan con su imagen desde el formulario de evidencia.');
 const rows=parseCSV(text.replace(/^\uFEFF/,''));
 if(rows.length<2)throw new Error('El archivo debe contener encabezados y al menos un registro.');
 if(rows.length>201)throw new Error('Podés importar hasta 200 registros por archivo.');
 const keys=rows[0].map(value=>value.trim());const allowed=fields[kind].map(field=>field.key);
 const unknown=keys.filter(key=>!allowed.includes(key)&&!metadataColumns.includes(key));
 if(unknown.length)throw new Error(`Columnas no reconocidas: ${unknown.join(', ')}. Descargá la plantilla para usar los nombres correctos.`);
 if(new Set(keys).size!==keys.length)throw new Error('Hay encabezados duplicados.');
 const errors:string[]=[];
 const records=rows.slice(1).map((row,index)=>{
  if(row.length!==keys.length)errors.push(`Fila ${index+2}: cantidad de columnas incorrecta.`);
  const record:Record<string,unknown>={};
  for(const field of fields[kind]) {
   const raw=(row[keys.indexOf(field.key)]||'').trim();
   if(field.type==='number'){
    // Restore only strict numeric literals escaped by spreadsheet-safe server exports.
    const numeric=/^'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)?raw.slice(1):raw;
    record[field.key]=numeric===''?'':/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(numeric)?Number(numeric):NaN;
   }else if(field.type==='screens')record[field.key]=[...new Set(raw.split('|').map(value=>value.trim()).filter(Boolean))];
   else record[field.key]=raw;
  }
  errors.push(...fieldValidationErrors(kind,record).map(error=>`Fila ${index+2}: ${error}`));
  if(kind==='screens'){record.lastSeen='';if(record.status==='online')record.status='unknown';}
  return record;
 });
 if(kind==='screens'){
  const externalIds=new Set<string>();records.forEach((record,index)=>{const id=String(record.externalId||'');if(id&&externalIds.has(id))errors.push(`Fila ${index+2}: ID externo repetido en este archivo.`);if(id)externalIds.add(id);});
 }
 return {records,errors};
}
export function ImportDialog({kind,onClose,onImport}:{kind:Kind;onClose:()=>void;onImport:(records:Record<string,unknown>[])=>Promise<void>}) {
 const [records,setRecords]=useState<Record<string,unknown>[]>([]);const [errors,setErrors]=useState<string[]>([]);const [busy,setBusy]=useState(false);const [reading,setReading]=useState(false);const [fileName,setFileName]=useState('');const readVersion=useRef(0);
 async function read(file?:File){
  if(!file||busy)return;const version=++readVersion.current;setFileName(file.name);setRecords([]);setErrors([]);setReading(true);
  try{if(file.size>2*1024*1024)throw new Error('El archivo debe pesar como máximo 2 MB.');const result=readImportCSV(kind,await file.text());if(version!==readVersion.current)return;setRecords(result.records);setErrors(result.errors);}
  catch(cause){if(version===readVersion.current)setErrors([cause instanceof Error?cause.message:'No se pudo leer el archivo.']);}
  finally{if(version===readVersion.current)setReading(false);}
 }
 return <Modal title={`Importar ${labels[kind].toLowerCase()}s`} subtitle="Revisá los datos antes de confirmar. La importación crea nuevos registros." onClose={onClose} wide><div className="import-body"><div className="info-banner"><FileSpreadsheet size={21}/><div>CSV con separador coma y codificación UTF-8. Máximo 200 filas.<small>Usá punto decimal y fechas AAAA-MM-DD. Los estados usan valores internos; las referencias usan IDs existentes y las listas de pantallas se separan con |.</small><small>Los IDs, versiones, fechas de creación y señales exportadas se ignoran al importar. Se crean registros nuevos sin señal de telemetría.</small></div></div><button type="button" className="button secondary" disabled={busy} onClick={()=>downloadFile(`plantilla-tnw-${kind}.csv`,'\uFEFF'+fields[kind].map(field=>field.key).join(',')+'\r\n')}><Download size={16}/>Descargar plantilla</button><label className="upload-zone"><Upload size={24}/><strong>{reading?'Leyendo archivo…':fileName||'Seleccioná tu archivo CSV'}</strong><span>La carga no modifica datos hasta confirmar.</span><input type="file" accept=".csv,text/csv" aria-label="Seleccionar CSV" disabled={busy} onChange={event=>void read(event.target.files?.[0])}/></label>{errors.length>0&&<div className="error-box" role="alert">{errors.slice(0,10).map((error,index)=><div key={index}>{error}</div>)}{errors.length>10&&<div>Y {errors.length-10} errores más.</div>}</div>}{records.length>0&&<><div className="section-heading"><h3>Vista previa</h3><span className="badge">{records.length} registros</span></div><div className="table-scroll"><table><thead><tr>{fields[kind].slice(0,5).map(field=><th key={field.key}>{field.label}</th>)}</tr></thead><tbody>{records.slice(0,8).map((record,index)=><tr key={index}>{fields[kind].slice(0,5).map(field=><td key={field.key}>{String(record[field.key]??'—')}</td>)}</tr>)}</tbody></table></div>{records.length>8&&<p className="muted">Mostrando 8 de {records.length} filas.</p>}</>}</div><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="button" className="button primary" disabled={!records.length||!!errors.length||busy||reading} onClick={async()=>{if(busy||reading||errors.length||!records.length)return;setBusy(true);try{await onImport(records);onClose();}catch(cause){setErrors([cause instanceof Error?cause.message:'Error al importar.']);}finally{setBusy(false);}}}><Check size={16}/>{busy?'Importando…':`Importar ${records.length||''} registros`}</button></div></Modal>;
}
