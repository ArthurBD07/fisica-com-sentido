import type {Metadata} from 'next';
import './globals.css';
import {SessionProvider} from '@/components/trainer/session';
import {Shell} from '@/components/trainer/shell';
import {publicSupabaseConfig} from '@/src/lib/public-config';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Física com Sentido',description:'Aprenda a interpretar questões de Física do ENEM, um passo de cada vez.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><SessionProvider publicConfig={publicSupabaseConfig()}><Shell>{children}</Shell></SessionProvider></body></html>;}
