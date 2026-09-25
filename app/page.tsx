"use client";
import {useState} from "react";
import {createClient} from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zyekgimmyosbxawvllvs.supabase.co";
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_QFMzIAr9q6jeM8o0yDKr7A_A5KZU9Pd";
const supabase=createClient(url,key);

export default function Home(){ 
  const [email,setEmail]=useState(""); const [sent,setSent]=useState(false); const [loading,setLoading]=useState(false);
  async function login(e:React.FormEvent){e.preventDefault();setLoading(true);const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}});setLoading(false);if(!error)setSent(true);}
  return <main>
    <section className="hero"><div className="container">
      <nav className="nav"><div className="brand">Qualific<span>.</span>Estetic</div><div><a href="#servicos">Serviços</a><a href="#cuidado">Cuidado</a><a href="#acesso">Acessar</a></div></nav>
      <div className="heroGrid">
        <div><div className="eyebrow">Estética automotiva</div><h1>Seu carro merece cuidado em cada detalhe.</h1><p>Uma nova experiência para agendar serviços, acompanhar o histórico do seu veículo e manter cada cuidado registrado.</p><div className="actions"><a className="btn primary" href="#acesso">Agendar meu carro</a><a className="btn ghost" href="#servicos">Conhecer serviços</a></div></div>
        <div className="card" id="acesso"><h3>Acesse sua garagem</h3><p>Entre sem senha. Enviaremos um link seguro para o seu e-mail.</p><form onSubmit={login}><div className="field"><label>E-mail</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></div><button className="btn primary" disabled={loading}>{loading?"Enviando...":"Receber link de acesso"}</button>{sent&&<p style={{marginTop:14,color:"#17634e"}}>Link enviado. Verifique seu e-mail.</p>}</form></div>
      </div>
    </div></section>
    <section className="section" id="servicos"><div className="container"><h2>Mais que brilho.</h2><p className="sectionLead">A Qualific.Estetic transforma cada atendimento em histórico, cuidado e acompanhamento para o seu veículo.</p><div className="features"><div className="feature"><b>Agendamento inteligente</b><p>Escolha veículo, serviço e horário conforme a disponibilidade real da operação.</p></div><div className="feature"><b>Garagem digital</b><p>Seus veículos, serviços realizados e cuidados especiais ficam organizados em um só lugar.</p></div><div className="feature"><b>Histórico completo</b><p>Registros de atendimento, fotos e recomendações para facilitar os próximos cuidados.</p></div></div></div></section>
    <section className="section" id="cuidado" style={{background:"#f0f3ef"}}><div className="container"><h2>Cuidado em cada detalhe.</h2><p className="sectionLead">Da lavagem ao tratamento técnico, cada serviço nasce de uma ficha do veículo e pode alimentar a próxima recomendação.</p></div></section>
    <footer className="footer"><div className="container"><strong>Qualific.Estetic</strong> · Estética Automotiva · Marechal Cândido Rondon/PR</div></footer>
  </main>
}