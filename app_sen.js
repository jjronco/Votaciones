// Se toman los datos de senadores.json para visualizar los integrantes de cada bloque
async function obtenerDatosDiputados() {
    try {
        const respuesta = await fetch('senadores.json');
        if (!respuesta.ok) {
            throw new Error('Error al cargar los datos');
        }
        const diputados = await respuesta.json();

        // Agrupar por bloque
        const bloques = agruparPorBloque(diputados);

        // Crear el acordeón con los datos agrupados
        mostrarAccordionBloques(bloques);
    } catch (error) {
        console.error('Error al obtener los datos:', error);
    }
}

// Agrupa diputados por bloque y crea un array para cada uno
function agruparPorBloque(diputados) {
    const bloques = {};
    diputados.forEach(diputado => {
        const bloque = diputado.bloque;
        if (!bloques[bloque]) {
            bloques[bloque] = [];
        }
        bloques[bloque].push(diputado);
    });
    return bloques;
}

// Crea el acordeón y lo inserta en el DOM
function mostrarAccordionBloques(bloques) {
    const contenedor = document.getElementById("integrantes");
    contenedor.innerHTML = "";

    const acordeon = document.createElement("div");
    acordeon.className = "accordion";
    acordeon.id = "accordionBloques";

    // Ordenar bloques por cantidad de integrantes de mayor a menor
    const bloquesOrdenados = Object.entries(bloques).sort(([, a], [, b]) => b.length - a.length);

    let index = 0;
    for (const [nombreBloque, diputados] of bloquesOrdenados) {
        const item = document.createElement("div");
        item.className = "accordion-item";

        item.innerHTML = `
            <h2 class="accordion-header" id="heading${index}">
                <button class="accordion-button ${index > 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="${index === 0}" aria-controls="collapse${index}">
                    ${nombreBloque} (${diputados.length} miembros)
                </button>
            </h2>
            <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" aria-labelledby="heading${index}" data-bs-parent="#accordionBloques">
                <div class="accordion-body">
                    <ul>
                        ${diputados.map(d => `<li>${d.diputado_apellido}, ${d.diputado_nombre} (${d.distrito})</li>`).join("")}
                    </ul>
                </div>
            </div>
        `;
        acordeon.appendChild(item);
        index++;
    }

    contenedor.appendChild(acordeon);
}


// Inicia el proceso al cargar el DOM
document.addEventListener("DOMContentLoaded", obtenerDatosDiputados);

// Se crea clase Bloque con función constructora para contener nombre, cantidad de miembros y más adelante el número de votos
class Bloque {
    constructor(nombre, cantidad) {
        this.nombre = nombre;
        this.cantidad = cantidad;
        this.votosAfirmativos = 0;
    }
}

// Se crea clase Votación, ahora se cargan los bloques dinámicamente desde el archivo JSON
class Votacion {
    constructor() {
        this.bloques = [];
        this.totalDiputados = 0;
        this.mayoriaRequerida = 0;
        this.nombreVotacion = '';
        this.historial = JSON.parse(localStorage.getItem("historialVotaciones")) || [];
        
        this.obtenerBloquesDesdeJSON(); // Llamada para cargar los bloques
    }

    async obtenerBloquesDesdeJSON() {
        try {
            const respuesta = await fetch('senadores.json');
            if (!respuesta.ok) {
                throw new Error('Error al cargar los bloques');
            }
            const diputados = await respuesta.json();
            const bloquesAgrupados = agruparPorBloque(diputados);

            this.bloques = Object.keys(bloquesAgrupados).map(bloque => {
                return new Bloque(bloque, bloquesAgrupados[bloque].length);
            });

            this.totalDiputados = this.bloques.reduce((acc, bloque) => acc + bloque.cantidad, 0);
        } catch (error) {
            console.error('Error al obtener los bloques:', error);
        }
    }

    guardarHistorial() {
        localStorage.setItem("historialVotaciones", JSON.stringify(this.historial));
    }

    guardarNombreVotacion() {
        const nombreInput = document.getElementById("nombre-votacion-input");
        const mensajeNombre = document.getElementById("mensaje-nombre");
        this.nombreVotacion = nombreInput.value.trim();

        if (!this.nombreVotacion) {
            Swal.fire({
                toast: true,
                position: 'center',
                icon: 'error',
                title: 'Por favor, ingrese un nombre para la votación.',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
            return false;
        }
        
        Swal.fire({
            toast: true,
            position: 'center',
            icon: 'success',
            title: `Se procede a la votación de: ${this.nombreVotacion}.`,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
        });

        mensajeNombre.textContent = `Se procede a la votación de: ${this.nombreVotacion}.`;
        mensajeNombre.style.display = "block";
        return true;
    }

    verificarQuorum() {
        const presentesInput = document.getElementById("presentes");
        const totalPresentes = parseInt(presentesInput.value, 10);
        const mensajeQuorum = document.getElementById("quorum-mensaje");

        if (isNaN(totalPresentes) || totalPresentes < (this.totalDiputados/2) + 1) {
            Swal.fire({
                toast: true,
                position: 'center',
                icon: 'error',
                title: 'No hay quórum para realizar la votación.',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
            mensajeQuorum.textContent = "No hay quórum para realizar la votación.";
        } else if (totalPresentes > this.totalDiputados) {
            Swal.fire({
                toast: true,
                position: 'center',
                icon: 'error',
                title: `El número de presentes no puede ser superior al total (${this.totalDiputados}).`,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
            mensajeQuorum.textContent = `El número de presentes no puede ser superior al total de diputados (${this.totalDiputados}).`;
        } else {
            Swal.fire({
                toast: true,
                position: 'center',
                icon: 'success',
                title: '¡Hay quórum! Puede iniciar el debate.',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
            mensajeQuorum.textContent = "¡Hay quórum! Puede iniciar el debate.";
        }
    }

    iniciarVotacion() {
        if (!this.guardarNombreVotacion()) {
            return; // No iniciar votación si no se ingresó un nombre
        }

        const tipoMayoriaSeleccionado = document.querySelector('input[name="mayoria"]:checked');
        const mensajeMayoria = document.getElementById("mensajeMayoria");

        if (!tipoMayoriaSeleccionado) {
            Swal.fire({
                toast: true,
                position: 'center',
                icon: 'error',
                title: 'Por favor, seleccione un tipo de mayoría.',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });
            return;
        }

        const tipoVotacion = tipoMayoriaSeleccionado.value;
        const totalPresentes = parseInt(document.getElementById("presentes").value, 10);

        switch (tipoVotacion) {
            case "mitad_presentes":
                this.mayoriaRequerida = Math.floor(totalPresentes / 2) + 1;
                break;
            case "mitad_total":
                this.mayoriaRequerida = Math.floor(this.totalDiputados / 2) + 1;
                break;
            case "dos_tercios_presentes":
                this.mayoriaRequerida = Math.ceil(totalPresentes * 2 / 3);
                break;
            case "tres_cuartas_presentes":
                this.mayoriaRequerida = Math.ceil(totalPresentes * 3 / 4);
                break;
            default:
                return;
        }
        
        Swal.fire({
            toast: true,
            position: 'center',
            icon: 'info',
            title: `Los votos afirmativos requeridos son: ${this.mayoriaRequerida}.`,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
        });

        mensajeMayoria.textContent = `Los votos afirmativos requeridos son: ${this.mayoriaRequerida}`;
        this.mostrarFormularioVotacion();
    }

    mostrarFormularioVotacion() {
    const votacionContainer = document.getElementById("votacion");
    votacionContainer.innerHTML = "";

    // Ordenar bloques de mayor a menor según la cantidad de integrantes
    const bloquesOrdenados = [...this.bloques].sort((a, b) => b.cantidad - a.cantidad);

    bloquesOrdenados.forEach(bloque => {
        const bloqueDiv = document.createElement("div");
        bloqueDiv.className = "bloque";
        bloqueDiv.innerHTML = `
            <h3>${bloque.nombre} (${bloque.cantidad})</h3>
            <label>Votos afirmativos:</label>
            <input type="number" class="afirmativos" data-bloque="${bloque.nombre}" value="0" min="0" max="${bloque.cantidad}">
        `;
        votacionContainer.appendChild(bloqueDiv);

        // Listener para limitar que se ingrese un valor superior al total de miembros de cada bloque
        const input = bloqueDiv.querySelector(".afirmativos");
        input.addEventListener("input", (event) => {
            let value = parseInt(event.target.value, 10);
            if (value > bloque.cantidad) {
                // Si el valor supera la cantidad de miembros, se corrige al total
                event.target.value = bloque.cantidad;
            } else if (value < 0) {
                // No permitir valores negativos
                event.target.value = 0;
            }
        });
    });

    votacionContainer.style.display = "block";
}

    mostrarResultados() {
    const votosAfirmativos = document.querySelectorAll(".afirmativos");
    let totalAfirmativos = 0;

    votosAfirmativos.forEach(input => {
        totalAfirmativos += parseInt(input.value) || 0;
    });

    // Verificar si no hay votos ingresados
    if (totalAfirmativos === 0) {
        Swal.fire({
            toast: true,
            position: 'center',
            icon: 'error',
            title: 'No se han ingresado votos válidos.',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
        });
        return;
    }

    const mensajeResultado = this.compararConMayoria(totalAfirmativos);

    // Guarda todos los resultados (aprobados o rechazados)
    this.historial.push({
        nombreVotacion: this.nombreVotacion,
        votosAfirmativos: totalAfirmativos,
        mayoriaRequerida: this.mayoriaRequerida,
        resultado: mensajeResultado,
    });

    this.guardarHistorial();
    this.mostrarHistorial();

    Swal.fire({
        toast: true,
        position: 'center',
        icon: totalAfirmativos >= this.mayoriaRequerida ? 'success' : 'error',
        title: mensajeResultado,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
    });

    const resultadoFinal = document.getElementById("resultados");
    resultadoFinal.innerHTML = `
        <ul>
            <li>Total de votos afirmativos: ${totalAfirmativos}</li>
        </ul>
        <p>${mensajeResultado}</p>`;
    resultadoFinal.style.display = "block";
}

    compararConMayoria(totalAfirmativos) {
        return totalAfirmativos >= this.mayoriaRequerida
            ? "¡La votación fue aprobada!"
            : "No se alcanzó la mayoría necesaria.";
    }

    mostrarHistorial() {
        const historialDiv = document.getElementById("historial");
        historialDiv.innerHTML = "";

        if (this.historial.length > 0) {
            this.historial.forEach((simulacion, index) => {
                const item = document.createElement("li");
                item.textContent = `Votación: ${simulacion.nombreVotacion} - Votos Afirmativos: ${simulacion.votosAfirmativos}, 
                    Mayoría Requerida: ${simulacion.mayoriaRequerida}, Resultado: ${simulacion.resultado}`;
                historialDiv.appendChild(item);
            });
            historialDiv.style.display = "block";
        }
    }
}

// Instancia de la clase Votacion
const votacion = new Votacion();

// Se agregan los event listeners
document.addEventListener("DOMContentLoaded", () => {
    const verificarQuorumBtn = document.getElementById("verificar-quorum-btn");
    verificarQuorumBtn.addEventListener("click", () => votacion.verificarQuorum());

    const guardarNombreVotacionBtn = document.getElementById("guardar-nombre-votacion");
    guardarNombreVotacionBtn.addEventListener("click", () => votacion.guardarNombreVotacion());

    const iniciarVotacionBtn = document.getElementById("iniciar-votacion-btn");
    iniciarVotacionBtn.addEventListener("click", () => votacion.iniciarVotacion());

    const mostrarResultadosBtn = document.getElementById("mostrar-resultados-btn");
    mostrarResultadosBtn.addEventListener("click", () => votacion.mostrarResultados());
});
