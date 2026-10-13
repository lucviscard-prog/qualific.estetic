"use client";
import {useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";
import "../homologacao/homologacao.css";

// Capture the recovery token before Supabase removes the URL fragment.
// Wait for initialization and match the resulting session before showing the form.
const recoveryToken=typeof window!=="undefined"
 ?new URLSearchParams(window.location.hash.slice(1)).get("access_token"):null;

export default function RecoverPassword(){
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [confirmation,setConfirmation]=useState("");
 const [recovery,setRecovery]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  const {data}=supabase.auth.onAuthStateChange(event=>{
   if(event==="PASSWORD_RECOVERY")setRecovery(true);
  });
  let live=true;
  void supabase.auth.getSession().then(({data})=>{
   if(live&&recoveryToken&&data.session?.access_token===recoveryToken)setRecovery(true);
  });
  return()=>{live=false;data.subscription.unsubscribe()};
 },[]);
 async function submit(event:React.FormEvent){
  event.preventDefault();if(busy)return;setError("");setNotice("");
  if(recovery&&(password.length<8||password!==confirmation)){setError("Use ao menos 8 caracteres e repita a mesma senha.");return}
  setBusy(true);
  try{
   if(recovery){
    const result=await supabase.auth.updateUser({password});
    if(result.error)throw result.error;
    await supabase.auth.signOut();setRecovery(false);setPassword("");setConfirmation("");
    setNotice("Senha atualizada. Entre novamente com sua nova senha.");
   }else{
    const result=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+"/recuperar-senha"});
    if(result.error)throw result.error;
    setNotice("Se houver uma conta com este e-mail, você receberá um link para redefinir a senha. Verifique também o spam.");
   }
  }catch{setError("Não foi possível concluir agora. Tente novamente ou solicite um novo link se o anterior expirou.")}
  finally{setBusy(false)}
 }
 return <main className="hv-realAuth"><section className="hv-realAuthCard"><img src="/logo-qualificar-correta.webp" alt="Qualificar"/><h1>{recovery?"Defina sua nova senha.":"Recupere seu acesso."}</h1><p>Use o e-mail da sua conta Qualific.Estetic.</p><form onSubmit={submit}>{recovery?<><label>Nova senha<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event=>setPassword(event.target.value)}/></label><label>Repita a senha<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={event=>setConfirmation(event.target.value)}/></label></>:<label>E-mail<input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>}{error&&<p className="hv-realError" role="alert">{error}</p>}{notice&&<p className="hv-info" role="status">{notice}</p>}<button className="hv-button" disabled={busy}>{busy?"Aguarde...":recovery?"Salvar nova senha":"Enviar link de recuperação"}</button></form><a href="/homologacao/cliente-real">Voltar ao acesso</a></section></main>;
}
