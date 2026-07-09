(function(){
  const toggle=document.querySelector('[data-menu-toggle]');
  const links=document.querySelector('[data-nav-links]');
  if(toggle&&links){
    toggle.addEventListener('click',()=>{links.classList.toggle('open');toggle.setAttribute('aria-expanded',links.classList.contains('open')?'true':'false')});
  }

  document.querySelectorAll('[data-hero-slider]').forEach(slider=>{
    const slides=[...slider.querySelectorAll('.hero-slider__slide')];
    const dots=[...slider.querySelectorAll('[data-hero-dot]')];
    if(!slides.length) return;
    let current=0;
    const show=index=>{
      current=(index+slides.length)%slides.length;
      slides.forEach((slide,i)=>slide.classList.toggle('is-active',i===current));
      dots.forEach((dot,i)=>dot.classList.toggle('is-active',i===current));
    };
    dots.forEach((dot,i)=>dot.addEventListener('click',()=>show(i)));
    setInterval(()=>show(current+1),5000);
  });
  document.querySelectorAll('[data-rfq-form]').forEach(form=>{
    form.addEventListener('submit',e=>{
      e.preventDefault();
      alert('Thank you. Your inquiry draft is ready. For faster response, please contact us by WhatsApp or email.');
    });
  });
})();
