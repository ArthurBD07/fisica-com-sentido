import Link from 'next/link';
export default function NotFound(){return <div className="page empty"><h1>Este caminho não existe.</h1><p>Vamos voltar ao seu espaço de estudo?</p><Link href="/" className="button dark">Voltar ao início</Link></div>;}
