(()=>{
  const init=()=>{
    const nav=document.querySelector('[data-nav-links]');
    const productsLink=nav?.querySelector(':scope > a[href="/products/"]');
    if(!nav||!productsLink||nav.querySelector('[data-products-menu]'))return;

    const productsItem=document.createElement('div');
    productsItem.className='nav-products';
    productsItem.dataset.productsMenu='';
    productsLink.before(productsItem);
    productsItem.append(productsLink);

    productsLink.classList.add('nav-products-trigger');
    productsLink.setAttribute('aria-haspopup','true');
    productsLink.setAttribute('aria-expanded','false');
    productsLink.setAttribute('aria-controls','nav-products-menu');
    productsLink.insertAdjacentHTML('beforeend','<span class="nav-products-caret" aria-hidden="true">⌄</span>');

    const menu=document.createElement('div');
    menu.className='nav-products-menu';
    menu.id='nav-products-menu';
    menu.setAttribute('aria-label','Product categories');
    menu.innerHTML=[
      '<a href="/products/adjustable-bed-bases/">Adjustable Bed Bases</a>',
      '<a href="/products/smart-beds/">Smart Beds</a>',
      '<a href="/products/smart-mattresses/">Smart Mattresses</a>'
    ].join('');
    productsItem.append(menu);

    const setExpanded=open=>productsLink.setAttribute('aria-expanded',String(open));
    productsItem.addEventListener('mouseenter',()=>setExpanded(true));
    productsItem.addEventListener('mouseleave',()=>setExpanded(false));
    productsItem.addEventListener('focusin',()=>setExpanded(true));
    productsItem.addEventListener('focusout',()=>requestAnimationFrame(()=>setExpanded(productsItem.contains(document.activeElement))));

    menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
      nav.classList.remove('open');
      document.body.classList.remove('menu-open');
      const toggle=document.querySelector('[data-menu-toggle]');
      toggle?.setAttribute('aria-expanded','false');
    }));
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
