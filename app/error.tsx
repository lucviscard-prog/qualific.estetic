"use client";
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){
 return <main className="loadingScreen"><div><h1>Não foi possível abrir esta tela.</h1><p>Tente novamente. Se o problema continuar, volte ao acesso.</p><button className="btn primary" onClick={reset}>Tentar novamente</button><p><a href="/homologacao">Voltar à homologação</a></p></div></main>;
}
