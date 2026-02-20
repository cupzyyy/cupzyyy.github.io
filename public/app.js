// =============================================
// FRONTEND JAVASCRIPT - AUTO ORDER PAKASIR
// VERCEL COMPATIBLE VERSION
// =============================================

// State Management
let products = [];
let selectedProduct = null;
let currentOrder = null;
let checkInterval = null;

// DOM Elements
const productsContainer = document.getElementById('productsContainer');
const selectedProductDisplay = document.getElementById('selectedProductDisplay');
const customerName = document.getElementById('customerName');
const customerWhatsapp = document.getElementById('customerWhatsapp');
const customerEmail = document.getElementById('customerEmail');
const quantity = document.getElementById('quantity');
const totalPrice = document.getElementById('totalPrice');
const orderButton = document.getElementById('orderButton');
const paymentSection = document.getElementById('paymentSection');
const qrisLoading = document.getElementById('qrisLoading');
const qrisImage = document.getElementById('qrisImage');
const qrcanvas = document.getElementById('qrcanvas');
const paymentTotal = document.getElementById('paymentTotal');
const paymentStatus = document.getElementById('paymentStatus');
const orderId = document.getElementById('orderId');
const expiredTime = document.getElementById('expiredTime');
const deliveryInfo = document.getElementById('deliveryInfo');
const downloadLinkContainer = document.getElementById('downloadLinkContainer');
const deliveryMessage = document.getElementById('deliveryMessage');
const deliveryCode = document.getElementById('deliveryCode');
const toast = document.getElementById('toast');

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Auto Order System Initialized (Vercel Edition)');
    
    // Load products from API
    loadProducts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for existing order in session storage
    const savedOrder = sessionStorage.getItem('currentOrder');
    if (savedOrder) {
        try {
            currentOrder = JSON.parse(savedOrder);
            if (currentOrder && currentOrder.order_id) {
                restoreOrderSession();
            }
        } catch (e) {
            console.error('Failed to parse saved order:', e);
            sessionStorage.removeItem('currentOrder');
        }
    }
});

// =============================================
// EVENT LISTENERS SETUP
// =============================================
function setupEventListeners() {
    // Quantity change
    quantity.addEventListener('input', () => {
        updateTotalPrice();
        validateForm();
    });
    
    // Input validation
    customerName.addEventListener('input', validateForm);
    customerWhatsapp.addEventListener('input', validateForm);
    customerEmail.addEventListener('input', validateForm);
    
    // Order button
    orderButton.addEventListener('click', createOrder);
    
    // Prevent form submission on enter
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
}

// =============================================
// LOAD PRODUCTS FROM API
// =============================================
async function loadProducts() {
    try {
        showToast('Memuat produk...', 'info');
        
        const response = await fetch('/api/products', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.ok && data.products) {
            products = data.products;
            renderProducts();
            showToast('Produk berhasil dimuat', 'success');
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        
        // Fallback products jika API gagal
        products = [
            {
                id: 'body-hs-100',
                name: 'BODY HS 100%',
                description: 'Work di semua device',
                price: 15000,
                icon: '💪'
            },
            {
                id: 'headlock-97',
                name: 'HEADLOCK 97%',
                description: 'Work di semua device',
                price: 10000,
                icon: '🔒'
            }
        ];
        
        renderProducts();
        showToast('Gagal memuat produk dari server, menggunakan data lokal', 'error');
    }
}

// =============================================
// RENDER PRODUCTS GRID
// =============================================
function renderProducts() {
    if (!products || products.length === 0) {
        productsContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-box-open text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">Tidak ada produk tersedia</p>
                <button onclick="loadProducts()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <i class="fas fa-sync-alt mr-2"></i>Muat Ulang
                </button>
            </div>
        `;
        return;
    }

    productsContainer.innerHTML = products.map(product => `
        <div class="product-card bg-white rounded-xl shadow-md p-6 
                    ${selectedProduct?.id === product.id ? 'selected border-blue-500 border-2' : 'border-2 border-transparent'}"
             onclick="selectProduct('${product.id}')">
            <div class="text-5xl mb-4">${product.icon || '📦'}</div>
            <h3 class="font-bold text-xl mb-2">${product.name}</h3>
            <p class="text-gray-600 mb-4 text-sm">${product.description}</p>
            <div class="flex justify-between items-center">
                <span class="text-blue-600 font-bold text-lg">${formatRupiah(product.price)}</span>
                <span class="text-xs bg-gray-100 px-3 py-1 rounded-full">
                    <i class="fas fa-check-circle text-green-500 mr-1"></i>
                    Ready
                </span>
            </div>
        </div>
    `).join('');
}

// =============================================
// SELECT PRODUCT
// =============================================
window.selectProduct = function(productId) {
    selectedProduct = products.find(p => p.id === productId);
    
    // Re-render products to show selection
    renderProducts();
    
    // Update selected product display
    if (selectedProduct) {
        selectedProductDisplay.innerHTML = `
            <div class="flex items-center">
                <div class="text-4xl mr-4 bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center">
                    ${selectedProduct.icon || '📦'}
                </div>
                <div>
                    <div class="font-bold text-lg text-gray-800">${selectedProduct.name}</div>
                    <div class="text-blue-600 font-bold text-xl">${formatRupiah(selectedProduct.price)}</div>
                    <div class="text-xs text-gray-500 mt-1">${selectedProduct.description}</div>
                </div>
            </div>
        `;
    }
    
    updateTotalPrice();
    validateForm();
    
    // Scroll to form
    document.querySelector('.order-form-section').scrollIntoView({ behavior: 'smooth' });
};

// =============================================
// UPDATE TOTAL PRICE
// =============================================
function updateTotalPrice() {
    if (!selectedProduct) {
        totalPrice.innerHTML = 'Rp 0';
        return;
    }
    
    const qty = parseInt(quantity.value) || 1;
    const total = selectedProduct.price * qty;
    totalPrice.innerHTML = formatRupiah(total);
}

// =============================================
// VALIDATE FORM
// =============================================
function validateForm() {
    const name = customerName.value.trim();
    const wa = customerWhatsapp.value.trim();
    const email = customerEmail.value.trim();
    const qty = parseInt(quantity.value) || 0;
    
    // Validasi nama (minimal 3 karakter)
    const isNameValid = name.length >= 3;
    
    // Validasi WhatsApp (minimal 10 digit, hanya angka)
    const isWaValid = wa.length >= 10 && /^\d+$/.test(wa.replace(/\D/g, ''));
    
    // Validasi email
    const isEmailValid = isValidEmail(email);
    
    // Validasi quantity
    const isQtyValid = qty >= 1 && qty <= 99;
    
    // Validasi produk dipilih
    const isProductValid = selectedProduct !== null;
    
    // Update UI untuk validasi
    document.getElementById('customerName').classList.toggle('border-red-500', !isNameValid && name.length > 0);
    document.getElementById('customerWhatsapp').classList.toggle('border-red-500', !isWaValid && wa.length > 0);
    document.getElementById('customerEmail').classList.toggle('border-red-500', !isEmailValid && email.length > 0);
    document.getElementById('quantity').classList.toggle('border-red-500', !isQtyValid);
    
    const isValid = isNameValid && isWaValid && isEmailValid && isQtyValid && isProductValid;
    
    orderButton.disabled = !isValid;
    
    // Update button tooltip
    if (!isValid) {
        let message = 'Lengkapi data:';
        if (!isProductValid) message += ' Pilih produk,';
        if (!isNameValid) message += ' Nama min 3 karakter,';
        if (!isWaValid) message += ' No WA valid,';
        if (!isEmailValid) message += ' Email valid,';
        if (!isQtyValid) message += ' Jumlah 1-99,';
        
        orderButton.title = message.slice(0, -1);
    } else {
        orderButton.title = 'Klik untuk order';
    }
    
    return isValid;
}

// =============================================
// CREATE ORDER
// =============================================
async function createOrder() {
    if (!validateForm()) {
        showToast('Lengkapi semua data dengan benar', 'error');
        return;
    }
    
    // Show loading state
    const originalText = orderButton.innerHTML;
    orderButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Memproses Order...';
    orderButton.disabled = true;
    
    try {
        const orderData = {
            product_id: selectedProduct.id,
            buyer_email: customerEmail.value.trim(),
            buyer_name: customerName.value.trim(),
            quantity: parseInt(quantity.value)
        };
        
        console.log('Sending order:', orderData);
        
        const response = await fetch('/api/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Order response:', data);
        
        if (data.ok) {
            // Save to session storage
            currentOrder = data;
            sessionStorage.setItem('currentOrder', JSON.stringify(data));
            
            // Show payment section
            paymentSection.style.display = 'block';
            
            // Scroll to payment section
            setTimeout(() => {
                paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            
            // Display QRIS
            displayQRIS(data);
            
            // Start checking payment status
            startPaymentCheck(data.order_id);
            
            showToast('Order berhasil dibuat! Silakan scan QRIS', 'success');
        } else {
            showToast(data.error || 'Gagal membuat order', 'error');
        }
    } catch (error) {
        console.error('Create order error:', error);
        showToast('Terjadi kesalahan jaringan. Coba lagi.', 'error');
    } finally {
        orderButton.innerHTML = originalText;
        orderButton.disabled = false;
    }
}

// =============================================
// DISPLAY QRIS
// =============================================
function displayQRIS(data) {
    // Hide loading, show QRIS
    qrisLoading.style.display = 'none';
    qrisImage.style.display = 'block';
    
    // Generate QR code
    QRCode.toCanvas(qrcanvas, data.qris, {
        width: 250,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, function(error) {
        if (error) {
            console.error('QR Code error:', error);
            showToast('Gagal generate QRIS', 'error');
            
            // Fallback: tampilkan text QRIS
            qrisImage.innerHTML = `
                <div class="bg-gray-100 p-4 rounded-lg">
                    <p class="text-sm font-mono break-all">${data.qris}</p>
                    <p class="text-xs text-gray-500 mt-2">Scan QRIS di atas dengan aplikasi pembayaran</p>
                </div>
            `;
        }
    });
    
    // Update payment info
    paymentTotal.innerHTML = formatRupiah(data.total_payment || data.total_amount);
    orderId.innerHTML = data.order_id;
    
    if (data.expired_at) {
        const expDate = new Date(data.expired_at);
        expiredTime.innerHTML = `<i class="far fa-clock mr-1"></i>Exp: ${expDate.toLocaleString('id-ID')}`;
    } else {
        // Set default expired 24 jam
        const expDate = new Date();
        expDate.setHours(expDate.getHours() + 24);
        expiredTime.innerHTML = `<i class="far fa-clock mr-1"></i>Exp: ${expDate.toLocaleString('id-ID')}`;
    }
}

// =============================================
// START PAYMENT CHECK
// =============================================
function startPaymentCheck(orderId) {
    // Clear existing interval
    if (checkInterval) {
        clearInterval(checkInterval);
    }
    
    let checkCount = 0;
    const MAX_CHECKS = 120; // 5 detik * 120 = 10 menit
    
    // Update status
    updatePaymentStatus('pending');
    
    checkInterval = setInterval(async () => {
        checkCount++;
        
        try {
            const response = await fetch('/api/check-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ order_id: orderId })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.ok) {
                handleStatusUpdate(data);
            }
            
            // Stop checking if max checks reached
            if (checkCount >= MAX_CHECKS) {
                console.log('Max checks reached, stopping...');
                clearInterval(checkInterval);
                checkInterval = null;
                showToast('Waktu pemeriksaan habis, refresh halaman', 'info');
            }
            
        } catch (error) {
            console.error('Check status error:', error);
            
            // Still show pending on error
            if (checkCount % 6 === 0) { // Tampilkan pesan setiap 30 detik
                showToast('Menunggu pembayaran...', 'info');
            }
        }
    }, 5000); // Cek setiap 5 detik
}

// =============================================
// HANDLE STATUS UPDATE
// =============================================
function handleStatusUpdate(data) {
    const status = data.status;
    const order = data.order;
    
    console.log('Status update:', status, order);
    
    // Update status badge
    updatePaymentStatus(status);
    
    // Handle different statuses
    if (status === 'delivered') {
        // Payment success and delivered
        paymentStatus.innerHTML = `
            <i class="fas fa-check-circle mr-1"></i>
            PEMBAYARAN BERHASIL
        `;
        paymentStatus.className = 'status-badge status-delivered';
        
        // Hide QRIS, show success
        qrisImage.style.display = 'none';
        qrisLoading.style.display = 'block';
        qrisLoading.innerHTML = `
            <div class="py-4">
                <i class="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
                <p class="text-green-600 font-bold text-xl mb-2">PEMBAYARAN BERHASIL!</p>
                <p class="text-gray-600 mb-4">Produk siap diunduh</p>
            </div>
        `;
        
        // Show download link
        if (order && order.download_link) {
            deliveryInfo.style.display = 'block';
            
            downloadLinkContainer.innerHTML = `
                <a href="${order.download_link}" target="_blank" 
                   class="download-link inline-block w-full py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 
                          text-white font-bold rounded-lg hover:from-green-600 hover:to-green-700 
                          transition-all transform hover:scale-105 shadow-lg">
                    <i class="fas fa-download mr-2"></i>
                    DOWNLOAD PRODUK
                </a>
            `;
            
            deliveryMessage.innerHTML = order.delivery_message || 
                'Terima kasih telah berbelanja! Klik tombol di atas untuk mengunduh produk.';
            deliveryCode.innerHTML = order.delivery_code || '-';
        }
        
        // Stop checking
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
        
        // Show success animation
        showSuccessAnimation();
        
        // Clear session
        sessionStorage.removeItem('currentOrder');
        
        showToast('Pembayaran berhasil! Produk siap diunduh', 'success');
    }
    else if (status === 'paid') {
        paymentStatus.innerHTML = `
            <i class="fas fa-spinner fa-spin mr-1"></i>
            VERIFYING PAYMENT
        `;
        paymentStatus.className = 'status-badge status-paid';
    }
    else if (['expired', 'failed', 'cancelled'].includes(status)) {
        paymentStatus.innerHTML = `
            <i class="fas fa-times-circle mr-1"></i>
            ${status.toUpperCase()}
        `;
        paymentStatus.className = 'status-badge status-expired';
        
        // Stop checking
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
        
        // Show retry button
        qrisImage.innerHTML = `
            <div class="py-8">
                <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                <p class="text-red-600 font-bold mb-4">Pembayaran ${status}</p>
                <button onclick="window.location.reload()" 
                        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <i class="fas fa-sync-alt mr-2"></i>
                    Buat Order Baru
                </button>
            </div>
        `;
        
        showToast(`Pembayaran ${status}`, 'error');
        sessionStorage.removeItem('currentOrder');
    }
}

// =============================================
// UPDATE PAYMENT STATUS
// =============================================
function updatePaymentStatus(status) {
    switch(status) {
        case 'pending':
            paymentStatus.innerHTML = `
                <i class="fas fa-hourglass-half mr-1"></i>
                MENUNGGU PEMBAYARAN
            `;
            paymentStatus.className = 'status-badge status-pending';
            break;
            
        case 'paid':
            paymentStatus.innerHTML = `
                <i class="fas fa-spinner fa-spin mr-1"></i>
                VERIFYING
            `;
            paymentStatus.className = 'status-badge status-paid';
            break;
            
        case 'delivered':
            paymentStatus.innerHTML = `
                <i class="fas fa-check-circle mr-1"></i>
                SUCCESS
            `;
            paymentStatus.className = 'status-badge status-delivered';
            break;
            
        case 'expired':
        case 'failed':
        case 'cancelled':
            paymentStatus.innerHTML = `
                <i class="fas fa-times-circle mr-1"></i>
                ${status.toUpperCase()}
            `;
            paymentStatus.className = 'status-badge status-expired';
            break;
            
        default:
            paymentStatus.innerHTML = `
                <i class="fas fa-hourglass-half mr-1"></i>
                ${status.toUpperCase()}
            `;
            paymentStatus.className = 'status-badge status-pending';
    }
}

// =============================================
// RESTORE ORDER SESSION
// =============================================
function restoreOrderSession() {
    if (currentOrder && currentOrder.order_id) {
        console.log('Restoring order session:', currentOrder.order_id);
        
        // Show payment section
        paymentSection.style.display = 'block';
        
        // Display QRIS
        displayQRIS(currentOrder);
        
        // Start checking
        startPaymentCheck(currentOrder.order_id);
        
        showToast('Melanjutkan order sebelumnya', 'info');
    }
}

// =============================================
// SHOW SUCCESS ANIMATION
// =============================================
function showSuccessAnimation() {
    // Create confetti effect
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.innerHTML = '🎉';
            confetti.style.position = 'fixed';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-20px';
            confetti.style.fontSize = (Math.random() * 20 + 20) + 'px';
            confetti.style.zIndex = '9999';
            confetti.style.pointerEvents = 'none';
            confetti.style.animation = `confettiFall ${Math.random() * 3 + 2}s linear`;
            confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }, i * 50);
    }
}

// =============================================
// SHOW TOAST NOTIFICATION
// =============================================
function showToast(message, type = 'info') {
    toast.innerHTML = message;
    toast.classList.add('show');
    
    // Set color based on type
    switch(type) {
        case 'success':
            toast.style.backgroundColor = '#10b981';
            break;
        case 'error':
            toast.style.backgroundColor = '#ef4444';
            break;
        case 'warning':
            toast.style.backgroundColor = '#f59e0b';
            break;
        default:
            toast.style.backgroundColor = '#3b82f6';
    }
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Format number to Rupiah
 */
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount).replace('IDR', 'Rp');
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Format WhatsApp number (remove non-digits)
 */
function formatWhatsApp(number) {
    return number.replace(/\D/g, '');
}

// =============================================
// ADD ANIMATION STYLES
// =============================================
const style = document.createElement('style');
style.innerHTML = `
    @keyframes confettiFall {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }
    
    .product-card {
        transition: all 0.3s ease;
    }
    
    .product-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
    }
    
    .status-badge {
        transition: all 0.3s ease;
    }
    
    .download-link {
        transition: all 0.3s ease;
    }
    
    .toast {
        transition: all 0.3s ease;
    }
`;
document.head.appendChild(style);

// =============================================
// EXPOSE FUNCTIONS TO WINDOW
// =============================================
window.selectProduct = selectProduct;
window.loadProducts = loadProducts;

console.log('✅ App.js loaded successfully (Vercel Edition)');