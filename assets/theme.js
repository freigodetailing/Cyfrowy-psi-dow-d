document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Nawigacja i Menu Mobilne (NAPRAWIONE) ---
    const burgerBtn = document.getElementById('burger-btn');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const header = document.querySelector('.header');
    
    if (burgerBtn && mobileOverlay) {
        burgerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Kliknięto hamburgera');
            burgerBtn.classList.toggle('active');
            mobileOverlay.classList.toggle('active');
            
            // Blokada przewijania tła przy otwartym menu
            if (mobileOverlay.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'auto';
            }
        });
        
        // Automatyczne zamykanie menu po kliknięciu w link
        mobileOverlay.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                burgerBtn.classList.remove('active');
                mobileOverlay.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        });
    }

    // Efekt przyklejonego nagłówka przy przewijaniu
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // --- 2. Wybór Rozmiarów (Synchronizacja z ukrytym ID) ---
    document.addEventListener('click', (e) => {
        const option = e.target.closest('.size-option');
        if (!option) return;

        const container = option.closest('.size-options');
        container.querySelectorAll('.size-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');

        const productCard = option.closest('.product-card');
        if (productCard) {
            const idInput = productCard.querySelector('input[name="id"]');
            if (idInput && option.dataset.variantId) {
                idInput.value = option.dataset.variantId;
                console.log('ID wariantu zaktualizowane do:', idInput.value);
            }
        }
    });

    // --- 3. Logika Koszyka Bocznego (AJAX) ---
    const cartIcon = document.getElementById('cart-icon');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-overlay');
    const closeCartBtn = document.getElementById('close-cart');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartTotalPriceEl = document.getElementById('cart-total-price');
    const cartCountEl = document.querySelector('.cart-count');

    const updateCartUI = async () => {
        try {
            const res = await fetch('/cart.js');
            const cart = await res.json();
            if (cartCountEl) cartCountEl.textContent = cart.item_count;
            if (!cartItemsContainer) return;
            
            if (cart.item_count === 0) {
                cartItemsContainer.innerHTML = `<div class="cart-empty-msg"><i class="fas fa-shopping-basket"></i>Twój koszyk jest pusty</div>`;
                if (cartTotalPriceEl) cartTotalPriceEl.textContent = '0.00 PLN';
                return;
            }

            let cartHTML = '';
            cart.items.forEach((item) => {
                cartHTML += `
                    <div class="cart-item">
                        <img src="${item.image}" class="cart-item-img">
                        <div class="cart-item-info">
                            <h4>${item.product_title}</h4>
                            <div class="cart-item-variant">${item.variant_title || ''}</div>
                            <div class="cart-item-price">${(item.price / 100).toFixed(2)} PLN</div>
                            <div class="cart-item-qty">
                                <button class="qty-btn" onclick="updateQty('${item.key}', ${item.quantity - 1})">-</button>
                                <span>${item.quantity}</span>
                                <button class="qty-btn" onclick="updateQty('${item.key}', ${item.quantity + 1})">+</button>
                            </div>
                            <span class="remove-item" onclick="updateQty('${item.key}', 0)">Usuń</span>
                        </div>
                    </div>`;
            });
            cartItemsContainer.innerHTML = cartHTML;
            if (cartTotalPriceEl) cartTotalPriceEl.textContent = (cart.total_price / 100).toFixed(2) + ' PLN';
        } catch (err) {
            console.error('Błąd koszyka:', err);
        }
    };

    const toggleCart = (open) => {
        if (!cartDrawer || !cartOverlay) return;
        const isOpen = open !== undefined ? open : !cartDrawer.classList.contains('open');
        cartDrawer.classList.toggle('open', isOpen);
        cartOverlay.classList.toggle('open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    };

    if (cartIcon) cartIcon.addEventListener('click', (e) => { e.preventDefault(); toggleCart(true); });
    if (closeCartBtn) closeCartBtn.addEventListener('click', () => toggleCart(false));
    if (cartOverlay) cartOverlay.addEventListener('click', () => toggleCart(false));

    // --- 4. AJAX Add to Cart ---
    document.addEventListener('submit', async (e) => {
        const form = e.target;
        if (form.action && form.action.includes('/cart/add')) {
            e.preventDefault();
            const submitBtn = form.querySelector('[type="submit"]');
            const formData = new FormData(form);

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dodawanie...';
            }

            try {
                const response = await fetch('/cart/add.js', { method: 'POST', body: formData });
                if (response.ok) {
                    await updateCartUI();
                    toggleCart(true);
                } else {
                    alert('Wybierz rozmiar przed dodaniem do koszyka.');
                }
            } catch (err) {
                console.error('Błąd AJAX:', err);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Dodaj do koszyka';
                }
            }
        }
    });

    window.updateQty = async (key, quantity) => {
        try {
            await fetch('/cart/change.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: key, quantity: parseInt(quantity) })
            });
            updateCartUI();
        } catch (err) {
            console.error('Błąd ilości:', err);
        }
    };

    updateCartUI();
});
