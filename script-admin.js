import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    initializeFirestore,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA5BXWwtk7LsDCXmjYhz5LOIv5tz6U1N_A",
    authDomain: "gracia-accesorios.firebaseapp.com",
    projectId: "gracia-accesorios",
    storageBucket: "gracia-accesorios.firebasestorage.app",
    messagingSenderId: "843057510032",
    appId: "1:843057510032:web:148405f256ffd62b5a8a15"
};

const URL_GOOGLE_DRIVE = "https://script.google.com/macros/s/AKfycbzNPWF6F7-ML2lMG597jR_3NO56Gs7gTt05K09-9HpS-xXqdjK8mT0JmUP3zc9bWbme/exec";

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

const form = document.getElementById("formPublicarJoya");
const fileInput = document.getElementById("j_foto");
const folderInput = document.getElementById("j_carpeta");
const btnFile = document.getElementById("btnSeleccionarFoto");
const btnFolder = document.getElementById("btnSeleccionarCarpeta");
const txtFileName = document.getElementById("textoNombreArchivo");
const previewGallery = document.getElementById("previewGallery");
const btnSubmit = document.getElementById("btnGuardar");
const btnCancelar = document.getElementById("btnCancelar");
const mensajeEstado = document.getElementById("mensajeEstado");
const listaInventario = document.getElementById("listaInventarioAdmin");
const selectCategoria = document.getElementById("j_categoria");
const btnToggleAdmCat = document.getElementById("btnToggleAdmCat");
const boxAdmCategorias = document.getElementById("boxAdmCategorias");
const inputNuevaCat = document.getElementById("nuevaCategoriaInput");
const btnAnadirCat = document.getElementById("btnAnadirCategoria");
const listaAdminCats = document.getElementById("listaAdminCategorias");

const kickerForm = document.getElementById("kickerForm");
const tituloForm = document.getElementById("tituloForm");
const subtituloForm = document.getElementById("subtituloForm");

let editandoId = null;
let productosCache = {};
let imagenExistenteUrl = "";
let categoriasColapsadas = {};
let archivosParaSubir = [];
let listaCategoriasRegistradas = []; // Almacena las categorías oficiales de Firebase
let listaProductosSnapshot = [];

btnFile.addEventListener("click", () => {
    folderInput.value = "";
    fileInput.value = "";
    fileInput.click();
});

btnFolder.addEventListener("click", () => {
    fileInput.value = "";
    folderInput.value = "";
    folderInput.click();
});

function procesarArchivos(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    archivosParaSubir = Array.from(files).filter(f => f.type.startsWith("image/"));
    actualizarVistaPrevia();
}

fileInput.addEventListener("change", procesarArchivos);
folderInput.addEventListener("change", procesarArchivos);

function actualizarVistaPrevia() {
    previewGallery.innerHTML = "";
    
    if (archivosParaSubir.length > 0) {
        txtFileName.textContent = `${archivosParaSubir.length} imagen(es) lista(s) para publicar`;
        
        archivosParaSubir.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const container = document.createElement("div");
                container.className = "preview-container";
                
                container.innerHTML = `
                    <img src="${e.target.result}" class="preview-thumb">
                    <button type="button" class="btn-remove-thumb" data-index="${index}" title="Quitar imagen">✕</button>
                `;
                
                previewGallery.appendChild(container);
            };
            reader.readAsDataURL(file);
        });
    } else {
        txtFileName.textContent = "No se ha seleccionado ningún archivo.";
    }
}

previewGallery.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-remove-thumb")) {
        const index = Number(e.target.dataset.index);
        archivosParaSubir.splice(index, 1);
        actualizarVistaPrevia();
    }
});

btnToggleAdmCat.addEventListener("click", () => {
    boxAdmCategorias.style.display = boxAdmCategorias.style.display === "none" || boxAdmCategorias.style.display === "" ? "block" : "none";
});

// --- GESTIÓN DE CATEGORÍAS EN TIEMPO REAL ---
onSnapshot(collection(db, "categories"), (snapshot) => {
    selectCategoria.innerHTML = '<option value="">Selecciona una categoría...</option>';
    listaAdminCats.innerHTML = "";
    listaCategoriasRegistradas = [];

    if (snapshot.empty) {
        listaAdminCats.innerHTML = `<p style="font-size:0.8rem; color:#a3a3a3; margin:0;">No hay categorías registradas.</p>";
        renderizarInventarioAgrupado();
        return;
    }

    snapshot.forEach((docSnap) => {
        const catData = docSnap.data();
        const catId = docSnap.id;
        const nombre = catData.nombre || "";
        const valor = nombre.trim();

        listaCategoriasRegistradas.push(valor.toUpperCase());

        const opt = document.createElement("option");
        opt.value = valor;
        opt.textContent = nombre;
        selectCategoria.appendChild(opt);

        const row = document.createElement("div");
        row.className = "category-row-item";
        row.innerHTML = `
            <span>${nombre}</span>
            <button class="btn-del-cat-row" data-id="${catId}" title="Eliminar categoría" type="button">✕</button>
        `;
        listaAdminCats.appendChild(row);
    });

    renderizarInventarioAgrupado();
});

btnAnadirCat.addEventListener("click", async () => {
    const nombreCat = inputNuevaCat.value.trim();
    if (!nombreCat) {
        alert("Por favor ingresa el nombre de la categoría.");
        return;
    }
    try {
        await addDoc(collection(db, "categories"), {
            nombre: nombreCat,
            creado: Date.now()
        });
        inputNuevaCat.value = "";
    } catch (err) {
        alert("Error al añadir la categoría: " + err.message);
    }
});

listaAdminCats.addEventListener("click", async (e) => {
    if (e.target.classList.contains("btn-del-cat-row") || e.target.closest(".btn-del-cat-row")) {
        const btn = e.target.classList.contains("btn-del-cat-row") ? e.target : e.target.closest(".btn-del-cat-row");
        const id = btn.dataset.id;
        if (confirm("¿Estás segura de que deseas eliminar esta categoría?")) {
            try {
                await deleteDoc(doc(db, "categories", id));
            } catch (err) {
                alert("No se pudo eliminar la categoría: " + err.message);
            }
        }
    }
});

// --- PREPARAR EDICIÓN ---
window.prepararEdicion = (id) => {
    const prod = productosCache[id];
    if (!prod) return;

    editandoId = id;
    document.getElementById("j_nombre").value = prod.nombre || "";
    document.getElementById("j_precio").value = prod.precio || "";
    selectCategoria.value = prod.categoria || "";
    document.getElementById("j_descripcion").value = prod.descripcion || "";
    
    imagenExistenteUrl = prod.imagenUrl || "";
    archivosParaSubir = [];

    previewGallery.innerHTML = "";
    if (imagenExistenteUrl) {
        const container = document.createElement("div");
        container.className = "preview-container";
        container.innerHTML = `<img src="${imagenExistenteUrl}" class="preview-thumb">`;
        previewGallery.appendChild(container);
    }

    txtFileName.textContent = "Modificando producto individual existente.";
    kickerForm.textContent = "MODIFICAR PRODUCTO";
    tituloForm.textContent = "Editar artículo";
    subtituloForm.textContent = `Actualizando los detalles del producto ID: ${id}`;
    btnSubmit.textContent = "Guardar cambios";
    btnCancelar.style.display = "block";

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

btnCancelar.addEventListener("click", () => {
    resetearFormulario();
});

function resetearFormulario() {
    editandoId = null;
    imagenExistenteUrl = "";
    archivosParaSubir = [];
    form.reset();
    fileInput.value = "";
    folderInput.value = "";
    previewGallery.innerHTML = "";
    txtFileName.textContent = "No se ha seleccionado ningún archivo.";
    kickerForm.textContent = "Nuevo Producto";
    tituloForm.textContent = "Publicar artículo";
    subtituloForm.textContent = "Ingresa los detalles, selecciona categoría y sube fotos individuales o una carpeta completa.";
    btnSubmit.textContent = "Subir a Google Drive y Publicar";
    btnCancelar.style.display = "none";
    mensajeEstado.textContent = "";
}

// --- PUBLICAR O EDITAR PRODUCTO ---
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!editandoId && archivosParaSubir.length === 0) {
        alert("Por favor selecciona al menos una foto o una carpeta antes de publicar.");
        return;
    }

    btnSubmit.disabled = true;
    mensajeEstado.style.color = "#d4af37";

    try {
        const nombreBase = document.getElementById("j_nombre").value.trim();
        const precio = Number(document.getElementById("j_precio").value);
        const categoriaSeleccionada = selectCategoria.value; 
        const descripcion = document.getElementById("j_descripcion").value.trim();

        if (editandoId) {
            let urlFinal = imagenExistenteUrl;

            if (archivosParaSubir.length > 0) {
                mensajeEstado.textContent = "Subiendo nueva imagen a Google Drive...";
                const file = archivosParaSubir[0];
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(file);
                });

                const res = await fetch(URL_GOOGLE_DRIVE, {
                    method: "POST",
                    body: JSON.stringify({
                        file: base64,
                        filename: `JOYERIA_${Date.now()}_${file.name}`
                    })
                });
                
                const dataDrive = await res.json();
                if (dataDrive.status !== "success") {
                    throw new Error(dataDrive.message || "Error al subir la imagen a Drive.");
                }
                urlFinal = dataDrive.url;
            }

            mensajeEstado.textContent = "Actualizando datos en Firebase...";
            await updateDoc(doc(db, "jewelry", editandoId), {
                nombre: nombreBase,
                precio: precio,
                categoria: categoriaSeleccionada,
                descripcion: descripcion,
                imagenUrl: urlFinal,
                actualizado: Date.now()
            });

            mensajeEstado.style.color = "#16a34a";
            mensajeEstado.textContent = "¡Producto actualizado con éxito!";
        } else {
            let creados = 0;

            for (let i = 0; i < archivosParaSubir.length; i++) {
                const file = archivosParaSubir[i];
                mensajeEstado.textContent = `Subiendo imagen ${i + 1} de ${archivosParaSubir.length} a Google Drive...`;

                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(file);
                });

                const res = await fetch(URL_GOOGLE_DRIVE, {
                    method: "POST",
                    body: JSON.stringify({
                        file: base64,
                        filename: `JOYERIA_${Date.now()}_${file.name}`
                    })
                });
                
                const dataDrive = await res.json();
                if (dataDrive.status !== "success") {
                    console.error(`Error al subir ${file.name}`);
                    continue;
                }

                await addDoc(collection(db, "jewelry"), {
                    nombre: nombreBase,
                    precio: precio,
                    categoria: categoriaSeleccionada,
                    descripcion: descripcion,
                    imagenUrl: dataDrive.url,
                    creado: Date.now() + i
                });

                creados++;
            }

            mensajeEstado.style.color = "#16a34a";
            mensajeEstado.textContent = `¡Se publicaron ${creados} producto(s) de forma individual con éxito!`;
        }

        resetearFormulario();
    } catch (err) {
        console.error(err);
        mensajeEstado.style.color = "#dc2626";
        mensajeEstado.textContent = "Error: " + err.message;
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = editandoId ? "Guardar cambios" : "Subir a Google Drive y Publicar";
    }
});

// --- LISTAR Y GESTIONAR INVENTARIO AGRUPADO ---
window.toggleCategoriaColapsar = (catNombre) => {
    categoriasColapsadas[catNombre] = !categoriasColapsadas[catNombre];
    renderizarInventarioAgrupado();
};

const q = query(collection(db, "jewelry"), orderBy("creado", "desc"));
onSnapshot(q, (snapshot) => {
    listaProductosSnapshot = [];
    productosCache = {};

    snapshot.forEach((documento) => {
        const item = documento.data();
        const id = documento.id;
        productosCache[id] = { id, ...item };
        listaProductosSnapshot.push({ id, ...item });
    });

    renderizarInventarioAgrupado();
});

function renderizarInventarioAgrupado() {
    listaInventario.innerHTML = "";

    if (listaCategoriasRegistradas.length === 0 && listaProductosSnapshot.length === 0) {
        listaInventario.innerHTML = "<p style='color:#a3a3a3; grid-column: 1 / -1;'>No hay categorías ni productos registrados aún.</p>";
        return;
    }

    let porCategoria = {};

    // 1. Inicializar TODAS las categorías oficiales creadas en Firebase (para que nunca desaparezcan)
    listaCategoriasRegistradas.forEach(cat => {
        porCategoria[cat] = [];
    });

    // 2. Colocar cada producto en su categoría correspondiente
    listaProductosSnapshot.forEach(item => {
        let cat = item.categoria ? item.categoria.trim().toUpperCase() : "SIN CATEGORÍA";
        if (!porCategoria[cat]) {
            porCategoria[cat] = [];
        }
        porCategoria[cat].push(item);
    });

    // 3. Renderizar cada categoría en pantalla
    for (const [cat, productos] of Object.entries(porCategoria)) {
        const estaColapsada = !!categoriasColapsadas[cat];
        const flecha = estaColapsada ? "▶" : "▼";
        const estiloDisplay = estaColapsada ? "display: none;" : "display: grid;";

        const seccionCat = document.createElement("div");
        seccionCat.style.cssText = "grid-column: 1 / -1; background: #141414; border: 1px solid #262626; border-radius: 12px; padding: 16px; margin-bottom: 16px;";
        
        seccionCat.innerHTML = `
            <div onclick="toggleCategoriaColapsar('${cat}')" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                <h3 style="margin: 0; font-size: 1.1rem; color: #d4af37; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 0.9rem;">${flecha}</span> 
                    📁 ${cat} (${productos.length} productos)
                </h3>
            </div>
            <div id="grid-cat-${cat}" style="${estiloDisplay} grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin-top: 14px;">
            </div>
        `;

        const gridProductos = seccionCat.querySelector(`#grid-cat-${cat}`);

        if (productos.length === 0) {
            gridProductos.style.display = "block";
            gridProductos.innerHTML = `<p style="color: #737373; font-size: 0.85rem; margin: 0;">No hay productos en esta categoría.</p>`;
        } else {
            productos.forEach(item => {
                const card = document.createElement("div");
                card.className = "product-item";
                card.innerHTML = `
                    <div>
                        <img src="${item.imagenUrl || ''}" alt="${item.nombre}" loading="lazy">
                        <h4 style="margin: 8px 0 2px 0; color: #fff;">${item.nombre}</h4>
                        <p style="margin: 0; color: #d4af37; font-weight: 700;">₡${(item.precio || 0).toLocaleString()}</p>
                        <small style="color: #a3a3a3; text-transform: uppercase;">${item.categoria}</small>
                    </div>
                    <div class="product-actions">
                        <button class="btn-edit" onclick="prepararEdicion('${item.id}')" type="button">✏️ Editar</button>
                        <button class="btn-delete" data-id="${item.id}" type="button">🗑 Eliminar</button>
                    </div>
                `;
                gridProductos.appendChild(card);
            });
        }

        listaInventario.appendChild(seccionCat);
    }
}

listaInventario.addEventListener("click", async (e) => {
    if (e.target.classList.contains("btn-delete")) {
        const id = e.target.dataset.id;
        if (confirm("¿Estás segura de que deseas eliminar este producto?")) {
            try {
                await deleteDoc(doc(db, "jewelry", id));
                if (editandoId === id) resetearFormulario();
            } catch (err) {
                alert("No se pudo eliminar: " + err.message);
            }
        }
    }
});
