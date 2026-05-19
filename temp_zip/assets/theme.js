document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Sticky Header Effect ---
    const header = document.querySelector('.header-main');
    window.addEventListener('scroll', () => {
        if (header) {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    });

    // --- 2. Size Selector Synchronization ---
    document.addEventListener('click', (e) => {
        const option = e.target.closest('.size-option');
        if (!option) return;

        const container = option.closest('.size-options');
        container.querySelectorAll('.size-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');

        const productCard = option.closest('.product-card') || option.closest('.product-form');
        if (productCard) {
            const idInput = productCard.querySelector('input[name="id"]');
            if (idInput && option.dataset.variantId) {
                idInput.value = option.dataset.variantId;
                console.log('ID wariantu zaktualizowane do:', idInput.value);
            }
        }
    });

    // NOTE: All Cart AJAX (Add, Remove, Qty) and Theme Switching logic 
    // has been moved to header.liquid to ensure pixel-perfect integration 
    // and prevent double-execution conflicts.
});
