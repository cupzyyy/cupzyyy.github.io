// API URL otomatis detect (local atau Vercel)
const API_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:3001' 
    : ''; // Vercel: relative path

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
    errorToast: document.getElementById('errorToast'),
    errorMessage: document.getElementById('errorMessage')
};

document.addEventListener('DOMContentLoaded', loadProducts);

async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/api/products`);
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
    els.productList.innerHTML = state.products.map(p => `
        <div onclick="selectProduct('${p.id}')" class="product-card cursor-pointer p-5 rounded-2xl relative ${state.selectedProduct?.id === p.id ? 'selected' : ''}">
            ${p.popular ? `<div class="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold text-black bg-gradient-to-r from-orange-400 to-orange-600"><i class="fa-solid fa-fire mr-1"></i>POPULER</div>` : ''}
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-3xl border border-white/10">${p.icon}</div>
                <div class="flex-1">
                    <h3 class="font-bold text-lg mb-1">${p.name}</h3>
                    <p class="text-gray-500 text-sm mb-2">${p.description}</p>
                    <p class="text-blue-400 font-bold text-xl">Rp ${p.price.toLocaleString('id-ID')}</p>
                </div>
                ${state.selectedProduct?.id === p.id ? `<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white"><i class="fa-solid fa-check"></i></div>` : ''}
            </div>
        </div>
    `).join('');
}

function selectProduct(id) {
    state.selectedProduct = state.products.find(p => p.id === id);
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
    const total = state.selectedProduct.price * state.quantity;
    els.subtotal.textContent = `Rp ${total.toLocaleString('id-ID')}`;
    els.totalPrice.textContent = `Rp ${total.toLocaleString('id-ID')}`;
}

async function createOrder() {
    const name = els.buyerName.value.trim();
    const email = els.buyerEmail.value.trim();
    
    if (!state.selectedProduct) return showError('Pilih produk!');
    if (!name) return showError('Masukkan nama!');
    if (!email.includes('@')) return showError('Email tidak valid!');

    setLoading(true);
    try {
        const res = await fetch(`${API_URL}/api/create-order`, {
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
        if (!data.ok) throw new Error(data.error);
        
        state.currentOrder = data;
        showPayment(data);
        startCheck(data.order_id);
    } catch (err) {
        showError(err.message);
    } finally {
        setLoading(false);
    }
}

function showPayment(data) {
    els.orderForm.classList.add('hidden');
    els.paymentSection.classList.remove('hidden');
    els.paymentAmount.textContent = `Rp ${data.total_payment.toLocaleString('id-ID')}`;
    els.displayOrderId.textContent = data.order_id;
    if (data.expired_at) {
        els.expiredTime.textContent = new Date(data.expired_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
    }
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.qris)}`;
    els.qrisImage.src = qrUrl;
    els.qrisImage.onload = () => {
        els.qrisLoader.classList.add('hidden');
        els.qrisImage.classList.remove('hidden');
    };
}

function startCheck(orderId) {
    checkStatus(orderId);
    state.checkInterval = setInterval(() => checkStatus(orderId), 5000);
}

async function checkStatus(orderId) {
    try {
        const res = await fetch(`${API_URL}/api/check-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId })
        });
        const data = await res.json();
        if (!data.ok) return;
        
        updateBadge(data.status);
        
        if (data.status === 'delivered') {
            clearInterval(state.checkInterval);
            showSuccess(data.order);
        } else if (['expired', 'failed', 'cancelled'].includes(data.status)) {
            clearInterval(state.checkInterval);
            showError(`Pembayaran ${data.status}`);
            setTimeout(resetOrder, 3000);
        }
    } catch (e) {
        console.error('Check error:', e);
    }
}

function updateBadge(status) {
    const configs = {
        pending: { text: 'MENUNGGU', class: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: 'fa-clock' },
        paid: { text: 'DITERIMA', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: 'fa-check' },
        delivered: { text: 'DIKIRIM', class: 'bg-green-500/20 text-green-400 border-green-500/30', icon: 'fa-download' }
    };
    const cfg = configs[status] || configs.pending;
    els.statusBadge.className = `inline-flex items-center gap-2 px-4 py-2 rounded-full border ${cfg.class}`;
    els.statusBadge.innerHTML = `<span class="w-2 h-2 bg-current rounded-full ${status === 'pending' ? 'animate-pulse' : ''}"></span><span class="font-semibold text-sm"><i class="fa-solid ${cfg.icon} mr-1"></i>${cfg.text}</span>`;
}

function showSuccess(order) {
    els.paymentSection.classList.add('hidden');
    els.successSection.classList.remove('hidden');
    els.successName.textContent = order.buyer_name;
    els.successProduct.textContent = order.product_name;
    els.successQty.textContent = `${order.quantity}x ${order.product_icon}`;
    els.successIcon.textContent = order.product_icon;
    els.downloadLink.href = order.download_link || '#';
}

function resetOrder() {
    if (state.checkInterval) clearInterval(state.checkInterval);
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
    els.btnOrder.disabled = loading;
    els.btnOrder.innerHTML = loading 
        ? '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Memproses...'
        : '<i class="fa-solid fa-bolt"></i><span>ORDER SEKARANG</span>';
}

function showError(msg) {
    els.errorMessage.textContent = msg;
    els.errorToast.classList.remove('hidden', 'translate-y-full');
    setTimeout(hideError, 4000);
}

function hideError() {
    els.errorToast.classList.add('translate-y-full');
    setTimeout(() => els.errorToast.classList.add('hidden'), 300);
}

updateTotal();
