// 图片懒加载指令
const lazyload = {
  mounted(el, binding) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = binding.value;
          
          if (src) {
            img.src = src;
            img.onload = () => {
              img.classList.add('loaded');
            };
            img.onerror = () => {
              img.classList.add('error');
            };
          }
          
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px'
    });

    observer.observe(el);
    
    // 将 observer 保存到元素上，以便在 unmounted 时清理
    el._observer = observer;
  },
  
  unmounted(el) {
    if (el._observer) {
      el._observer.disconnect();
    }
  }
};

export default lazyload;
