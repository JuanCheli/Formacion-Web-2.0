import React, { useState, useRef, useEffect } from "react";

// Formación de usuarios — Documento colaborativo + Mapa conceptual mejorado (v2)
// Cambios en esta versión:
// - Eliminar conexiones entre nodos (selección y borrado)
// - Vista previa con formato simple (markdown-like) para el documento formalizado
// - Eliminado el slider extra: ahora solo el textarea tiene scroll (un único scrollbar)
// - Mejoras menores en la UI para manejo de conexiones

export default function App() {
  const initialDocument = `# Formación de usuarios de la información mediante aplicaciones Web 2.0

## Resumen

La formación de usuarios de la información mediante aplicaciones Web 2.0 propone un marco pedagógico y operativo para capacitar a usuarios en la búsqueda, evaluación, gestión y uso ético de la información. Este programa integra herramientas colaborativas, contenidos didácticos y estrategias de evaluación para co-construir competencias informacionales.

## Objetivos

- **Desarrollar** habilidades para localizar y evaluar información en línea.
- **Promover** el uso crítico y ético de recursos digitales.
- **Implementar** competencias para gestionar y comunicar información mediante aplicaciones Web 2.0.

## Metodología

El programa se organiza en fases: diagnóstico, diseño curricular, producción de recursos, implementación y evaluación. Se emplean metodologías activas (aprendizaje basado en tareas, proyectos colaborativos y microlearning) y herramientas Web 2.0 que favorecen la colaboración y el acceso multiplataforma.

## Contenidos principales

1. Alfabetización informacional: conceptos básicos, tipos de fuentes, evaluación de la fiabilidad.
2. Herramientas colaborativas: wikis, blogs, gestores bibliográficos, plataformas de curación de contenidos.
3. Búsqueda avanzada: operadores, bases de datos académicas y metabuscadores.
4. Gestión y organización: etiquetas, carpetas, entornos personales de aprendizaje (PLE).
5. Comunicación y difusión: licencias, citación y buenas prácticas.

## Evaluación

Se recomienda combinar evaluación formativa (seguimiento continuo de tareas) y sumativa (proyectos finales). Indicadores: precisión en búsqueda, capacidad crítica para evaluar fuentes, calidad de productos colaborativos y cumplimiento de buenas prácticas éticas.

## Alcances y limitaciones

Las herramientas Web 2.0 amplían el acceso y la colaboración, pero requieren gestión de privacidad, planes de respaldo y adaptación a la infraestructura institucional.

## Conclusiones y recomendaciones

Se sugiere integrar la formación en la planificación institucional, ofrecer capacitación continua para docentes y estudiantes, y evaluar periódicamente la eficacia del programa mediante métricas claras.
`;

  const [documentText, setDocumentText] = useState(() => {
    return localStorage.getItem("fu_formal_doc_v2") || initialDocument;
  });

  useEffect(() => {
    localStorage.setItem("fu_formal_doc_v2", documentText);
  }, [documentText]);

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

  // Export functions
  function exportJSON() {
    const data = { document: documentText, nodes, connections };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formacion_usuarios_mapa_v2.json";
    a.click();
    URL.revokeObjectURL(url);
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

  // Simple markdown-like formatter for preview
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function markdownToHtml(md) {
    const lines = md.split("\n");
    let html = "";
    let inList = false;
    for (let raw of lines) {
      const line = raw.trim();
      if (line.startsWith("### ")) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h3>${escapeHtml(line.slice(4))}</h3>`;
      } else if (line.startsWith("## ")) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h2>${escapeHtml(line.slice(3))}</h2>`;
      } else if (line.startsWith("# ")) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h1>${escapeHtml(line.slice(2))}</h1>`;
      } else if (line.startsWith("- ")) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${escapeHtml(line.slice(2)).replace(
          /\*\*(.*?)\*\*/g,
          "<strong>$1</strong>"
        )}</li>`;
      } else if (line.match(/^\d+\.\s/)) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<p>${escapeHtml(line)}</p>`;
      } else if (line === "") {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += "<p></p>";
      } else {
        html += `<p>${escapeHtml(line).replace(
          /\*\*(.*?)\*\*/g,
          "<strong>$1</strong>"
        )}</p>`;
      }
    }
    if (inList) html += "</ul>";
    return html;
  }

  return (
    <div className="w-full h-screen p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="flex gap-4 h-full">
        {/* Documento formal */}
        <div className="w-1/2 bg-slate-50 dark:bg-slate-800 rounded-xl shadow p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Documento formalizado</h2>
            <div className="flex gap-2">
              <button
                onClick={exportJSON}
                className="px-3 py-1 rounded bg-blue-600 text-white"
              >
                Exportar JSON
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(documentText);
                }}
                className="px-3 py-1 rounded bg-emerald-600 text-white"
              >
                Copiar
              </button>
            </div>
          </div>

          {/* Preview (formateado) */}
          <div
            className="mb-3 p-3 bg-white dark:bg-slate-900 rounded border overflow-auto"
            style={{ minHeight: 120 }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: markdownToHtml(documentText) }}
              style={{ lineHeight: 1.5 }}
            />
          </div>

          {/* Editor: single scrollbar only (textarea tiene overflow) */}
          <div
            className="flex-1 p-0"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <textarea
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              className="w-full p-3 resize-none outline-none text-sm overflow-y-auto"
              style={{
                flex: 1,
                minHeight: "200px", // asegura un alto inicial
                borderRadius: 8,
                border: "1px solid rgba(15,23,42,0.06)",
                background: "transparent",
              }}
            />
          </div>

          <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Vista previa dinámica. Editá el texto abajo; el formato se actualiza
            en tiempo real.
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
            <div className="dark:text-slate-400"
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                fontSize: 12
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
