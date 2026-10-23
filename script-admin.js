import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    initializeFirestore,
    collection,
    addDoc,
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
const btnSubmit = document.getElementById("btnGuardar");
const mensajeEstado = document.getElementById("mensajeEstado");
const listaInventario = document.getElementById("listaInventarioAdmin");

const selectCategoria = document.getElementById("j_categoria");
const btnToggleAdmCat = document.getElementById("btnToggleAdmCat");
const boxAdmCategorias = document.getElementById("boxAdmCategorias");
const inputNuevaCat = document.getElementById("nuevaCategoriaInput");
const btnAnadirCat = document.getElementById("btnAnadirCategoria");
const listaAdminCats = document.getElementById("listaAdminCategorias");

btnFile.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
        txtFileName.textContent = fileInput.files[0].name;
    } else {
        txtFileName.textContent = "No se ha seleccionado ningún archivo.";
    }
});

// Mostrar/Ocultar el panel de administración de categorías al hacer clic en el botón pequeño
btnToggleAdmCat.addEventListener("click", () => {
    if (boxAdmCategorias.style.display === "none" || boxAdmCategorias.style.display === "") {
        boxAdmCategorias.style.display = "block";
    } else {
        boxAdmCategorias.style.display = "none";
    }
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

        // Llenar el select del formulario principal
        const opt = document.createElement("option");
        opt.value = valor;
        opt.textContent = nombre;
        selectCategoria.appendChild(opt);

        // Llenar la lista dentro del panel desplegable
        const row = document.createElement("div");
        row.className = "category-row-item";
        row.innerHTML = `
            <span>${nombre}</span>
            <button class="btn-del-cat-row" data-id="${catId}" title="Eliminar categoría">✕</button>
        `;
        listaAdminCats.appendChild(row);
    });
});

// Añadir nueva categoría
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

// Eliminar categoría
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

// --- PUBLICAR PRODUCTO ---
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) {
        alert("Por favor selecciona una imagen.");
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = "Subiendo imagen a Google Drive...";
    mensajeEstado.style.color = "#d4af37";
    mensajeEstado.textContent = "Procesando...";

    try {
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
            throw new Error(dataDrive.message || "Error al subir a Google Drive");
        }

        btnSubmit.textContent = "Guardando en Firebase...";
        await addDoc(collection(db, "jewelry"), {
            nombre: document.getElementById("j_nombre").value.trim(),
            precio: Number(document.getElementById("j_precio").value),
            categoria: selectCategoria.value,
            descripcion: document.getElementById("j_descripcion").value.trim(),
            imagenUrl: dataDrive.url,
            creado: Date.now()
        });

        mensajeEstado.style.color = "#16a34a";
        mensajeEstado.textContent = "¡Producto publicado con éxito!";
        form.reset();
        txtFileName.textContent = "No se ha seleccionado ningún archivo.";
    } catch (err) {
        console.error(err);
        mensajeEstado.style.color = "#dc2626";
        mensajeEstado.textContent = "Error: " + err.message;
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Subir foto a Google Drive y Publicar";
    }
});

// --- GESTIÓN DE PRODUCTOS PUBLICADOS ---
const q = query(collection(db, "jewelry"), orderBy("creado", "desc"));
onSnapshot(q, (snapshot) => {
    listaInventario.innerHTML = "";
    if (snapshot.empty) {
        listaInventario.innerHTML = "<p style='color:#a3a3a3; grid-column: 1 / -1;'>No hay productos registrados aún.</p>";
        return;
    }
    snapshot.forEach((documento) => {
        const item = documento.data();
        const id = documento.id;
        const card = document.createElement("div");
        card.className = "product-item";
        card.innerHTML = `
            <div>
                <img src="${item.imagenUrl}" alt="${item.nombre}" loading="lazy">
                <h4 style="margin: 8px 0 2px 0; color: #fff;">${item.nombre}</h4>
                <p style="margin: 0; color: #d4af37; font-weight: 700;">₡${(item.precio || 0).toLocaleString()}</p>
                <small style="color: #a3a3a3; text-transform: uppercase;">${item.categoria}</small>
            </div>
            <button class="btn-delete" data-id="${id}">🗑 Eliminar</button>
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
            } catch (err) {
                alert("No se pudo eliminar: " + err.message);
            }
        }
    }
});