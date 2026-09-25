"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zyekgimmyosbxawvllvs.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_QFMzIAr9q6jeM8o0yDKr7A_A5KZU9Pd"
);
const logo = "https://raw.githubusercontent.com/lucviscard-prog/qualific.estetic/main/public/logo-qualificar-correta.webp";
const FIPE="https://parallelum.com.br/fipe/api/v1/carros";

type Vehicle={id:string;make:string;model:string;year:number;color:string;plate:string;category:string;observations:string|null};
type Service={id:string;name:string;description:string|null;duration_minutes:number;requires_evaluation:boolean};
type Booking={id:string;booking_date:string;start_time:string;end_time:string;status:string;delivery_mode:string;final_price:number|null;vehicle_id:string;observations:string|null};
type Option={code:string;name:string};
type AdminBooking=Booking&{customer?:{full_name:string;whatsapp:string|null}|null;vehicle?:{make:string;model:string;plate:string}|null};

const money=(n:number|null)=>n==null?"A definir":new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(n));
const time=(s:string)=>s.slice(0,5);
const status=(s:string)=>({REQUESTED:"Solicitado",CONFIRMED:"Confirmado",CUSTOMER_ARRIVED:"Cliente chegou",IN_SERVICE:"Em atendimento",AWAITING_PICKUP:"Aguardando retirada",COMPLETED:"Concluído",CANCELLED:"Cancelado",RESCHEDULED:"Reagendado",NO_SHOW:"Não compareceu"} as Record<string,string>)[s]||s;
const date=(s:string)=>new Date(s+"T12:00:00").toLocaleDateString("pt-BR");
const cleanDigits=(s:string)=>s.replace(/\D/g,"");
const validPhone=(s:string)=>{const n=cleanDigits(s);return (n.length===10||n.length===11)&&!/^(\d)\1+$/.test(n)&&n.slice(2).startsWith("9")};
const validCep=(s:string)=>/^\d{8}$/.test(cleanDigits(s));
const validCpf=(value:string)=>{
 const cpf=cleanDigits(value); if(cpf.length!==11||/^(\d)\1+$/.test(cpf))return false;
 let sum=0; for(let i=0;i<9;i++)sum+=Number(cpf[i])*(10-i); let d=(sum*10)%11;if(d===10)d=0;if(d!==Number(cpf[9]))return false;
 sum=0;for(let i=0;i<10;i++)sum+=Number(cpf[i])*(11-i);d=(sum*10)%11;if(d===10)d=0;return d===Number(cpf[10]);
};
const colors=["Preto","Branco","Prata","Cinza","Grafite","Vermelho","Azul","Verde","Amarelo","Laranja","Marrom","Bege","Dourado","Roxo","Vinho","Outra"];
function Combo({label,value,placeholder,options,onChange,disabled=false}:{label:string;value:string;placeholder:string;options:Option[];onChange:(v:string)=>void;disabled?:boolean}){
 const [open,setOpen]=useState(false);
 const safeValue=value||""; const filtered=(options||[]).filter(o=>String(o?.name||"").toLowerCase().includes(safeValue.toLowerCase())).slice(0,12);
 return <div className="field combo"><label>{label}</label><input value={value} disabled={disabled} placeholder={placeholder} onFocus={()=>setOpen(true)} onChange={e=>{onChange(e.target.value);setOpen(true)}} onBlur={()=>setTimeout(()=>setOpen(false),150)} autoComplete="off"/>{open&&!disabled&&filtered.length>0&&<div className="comboMenu">{filtered.map(o=><button type="button" key={o.code} onMouseDown={e=>e.preventDefault()} onClick={()=>{onChange(o.name);setOpen(false)}}>{o.name}</button>)}</div>}</div>
}


export default function Home(){
 const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true);
 const [mode,setMode]=useState<"login"|"register">("login"),[email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [name,setName]=useState(""),[whatsapp,setWhatsapp]=useState(""),[cpf,setCpf]=useState(""),[birth,setBirth]=useState(""),[terms,setTerms]=useState(false),[marketing,setMarketing]=useState(false);
 const [message,setMessage]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [customerId,setCustomerId]=useState(""),[customerName,setCustomerName]=useState(""),[vehicles,setVehicles]=useState<Vehicle[]>([]),[services,setServices]=useState<Service[]>([]),[bookings,setBookings]=useState<Booking[]>([]);
 const [view,setView]=useState<"home"|"agenda"|"garage"|"history"|"profile"|"admin">("home");
 const [isStaff,setIsStaff]=useState(false),[adminBookings,setAdminBookings]=useState<AdminBooking[]>([]),[adminDate,setAdminDate]=useState(new Date().toISOString().slice(0,10));
 const [checkinBooking,setCheckinBooking]=useState<AdminBooking|null>(null),[kmEntry,setKmEntry]=useState(""),[entryNotes,setEntryNotes]=useState("");
 const [completeBooking,setCompleteBooking]=useState<AdminBooking|null>(null),[kmExit,setKmExit]=useState(""),[exitNotes,setExitNotes]=useState("");
 const [inspectionBooking,setInspectionBooking]=useState<AdminBooking|null>(null),[inspection,setInspection]=useState<any>(null),[dirtLevel,setDirtLevel]=useState("MEDIUM"),[belongingsNotes,setBelongingsNotes]=useState(""),[damageNotes,setDamageNotes]=useState("");
 const [photoType,setPhotoType]=useState("BEFORE"),[photoCategory,setPhotoCategory]=useState("FRONT"),[photoFile,setPhotoFile]=useState<File|null>(null),[attendancePhotos,setAttendancePhotos]=useState<any[]>([]);
 const [vehicleId,setVehicleId]=useState(""),[serviceId,setServiceId]=useState(""),[bookingDate,setBookingDate]=useState(""),[quote,setQuote]=useState<any>(null),[slots,setSlots]=useState<any[]>([]),[slot,setSlot]=useState("");
 const [newVehicle,setNewVehicle]=useState(false);
 const [vf,setVf]=useState({make:"",model:"",year:String(new Date().getFullYear()),color:"",plate:"",category:"HATCH",observations:""});
 const [makes,setMakes]=useState<Option[]>([]),[models,setModels]=useState<Option[]>([]);
 const [cep,setCep]=useState(""),[cepInfo,setCepInfo]=useState({street:"",neighborhood:"",city:"",state:""}),[cepLoading,setCepLoading]=useState(false),[cepError,setCepError]=useState("");
 const years=useMemo(()=>Array.from({length:30},(_,i)=>String(new Date().getFullYear()+1-i)).map(y=>({code:y,name:y})),[]);
 const categories=[{code:"HATCH",name:"Hatch"},{code:"SEDAN",name:"Sedan"},{code:"SUV",name:"SUV"},{code:"PICKUP",name:"Caminhonete"},{code:"OTHER",name:"Outro"}];

 async function loadMakes(){
   try{const r=await fetch(FIPE+"/marcas");if(r.ok)setMakes(await r.json())}catch{}
 }
 async function lookupCep(value:string){
   const digits=cleanDigits(value); setCep(digits.replace(/(\d{5})(\d{3})/,"$1-$2")); setCepError("");
   if(digits.length!==8)return;
   setCepLoading(true);
   try{
     const r=await fetch("https://viacep.com.br/ws/"+digits+"/json/");
     const d=await r.json();
     if(d.erro) setCepError("CEP não encontrado.");
     else setCepInfo({street:d.logradouro||"",neighborhood:d.bairro||"",city:d.localidade||"",state:d.uf||""});
   }catch{setCepError("Não foi possível consultar o CEP agora.")}
   setCepLoading(false);
 }
 async function loadModels(makeName:string){
   setModels([]);setVf(v=>({...v,model:""}));
   const make=makes.find(x=>x.name===makeName); if(!make)return;
   try{const r=await fetch(FIPE+"/marcas/"+make.code+"/modelos");if(r.ok){const d=await r.json();setModels((d.modelos||[]).map((x:any)=>({code:String(x.codigo),name:x.nome})))}}catch{}
 }
 async function load(){
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){setLoading(false);return;}
   const [c,v,s,b]=await Promise.all([
    supabase.from("customers").select("id,full_name").eq("profile_id",user.id).single(),
    supabase.from("vehicles").select("id,make,model,year,color,plate,category,observations").eq("active",true).order("created_at"),
    supabase.from("services").select("id,name,description,duration_minutes,requires_evaluation").eq("active",true).eq("allows_online_booking",true).order("name"),
    supabase.from("bookings").select("id,booking_date,start_time,end_time,status,delivery_mode,final_price,vehicle_id,observations").order("booking_date",{ascending:false}).order("start_time",{ascending:false}).limit(50)
   ]);
   if(c.data){setCustomerId(c.data.id);setCustomerName(c.data.full_name||user.email||"Cliente");}
   const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
   const staff=!!profile&&["ADMIN","MANAGER","RECEPTION","PROFESSIONAL"].includes(profile.role);
   setIsStaff(staff);
   if(staff){
     const {data:ab}=await supabase.from("bookings").select("id,booking_date,start_time,end_time,status,delivery_mode,final_price,vehicle_id,observations,customer:customers(full_name,whatsapp),vehicle:vehicles(make,model,plate)").eq("booking_date",adminDate).order("start_time");
     setAdminBookings((ab||[]) as unknown as AdminBooking[]);
   }
   setVehicles(v.data||[]);setServices(s.data||[]);setBookings(b.data||[]);
   if(!vehicleId&&v.data?.[0])setVehicleId(v.data[0].id);
   setLoading(false);
 }
 useEffect(()=>{loadMakes();supabase.auth.getSession().then(({data})=>{setSession(data.session);if(data.session)load();else setLoading(false)});const {data:l}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);if(s)setTimeout(load,0)});return()=>l.subscription.unsubscribe()},[]);

 async function auth(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  if(mode==="register"){
   if(!validPhone(whatsapp)){setError("Digite um celular brasileiro válido com DDD.");setBusy(false);return}
   if(!validCpf(cpf)){setError("Digite um CPF válido.");setBusy(false);return}
   if(!validCep(cep)){setError("Digite um CEP válido com 8 números.");setBusy(false);return}
   if(!cepInfo.city){setError("Consulte um CEP válido antes de finalizar o cadastro.");setBusy(false);return}
   if(password.length<8){setError("A senha precisa ter pelo menos 8 caracteres.");setBusy(false);return}
  }
  if(mode==="register"){
   if(!terms){setError("Aceite os Termos de Uso e a Política de Privacidade.");setBusy(false);return}
   const r=await supabase.auth.signUp({email,password,options:{data:{full_name:name,whatsapp:cleanDigits(whatsapp),cpf:cleanDigits(cpf),birth_date:birth,cep:cleanDigits(cep),street:cepInfo.street,neighborhood:cepInfo.neighborhood,city:cepInfo.city,state:cepInfo.state,marketing_consent:marketing,transactional_whatsapp:true,transactional_consent:true,terms_accepted:true}}});
   if(r.error)setError(r.error.message);else setMessage(r.data.session?"Cadastro concluído.":"Cadastro criado. Verifique seu e-mail para confirmar o acesso.");
  }else{const r=await supabase.auth.signInWithPassword({email,password});if(r.error)setError(r.error.message);else setMessage("Acesso realizado.")}
  setBusy(false);
 }
 async function saveVehicle(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");
  if(!vf.make||!vf.model||!vf.color||!vf.year||!vf.category){setError("Preencha marca, modelo, ano, cor e categoria.");setBusy(false);return}
  const r=await supabase.from("vehicles").insert({...vf,year:Number(vf.year),customer_id:customerId}).select().single();
  if(r.error)setError(r.error.message);else{setVehicles([...vehicles,r.data]);setNewVehicle(false);setVf({make:"",model:"",year:String(new Date().getFullYear()),color:"",plate:"",category:"HATCH",observations:""});}
  setBusy(false);
 }
 async function prepareQuote(){
  setError("");setMessage("");setQuote(null);setSlots([]);setSlot("");
  if(!vehicleId||!serviceId)return;
  const r=await supabase.rpc("get_service_quote",{p_vehicle_id:vehicleId,p_service_id:serviceId,p_package_id:null});
  if(r.error||!r.data?.[0])setError(r.error?.message||"Não foi possível consultar o serviço.");
  else setQuote({name:r.data[0].item_name,price:Number(r.data[0].base_price),duration:Number(r.data[0].duration_minutes)});
 }
 async function getSlots(){
  if(!quote||!bookingDate)return;setBusy(true);const r=await supabase.rpc("get_available_slots",{p_date:bookingDate,p_duration_minutes:quote.duration});
  if(r.error)setError(r.error.message);else setSlots(r.data||[]);setBusy(false);
 }
 async function book(){
  if(!customerId||!vehicleId||!serviceId||!bookingDate||!slot)return;setBusy(true);setError("");
  const r=await supabase.rpc("create_customer_booking",{p_customer_id:customerId,p_vehicle_id:vehicleId,p_booking_date:bookingDate,p_start_time:slot,p_service_id:serviceId,p_package_id:null,p_delivery_mode:"CUSTOMER_BRINGS",p_observations:null});
  if(r.error)setError(r.error.message.replaceAll("_"," ").toLowerCase());else{setMessage("Agendamento solicitado com sucesso.");setView("history");await load();}
  setBusy(false);
 }
 async function cancel(id:string){if(!confirm("Cancelar este agendamento?"))return;setBusy(true);const r=await supabase.rpc("cancel_customer_booking",{p_booking_id:id,p_reason:"Cancelado pelo cliente"});if(r.error)setError(r.error.message);else await load();setBusy(false)}
 async function updateBookingStatus(id:string,next:string){
  setBusy(true);setError("");
  let r:any;
  if(next==="CONFIRMED") r=await supabase.from("bookings").update({status:"CONFIRMED"}).eq("id",id);
  else if(next==="IN_SERVICE") r=await supabase.rpc("staff_start_service",{p_booking_id:id});
  else if(next==="AWAITING_PICKUP") r=await supabase.rpc("staff_finish_service",{p_booking_id:id});
  else {setBusy(false);return}
  if(r.error)setError(r.error.message);else await refreshAdmin();
  setBusy(false);
 }
 async function doCheckin(e:React.FormEvent){
  e.preventDefault();if(!checkinBooking)return;setBusy(true);setError("");
  const km=Number(kmEntry);
  if(!Number.isInteger(km)||km<0){setError("Informe a quilometragem de entrada.");setBusy(false);return}
  const r=await supabase.rpc("staff_checkin_booking",{p_booking_id:checkinBooking.id,p_km_entry:km,p_entry_notes:entryNotes||null});
  if(r.error)setError(r.error.message);else{setCheckinBooking(null);setKmEntry("");setEntryNotes("");await refreshAdmin()}
  setBusy(false);
 }
 async function doComplete(e:React.FormEvent){
  e.preventDefault();if(!completeBooking)return;setBusy(true);setError("");
  const km=Number(kmExit);
  if(!Number.isInteger(km)||km<0){setError("Informe a quilometragem de saída.");setBusy(false);return}
  const r=await supabase.rpc("staff_complete_attendance",{p_booking_id:completeBooking.id,p_km_exit:km,p_exit_notes:exitNotes||null});
  if(r.error)setError(r.error.message);else{setCompleteBooking(null);setKmExit("");setExitNotes("");await refreshAdmin()}
  setBusy(false);
 }
 async function openInspection(b:AdminBooking){
  setBusy(true);setError("");
  const r=await supabase.rpc("staff_get_inspection",{p_booking_id:b.id});
  if(r.error)setError(r.error.message);else{
   const d=Array.isArray(r.data)?r.data[0]:r.data;
   setInspection(d||null);setDirtLevel(d?.dirt_level||"MEDIUM");setBelongingsNotes(d?.belongings_notes||"");setDamageNotes(d?.preexisting_damage_notes||"");setInspectionBooking(b);await loadAttendancePhotos(b.id);
  }
  setBusy(false);
 }
 function toggleInspectionItem(id:string){
  setInspection((d:any)=>({...d,checklist:(d?.checklist||[]).map((x:any)=>x.id===id?{...x,completed:!x.completed}:x)}));
 }
 async function loadAttendancePhotos(bookingId:string){
  const r=await supabase.rpc("staff_get_attendance_photos",{p_booking_id:bookingId});
  if(!r.error){
   const rows=r.data||[];
   const withUrls=await Promise.all(rows.map(async(p:any)=>{const s=await supabase.storage.from("attendance-photos").createSignedUrl(p.storage_path,3600);return {...p,url:s.data?.signedUrl||""}}));
   setAttendancePhotos(withUrls);
  }
 }
 async function uploadAttendancePhoto(){
  if(!inspectionBooking||!photoFile)return;setBusy(true);setError("");
  if(photoFile.size>10*1024*1024){setError("A foto deve ter no máximo 10 MB.");setBusy(false);return}
  const ext=(photoFile.name.split(".").pop()||"jpg").toLowerCase();
  const path=inspectionBooking.id+"/"+Date.now()+"-"+Math.random().toString(36).slice(2)+"."+ext;
  const up=await supabase.storage.from("attendance-photos").upload(path,photoFile,{contentType:photoFile.type,upsert:false});
  if(up.error){setError(up.error.message);setBusy(false);return}
  const r=await supabase.rpc("staff_add_attendance_photo",{p_booking_id:inspectionBooking.id,p_type:photoType,p_category:photoCategory,p_storage_path:path,p_description:null});
  if(r.error){await supabase.storage.from("attendance-photos").remove([path]);setError(r.error.message)}
  else{setPhotoFile(null);await loadAttendancePhotos(inspectionBooking.id)}
  setBusy(false);
 }
 async function saveInspection(e:React.FormEvent){
  e.preventDefault();if(!inspectionBooking||!inspection)return;setBusy(true);setError("");
  const r=await supabase.rpc("staff_save_inspection",{p_booking_id:inspectionBooking.id,p_dirt_level:dirtLevel,p_belongings_notes:belongingsNotes||null,p_damage_notes:damageNotes||null,p_checklist:inspection.checklist||[]});
  if(r.error)setError(r.error.message);else{setInspectionBooking(null);setInspection(null);await refreshAdmin()}
  setBusy(false);
 }
 async function refreshAdmin(dateValue=adminDate){
  setBusy(true);const {data,error:r}=await supabase.from("bookings").select("id,booking_date,start_time,end_time,status,delivery_mode,final_price,vehicle_id,observations,customer:customers(full_name,whatsapp),vehicle:vehicles(make,model,plate)").eq("booking_date",dateValue).order("start_time");if(!r)setAdminBookings((data||[]) as unknown as AdminBooking[]);setBusy(false);
 }
 async function logout(){await supabase.auth.signOut();setSession(null)}
 const active=useMemo(()=>bookings.filter(x=>!["CANCELLED","COMPLETED","NO_SHOW"].includes(x.status)),[bookings]);
 const vehicleName=(id:string)=>{const v=vehicles.find(x=>x.id===id);return v?v.make+" "+v.model+" · "+v.plate:"Veículo"};

 if(loading)return <div className="loadingScreen">Abrindo sua garagem...</div>;
 if(!session)return <main className="authPage"><div className="authShell">
  <div className="authIntro"><img src={logo}/><span>QUALIFIC.ESTETIC</span><h1>Seu carro, seu histórico, seu cuidado.</h1><p>Agende serviços, acompanhe seus veículos e tenha cada atendimento registrado em uma garagem digital.</p><div className="miniStats"><b>GARAGEM DIGITAL</b><b>HISTÓRICO</b><b>AGENDAMENTO</b></div></div>
  <div className="authCard"><div className="tabs"><button className={mode==="login"?"active":""} onClick={()=>setMode("login")}>Entrar</button><button className={mode==="register"?"active":""} onClick={()=>setMode("register")}>Criar conta</button></div>
   <h2>{mode==="login"?"Bem-vindo de volta.":"Crie sua garagem."}</h2><p>{mode==="login"?"Acesse seus veículos e agendamentos.":"Cadastre seus dados para começar."}</p>
   <form onSubmit={auth}>
    {mode==="register"&&<><div className="field"><label>Nome completo</label><input required value={name} onChange={e=>setName(e.target.value)}/></div><div className="formGrid"><div className="field"><label>WhatsApp</label><input required inputMode="tel" maxLength={15} value={whatsapp} onChange={e=>setWhatsapp(e.target.value.replace(/[^0-9()+ -]/g,""))}/></div><div className="field"><label>CPF</label><input required inputMode="numeric" maxLength={14} value={cpf} onChange={e=>setCpf(e.target.value)}/></div><div className="field"><label>Data de nascimento</label><input required type="date" value={birth} onChange={e=>setBirth(e.target.value)}/></div><div className="field"><label>CEP</label><input required inputMode="numeric" maxLength={9} value={cep} onChange={e=>lookupCep(e.target.value)} placeholder="00000-000"/>{cepLoading&&<small>Consultando CEP...</small>}{cepError&&<small className="fieldError">{cepError}</small>}{cepInfo.city&&<small className="cepOk">{cepInfo.street}, {cepInfo.neighborhood} · {cepInfo.city}/{cepInfo.state}</small>}</div></div></>}
    <div className="field"><label>E-mail</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></div><div className="field"><label>Senha</label><input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)}/></div>
    {mode==="register"&&<div className="checks"><label><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/> Aceito os Termos de Uso e a Política de Privacidade.</label><label><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/> Quero receber novidades e ofertas.</label></div>}
    {error&&<div className="error">{error}</div>}{message&&<div className="success">{message}</div>}<button className="btn primary full" disabled={busy}>{busy?"Processando...":mode==="login"?"Entrar na garagem":"Criar minha conta"}</button>
   </form>
  </div>
 </div></main>;

 return <main className="appPage"><header className="appHeader"><div className="appBrand"><img src={logo}/><div><b>QUALIFIC.ESTETIC</b><span>Garagem digital</span></div></div><nav>{(["home","agenda","garage","history","profile"] as const).map(x=><button key={x} className={view===x?"selected":""} onClick={()=>setView(x)}>{({home:"Início",agenda:"Agendar",garage:"Garagem",history:"Histórico",profile:"Perfil"} as any)[x]}</button>)}{isStaff&&<button className={view==="admin"?"selected":""} onClick={()=>{setView("admin");refreshAdmin()}}>Operação</button>}</nav><button className="logout" onClick={logout}>Sair</button></header>
 <div className="appBody">
 {view==="home"&&<><div className="welcome"><div><span className="eyebrow dark">GARAGEM DIGITAL</span><h1>Olá, {customerName.split(" ")[0]||"cliente"}.</h1><p>Seu carro está em boas mãos. Acompanhe o que já foi feito e o que vem pela frente.</p></div><button className="btn primary" onClick={()=>setView("agenda")}>Novo agendamento</button></div><div className="dashboardGrid"><div className="panel"><div className="panelTitle"><div><span>PRÓXIMOS CUIDADOS</span><h3>{active.length?"Seus agendamentos":"Nada agendado ainda"}</h3></div></div>{active.slice(0,4).map(b=><div className="bookingRow" key={b.id}><div className="dateBox"><b>{new Date(b.booking_date+"T12:00:00").getDate()}</b><span>{new Date(b.booking_date+"T12:00:00").toLocaleDateString("pt-BR",{month:"short"}).replace(".","")}</span></div><div><b>{vehicleName(b.vehicle_id)}</b><p>{time(b.start_time)} · {status(b.status)}</p></div><strong>{money(b.final_price)}</strong></div>)}{!active.length&&<div className="empty">Seu próximo cuidado começa com um agendamento.</div>}</div><div className="panel accentPanel"><span className="eyebrow dark">MINHA GARAGEM</span><h3>{vehicles.length} veículo{vehicles.length===1?"":"s"}</h3><p>Organize seus carros e mantenha cada histórico no lugar certo.</p><button className="btn darkBtn" onClick={()=>setView("garage")}>Abrir garagem</button></div></div></>}
 {view==="agenda"&&<><div className="pageTitle"><span className="eyebrow dark">NOVO AGENDAMENTO</span><h1>Escolha o próximo cuidado.</h1><p>Os horários consideram a duração do serviço, o intervalo da operação e a disponibilidade do box.</p></div><div className="bookingWizard"><div className="panel"><h3>1. Escolha o veículo</h3><div className="choiceGrid">{vehicles.map(v=><button key={v.id} className={"choice "+(vehicleId===v.id?"chosen":"")} onClick={()=>{setVehicleId(v.id);setQuote(null);setSlots([])}}><b>{v.make} {v.model}</b><span>{v.plate} · {v.category}</span></button>)}</div>{!vehicles.length&&<div className="empty">Cadastre um veículo primeiro.</div>}<h3>2. Escolha o serviço</h3><div className="serviceGrid">{services.map(s=><button key={s.id} className={"serviceChoice "+(serviceId===s.id?"chosen":"")} onClick={()=>setServiceId(s.id)}><div><b>{s.name}</b><span>{s.description||"Serviço de estética automotiva"} · {s.duration_minutes} min</span></div><strong>{s.requires_evaluation?"Avaliação":"Agendar"}</strong></button>)}</div><button className="btn primary" disabled={!vehicleId||!serviceId||busy} onClick={prepareQuote}>Continuar</button></div>{quote&&<div className="panel bookingSide"><span className="eyebrow dark">RESUMO</span><h3>{quote.name}</h3><div className="quoteLine"><span>Duração</span><b>{quote.duration} min</b></div><div className="quoteLine"><span>Valor base</span><b>{money(quote.price)}</b></div><div className="field"><label>Data</label><input type="date" min={new Date().toISOString().slice(0,10)} value={bookingDate} onChange={e=>{setBookingDate(e.target.value);setSlots([]);setSlot("")}}/></div><button className="btn darkBtn full" disabled={!bookingDate||busy} onClick={getSlots}>Ver horários</button>{slots.length>0&&<><label className="slotLabel">Horários disponíveis</label><div className="slots">{slots.map(s=><button key={s.start_time} className={slot===s.start_time?"slot selectedSlot":"slot"} onClick={()=>setSlot(s.start_time)}>{time(s.start_time)}</button>)}</div><button className="btn primary full" disabled={!slot||busy} onClick={book}>Solicitar agendamento</button></>}{error&&<div className="error">{error}</div>}{message&&<div className="success">{message}</div>}</div>}</div></>}
 {view==="garage"&&<><div className="pageTitle"><span className="eyebrow dark">MINHA GARAGEM</span><h1>Seus veículos.</h1><p>O veículo é o centro do seu histórico na Qualific.Estetic.</p></div><div className="vehicleGrid">{vehicles.map(v=><div className="vehicleCard" key={v.id}><div className="vehicleVisual">🚘</div><div className="vehicleInfo"><span className="pill">{v.category}</span><h3>{v.make} {v.model}</h3><p>{v.year} · {v.color} · {v.plate}</p>{v.observations&&<small>{v.observations}</small>}<button className="linkBtn" onClick={()=>setView("history")}>Ver histórico</button></div></div>)}<button className="addVehicle" onClick={()=>setNewVehicle(true)}>＋ Adicionar veículo</button></div>{newVehicle&&<div className="modalBackdrop"><form className="modal panel" onSubmit={saveVehicle}><div className="panelTitle"><h3>Novo veículo</h3><button type="button" className="close" onClick={()=>setNewVehicle(false)}>×</button></div><div className="formGrid"><Combo label="Marca" value={vf.make} placeholder="Digite a marca..." options={makes} onChange={v=>{setVf({...vf,make:v});loadModels(v)}}/><Combo label="Modelo" value={vf.model} placeholder={vf.make?"Digite o modelo...":"Escolha a marca primeiro"} options={models} onChange={v=>setVf({...vf,model:v})} disabled={!vf.make}/><Combo label="Ano" value={vf.year} placeholder="Escolha o ano" options={years} onChange={v=>setVf({...vf,year:v})}/><Combo label="Cor" value={vf.color} placeholder="Digite ou escolha a cor" options={colors.map(x=>({code:x,name:x}))} onChange={v=>setVf({...vf,color:v})}/><div className="field"><label>Placa</label><input required maxLength={8} value={vf.plate} onChange={e=>setVf({...vf,plate:e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,"")})}/></div><Combo label="Categoria" value={categories.find(x=>x.code===vf.category)?.name||""} placeholder="Escolha a categoria" options={categories} onChange={v=>{const c=categories.find(x=>x.name===v);setVf({...vf,category:c?.code||"OTHER"})}}/></div><div className="field"><label>Observações permanentes</label><textarea value={vf.observations} onChange={e=>setVf({...vf,observations:e.target.value})}/></div><button className="btn primary full" disabled={busy}>Salvar veículo</button></form></div>}</>}
 {view==="history"&&<><div className="pageTitle"><span className="eyebrow dark">HISTÓRICO</span><h1>O que já fizemos pelo seu carro.</h1><p>Agendamentos e atendimentos ficam vinculados ao veículo.</p></div><div className="historyList">{bookings.map(b=><div className="historyCard" key={b.id}><div><span className="pill">{status(b.status)}</span><h3>{vehicleName(b.vehicle_id)}</h3><p>{date(b.booking_date)} às {time(b.start_time)} · {money(b.final_price)}</p></div><div className="historyActions">{!["CANCELLED","COMPLETED","NO_SHOW"].includes(b.status)&&<button className="dangerBtn" onClick={()=>cancel(b.id)}>Cancelar</button>}</div></div>)}{!bookings.length&&<div className="empty">Seu histórico ainda está vazio.</div>}</div></>}
 {view==="profile"&&<><div className="pageTitle"><span className="eyebrow dark">MEU PERFIL</span><h1>Seus dados.</h1><p>Seu acesso está protegido pelo Supabase Auth.</p></div><div className="panel profilePanel"><div className="profileAvatar">{customerName.slice(0,1).toUpperCase()}</div><div><h3>{customerName}</h3><p>{session.user.email}</p></div><div className="profileNote">Para alterar dados cadastrais sensíveis, fale com a Qualific.Estetic pelo atendimento.</div></div></>} {view==="admin"&&isStaff&&<><div className="pageTitle"><span className="eyebrow dark">CENTRAL OPERACIONAL</span><h1>Agenda da Qualific.Estetic.</h1><p>Visão interna do dia, clientes, veículos e andamento dos atendimentos.</p></div><div className="adminToolbar panel"><div className="field"><label>Dia da operação</label><input type="date" value={adminDate} onChange={e=>{setAdminDate(e.target.value);refreshAdmin(e.target.value)}}/></div><div className="adminStats"><div><b>{adminBookings.length}</b><span>agendamentos</span></div><div><b>{adminBookings.filter(x=>x.status==="CONFIRMED").length}</b><span>confirmados</span></div><div><b>{adminBookings.filter(x=>x.status==="IN_SERVICE").length}</b><span>em atendimento</span></div></div></div><div className="adminList">{adminBookings.map(b=><div className="adminBooking panel" key={b.id}><div className="adminTime">{time(b.start_time)}<span>{time(b.end_time)}</span></div><div className="adminMain"><span className="pill">{status(b.status)}</span><h3>{b.vehicle?.make} {b.vehicle?.model}</h3><p>{b.vehicle?.plate||"Sem placa"} · {b.customer?.full_name||"Cliente"} · {b.customer?.whatsapp||"Sem WhatsApp"}</p><small>{b.delivery_mode==="CUSTOMER_BRINGS"?"Cliente leva o veículo":"Retirada pela Qualific.Estetic"}</small></div><div className="adminActions">{b.status==="REQUESTED"&&<button className="btn primary" onClick={()=>updateBookingStatus(b.id,"CONFIRMED")}>Confirmar</button>}{b.status==="CONFIRMED"&&<button className="btn darkBtn" onClick={()=>{setCheckinBooking(b);setError("")}}>Check-in</button>}{b.status==="CUSTOMER_ARRIVED"&&<><button className="btn darkBtn" onClick={()=>openInspection(b)}>Vistoria</button><button className="btn darkBtn" onClick={()=>updateBookingStatus(b.id,"IN_SERVICE")}>Iniciar</button></>}{b.status==="IN_SERVICE"&&<button className="btn primary" onClick={()=>updateBookingStatus(b.id,"AWAITING_PICKUP")}>Finalizar</button>}{b.status==="AWAITING_PICKUP"&&<button className="btn darkBtn" onClick={()=>{setCompleteBooking(b);setError("")}}>Entregar</button>}</div></div>)}{!adminBookings.length&&<div className="empty panel">Nenhum agendamento para este dia.</div>}</div></>}
 {checkinBooking&&<div className="modalBackdrop"><form className="modal panel" onSubmit={doCheckin}><div className="panelTitle"><div><span className="eyebrow dark">CHECK-IN</span><h3>{checkinBooking.vehicle?.make} {checkinBooking.vehicle?.model}</h3></div><button type="button" className="close" onClick={()=>setCheckinBooking(null)}>×</button></div><p className="modalLead">Registre a entrada do veículo. A quilometragem é obrigatória e a vistoria inicial será criada automaticamente.</p><div className="field"><label>Quilometragem de entrada</label><input autoFocus required type="number" min="0" step="1" value={kmEntry} onChange={e=>setKmEntry(e.target.value)} placeholder="Ex.: 82450"/></div><div className="field"><label>Observações da entrada</label><textarea value={entryNotes} onChange={e=>setEntryNotes(e.target.value)} placeholder="Avarias, objetos no veículo, nível de sujeira..."/></div>{error&&<div className="error">{error}</div>}<button className="btn primary full" disabled={busy}>{busy?"Registrando...":"Confirmar check-in"}</button></form></div>}
 {inspectionBooking&&inspection&&<div className="modalBackdrop"><form className="modal panel inspectionModal" onSubmit={saveInspection}><div className="panelTitle"><div><span className="eyebrow dark">VISTORIA INICIAL</span><h3>{inspectionBooking.vehicle?.make} {inspectionBooking.vehicle?.model}</h3></div><button type="button" className="close" onClick={()=>setInspectionBooking(null)}>×</button></div><div className="inspectionMeta"><span>KM entrada <b>{inspection.km_entry}</b></span><span>{inspectionBooking.vehicle?.plate||"Sem placa"}</span></div><div className="field"><label>Nível de sujeira</label><select value={dirtLevel} onChange={e=>setDirtLevel(e.target.value)}><option value="LIGHT">Leve</option><option value="MEDIUM">Média</option><option value="HEAVY">Pesada</option><option value="EXTREME">Extrema</option></select></div><h4>Checklist visual</h4><div className="inspectionList">{(inspection.checklist||[]).map((x:any)=><label className={"inspectionItem "+(x.completed?"checked":"")} key={x.id}><input type="checkbox" checked={!!x.completed} onChange={()=>toggleInspectionItem(x.id)}/><span>{x.item}</span></label>)}</div><div className="field"><label>Pertences / porta-malas</label><textarea value={belongingsNotes} onChange={e=>setBelongingsNotes(e.target.value)} placeholder="Objetos encontrados, pertences removidos, observações..."/></div><div className="field"><label>Danos preexistentes</label><textarea value={damageNotes} onChange={e=>setDamageNotes(e.target.value)} placeholder="Riscos, amassados, trincas, manchas ou outras avarias..."/></div>{Array.isArray(inspection.special_care)&&inspection.special_care.length>0&&<div className="careAlert"><b>⚠ Cuidados especiais cadastrados</b>{inspection.special_care.map((x:any,i:number)=><p key={i}>{x.type}: {x.status}{x.product_used?" · "+x.product_used:""}</p>)}</div>}<h4>Fotos do atendimento</h4><div className="photoControls"><select value={photoType} onChange={e=>setPhotoType(e.target.value)}><option value="BEFORE">Antes</option><option value="AFTER">Depois</option></select><select value={photoCategory} onChange={e=>setPhotoCategory(e.target.value)}><option value="FRONT">Frente</option><option value="REAR">Traseira</option><option value="LEFT">Lateral esquerda</option><option value="RIGHT">Lateral direita</option><option value="INTERIOR_FRONT">Interior dianteiro</option><option value="INTERIOR_REAR">Interior traseiro</option><option value="DASHBOARD">Painel</option><option value="WHEELS">Rodas</option><option value="TRUNK">Porta-malas</option><option value="DAMAGE">Avaria</option><option value="OTHER">Outra</option></select><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhotoFile(e.target.files?.[0]||null)}/><button type="button" className="btn darkBtn" disabled={!photoFile||busy} onClick={uploadAttendancePhoto}>Adicionar foto</button></div>{attendancePhotos.length>0&&<div className="photoGrid">{attendancePhotos.map((p:any)=><div className="photoCard" key={p.id}>{p.url&&<img src={p.url}/>}<span>{p.type==="BEFORE"?"Antes":"Depois"} · {p.category}</span></div>)}</div>}{error&&<div className="error">{error}</div>}<button className="btn primary full" disabled={busy}>{busy?"Salvando...":"Concluir vistoria"}</button></form></div>}
 {completeBooking&&<div className="modalBackdrop"><form className="modal panel" onSubmit={doComplete}><div className="panelTitle"><div><span className="eyebrow dark">ENTREGA</span><h3>{completeBooking.vehicle?.make} {completeBooking.vehicle?.model}</h3></div><button type="button" className="close" onClick={()=>setCompleteBooking(null)}>×</button></div><p className="modalLead">A quilometragem de saída fecha o atendimento e preserva o histórico do veículo.</p><div className="field"><label>Quilometragem de saída</label><input autoFocus required type="number" min="0" step="1" value={kmExit} onChange={e=>setKmExit(e.target.value)} placeholder="Ex.: 82453"/></div><div className="field"><label>Observações da entrega</label><textarea value={exitNotes} onChange={e=>setExitNotes(e.target.value)} placeholder="Observações finais do atendimento..."/></div>{error&&<div className="error">{error}</div>}<button className="btn primary full" disabled={busy}>{busy?"Finalizando...":"Concluir e entregar veículo"}</button></form></div>}
 </div></main>
}
