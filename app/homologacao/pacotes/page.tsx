"use client";
import {useCallback,useEffect,useState} from "react";
import {createClient,type Session} from "@supabase/supabase-js";
import "../homologacao.css";
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://zyekgimmyosbxawvllvs.supabase.co",process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"sb_publishable_QFMzIAr9q6jeM8o0yDKr7A_A5KZU9Pd");
const logo="https://raw.githubusercontent.com/lucviscard-prog/qualific.estetic/main/public/logo-qualificar-correta.webp";
type Service={id:string;name:string;category:string|null;duration_minutes:number;active:boolean};
type PackageItem={service_id:string;name:string;quantity:number};
type Pack={id:string;name:string;description:string|null;duration_minutes:number|null;online_enabled:boolean;approved_at:string|null;items:PackageItem[]};
export default function PackageManagement(){
 const [session,setSession]=useState<Session|null>(null),[checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [packs,setPacks]=useState<Pack[]>([]),[services,setServices]=useState<Service[]>([]),[current,setCurrent]=useState(""),[selection,setSelection]=useState<string[]>([]),[minutes,setMinutes]=useState(""),[approved,setApproved]=useState(false),[filter,setFilter]=useState("");
 const selected=packs.find(x=>x.id===current);
 const load=useCallback(async()=>{
  setBusy(true);setError("");
  const [config,catalog]=await Promise.all([supabase.rpc("staff_package_configuration"),supabase.from("services").select("id,name,category,duration_minutes,active").eq("active",true).order("category").order("name")]);
  if(config.error||catalog.error){setError(config.error?.message||catalog.error?.message||"Falha ao carregar configuração.");setBusy(false);return}
  const rows=(config.data||[]) as Pack[];setPacks(rows);setServices((catalog.data||[]) as Service[]);
  setCurrent(previous=>rows.some(p=>p.id===previous)?previous:rows[0]?.id||"");setBusy(false);
 },[]);
 useEffect(()=>{let live=true;supabase.auth.getSession().then(({data})=>{if(!live)return;setSession(data.session);setChecking(false);if(data.session)void load()});const {data:sub}=supabase.auth.onAuthStateChange((_evt,s)=>{setSession(s);if(s)window.setTimeout(()=>void load(),0)});return()=>{live=false;sub.subscription.unsubscribe()}},[load]);
 useEffect(()=>{if(!selected)return;setSelection((selected.items||[]).map(x=>x.service_id));setMinutes(selected.duration_minutes==null?"":String(selected.duration_minutes));setApproved(selected.online_enabled);setNotice("")},[selected?.id,packs]);
 const estimated=selection.reduce((sum,id)=>sum+(services.find(s=>s.id===id)?.duration_minutes||0),0);
 function toggle(id:string){setSelection(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);setApproved(false)}
 async function save(enable:boolean){
  if(!selected)return;
  const duration=minutes.trim()?Number(minutes):null;
  if(duration!==null&&(!Number.isInteger(duration)||duration<15||duration>600||duration%15!==0)){setError("Informe uma duração operacional de 15 a 600 minutos, em intervalos de 15.");return}
  if(enable&&(!duration||selection.length===0)){setError("Para aprovar o pacote, selecione os itens incluídos e defina sua duração operacional.");return}
  if(enable&&!window.confirm("Confirmar a composição e a duração deste pacote e liberar agendamento ONLINE real? O preço oficial existente será mantido."))return;
  setBusy(true);setError("");setNotice("");
  const r=await supabase.rpc("staff_save_package_configuration",{p_package_id:selected.id,p_duration_minutes:duration,p_service_ids:selection,p_enable_online:enable});
  if(r.error){setError(r.error.message);setBusy(false);return}
  setNotice(enable?"Pacote aprovado e liberado para o agendamento online.":"Configuração salva como rascunho, sem reserva online.");await load();setBusy(false);
 }
 if(checking)return <main className="hv-packageAuth">Verificando acesso...</main>;
 if(!session)return <main className="hv-packageAuth"><section className="hv-panel"><img className="hv-manageLogo" src={logo} alt="Qualificar"/><h2>Configuração de pacotes</h2><p>Entre primeiro no aplicativo com uma conta de gestor ou administrador.</p><a className="hv-button" href="/">Acessar conta</a></section></main>;
 return <main className="hv-manager"><div className="hv-managerTop"><a href="/homologacao">← Homologação geral</a><img src={logo} alt="Qualificar"/><span className="hv-pill gold">Gestão · Dados reais</span></div><div className="hv-managerBody"><div className="hv-heading"><div><span className="hv-overline">CONFIGURAÇÃO OPERACIONAL</span><h1>Composição dos pacotes.</h1><p>Escolha os serviços incluídos e aprove a duração real do pacote. O preço de tabela não será alterado.</p></div><span className="hv-pill green">{packs.filter(p=>p.online_enabled).length} de {packs.length} liberados</span></div>{error&&<div className="hv-realError" role="alert">{error}</div>}{notice&&<div className="hv-info" role="status">{notice}</div>}<div className="hv-manageGrid"><section className="hv-panel"><div className="hv-panelHead"><h3>Pacotes cadastrados</h3><small>Aprovação individual</small></div>{packs.map(p=><button className={"hv-packSelect "+(current===p.id?"active":"")} key={p.id} onClick={()=>setCurrent(p.id)}><span><b>{p.name}</b><small>{p.description}</small></span><span className={"hv-pill "+(p.online_enabled?"green":"gold")}>{p.online_enabled?"Liberado":"Pendente"}</span></button>)}{!packs.length&&!busy&&<p>Não foi possível carregar os pacotes. Verifique se sua conta tem perfil ADMIN ou MANAGER.</p>}</section><div>{selected&&<><section className="hv-panel"><div className="hv-panelHead"><h3>{selected.name}</h3><small>{selected.description||"Composição a definir"}</small></div><label className="hv-blockLabel">Duração operacional aprovada (minutos)<input type="number" min="15" max="600" step="15" value={minutes} onChange={e=>{setMinutes(e.target.value);setApproved(false)}} placeholder="Ex.: 180"/></label><div className="hv-info">Soma das durações isoladas dos serviços selecionados: {estimated} min. Use esse número como referência, não como substituto da duração real do pacote: tarefas compartilhadas não devem ser somadas duas vezes.</div><div className="hv-line"><span>Serviços incluídos</span><b>{selection.length} selecionado(s)</b></div><input className="hv-search" placeholder="Pesquisar serviço" value={filter} onChange={e=>setFilter(e.target.value)}/><div className="hv-serviceSelect">{services.filter(s=>(s.name+" "+s.category).toLowerCase().includes(filter.toLowerCase())).map(s=><label key={s.id} className={selection.includes(s.id)?"active":""}><input type="checkbox" checked={selection.includes(s.id)} onChange={()=>toggle(s.id)}/><span><b>{s.name}</b><small>{s.category||"SERVIÇO"} · referência isolada: {s.duration_minutes} min</small></span></label>)}</div><div className="hv-actions hv-packageActions"><button className="hv-outline" disabled={busy} onClick={()=>void save(false)}>{busy?"Salvando...":"Salvar como rascunho"}</button><button className="hv-button" disabled={busy||approved||!selection.length||!minutes} onClick={()=>void save(true)}>{selected.online_enabled&&!approved?"Reaprovar configuração":"Aprovar e liberar reserva online"}</button>{selected.online_enabled&&<button className="hv-danger" disabled={busy} onClick={()=>void save(false)}>Suspender reserva online</button>}</div><p className="hv-fine">A aprovação é restrita a ADMIN/MANAGER. Alterar serviços ou duração remove a aprovação anterior até nova confirmação. Clientes só podem reservar pacotes liberados, com horários livres.</p></section></>}</div></div></div></main>;
}
