const qs=(s,p=document)=>p.querySelector(s);const qsa=(s,p=document)=>[...p.querySelectorAll(s)];
const nav=qs('.navlinks');const hamb=qs('.hamb');if(hamb){hamb.addEventListener('click',()=>nav.classList.toggle('open'))}
qsa('.faq').forEach(f=>{f.querySelector('button')?.addEventListener('click',()=>f.classList.toggle('open'))});
qsa('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{qsa('[data-filter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const cat=btn.dataset.filter;qsa('.product-card').forEach(card=>{card.dataset.hidden=(cat!=='all'&&card.dataset.category!==cat)?'true':'false'})}));
qsa('form[data-demo]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();alert('Thank you for your inquiry. For faster response, please contact us by WhatsApp or email.')}));
