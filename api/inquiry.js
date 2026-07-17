
const recent = globalThis.__kfyRecent || (globalThis.__kfyRecent = new Map());
const clean = (v, max=3000) => String(v ?? '').trim().slice(0,max);
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const ip=clean(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown',120).split(',')[0];
    const now=Date.now(), last=recent.get(ip)||0;
    if(now-last<15000) return res.status(429).json({error:'Please wait before submitting again'});
    recent.set(ip,now);
    const b=req.body||{};
    if(clean(b.website,200)) return res.status(200).json({ok:true});
    const fullName=clean(b.fullName,100), companyName=clean(b.companyName,150), businessEmail=clean(b.businessEmail,160), country=clean(b.country,100), interestedProduct=clean(b.interestedProduct,100), requirements=clean(b.requirements,3000);
    if(!fullName||!companyName||!businessEmail||!country||!interestedProduct||!requirements||!b.consent) return res.status(400).json({error:'Please complete all required fields'});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) return res.status(400).json({error:'Invalid email address'});
    const key=process.env.RESEND_API_KEY, to=process.env.INQUIRY_TO_EMAIL||'liwei@kfygroup.com', from=process.env.INQUIRY_FROM_EMAIL;
    if(!key||!from) return res.status(503).json({error:'Email service is not configured'});
    const phone=clean(b.phone,80), quantity=clean(b.quantity,80), sourcePage=clean(b.sourcePage,300), submissionTime=clean(b.submissionTime,100);
    const text=[`New KFY SMART Website Inquiry`,``,`Full Name: ${fullName}`,`Company: ${companyName}`,`Business Email: ${businessEmail}`,`WhatsApp / Phone: ${phone||'-'}`,`Country / Region: ${country}`,`Interested Product: ${interestedProduct}`,`Estimated Quantity: ${quantity||'-'}`,`Source Page: ${sourcePage||'-'}`,`Submission Time: ${submissionTime||new Date().toISOString()}`,``,`Project Requirements:`,` ${requirements}`].join('\n');
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],reply_to:businessEmail,subject:`New Website Inquiry – ${interestedProduct} – ${companyName}`,text})});
    if(!response.ok){console.error(await response.text());return res.status(502).json({error:'Email delivery failed'});}
    return res.status(200).json({ok:true});
  }catch(e){console.error(e);return res.status(500).json({error:'Unexpected server error'});}
}
