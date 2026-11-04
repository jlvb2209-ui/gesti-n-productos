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
const btnFile = document.getElementById("btnSeleccionarFoto");
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

btnFile.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
    previewGallery.innerHTML = "";
    const archivos = Array.from(fileInput.files).filter(f => f.type.startsWith("image/"));
    
    if (archivos.length > 0) {
        txtFileName.textContent = `${archivos.length} imagen(es) seleccionada(s)`;
        
        archivos.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement("img");
                img.src = e.target.result;
                img.className = "preview-thumb";
                previewGallery.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    } else {
        txtFileName.textContent = "No se ha seleccionado ningún archivo.";
    }
});

btnToggleAdmCat.addEventListener("click", () => {
    boxAdmCategorias.style.display = boxAdmCategorias.style.display === "none" || boxAdmCategorias.style.display === "" ? "block" : "none";
});

// --- GESTIÓN DE CATEGORÍAS EN TIEMPO REAL ---
onSnapshot(collection(db, "categories"), (snapshot) => {
    selectCategoria.innerHTML = '<option value="">Selecciona una categoría...</option>';
    listaAdminCats.innerHTML = "";
    if (snapshot.empty) {
        listaAdminCats.innerHTML = `<p style="font-size:0.8rem; color:#a3a3a3; margin:0;">No hay categorías registradas.</p>`;
        return;
    }
    snapshot.forEach((docSnap) => {
        const catData = docSnap.data();
        const catId = docSnap.id;
        const nombre = catData.nombre || "";
        const valor = nombre.trim().toLowerCase();

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

// --- PREPARAR EDICIÓN (SOLO UN PRODUCTO INDIVIDUAL) ---
window.prepararEdicion = (id) => {
    const prod = productosCache[id];
    if (!prod) return;

    editandoId = id;
    document.getElementById("j_nombre").value = prod.nombre || "";
    document.getElementById("j_precio").value = prod.precio || "";
    selectCategoria.value = prod.categoria || "";
    document.getElementById("j_descripcion").value = prod.descripcion || "";
    
    imagenExistenteUrl = prod.imagenUrl || "";

    previewGallery.innerHTML = "";
    if (imagenExistenteUrl) {
        const img = document.createElement("img");
        img.src = imagenExistenteUrl;
        img.className = "preview-thumb";
        previewGallery.appendChild(img);
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
    form.reset();
    fileInput.value = "";
    previewGallery.innerHTML = "";
    txtFileName.textContent = "No se ha seleccionado ningún archivo.";
    kickerForm.textContent = "Nuevo Producto";
    tituloForm.textContent = "Publicar artículo";
    subtituloForm.textContent = "Ingresa los detalles, selecciona categoría y sube una o varias fotos (o carpetas) a Google Drive.";
    btnSubmit.textContent = "Subir a Google Drive y Publicar";
    btnCancelar.style.display = "none";
    mensajeEstado.textContent = "";
}

// --- PUBLICAR CADA IMAGEN COMO UN PRODUCTO INDIVIDUAL O EDITAR ---
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const archivos = Array.from(fileInput.files).filter(f => f.type.startsWith("image/"));

    if (!editandoId && archivos.length === 0) {
        alert("Por favor selecciona al menos una imagen o carpeta.");
        return;
    }

    btnSubmit.disabled = true;
    mensajeEstado.style.color = "#d4af37";

    try {
        const nombreBase = document.getElementById("j_nombre").value.trim();
        const precio = Number(document.getElementById("j_precio").value);
        const categoria = selectCategoria.value;
        const descripcion = document.getElementById("j_descripcion").value.trim();

        if (editandoId) {
            // MODO EDICIÓN: Se actualiza únicamente el producto seleccionado
            let urlFinal = imagenExistenteUrl;

            if (archivos.length > 0) {
                mensajeEstado.textContent = "Subiendo nueva imagen a Google Drive...";
                const file = archivos[0];
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
                    throw new Error(dataDrive.message || "Error al subir la imagen.");
                }
                urlFinal = dataDrive.url;
            }

            mensajeEstado.textContent = "Actualizando datos en Firebase...";
            await updateDoc(doc(db, "jewelry", editandoId), {
                nombre: nombreBase,
                precio: precio,
                categoria: categoria,
                descripcion: descripcion,
                imagenUrl: urlFinal,
                actualizado: Date.now()
            });

            mensajeEstado.style.color = "#16a34a";
            mensajeEstado.textContent = "¡Producto actualizado con éxito!";
        } else {
            // MODO CREACIÓN MÚLTIPLE: Se crea UN PRODUCTO INDIVIDUAL por cada imagen seleccionada
            let creados = 0;

            for (let i = 0; i < archivos.length; i++) {
                const file = archivos[i];
                mensajeEstado.textContent = `Procesando imagen ${i + 1} de ${archivos.length}...`;

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

                // Guardar como producto independiente
                await addDoc(collection(db, "jewelry"), {
                    nombre: archivos.length > 1 ? `${nombreBase} (${i + 1})` : nombreBase,
                    precio: precio,
                    categoria: categoria,
                    descripcion: descripcion,
                    imagenUrl: dataDrive.url,
                    creado: Date.now() + i // Offset de tiempo para mantener el orden
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

// --- LISTAR Y GESTIONAR INVENTARIO (CADAPRODUCTO SE MUESTRA EN SU PROPIO CUADRITO) ---
const q = query(collection(db, "jewelry"), orderBy("creado", "desc"));
onSnapshot(q, (snapshot) => {
    listaInventario.innerHTML = "";
    productosCache = {};

    if (snapshot.empty) {
        listaInventario.innerHTML = "<p style='color:#a3a3a3; grid-column: 1 / -1;'>No hay productos registrados aún.</p>";
        return;
    }

    snapshot.forEach((documento) => {
        const item = documento.data();
        const id = documento.id;
        productosCache[id] = { id, ...item };

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
                <button class="btn-edit" onclick="prepararEdicion('${id}')" type="button">✏️ Editar</button>
                <button class="btn-delete" data-id="${id}" type="button">🗑 Eliminar</button>
            </div>
        `;
        listaInventario.appendChild(card);
    });
});

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
