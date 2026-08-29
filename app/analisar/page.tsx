'use client';
import {useState} from 'react';
import {AnalysisForm} from '@/components/trainer/upload';
import {Exercise} from '@/components/trainer/exercise';
import {type Question} from '@/src/lib/schema';
import Link from 'next/link';
export default function Analyze(){const [question,setQuestion]=useState<Question|null>(null);return <div className="page">{question?<Exercise key={question.id} question={question} onExit={()=>setQuestion(null)}/>:<><div className="eyebrow">TRAGA A SUA DÚVIDA</div><h1>Analisar uma <em>questão</em></h1><p className="page-intro">Uma foto ou um texto. Vamos transformar o enunciado em um caminho para pensar.</p><section className="panel form-panel"><h2>O que você está estudando?</h2><p>Envie uma questão de Física completa e legível. A resposta não aparece de cara: vamos por etapas.</p><AnalysisForm onQuestion={setQuestion}/></section><p className="notice">Prefere começar sem IA? <Link href="/treinar">Escolha uma das 10 questões autorais.</Link></p></>}</div>}
