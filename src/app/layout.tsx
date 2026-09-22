import type { Metadata } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
export const metadata:Metadata={title:{default:'TNW — Time Network',template:'%s · TNW'},description:'El centro de control de tu red de pantallas. Inventario, campañas, evidencia y expansión, en un solo lugar.',robots:{index:true,follow:true},icons:{icon:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es-AR"><body>{children}</body></html>;}
