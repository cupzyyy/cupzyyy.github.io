// ============================================================
//  FRONTEND APP - DARK iOS GLOSSY
// ============================================================

let state = {
    products: [],
    selectedProduct: null,
    quantity: 1,
    currentOrder: null,
    checkInterval: null
};

const els = {
    productList: document.getElementById('productList'),
    quantity: document.getElementById('quantity'),
    buyerName: document.getElementById('buyerName'),
    buyerEmail: document.getElementById('buyerEmail'),
    subtotal: document.getElementById('subtotal'),
    totalPrice: document.getElementById('totalPrice'),
    btnOrder: document.getElementById('btnOrder'),
    
    orderForm: document.getElementById('orderForm'),
    paymentSection: document.getElementById('paymentSection'),
    successSection: document.getElementById('successSection'),
    
    statusBadge: document.getElementById('statusBadge'),
    paymentAmount: document.getElementById('paymentAmount'),
    qrisImage: document.getElementById('qrisImage'),
    qrisLoader: document.getElementById('qrisLoader'),
    displayOrderId: document.getElementById('displayOrderId'),
    expiredTime: document.getElementById('expiredTime'),
    checkSpinner: document.getElementById('checkSpinner'),
    checkText: document.getElementById('checkText'),
    
    successName: document.getElementById('successName'),
    successProduct: document.getElementById('successProduct'),
    successQty: document.getElementById('successQty'),
    successIcon: document.getElementById('successIcon'),
    downloadLink: document.getElementById('downloadLink'),
    linkText: document.getElementById('linkText'),
    
    errorToast: document.getElementById('errorToast'),
    errorMessage: document.getElementById('errorMessage')
};

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});

async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        
        if (data.ok) {
            state.products = data.products;
            renderProducts();
        }
    } catch (err) {
        showError('Gagal memuat produk');
    }
}

function renderProducts() {
    els.productList.innerHTML = state.products.map(product => `
        <div onclick="selectProduct('${product.id}')" 
             class="product-card cursor-pointer p-5 rounded-2xl relative overflow-hidden ${state.selectedProduct?.id === product.id ? 'selected' : ''}"
             data-id="${product.id}">
            
            ${product.popular ? `
                <div class="popular-badge absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold text-black">
                    <i class="fa-solid fa-fire mr-1"></i>POPULER
                </div>
            ` : ''}
            
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-ios-blue/20 to-ios-purple/20 flex items-center justify-center text-3xl border border-white/10">
                    ${product.icon}
                </div>
                <div class="flex-1">
                    <h3 class="font-bold text-white text-lg mb-1">${product.name}</h3>
                    <p class="text-ios-gray text-sm mb-2">${product.description}</p>
                    <p class="text-ios-blue font-bold text-xl">Rp ${product.price.toLocaleString('id-ID')}</p>
                </div>
                ${state.selectedProduct?.id === product.id ? `
                    <div class="w-8 h-8 bg-ios-blue rounded-full flex items-center justify-center text-white shadow-lg shadow-ios-blue/30">
                        <i class="fa-solid fa-check"></i>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function selectProduct(productId) {
    state.selectedProduct = state.products.find(p => p.id === productId);
    state.quantity = 1;
    els.quantity.value = 1;
    renderProducts();
    updateTotal();
}

function updateQty(delta) {
    const newQty = state.quantity + delta;
    if (newQty >= 1 && newQty <= 99) {
        state.quantity = newQty;
        els.quantity.value = newQty;
        updateTotal();
    }
}

function updateTotal() {
    if (!state.selectedProduct) {
        els.subtotal.textContent = 'Rp 0';
        els.totalPrice.textContent = 'Rp 0';
        return;
    }
    
    const subtotal = state.selectedProduct.price * state.quantity;
    els.subtotal.textContent = `Rp ${subtotal.toLocaleString('id-ID')}`;
    els.totalPrice.textContent = `Rp ${subtotal.toLocaleString('id-ID')}`;
}

async function createOrder() {
    const name = els.buyerName.value.trim();
    const email = els.buyerEmail.value.trim();
    
    if (!state.selectedProduct) return showError('Pilih produk terlebih dahulu!');
    if (!name) return showError('Masukkan nama lengkap!');
    if (!email || !email.includes('@')) return showError('Email tidak valid!');

    setLoading(true);

    try {
        const res = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: state.selectedProduct.id,
                buyer_name: name,
                buyer_email: email,
                quantity: state.quantity
            })
        });

        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Gagal membuat pesanan');

        state.currentOrder = data;
        showPaymentSection(data);
        startPaymentCheck(data.order_id);

    } catch (err) {
        showError(err.message);
    } finally {
        setLoading(false);
    }
}

async function checkPaymentStatus(orderId) {
    try {
        const res = await fetch('/api/check-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId })
        });
        return await res.json();
    } catch (err) {
        return { ok: false, status: 'pending' };
    }
}

function showPaymentSection(orderData) {
    els.orderForm.classList.add('hidden');
    els.paymentSection.classList.remove('hidden');
    
    els.paymentAmount.textContent = `Rp ${orderData.total_payment.toLocaleString('id-ID')}`;
    els.displayOrderId.textContent = orderData.order_id;
    
    if (orderData.expired_at) {
        const expDate = new Date(orderData.expired_at);
        els.expiredTime.textContent = expDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(orderData.qris)}`;
    
    els.qrisImage.src = qrUrl;
    els.qrisImage.onload = () => {
        els.qrisLoader.classList.add('hidden');
        els.qrisImage.classList.remove('hidden');
    };
}

function startPaymentCheck(orderId) {
    checkAndUpdate(orderId);
    state.checkInterval = setInterval(() => checkAndUpdate(orderId), 5000);
}

async function checkAndUpdate(orderId) {
    const result = await checkPaymentStatus(orderId);
    if (!result.ok) return;
    
    const status = result.status;
    updateStatusBadge(status);
    
    if (status === 'paid' || status === 'delivered') {
        clearInterval(state.checkInterval);
        showSuccessSection(result.order);
    } else if (['expired', 'failed', 'cancelled'].includes(status)) {
        clearInterval(state.checkInterval);
        showError(`Pembayaran ${status}. Silakan coba lagi.`);
        setTimeout(resetOrder, 3000);
    }
}

function updateStatusBadge(status) {
    const configs = {
        pending: { text: 'MENUNGGU PEMBAYARAN', class: 'bg-ios-orange/20 text-ios-orange border-ios-orange/30', dot: 'bg-ios-orange', icon: 'fa-clock' },
        paid: { text: 'PEMBAYARAN DITERIMA', class: 'bg-ios-blue/20 text-ios-blue border-ios-blue/30', dot: 'bg-ios-blue', icon: 'fa-check' },
        delivered: { text: 'PRODUK DIKIRIM', class: 'bg-ios-green/20 text-ios-green border-ios-green/30', dot: 'bg-ios-green', icon: 'fa-download' },
        expired: { text: 'KADALUARSA', class: 'bg-ios-gray/20 text-ios-gray border-ios-gray/30', dot: 'bg-ios-gray', icon: 'fa-clock' }
    };
    
    const config = configs[status] || configs.pending;
    
    els.statusBadge.className = `inline-flex items-center gap-2 px-4 py-2 rounded-full border ${config.class}`;
    els.statusBadge.innerHTML = `
        <span class="w-2 h-2 ${config.dot} rounded-full ${status === 'pending' ? 'animate-pulse status-dot' : ''}"></span>
        <span class="font-semibold text-sm"><i class="fa-solid ${config.icon} mr-1"></i>${config.text}</span>
    `;
    
    if (status === 'paid') els.checkText.textContent = 'Memproses pengiriman...';
}

function showSuccessSection(orderData) {
    els.paymentSection.classList.add('hidden');
    els.successSection.classList.remove('hidden');
    
    els.successName.textContent = orderData.buyer_name;
    els.successProduct.textContent = orderData.product_name;
    els.successQty.textContent = `${orderData.quantity}x ${orderData.product_icon}`;
    els.successIcon.textContent = orderData.product_icon;
    
    // Set download link
    const link = orderData.download_link || '#';
    els.downloadLink.href = link;
    els.linkText.textContent = 'Download Sekarang';
}

function resetOrder() {
    if (state.checkInterval) {
        clearInterval(state.checkInterval);
        state.checkInterval = null;
    }
    
    state.currentOrder = null;
    state.selectedProduct = null;
    state.quantity = 1;
    
    els.buyerName.value = '';
    els.buyerEmail.value = '';
    els.quantity.value = 1;
    
    els.paymentSection.classList.add('hidden');
    els.successSection.classList.add('hidden');
    els.orderForm.classList.remove('hidden');
    
    els.qrisImage.classList.add('hidden');
    els.qrisLoader.classList.remove('hidden');
    
    updateTotal();
    renderProducts();
}

function setLoading(loading) {
    if (loading) {
        els.btnOrder.disabled = true;
        els.btnOrder.innerHTML = `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div><span>Memproses...</span>`;
    } else {
        els.btnOrder.disabled = false;
        els.btnOrder.innerHTML = `<i class="fa-solid fa-bolt"></i><span>ORDER SEKARANG</span>`;
    }
}

function showError(message) {
    els.errorMessage.textContent = message;
    els.errorToast.classList.remove('hidden', 'translate-y-full');
    setTimeout(hideError, 4000);
}

function hideError() {
    els.errorToast.classList.add('translate-y-full');
    setTimeout(() => els.errorToast.classList.add('hidden'), 300);
}

updateTotal();
