function renderizarInventarioAgrupado() {
    listaInventario.innerHTML = "";

    if (listaProductosSnapshot.length === 0) {
        listaInventario.innerHTML = "<p style='color:#a3a3a3; grid-column: 1 / -1;'>No hay productos registrados aún.</p>";
        return;
    }

    let porCategoria = {};
    listaProductosSnapshot.forEach(item => {
        // Normalizamos la categoría para que no falle por mayúsculas, minúsculas o espacios extra
        let cat = item.categoria ? item.categoria.trim() : "SIN CATEGORÍA";
        // Poner la primera letra en mayúscula para que se vea ordenado (Ej: "anillos" -> "Anillos")
        cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();

        if (!porCategoria[cat]) porCategoria[cat] = [];
        porCategoria[cat].push(item);
    });

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

        listaInventario.appendChild(seccionCat);
    }
}
