(function(){
  const toggle=document.querySelector('[data-menu-toggle]');
  const links=document.querySelector('[data-nav-links]');
  if(toggle&&links){
    toggle.addEventListener('click',()=>{links.classList.toggle('open');toggle.setAttribute('aria-expanded',links.classList.contains('open')?'true':'false')});
  }
  document.querySelectorAll('[data-rfq-form]').forEach(form=>{
    form.addEventListener('submit',e=>{
      e.preventDefault();
      alert('Thank you. Your inquiry draft is ready. For faster response, please contact us by WhatsApp or email.');
    });
  });
})();
