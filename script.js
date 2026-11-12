let data = null, filterAktif = 'semua', kataKunci = '', halaman = 1;
const perHalaman = 8; // 4 Kolom x 2 Baris

const rupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

async function init() {
    try {
        const res = await fetch('https://cdn.jsdelivr.net/gh/intercatur/ayutuku@main/data.json');
        data = await res.json();
        
        document.getElementById('toko-nama').innerText = data.toko.nama;
        document.getElementById('toko-desc').innerText = data.toko.deskripsi;
        document.title = data.toko.nama + " | " + data.toko.deskripsi;

        if (data.footer) {
            document.getElementById('footer-kontak').innerHTML = data.footer.kontak || '';
            document.getElementById('footer-alamat').innerText = data.footer.alamat || '';
            document.getElementById('footer-copyright').innerHTML = data.footer.copyright || '';
        }

        renderFilter();
        proses();
        renderTestimoni();

        prosesHash();

    } catch (err) {
        console.error(err);
        document.getElementById('katalog').innerHTML = '<p style="width:100%;text-align:center;color:red;padding:20px;">Gagal memuat data.json. Pastikan file berada di folder yang sama.</p>';
    }
}

function renderTestimoni() {
    const container = document.getElementById('testimoni-container');
    if (!data.testimoni || data.testimoni.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#64748b;">Belum ada testimoni.</p>';
        return;
    }

    let html = '';
    data.testimoni.forEach(t => {
        const bintang = '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating);
        
        html += `
            <div class="testimoni-card">
                <div class="testimoni-header">
                    <div class="testimoni-nama">${t.nama}</div>
                    <div class="testimoni-rating">${bintang}</div>
                </div>
                <div class="testimoni-pesan">"${t.pesan}"</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function prosesHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        const id = parseInt(hash);
        if (!isNaN(id)) {
            tampilkanModal(id); 
        }
    } else {
        tutupModal(true);
    }
}

window.addEventListener('hashchange', prosesHash);

function renderFilter() {
    let html = `<button class="btn-filter ${filterAktif==='semua'?'active':''}" onclick="setFilter('semua')">Semua Produk</button>`;
    data.kategori.forEach(k => {
        html += `<button class="btn-filter ${filterAktif===k.id?'active':''}" onclick="setFilter('${k.id}')">${k.nama}</button>`;
    });
    document.getElementById('filter').innerHTML = html;
}

function setFilter(id) { filterAktif = id; halaman = 1; renderFilter(); proses(); }
function cariProduk() { kataKunci = document.getElementById('search').value.toLowerCase(); halaman = 1; proses(); }

function proses() {
    let hasil = data.produk.filter(p => (filterAktif === 'semua' || p.kategori_id === filterAktif) && p.nama.toLowerCase().includes(kataKunci));
    
    const totalHalaman = Math.ceil(hasil.length / perHalaman) || 1;
    if (halaman > totalHalaman) halaman = totalHalaman;

    const tampil = hasil.slice((halaman - 1) * perHalaman, halaman * perHalaman);

    let html = tampil.length ? '' : '<p style="width:100%;text-align:center;color:#64748b;padding:20px;">Produk tidak ditemukan.</p>';
    tampil.forEach(p => {
        const habis = p.detail.stok <= 0;
        html += `
        <div class="product-card ${habis ? 'out-of-stock' : ''}" onclick="bukaModal(${p.id})">
            ${habis ? '<div class="badge-out-of-stock">Stok Habis</div>' : ''}
            <img src="${p.gambar}" class="product-image" loading="lazy" alt="${p.nama}">
            <div class="product-info">
                <div class="product-title">${p.nama}</div>
                <div class="product-desc">${p.deskripsi_singkat}</div>
                <div class="product-price">${rupiah(p.harga)}</div>
            </div>
        </div>`;
    });
    document.getElementById('katalog').innerHTML = html;

    let pHTML = '';
    if (totalHalaman > 1) {
        pHTML += `<button class="page-btn" onclick="ubahHalaman(${halaman-1})" ${halaman===1?'disabled':''}>&lt;</button>`;
        for (let i = 1; i <= totalHalaman; i++) {
            pHTML += `<button class="page-btn ${i===halaman?'active':''}" onclick="ubahHalaman(${i})">${i}</button>`;
        }
        pHTML += `<button class="page-btn" onclick="ubahHalaman(${halaman+1})" ${halaman===totalHalaman?'disabled':''}>&gt;</button>`;
    }
    document.getElementById('pagination').innerHTML = pHTML;
}

function ubahHalaman(num) { 
    halaman = num; 
    proses(); 
    window.scrollTo({top: 0, behavior: 'smooth'}); 
}

function bukaModal(id) {
    window.location.hash = id;
}

function tampilkanModal(id) {
    const p = data.produk.find(x => x.id === id);
    if (!p) return;

    const habis = p.detail.stok <= 0;

    document.getElementById('modal-img').src = p.gambar;
    document.getElementById('modal-title').innerText = p.nama;
    document.getElementById('modal-price').innerText = rupiah(p.harga);
    document.getElementById('modal-desc').innerText = p.deskripsi_singkat;

    let dHTML = '';
    for (const [k, v] of Object.entries(p.detail)) {
        let val = Array.isArray(v) ? v.join(', ') : v;
        if (k === 'stok' && habis) val = `<span style="color:#dc2626">Habis (0)</span>`;
        dHTML += `<tr><th>${k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th><td>${val}</td></tr>`;
    }
    document.getElementById('modal-detail').innerHTML = dHTML;

    const btn = document.getElementById('modal-wa');
    if (habis) {
        btn.className = 'btn-whatsapp btn-disabled'; btn.innerText = 'Stok Habis'; btn.removeAttribute('href');
    } else {
        btn.className = 'btn-whatsapp'; btn.innerText = 'Beli via WhatsApp';
        
        const productLink = window.location.href;
        const waText = 
            `${productLink}\n` +
            `${p.nama}\n` +
            `${rupiah(p.harga)}\n\n` +
            `Halo, saya mau pesan produk di atas.`;
        
        btn.href = `https://wa.me/${data.toko.wa_number}?text=${encodeURIComponent(waText)}`;
    }

    document.getElementById('modal').classList.add('active');
    document.body.classList.add('modal-open');
}

function tutupModal(dariHash = false) { 
    document.getElementById('modal').classList.remove('active'); 
    document.body.classList.remove('modal-open');

    if (!dariHash) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
}

init();
