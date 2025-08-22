import React, { useState, useRef, useEffect } from "react";

// Formación de usuarios — Documento colaborativo + Mapa conceptual mejorado (v2)
// Cambios en esta versión:
// - Eliminar conexiones entre nodos (selección y borrado)
// - Vista previa con formato simple (markdown-like) para el documento formalizado
// - Eliminado el slider extra: ahora solo el textarea tiene scroll (un único scrollbar)
// - Mejoras menores en la UI para manejo de conexiones

export default function App() {
  // Mapa conceptual mejorado
  const defaultNodes = [
    { id: "n1", text: "TIC", x: 140, y: 80, type: "concept" },
    { id: "n2", text: "Formación de usuarios", x: 360, y: 80, type: "central" },
    { id: "n3", text: "Fases del programa", x: 560, y: 140, type: "topic" },
    { id: "n4", text: "Herramientas Web 2.0", x: 560, y: 260, type: "topic" },
    { id: "n5", text: "Evaluación", x: 360, y: 260, type: "topic" },
    { id: "n6", text: "Alcances", x: 760, y: 180, type: "detail" },
    { id: "n7", text: "Limitaciones", x: 760, y: 300, type: "detail" },
  ];

  const defaultConnections = [
    { from: "n1", to: "n2" },
    { from: "n2", to: "n3" },
    { from: "n2", to: "n4" },
    { from: "n2", to: "n5" },
    { from: "n4", to: "n6" },
    { from: "n4", to: "n7" },
  ];

  const [nodes, setNodes] = useState(() => {
    const saved = localStorage.getItem("fu_nodes_v2");
    return saved ? JSON.parse(saved) : defaultNodes;
  });
  const [connections, setConnections] = useState(() => {
    const saved = localStorage.getItem("fu_connections_v2");
    return saved ? JSON.parse(saved) : defaultConnections;
  });

  useEffect(() => {
    localStorage.setItem("fu_nodes_v2", JSON.stringify(nodes));
  }, [nodes]);
  useEffect(() => {
    localStorage.setItem("fu_connections_v2", JSON.stringify(connections));
  }, [connections]);

  // Pan & zoom state
  const svgRef = useRef(null);
  const viewportRef = useRef({ x: 0, y: 0, k: 1 });
  const isPanningRef = useRef(false);
  const panOriginRef = useRef({ x: 0, y: 0 });

  function screenToWorld(clientX, clientY) {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const rect = svg.getBoundingClientRect();
    const x =
      (clientX - rect.left - viewportRef.current.x) / viewportRef.current.k;
    const y =
      (clientY - rect.top - viewportRef.current.y) / viewportRef.current.k;
    return { x, y };
  }

  // Drag nodes
  const draggingRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  function handleNodePointerDown(e, node) {
    e.stopPropagation();
    const pt = screenToWorld(e.clientX, e.clientY);
    draggingRef.current = node.id;
    dragOffsetRef.current = { x: pt.x - node.x, y: pt.y - node.y };
  }

  function handlePointerMove(e) {
    // node dragging
    if (draggingRef.current) {
      const id = draggingRef.current;
      const pt = screenToWorld(e.clientX, e.clientY);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                x: pt.x - dragOffsetRef.current.x,
                y: pt.y - dragOffsetRef.current.y,
              }
            : n
        )
      );
      return;
    }

    // panning
    if (isPanningRef.current) {
      const dx = e.clientX - panOriginRef.current.x;
      const dy = e.clientY - panOriginRef.current.y;
      viewportRef.current.x += dx;
      viewportRef.current.y += dy;
      panOriginRef.current = { x: e.clientX, y: e.clientY };
      applyViewport();
    }
  }

  function handlePointerUp() {
    draggingRef.current = null;
    isPanningRef.current = false;
  }

  function applyViewport() {
    const svg = svgRef.current;
    if (!svg) return;
    const g = svg.querySelector("#viewport");
    if (!g) return;
    const { x, y, k } = viewportRef.current;
    g.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
  }

  function handleWheel(e) {
    e.preventDefault();
    const delta = -e.deltaY;
    const scaleFactor = delta > 0 ? 1.08 : 0.92;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const wx = (mx - viewportRef.current.x) / viewportRef.current.k;
    const wy = (my - viewportRef.current.y) / viewportRef.current.k;

    viewportRef.current.k *= scaleFactor;

    viewportRef.current.x = mx - wx * viewportRef.current.k;
    viewportRef.current.y = my - wy * viewportRef.current.k;

    applyViewport();
  }

  function startPan(e) {
    isPanningRef.current = true;
    panOriginRef.current = { x: e.clientX, y: e.clientY };
  }

  // Node types styling
  const typeStyles = {
    central: { radius: 70, fill: "#0ea5a4", textColor: "#fff" },
    concept: { radius: 56, fill: "#2563eb", textColor: "#fff" },
    topic: { radius: 48, fill: "#f59e0b", textColor: "#111" },
    detail: { radius: 40, fill: "#94a3b8", textColor: "#111" },
    default: { radius: 44, fill: "#e2e8f0", textColor: "#111" },
  };

  // Connections: add, select, remove
  const [connectSelect, setConnectSelect] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);

  function handleNodeClick(e, node) {
    e.stopPropagation();
    if (!connectSelect) {
      setConnectSelect(node.id);
    } else if (connectSelect === node.id) {
      setConnectSelect(null);
    } else {
      setConnections((prev) => [...prev, { from: connectSelect, to: node.id }]);
      setConnectSelect(null);
    }
    // clear any selected connection
    setSelectedConnection(null);
  }

  function selectConnection(index) {
    setSelectedConnection((prev) => (prev === index ? null : index));
    // clear node connect selection when selecting a connection
    setConnectSelect(null);
  }

  function deleteSelectedConnection() {
    if (selectedConnection == null) return;
    if (!confirm("Eliminar conexión seleccionada?")) return;
    setConnections((prev) => prev.filter((_, i) => i !== selectedConnection));
    setSelectedConnection(null);
  }

  function addNode() {
    const id = "n" + (Date.now() % 100000);
    const newNode = {
      id,
      text: "Nuevo nodo",
      x: 300 + Math.random() * 200,
      y: 200 + Math.random() * 160,
      type: "default",
    };
    setNodes((prev) => [...prev, newNode]);
  }

  function editNode(node) {
    const nuevo = prompt("Editar texto del nodo:", node.text);
    if (nuevo !== null)
      setNodes((prev) =>
        prev.map((n) => (n.id === node.id ? { ...n, text: nuevo } : n))
      );
  }

  function deleteNode(node) {
    if (!confirm("Eliminar nodo y sus conexiones?")) return;
    setNodes((prev) => prev.filter((n) => n.id !== node.id));
    setConnections((prev) =>
      prev.filter((c) => c.from !== node.id && c.to !== node.id)
    );
  }

  function exportSVG() {
    const svg = svgRef.current.cloneNode(true);
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formacion_usuarios_map_v2.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPNG() {
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const clone = svg.cloneNode(true);
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    const svgString = serializer.serializeToString(clone);
    const img = new Image();
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    return new Promise((res, rej) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = svg.clientWidth * 2;
        canvas.height = svg.clientHeight * 2;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => {
          const a = document.createElement("a");
          const url2 = URL.createObjectURL(b);
          a.href = url2;
          a.download = "formacion_usuarios_map_v2.png";
          a.click();
          URL.revokeObjectURL(url2);
          URL.revokeObjectURL(url);
          res();
        });
      };
      img.onerror = (err) => rej(err);
      img.src = url;
    });
  }

  // Context menu state
  const [contextNode, setContextNode] = useState(null);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });

  function openContext(e, node) {
    e.preventDefault();
    setContextNode(node);
    setContextPos({ x: e.clientX, y: e.clientY });
  }

  function closeContext() {
    setContextNode(null);
  }

  // Quick reset
  function resetToDefault() {
    if (!confirm("Restablecer mapa al diseño inicial?")) return;
    setNodes(defaultNodes);
    setConnections(defaultConnections);
  }

  // Apply viewport on mount
  useEffect(() => applyViewport(), []);

  return (
    <div className="w-full h-screen p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="flex gap-4 h-full">
        {/* Documento formal */}
        <div className="w-1/2 bg-slate-50 dark:bg-slate-800 rounded-xl shadow p-4 flex flex-col">
          <div className="items-center justify-between mb-3">
            <h2 className="text-3xl font-bold text-center text-indigo-600 dark:text-indigo-200">Documento formalizado</h2>
            <div className="flex gap-2"></div>
          </div>

          {/* Preview (formateado) */}
          <div
            className="mb-3 p-3 bg-white dark:bg-slate-900 rounded border overflow-auto"
            style={{ minHeight: 120 }}
          >
            <div style={{ lineHeight: 1.5 }}>
              <>
                <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 p-8 flex justify-center">
                  <div className="max-w-4xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 space-y-8">
                    <h2 className="text-3xl font-bold text-center text-indigo-600 dark:text-indigo-400">
                      Formación de usuarios de la información mediante
                      aplicaciones Web 2.0
                    </h2>

                    <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 text-center">
                      Este documento analiza cómo las <strong>TIC</strong> y las{" "}
                      <strong>aplicaciones Web 2.0</strong> pueden apoyar la
                      formación de usuarios en la gestión y uso de la
                      información, especialmente en el ámbito educativo.
                    </p>

                    {/* Importancia */}
                    <section>
                      <h3 className="text-2xl font-semibold text-indigo-500 mb-4">
                        📌 Importancia de las TIC
                      </h3>
                      <ul className="list-disc pl-6 space-y-2 marker:text-indigo-400">
                        <li>
                          Son parte esencial de la vida cotidiana (hogar,
                          trabajo, educación).
                        </li>
                        <li>
                          Impulsan la educación en línea, a distancia y la
                          teleeducación.
                        </li>
                        <li>
                          Exigen habilidades cognitivas, técnicas y
                          actitudinales.
                        </li>
                      </ul>
                    </section>

                    {/* Formación */}
                    <section>
                      <h3 className="text-2xl font-semibold text-indigo-500 mb-4">
                        🎯 Formación de usuarios de la información
                      </h3>
                      <ul className="list-disc pl-6 space-y-2 marker:text-indigo-400">
                        <li>
                          Busca dotar de competencias para acceder y usar
                          información eficientemente.
                        </li>
                        <li>
                          Implica intercambio de experiencias y aprendizajes
                          continuos.
                        </li>
                        <li>
                          Se adapta a comunidades con necesidades específicas.
                        </li>
                      </ul>
                    </section>

                    {/* Programas */}
                    <section>
                      <h3 className="text-2xl font-semibold text-indigo-500 mb-4">
                        📑 Programas de formación
                      </h3>
                      <p className="mb-3">
                        Requieren planificación didáctica clara con objetivos
                        definidos. Sus etapas son:
                      </p>
                      <ol className="list-decimal pl-6 space-y-1 marker:text-indigo-400">
                        <li>Definición del problema.</li>
                        <li>Análisis del entorno institucional.</li>
                        <li>Diagnóstico de necesidades.</li>
                        <li>Establecer objetivos.</li>
                        <li>Elaborar contenidos.</li>
                        <li>Seleccionar medios didácticos.</li>
                        <li>Producir materiales.</li>
                        <li>Implementar el programa.</li>
                        <li>Evaluar (formativa y sumativa).</li>
                      </ol>
                    </section>

                    {/* Aplicaciones */}
                    <section>
                      <h3 className="text-2xl font-semibold text-indigo-500 mb-4">
                        🌐 Aplicaciones Web 2.0 y educación
                      </h3>
                      <p className="mb-3">
                        Combinan <strong>tecnología</strong>,{" "}
                        <strong>información</strong> y{" "}
                        <strong>comunicación</strong>. Permiten crear, almacenar
                        y transmitir información, fomentando la colaboración.
                      </p>
                      <ul className="list-disc pl-6 space-y-2 marker:text-indigo-400">
                        <li>
                          <strong>Tecnologías de información:</strong>{" "}
                          computadoras, software, web, almacenamiento.
                        </li>
                        <li>
                          <strong>Tecnologías de comunicación:</strong>{" "}
                          internet, telefonía, televisión, radio.
                        </li>
                      </ul>
                    </section>

                    {/* Ventajas */}
                    <section>
                      <h3 className="text-2xl font-semibold text-indigo-500 mb-4">
                        ✅ Ventajas
                      </h3>
                      <ul className="list-disc pl-6 space-y-2 marker:text-green-500">
                        <li>Acceso global desde internet.</li>
                        <li>Multiplataforma y multiplataforma.</li>
                        <li>Actualización automática.</li>
                        <li>Bajo requerimiento técnico.</li>
                        <li>Colaboración remota y simultánea.</li>
                      </ul>
                    </section>

                    {/* Limitaciones */}
                    <section>
                      <h3 className="text-2xl font-semibold text-indigo-500 mb-4">
                        ⚠️ Limitaciones
                      </h3>
                      <ul className="list-disc pl-6 space-y-2 marker:text-red-500">
                        <li>Posible acceso de terceros a la información.</li>
                        <li>Cambios inesperados en condiciones de uso.</li>
                        <li>
                          Riesgo de pérdida de datos (copias de seguridad
                          necesarias).
                        </li>
                      </ul>
                    </section>

                    {/* Conclusión */}
                    <section className="bg-indigo-50 dark:bg-indigo-900/40 p-6 rounded-xl shadow-inner">
                      <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-300 mb-3">
                        🔎 Conclusión
                      </h3>
                      <p className="leading-relaxed">
                        La integración de <strong>aplicaciones Web 2.0</strong>{" "}
                        en programas de formación mejora la{" "}
                        <strong>gestión de la información</strong>, fomenta la{" "}
                        <strong>colaboración</strong> y desarrolla{" "}
                        <strong>competencias digitales</strong>. No obstante, se
                        deben considerar riesgos de seguridad y dependencia
                        tecnológica.
                      </p>
                    </section>
                  </div>
                </div>
              </>
            </div>
          </div>
        </div>

        {/* Mapa conceptual mejorado */}
        <div className="w-1/2 bg-slate-50 dark:bg-slate-800 rounded-xl shadow p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">
              Mapa conceptual interactivo — Mejorado
            </h2>
            <div className="flex gap-2">
              <button
                onClick={addNode}
                className="px-3 py-1 rounded bg-amber-500 text-black"
              >
                Añadir nodo
              </button>
              <button
                onClick={exportSVG}
                className="px-3 py-1 rounded bg-indigo-600 text-white"
              >
                Exportar SVG
              </button>
              <button
                onClick={() => exportPNG()}
                className="px-3 py-1 rounded bg-indigo-700 text-white"
              >
                Exportar PNG
              </button>
              <button
                onClick={resetToDefault}
                className="px-3 py-1 rounded bg-red-600 text-white"
              >
                Reset
              </button>
            </div>
          </div>

          <div
            className="flex-1 border border-dashed rounded overflow-hidden relative"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            <svg
              ref={svgRef}
              id="map-svg"
              className="w-full h-full"
              onWheel={handleWheel}
              onPointerDown={(e) => {
                if (e.button === 1) startPan(e);
              }}
            >
              <defs>
                <filter
                  id="shadow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feDropShadow
                    dx="0"
                    dy="6"
                    stdDeviation="10"
                    floodOpacity="0.2"
                  />
                </filter>
              </defs>

              <g id="viewport">
                {/* connections */}
                {connections.map((c, i) => {
                  const from = nodes.find((n) => n.id === c.from);
                  const to = nodes.find((n) => n.id === c.to);
                  if (!from || !to) return null;
                  const pathD = `M ${from.x} ${from.y} C ${
                    (from.x + to.x) / 2
                  } ${from.y}, ${(from.x + to.x) / 2} ${to.y}, ${to.x} ${to.y}`;
                  const isSelected = selectedConnection === i;
                  return (
                    <g key={i}>
                      <path
                        d={pathD}
                        stroke={isSelected ? "#ef4444" : "#94a3b8"}
                        strokeWidth={isSelected ? 5 : 3}
                        fill="none"
                        strokeLinecap="round"
                        style={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectConnection(i);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          selectConnection(i);
                        }}
                      />
                      <circle cx={to.x} cy={to.y} r={6} fill="#e6edf3" />
                    </g>
                  );
                })}

                {/* nodes */}
                {nodes.map((node) => {
                  const s = typeStyles[node.type] || typeStyles.default;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x} ${node.y})`}
                    >
                      <g
                        onPointerDown={(e) => handleNodePointerDown(e, node)}
                        onPointerUp={() => (draggingRef.current = null)}
                        onDoubleClick={() => editNode(node)}
                        onClick={(e) => handleNodeClick(e, node)}
                        onContextMenu={(e) => openContext(e, node)}
                        style={{ cursor: "grab" }}
                      >
                        <circle
                          r={s.radius}
                          fill={s.fill}
                          filter="url(#shadow)"
                        />
                        <foreignObject
                          x={-s.radius}
                          y={-22}
                          width={s.radius * 2}
                          height={44}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              pointerEvents: "none",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: s.textColor,
                                textAlign: "center",
                                padding: "0 8px",
                              }}
                            >
                              {node.text}
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Context menu */}
            {contextNode && (
              <div
                style={{
                  position: "fixed",
                  left: contextPos.x,
                  top: contextPos.y,
                  zIndex: 50,
                }}
                onMouseLeave={closeContext}
              >
                <div className="bg-white dark:bg-slate-800 border rounded shadow p-2 text-sm">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        editNode(contextNode);
                        closeContext();
                      }}
                      className="px-2 py-1 text-left"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => {
                        setConnectSelect(contextNode.id);
                        closeContext();
                      }}
                      className="px-2 py-1 text-left"
                    >
                      🔗 Conectar desde aquí
                    </button>
                    <button
                      onClick={() => {
                        deleteNode(contextNode);
                        closeContext();
                      }}
                      className="px-2 py-1 text-left text-red-600"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Help / footer */}
            <div
              className="dark:text-slate-400"
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                fontSize: 12,
              }}
            >
              Arrastrá nodos, doble clic para editar, clic para
              seleccionar/crear conexión. Hacé clic en una conexión para
              seleccionarla y luego "Eliminar conexión". Rueda para zoom. Click
              del mouse para arrastrar.
            </div>

            {/* Delete selected connection button (floating) */}
            <div
              style={{ position: "absolute", top: 12, right: 12, zIndex: 40 }}
            >
              <button
                onClick={deleteSelectedConnection}
                disabled={selectedConnection == null}
                className={`px-3 py-1 rounded ${
                  selectedConnection == null
                    ? "bg-slate-300 text-slate-600"
                    : "bg-red-600 text-white"
                }`}
              >
                Eliminar conexión
              </button>
            </div>
          </div>

          <div className="mt-2 text-sm flex items-center gap-3">
            <div>
              Seleccionado para conectar:{" "}
              <strong>{connectSelect || "—"}</strong>
            </div>
            <div>
              Conexión seleccionada:{" "}
              <strong>
                {selectedConnection == null ? "—" : selectedConnection}
              </strong>
            </div>
            <div className="ml-auto">
              Nodos: {nodes.length} · Conexiones: {connections.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
