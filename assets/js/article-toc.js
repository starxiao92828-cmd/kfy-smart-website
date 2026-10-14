(() => {
  const navigation = document.querySelector('.article-toc');
  const disclosure = navigation?.querySelector('details');
  if (!disclosure) return;

  const mobile = window.matchMedia('(max-width: 800px)');
  const adapt = () => { disclosure.open = !mobile.matches; };
  adapt();
  mobile.addEventListener('change', adapt);

  navigation.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link && mobile.matches) disclosure.open = false;
  });
})();
