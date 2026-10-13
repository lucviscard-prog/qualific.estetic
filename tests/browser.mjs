import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const BASE_URL=process.env.BASE_URL||'http://localhost:3000';
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
const user={id:'00000000-0000-4000-8000-000000000001',email:'fixture@example.invalid',aud:'authenticated',role:'authenticated'};
const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
async function authenticatedContext(manager=false){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({user,token})=>localStorage.setItem('sb-zyekgimmyosbxawvllvs-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{user,token});
 const calls=[];let bookingStatus='CUSTOMER_ARRIVED';
 await context.route('https://zyekgimmyosbxawvllvs.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());calls.push(url.pathname);
  let data=[];
  if(url.pathname==='/auth/v1/user')data=user;
  else if(url.pathname.includes('/rpc/is_package_manager'))data=manager;
  else if(url.pathname.includes('/rpc/is_staff'))data=manager;
  else if(url.pathname.endsWith('/profiles'))data={full_name:'FIXTURE DE TESTE',role:manager?'MANAGER':'CUSTOMER'};
  else if(url.pathname.endsWith('/customers'))data=url.searchParams.has('profile_id')?{id:user.id,full_name:'FIXTURE DE TESTE',whatsapp:null,email:user.email}:[];
  else if(url.pathname.endsWith('/vehicles'))data=[{id:user.id,make:'TESTE',model:'SEM DADOS REAIS',year:2026,color:'TESTE',plate:'ABC1D23',category:'HATCH',observations:null}];
  else if(url.pathname.endsWith('/services'))data=[{id:user.id,name:'SERVIÇO DE TESTE',description:null,duration_minutes:60,requires_evaluation:false,allows_online_booking:true}];
  else if(url.pathname.endsWith('/rpc/get_service_quote'))data=[{item_name:'SERVIÇO DE TESTE',base_price:0,duration_minutes:60}];
  else if(url.pathname.endsWith('/rpc/get_available_slots_v2'))data=[{start_time:'09:00:00',end_time:'10:00:00'}];
  else if(url.pathname.endsWith('/rpc/create_customer_booking_v2'))data=user.id;
  else if(manager&&url.pathname.endsWith('/bookings'))data=[{id:user.id,booking_date:new Date().toISOString().slice(0,10),start_time:'09:00:00',end_time:'10:00:00',status:bookingStatus,delivery_mode:'CUSTOMER_BRINGS',observations:null,final_price:0,customer:{full_name:'FIXTURE DE TESTE',whatsapp:null},vehicle:{make:'TESTE',model:'SEM DADOS REAIS',plate:'ABC1D23',color:'TESTE'},items:[],attendance:{id:user.id,status:'CHECKED_IN',km_entry:0,km_exit:null,inspection_completed_at:'2026-10-13T12:00:00Z',checkin_at:'2026-10-13T12:00:00Z',service_started_at:null,service_finished_at:null,delivered_at:null,dirt_level:'MEDIUM'}}];
  else if(url.pathname.endsWith('/rpc/staff_start_service')){bookingStatus='IN_SERVICE';data=null;}
  else if(url.pathname.endsWith('/rpc/staff_finish_service')){bookingStatus='AWAITING_PICKUP';data=null;}
  else if(url.pathname.endsWith('/rpc/staff_complete_attendance')){bookingStatus='COMPLETED';data=null;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 return {context,calls};
}
for(const path of ['/homologacao/pacotes','/homologacao/gestao-real','/homologacao/operacao-real']){
 const {context,calls}=await authenticatedContext();const page=await context.newPage();
 await page.goto(BASE_URL+path);await page.getByText(/Acesso restrito/).waitFor();
 assert.ok(!calls.some(path=>path.endsWith('/bookings')||path.endsWith('/payments')||path.endsWith('/rpc/staff_package_configuration')));
 console.log('PASS authenticated customer denied: '+path);await context.close();
}
const {context,calls}=await authenticatedContext();const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.goto(BASE_URL+'/homologacao/cliente-real');
await page.getByRole('button',{name:'Solicitar atendimento'}).click();
await page.getByRole('button',{name:/SERVIÇO DE TESTE/}).click();
await page.getByRole('button',{name:'Consultar preço e duração'}).click();
await page.getByLabel('Data',{exact:true}).fill(new Date(Date.now()+7*86400000).toISOString().slice(0,10));
await page.getByRole('button',{name:'Ver horários disponíveis'}).click();
await page.getByRole('button',{name:/09:00/}).click();
await page.getByRole('button',{name:/Solicitar agendamento real/}).click();
await page.getByText('Solicitação enviada! A equipe confirmará seu horário.').waitFor();
assert.ok(calls.includes('/rest/v1/rpc/create_customer_booking_v2'));
assert.deepEqual(errors,[]);
console.log('PASS quote survives date selection; slots and booking flow use v2 RPCs (isolated browser fixtures, no real writes)');
await context.close();
const operations=await authenticatedContext(true);const ops=await operations.context.newPage();
await ops.goto(BASE_URL+'/homologacao/operacao-real');
await ops.getByRole('button',{name:'Iniciar',exact:true}).click();
await ops.getByRole('button',{name:'Marcar pronto'}).click();
await ops.getByRole('button',{name:'Entregar',exact:true}).click();
await ops.getByLabel('Quilometragem de saída').fill('0');
await ops.getByRole('button',{name:'Concluir e entregar'}).click();
await ops.getByText('Entrega concluída.').waitFor();
for(const rpc of ['staff_start_service','staff_finish_service','staff_complete_attendance'])assert.ok(operations.calls.includes('/rest/v1/rpc/'+rpc));
console.log('PASS operation start, ready and delivery accept one-to-one attendance object and zero mileage (fixtures only)');
await operations.context.close();
const recoveryContext=await browser.newContext();
await recoveryContext.route('https://zyekgimmyosbxawvllvs.supabase.co/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)}));
const recoveryPage=await recoveryContext.newPage();
await recoveryPage.goto(BASE_URL+'/recuperar-senha#access_token='+token+'&refresh_token=fixture&token_type=bearer&expires_in=3600&type=recovery');
await recoveryPage.getByRole('heading',{name:'Defina sua nova senha.'}).waitFor();
await recoveryPage.getByLabel('Nova senha',{exact:true}).fill('FixturePassword123');
await recoveryPage.getByLabel('Repita a senha').fill('FixturePassword123');
await recoveryPage.getByRole('button',{name:'Salvar nova senha'}).click();
await recoveryPage.getByText('Senha atualizada. Entre novamente com sua nova senha.').waitFor();
console.log('PASS password recovery handles recovery URL and updates password (intercepted auth, no email or real changes)');
await recoveryContext.close();await browser.close();


