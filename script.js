const supabaseUrl = "https://lvxyphkarplslzwapmqg.supabase.co";
const supabaseKey = "sb_publishable_TN-L5hSlTa-ZsRL55z-2KQ_q5ZVwErB";

const form = document.getElementById("formularioDatos");
const agregarBtn = document.getElementById("agregarCodigo");
const contenedorCodigos = document.getElementById("codigos");
const loader = document.getElementById("loader");
const mensaje = document.getElementById("mensaje");
const toggle = document.getElementById("menuToggle");
const menu = document.getElementById("menu");
const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
const successModal = document.getElementById("successModal");
const successModalClose = document.getElementById("successModalClose");
const contactForm = document.getElementById("contactoForm");
const contactNameInput = document.getElementById("contactoNombre");
const contactPhoneInput = document.getElementById("contactoTelefono");
const contactIssueInput = document.getElementById("contactoInconveniente");
const contactStatus = document.getElementById("contactoEstado");
const cedulaInput = form ? form.querySelector('input[name="cedula"]') : null;
const nombreInput = form ? form.querySelector('input[name="nombre"]') : null;
const telefonoInput = form ? form.querySelector('input[name="telefono"]') : null;
const facturaInput = form ? form.querySelector('input[name="factura"]') : null;
const localInput = form ? form.querySelector('input[name="local_compra"]') : null;
const flyersRail = document.querySelector("[data-flyers-rail]");
const flyersTrack = document.querySelector("[data-flyers-track]");

let supabaseClient = null;
let productosPermitidos = [];
let codigosPermitidos = new Set();
let productosPermitidosCargados = false;
let flyersAutoScrollId = null;
let flyersIsDragging = false;
const mainControlKeys = [
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Tab",
  "Home",
  "End"
];
const mainPhonePrefix = "09";

function setMessage(texto, tipo = "") {
  if (!mensaje) {
    return;
  }

  mensaje.textContent = texto;
  mensaje.className = tipo ? `mensaje mensaje-${tipo}` : "mensaje";
}

function setLoadingState(isLoading) {
  if (loader) {
    loader.style.display = isLoading ? "block" : "none";
  }

  if (submitBtn) {
    submitBtn.disabled = isLoading;
  }

  if (agregarBtn) {
    agregarBtn.disabled = isLoading;
  }

  if (form) {
    form.classList.toggle("is-loading", isLoading);
  }
}

function resetCodigoFields() {
  if (!contenedorCodigos) {
    return;
  }

  contenedorCodigos.innerHTML = "";
  contenedorCodigos.appendChild(createCodigoField());
}

function openSuccessModal() {
  if (!successModal) {
    return;
  }

  successModal.hidden = false;
  successModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeSuccessModal() {
  if (!successModal) {
    return;
  }

  successModal.hidden = true;
  successModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function sanitizeMainUppercaseText(value) {
  return value
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trimStart()
    .toUpperCase();
}

function formatCedula(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatFactura(value) {
  return value.replace(/\D/g, "").slice(0, 7);
}

function formatCantidad(value) {
  const digits = value.replace(/\D/g, "").slice(0, 3);
  const cantidad = Number(digits);

  if (!digits || Number.isNaN(cantidad) || cantidad < 1) {
    return "1";
  }

  return String(cantidad);
}

function formatMainPhone(value) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith(mainPhonePrefix)) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("9")) {
    digits = digits.slice(1);
  }

  const suffix = digits.slice(0, 8);
  const full = `${mainPhonePrefix}${suffix}`;

  if (full.length <= 4) {
    return full;
  }

  if (full.length <= 7) {
    return `${full.slice(0, 4)}-${full.slice(4)}`;
  }

  return `${full.slice(0, 4)}-${full.slice(4, 7)}-${full.slice(7, 10)}`;
}

function initializeMainTicketFields() {
  if (telefonoInput) {
    telefonoInput.value = formatMainPhone(telefonoInput.value);
  }
}

function getProductoCodigo(row) {
  return String(
    row?.Codigo_barra ??
    row?.codigo_barra ??
    row?.["Codigo_barra"] ??
    row?.["codigo_barra"] ??
    ""
  ).trim();
}

function getProductoDescripcion(row) {
  return String(
    row?.["Descripción"] ??
    row?.["Descripcion"] ??
    row?.Descripcion ??
    row?.descripcion ??
    row?.["descripcion"] ??
    ""
  ).trim();
}

function getProductoEmpresa(row) {
  return String(
    row?.Empresa ??
    row?.empresa ??
    row?.["Empresa"] ??
    row?.["empresa"] ??
    ""
  ).trim();
}

function buildProductoPermitido(row) {
  const codigo = getProductoCodigo(row);

  if (!codigo) {
    return null;
  }

  return {
    codigo,
    descripcion: getProductoDescripcion(row),
    empresa: getProductoEmpresa(row)
  };
}

async function loadProductosPermitidos() {
  if (!supabaseClient) {
    return;
  }

  try {
    let from = 0;
    const size = 1000;
    const rows = [];

    while (true) {
      const { data, error } = await supabaseClient
        .from("Productos Permitidos")
        .select("*")
        .range(from, from + size - 1);

      if (error) {
        throw error;
      }

      if (!data || !data.length) {
        break;
      }

      rows.push(...data);

      if (data.length < size) {
        break;
      }

      from += size;
    }

    productosPermitidos = rows
      .map(buildProductoPermitido)
      .filter(Boolean)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));

    codigosPermitidos = new Set(productosPermitidos.map((item) => item.codigo));
    productosPermitidosCargados = true;
  } catch (error) {
    console.error("Error al cargar productos permitidos:", error);
    productosPermitidos = [];
    codigosPermitidos = new Set();
    productosPermitidosCargados = false;
  }
}

function filterProductosPermitidos(query) {
  const normalized = query.trim();

  if (!normalized || !productosPermitidos.length) {
    return [];
  }

  const starts = [];
  const contains = [];

  for (const item of productosPermitidos) {
    if (item.codigo.startsWith(normalized)) {
      starts.push(item);
    } else if (item.codigo.includes(normalized)) {
      contains.push(item);
    }

    if (starts.length + contains.length >= 8) {
      break;
    }
  }

  return [...starts, ...contains].slice(0, 8);
}

function hideCodigoSuggestions(suggestions) {
  if (!suggestions) {
    return;
  }

  suggestions.hidden = true;
  suggestions.innerHTML = "";
}

function renderCodigoSuggestions(input, suggestions) {
  const matches = filterProductosPermitidos(input.value);

  if (!matches.length) {
    hideCodigoSuggestions(suggestions);
    return;
  }

  suggestions.innerHTML = "";

  matches.forEach((item) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "codigo-suggestion";

    const code = document.createElement("span");
    code.className = "codigo-suggestion__code";
    code.textContent = item.codigo;

    const meta = document.createElement("span");
    meta.className = "codigo-suggestion__meta";
    meta.textContent = [item.empresa, item.descripcion].filter(Boolean).join(" | ");

    option.append(code, meta);

    option.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });

    option.addEventListener("click", () => {
      input.value = item.codigo;
      hideCodigoSuggestions(suggestions);
      input.focus();
    });

    suggestions.appendChild(option);
  });

  suggestions.hidden = false;
}

function attachCodigoAutocomplete(input, suggestions) {
  input.addEventListener("input", () => {
    if (!productosPermitidosCargados) {
      hideCodigoSuggestions(suggestions);
      return;
    }

    renderCodigoSuggestions(input, suggestions);
  });

  input.addEventListener("focus", () => {
    if (!productosPermitidosCargados || !input.value.trim()) {
      return;
    }

    renderCodigoSuggestions(input, suggestions);
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      hideCodigoSuggestions(suggestions);
    }, 120);
  });
}

function createCodigoField(value = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "codigo-field";

  const entry = document.createElement("div");
  entry.className = "codigo-entry";

  const main = document.createElement("div");
  main.className = "codigo-field__main";

  const input = document.createElement("input");
  input.type = "text";
  input.name = "codigo[]";
  input.placeholder = "Código de barras del producto";
  input.autocomplete = "off";
  input.inputMode = "numeric";
  input.setAttribute("aria-label", "Código de barras del producto");
  input.required = true;
  input.value = value;

  const qtyInput = document.createElement("input");
  qtyInput.type = "text";
  qtyInput.name = "cantidad[]";
  qtyInput.className = "codigo-qty";
  qtyInput.placeholder = "Cant.";
  qtyInput.inputMode = "numeric";
  qtyInput.maxLength = 3;
  qtyInput.setAttribute("aria-label", "Cantidad de unidades del producto");
  qtyInput.required = true;
  qtyInput.value = "1";

  const suggestions = document.createElement("div");
  suggestions.className = "codigo-suggestions";
  suggestions.hidden = true;

  qtyInput.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || mainControlKeys.includes(event.key)) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  });

  qtyInput.addEventListener("input", () => {
    qtyInput.value = formatCantidad(qtyInput.value);
  });

  qtyInput.addEventListener("blur", () => {
    qtyInput.value = formatCantidad(qtyInput.value);
  });

  attachCodigoAutocomplete(input, suggestions);
  main.append(input, suggestions);
  entry.append(main, qtyInput);
  wrapper.append(entry);
  return wrapper;
}

function setContactStatus(texto, tipo = "") {
  if (!contactStatus) {
    return;
  }

  contactStatus.textContent = texto;
  contactStatus.className = tipo ? `contact-status is-${tipo}` : "contact-status";
}

function sanitizeContactName(value) {
  return value
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trimStart();
}

function formatContactPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const first = digits.slice(0, 4);
  const second = digits.slice(4, 7);
  const third = digits.slice(7, 10);

  if (digits.length <= 4) {
    return first;
  }

  if (digits.length <= 7) {
    return `${first}-${second}`;
  }

  return `${first}-${second}-${third}`;
}

function setupFlyersRail() {
  if (!flyersRail || !flyersTrack) {
    return;
  }

  const cards = Array.from(flyersTrack.children);

  if (!cards.length) {
    return;
  }

  for (let setIndex = 0; setIndex < 2; setIndex += 1) {
    cards.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      flyersTrack.appendChild(clone);
    });
  }

  const getMiddleStart = () => flyersTrack.children[cards.length]?.offsetLeft || 0;
  const getSequenceWidth = () => {
    const middleStart = getMiddleStart();
    const lastStart = flyersTrack.children[cards.length * 2]?.offsetLeft || 0;
    return lastStart > middleStart ? lastStart - middleStart : middleStart;
  };

  let isNormalizing = false;

  const normalizeFlyersScroll = () => {
    if (isNormalizing) {
      return;
    }

    const middleStart = getMiddleStart();
    const sequenceWidth = getSequenceWidth();

    if (sequenceWidth <= 0) {
      return;
    }

    const minScroll = middleStart - sequenceWidth * 0.5;
    const maxScroll = middleStart + sequenceWidth * 0.5;

    if (flyersRail.scrollLeft < minScroll) {
      isNormalizing = true;
      flyersRail.scrollLeft += sequenceWidth;
      isNormalizing = false;
    } else if (flyersRail.scrollLeft >= maxScroll) {
      isNormalizing = true;
      flyersRail.scrollLeft -= sequenceWidth;
      isNormalizing = false;
    }
  };

  const tick = () => {
    flyersRail.scrollLeft += 0.45;
    normalizeFlyersScroll();

    flyersAutoScrollId = window.requestAnimationFrame(tick);
  };

  let dragStartX = 0;
  let startScrollLeft = 0;

  const stopDragging = () => {
    flyersIsDragging = false;
    flyersRail.classList.remove("is-dragging");
  };

  flyersRail.addEventListener("mouseleave", () => {
    stopDragging();
  });

  flyersRail.addEventListener("pointerdown", (event) => {
    flyersIsDragging = true;
    flyersRail.classList.add("is-dragging");
    dragStartX = event.clientX;
    startScrollLeft = flyersRail.scrollLeft;
    flyersRail.setPointerCapture(event.pointerId);
  });

  flyersRail.addEventListener("pointermove", (event) => {
    if (!flyersIsDragging) {
      return;
    }

    const delta = event.clientX - dragStartX;
    flyersRail.scrollLeft = startScrollLeft - delta;
    normalizeFlyersScroll();
    startScrollLeft = flyersRail.scrollLeft;
    dragStartX = event.clientX;
  });

  flyersRail.addEventListener("pointerup", stopDragging);
  flyersRail.addEventListener("pointercancel", stopDragging);
  flyersRail.addEventListener("scroll", normalizeFlyersScroll, { passive: true });

  if (flyersAutoScrollId !== null) {
    window.cancelAnimationFrame(flyersAutoScrollId);
  }

  flyersRail.scrollLeft = getMiddleStart();
  flyersAutoScrollId = window.requestAnimationFrame(tick);
}

if (form) {
  try {
    const supabaseLib = window.supabase || globalThis.supabase;

    if (!supabaseLib || typeof supabaseLib.createClient !== "function") {
      throw new Error("No se pudo cargar la librería de Supabase.");
    }

    supabaseClient = supabaseLib.createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    loadProductosPermitidos();
  } catch (error) {
    console.error("Error al iniciar Supabase:", error);
    setMessage("No se pudo iniciar la conexión con Supabase.", "error");
  }
}

if (cedulaInput) {
  cedulaInput.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || mainControlKeys.includes(event.key)) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  });

  cedulaInput.addEventListener("input", () => {
    cedulaInput.value = formatCedula(cedulaInput.value);
  });
}

if (facturaInput) {
  facturaInput.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || mainControlKeys.includes(event.key)) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  });

  facturaInput.addEventListener("input", () => {
    facturaInput.value = formatFactura(facturaInput.value);
  });
}

if (telefonoInput) {
  telefonoInput.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || mainControlKeys.includes(event.key)) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  });

  telefonoInput.addEventListener("input", () => {
    telefonoInput.value = formatMainPhone(telefonoInput.value);
  });

  telefonoInput.addEventListener("focus", () => {
    telefonoInput.value = formatMainPhone(telefonoInput.value);
  });
}

if (nombreInput) {
  nombreInput.addEventListener("input", () => {
    nombreInput.value = sanitizeMainUppercaseText(nombreInput.value);
  });
}

if (localInput) {
  localInput.addEventListener("input", () => {
    localInput.value = sanitizeMainUppercaseText(localInput.value);
  });
}

initializeMainTicketFields();
resetCodigoFields();
setupFlyersRail();

if (agregarBtn && contenedorCodigos) {
  agregarBtn.addEventListener("click", () => {
    contenedorCodigos.appendChild(createCodigoField());
  });
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
      setMessage("No se pudo conectar con Supabase.", "error");
      return;
    }

    const cedula = formatCedula(form.cedula.value.trim());
    const nombre = sanitizeMainUppercaseText(form.nombre.value.trim());
    const telefono = formatMainPhone(form.telefono.value.trim());
    const factura = formatFactura(form.factura.value.trim());
    const local_compra = sanitizeMainUppercaseText(form.local_compra.value.trim());
    const cedulaNumero = Number(cedula.replace(/\D/g, ""));

    form.cedula.value = cedula;
    form.nombre.value = nombre;
    form.telefono.value = telefono;
    form.factura.value = factura;
    form.local_compra.value = local_compra;

    if (cedulaNumero < 100000 || cedulaNumero > 15000000) {
      setMessage("La cédula debe estar entre 100.000 y 15.000.000.", "error");
      form.cedula.focus();
      return;
    }

    if (!nombre) {
      setMessage("Ingresa un nombre válido.", "error");
      form.nombre.focus();
      return;
    }

    if (!/^09\d{2}-\d{3}-\d{3}$/.test(telefono)) {
      setMessage("El teléfono debe tener el formato 09XX-XXX-XXX.", "error");
      form.telefono.focus();
      return;
    }

    if (!/^\d{7}$/.test(factura)) {
      setMessage("La factura debe tener exactamente 7 números.", "error");
      form.factura.focus();
      return;
    }

    if (!local_compra) {
      setMessage("Ingresa el nombre del local.", "error");
      form.local_compra.focus();
      return;
    }

    if (!productosPermitidosCargados) {
      setMessage("No se pudo cargar la lista de productos permitidos.", "error");
      return;
    }

    const codigoRows = Array.from(document.querySelectorAll(".codigo-field"))
      .map((row) => {
        const codigoInput = row.querySelector('input[name="codigo[]"]');
        const cantidadInput = row.querySelector('input[name="cantidad[]"]');
        const codigo = codigoInput ? codigoInput.value.trim() : "";
        const cantidad = cantidadInput ? Number(formatCantidad(cantidadInput.value)) : 1;

        if (cantidadInput) {
          cantidadInput.value = String(cantidad);
        }

        return { row, codigoInput, cantidadInput, codigo, cantidad };
      })
      .filter((item) => item.codigo);

    if (!codigoRows.length) {
      setMessage("Agrega al menos un código válido.", "error");
      return;
    }

    const filaCantidadInvalida = codigoRows.find((item) => !Number.isInteger(item.cantidad) || item.cantidad < 1);

    if (filaCantidadInvalida) {
      setMessage("La cantidad por producto debe ser mínimo 1.", "error");

      if (filaCantidadInvalida.cantidadInput) {
        filaCantidadInvalida.cantidadInput.focus();
      }

      return;
    }

    const codigoNoPermitido = codigoRows.find((item) => !codigosPermitidos.has(item.codigo));

    if (codigoNoPermitido) {
      setMessage(`El código ${codigoNoPermitido.codigo} no está habilitado para el sorteo.`, "error");

      if (codigoNoPermitido.codigoInput) {
        codigoNoPermitido.codigoInput.focus();
      }

      return;
    }

    const registros = codigoRows.flatMap(({ codigo, cantidad }) =>
      Array.from({ length: cantidad }, () => ({
        cedula,
        nombre,
        telefono,
        factura,
        local_compra,
        codigo
      }))
    );

    setLoadingState(true);
    setMessage("");

    try {
      const { error } = await supabaseClient.from("participantes").insert(registros);

      if (error) {
        throw error;
      }

      form.reset();
      initializeMainTicketFields();
      resetCodigoFields();
      setMessage("Datos enviados correctamente.", "success");
      openSuccessModal();
    } catch (error) {
      const detalle = error && error.message ? error.message : "desconocido";
      console.error("Error de Supabase:", error);
      setMessage(`Error al guardar: ${detalle}`, "error");
    } finally {
      setLoadingState(false);
    }
  });
}

if (successModal && successModalClose) {
  successModalClose.addEventListener("click", closeSuccessModal);

  successModal.addEventListener("click", (event) => {
    if (event.target === successModal) {
      closeSuccessModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !successModal.hidden) {
      closeSuccessModal();
    }
  });
}

if (contactNameInput) {
  contactNameInput.addEventListener("input", () => {
    contactNameInput.value = sanitizeContactName(contactNameInput.value);
  });
}

if (contactPhoneInput) {
  const allowedControlKeys = [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Tab",
    "Home",
    "End"
  ];

  contactPhoneInput.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === "v") {
        event.preventDefault();
      }

      return;
    }

    if (allowedControlKeys.includes(event.key)) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  });

  contactPhoneInput.addEventListener("paste", (event) => {
    event.preventDefault();
  });

  contactPhoneInput.addEventListener("input", () => {
    contactPhoneInput.value = formatContactPhone(contactPhoneInput.value);
  });
}

if (contactForm && contactNameInput && contactPhoneInput && contactIssueInput) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const nombre = sanitizeContactName(contactNameInput.value.trim());
    const telefono = formatContactPhone(contactPhoneInput.value);
    const inconveniente = contactIssueInput.value.trim();

    contactNameInput.value = nombre;
    contactPhoneInput.value = telefono;

    if (nombre.length < 2) {
      setContactStatus("Ingresa un nombre válido.", "error");
      contactNameInput.focus();
      return;
    }

    if (!/^\d{4}-\d{3}-\d{3}$/.test(telefono)) {
      setContactStatus("El teléfono debe tener el formato 0981-123-123.", "error");
      contactPhoneInput.focus();
      return;
    }

    if (!inconveniente) {
      setContactStatus("Describe tu duda o inconveniente.", "error");
      contactIssueInput.focus();
      return;
    }

    const mensajeWhatsapp = [
      `Buenas OA, mi nombre es "${nombre}", tengo una duda/inconveniente.`,
      `"${inconveniente}"`
    ].join("\n");

    const whatsappUrl = `https://api.whatsapp.com/send?phone=+595983734147&text=${encodeURIComponent(mensajeWhatsapp)}`;

    setContactStatus("Te redirigimos a WhatsApp para completar el envío.", "success");
    window.open(whatsappUrl, "_blank", "noopener");
    contactForm.reset();
  });
}

if (toggle && menu) {
  const closeMenu = () => {
    menu.classList.remove("activo");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const activo = menu.classList.toggle("activo");
    toggle.setAttribute("aria-expanded", String(activo));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) {
      closeMenu();
    }
  });
}
