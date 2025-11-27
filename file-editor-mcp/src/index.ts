#!/usr/bin/env node

/**
 * Servidor MCP (Model Context Protocol) - Completo
 * 
 * Este servidor implementa herramientas avanzadas para manipulación de archivos,
 * búsqueda, análisis de código y Git integration.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import os from "os";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Definición de las herramientas disponibles en este servidor
 */
const TOOLS: Tool[] = [
    {
        name: "get_system_info",
        description: "Obtiene información básica del sistema operativo",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "calculate",
        description: "Realiza operaciones matemáticas básicas",
        inputSchema: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    description: "Operación a realizar: add, subtract, multiply, divide",
                    enum: ["add", "subtract", "multiply", "divide"],
                },
                a: {
                    type: "number",
                    description: "Primer número",
                },
                b: {
                    type: "number",
                    description: "Segundo número",
                },
            },
            required: ["operation", "a", "b"],
        },
    },
    {
        name: "read_file_lines",
        description: "Lee un rango específico de líneas de un archivo",
        inputSchema: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "Ruta absoluta al archivo",
                },
                startLine: {
                    type: "number",
                    description: "Línea inicial (1-based)",
                },
                endLine: {
                    type: "number",
                    description: "Línea final (inclusive)",
                },
            },
            required: ["filePath", "startLine", "endLine"],
        },
    },
    {
        name: "edit_file_lines",
        description: "Edita líneas específicas de un archivo basándose en el número de línea",
        inputSchema: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "Ruta absoluta al archivo",
                },
                edits: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            line: {
                                type: "number",
                                description: "Número de línea a editar (1-based)",
                            },
                            content: {
                                type: "string",
                                description: "Nuevo contenido de la línea",
                            },
                        },
                        required: ["line", "content"],
                    },
                    description: "Lista de ediciones a realizar",
                },
            },
            required: ["filePath", "edits"],
        },
    },
    {
        name: "search_files",
        description: "Busca texto o patrones en archivos de un directorio recursivamente",
        inputSchema: {
            type: "object",
            properties: {
                directory: {
                    type: "string",
                    description: "Directorio donde buscar",
                },
                pattern: {
                    type: "string",
                    description: "Texto o expresión regular a buscar",
                },
                recursive: {
                    type: "boolean",
                    description: "Si es true, busca en subdirectorios",
                    default: true,
                },
            },
            required: ["directory", "pattern"],
        },
    },
    // NUEVAS HERRAMIENTAS - FASE 3
    {
        name: "insert_lines",
        description: "Inserta nuevas líneas en una posición específica del archivo",
        inputSchema: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "Ruta absoluta al archivo",
                },
                position: {
                    type: "number",
                    description: "Posición donde insertar (0 = inicio, N = después de línea N)",
                },
                lines: {
                    type: "array",
                    items: { type: "string" },
                    description: "Líneas a insertar",
                },
            },
            required: ["filePath", "position", "lines"],
        },
    },
    {
        name: "delete_lines",
        description: "Elimina un rango de líneas del archivo",
        inputSchema: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "Ruta absoluta al archivo",
                },
                startLine: {
                    type: "number",
                    description: "Línea inicial a eliminar (1-based)",
                },
                endLine: {
                    type: "number",
                    description: "Línea final a eliminar (inclusive)",
                },
            },
            required: ["filePath", "startLine", "endLine"],
        },
    },
    {
        name: "list_directory",
        description: "Lista archivos y directorios con filtros opcionales",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Ruta del directorio",
                },
                recursive: {
                    type: "boolean",
                    description: "Listar recursivamente",
                    default: false,
                },
                extensions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Filtrar por extensiones (ej. [\".ts\", \".js\"])",
                },
                maxDepth: {
                    type: "number",
                    description: "Profundidad máxima si recursivo",
                    default: 3,
                },
            },
            required: ["path"],
        },
    },
    {
        name: "regex_replace",
        description: "Reemplaza texto usando expresiones regulares",
        inputSchema: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "Ruta absoluta al archivo",
                },
                pattern: {
                    type: "string",
                    description: "Patrón regex como string",
                },
                replacement: {
                    type: "string",
                    description: "Texto de reemplazo",
                },
                flags: {
                    type: "string",
                    description: "Flags de regex (g, i, m, etc.)",
                    default: "g",
                },
            },
            required: ["filePath", "pattern", "replacement"],
        },
    },
    {
        name: "get_file_info",
        description: "Obtiene metadata del archivo (tamaño, fechas, permisos)",
        inputSchema: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "Ruta absoluta al archivo",
                },
            },
            required: ["filePath"],
        },
    },
    {
        name: "git_status",
        description: "Obtiene el estado del repositorio Git",
        inputSchema: {
            type: "object",
            properties: {
                repoPath: {
                    type: "string",
                    description: "Ruta del repositorio Git",
                },
            },
            required: ["repoPath"],
        },
    },
    {
        name: "git_diff",
        description: "Muestra diferencias de archivos en Git",
        inputSchema: {
            type: "object",
            properties: {
                repoPath: {
                    type: "string",
                    description: "Ruta del repositorio Git",
                },
                filePath: {
                    type: "string",
                    description: "Archivo específico (opcional)",
                },
                staged: {
                    type: "boolean",
                    description: "Ver cambios staged",
                    default: false,
                },
            },
            required: ["repoPath"],
        },
    },
];

/**
 * Función auxiliar para buscar archivos recursivamente
 */
async function searchInDirectory(dir: string, pattern: string, recursive: boolean = true): Promise<any[]> {
    const results: any[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (recursive && entry.name !== "node_modules" && entry.name !== ".git") {
                results.push(...(await searchInDirectory(fullPath, pattern, recursive)));
            }
        } else {
            try {
                const content = await fs.readFile(fullPath, "utf-8");
                const lines = content.split("\n");
                const regex = new RegExp(pattern, "g");

                lines.forEach((line, index) => {
                    if (line.includes(pattern) || regex.test(line)) {
                        results.push({
                            file: fullPath,
                            line: index + 1,
                            content: line.trim()
                        });
                    }
                });
            } catch (err) {
                // Ignorar errores de lectura
            }
        }
    }
    return results;
}

/**
 * Función auxiliar para listar directorio recursivamente
 */
async function listDirectoryRecursive(
    dir: string,
    extensions: string[] | undefined,
    currentDepth: number,
    maxDepth: number
): Promise<any[]> {
    if (currentDepth > maxDepth) return [];

    const results: any[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const ext = path.extname(entry.name);

        if (entry.isDirectory()) {
            if (entry.name !== "node_modules" && entry.name !== ".git") {
                results.push({
                    name: entry.name,
                    path: fullPath,
                    type: "directory",
                });
                if (currentDepth < maxDepth) {
                    results.push(...(await listDirectoryRecursive(fullPath, extensions, currentDepth + 1, maxDepth)));
                }
            }
        } else {
            if (!extensions || extensions.includes(ext)) {
                const stats = await fs.stat(fullPath);
                results.push({
                    name: entry.name,
                    path: fullPath,
                    type: "file",
                    size: stats.size,
                    extension: ext,
                });
            }
        }
    }
    return results;
}

/**
 * Implementación de las herramientas
 */
async function handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
        case "get_system_info":
            return {
                platform: os.platform(),
                architecture: os.arch(),
                hostname: os.hostname(),
                cpus: os.cpus().length,
                totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`,
                freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB`,
                uptime: `${Math.round(os.uptime() / 3600)} horas`,
                nodeVersion: process.version,
            };

        case "calculate":
            const { operation, a, b } = args;
            let result: number;

            switch (operation) {
                case "add":
                    result = a + b;
                    break;
                case "subtract":
                    result = a - b;
                    break;
                case "multiply":
                    result = a * b;
                    break;
                case "divide":
                    if (b === 0) {
                        throw new Error("No se puede dividir por cero");
                    }
                    result = a / b;
                    break;
                default:
                    throw new Error(`Operación no soportada: ${operation}`);
            }

            return {
                operation,
                a,
                b,
                result,
                formula: `${a} ${operation} ${b} = ${result}`,
            };

        case "read_file_lines":
            const { filePath, startLine, endLine } = args;
            try {
                const content = await fs.readFile(filePath, "utf-8");
                const lines = content.split("\n");

                if (startLine < 1 || endLine > lines.length || startLine > endLine) {
                    throw new Error(`Rango de líneas inválido. El archivo tiene ${lines.length} líneas.`);
                }

                const selectedLines = lines.slice(startLine - 1, endLine);

                return {
                    file: filePath,
                    totalLines: lines.length,
                    range: `${startLine}-${endLine}`,
                    content: selectedLines.join("\n"),
                    lines: selectedLines.map((line, idx) => ({
                        number: startLine + idx,
                        text: line
                    }))
                };
            } catch (error) {
                throw new Error(`Error al leer archivo: ${error instanceof Error ? error.message : String(error)}`);
            }

        case "edit_file_lines":
            const { filePath: editPath, edits } = args;
            try {
                const content = await fs.readFile(editPath, "utf-8");
                let lines = content.split("\n");
                const totalLines = lines.length;

                for (const edit of edits) {
                    if (edit.line < 1 || edit.line > totalLines) {
                        throw new Error(`Línea ${edit.line} fuera de rango. El archivo tiene ${totalLines} líneas.`);
                    }
                }

                for (const edit of edits) {
                    lines[edit.line - 1] = edit.content;
                }

                const newContent = lines.join("\n");
                await fs.writeFile(editPath, newContent, "utf-8");

                return {
                    success: true,
                    message: `Se editaron ${edits.length} líneas en ${editPath}`,
                    editedLines: edits.map((e: any) => e.line)
                };
            } catch (error) {
                throw new Error(`Error al editar archivo: ${error instanceof Error ? error.message : String(error)}`);
            }

        case "search_files":
            const { directory, pattern, recursive } = args;
            try {
                const results = await searchInDirectory(directory, pattern, recursive !== false);
                return {
                    pattern,
                    directory,
                    matchesCount: results.length,
                    matches: results.slice(0, 50)
                };
            } catch (error) {
                throw new Error(`Error en búsqueda: ${error instanceof Error ? error.message : String(error)}`);
            }

        // NUEVAS HERRAMIENTAS - FASE 3

        case "insert_lines":
            const { filePath: insertPath, position, lines: linesToInsert } = args;
            try {
                const content = await fs.readFile(insertPath, "utf-8");
                let lines = content.split("\n");

                if (position < 0 || position > lines.length) {
                    throw new Error(`Posición ${position} fuera de rango. El archivo tiene ${lines.length} líneas.`);
                }

                lines.splice(position, 0, ...linesToInsert);

                const newContent = lines.join("\n");
                await fs.writeFile(insertPath, newContent, "utf-8");

                return {
                    success: true,
                    message: `Se insertaron ${linesToInsert.length} líneas en posición ${position}`,
                    totalLines: lines.length
                };
            } catch (error) {
                throw new Error(`Error al insertar líneas: ${error instanceof Error ? error.message : String(error)}`);
            }

        case "delete_lines":
            const { filePath: deletePath, startLine: delStart, endLine: delEnd } = args;
            try {
                const content = await fs.readFile(deletePath, "utf-8");
                let lines = content.split("\n");

                if (delStart < 1 || delEnd > lines.length || delStart > delEnd) {
                    throw new Error(`Rango inválido. El archivo tiene ${lines.length} líneas.`);
                }

                const deletedCount = delEnd - delStart + 1;
                lines.splice(delStart - 1, deletedCount);

                const newContent = lines.join("\n");
                await fs.writeFile(deletePath, newContent, "utf-8");

                return {
                    success: true,
                    message: `Se eliminaron ${deletedCount} líneas (${delStart}-${delEnd})`,
                    remainingLines: lines.length
                };
            } catch (error) {
                throw new Error(`Error al eliminar líneas: ${error instanceof Error ? error.message : String(error)}`);
            }

        case "list_directory":
            const { path: dirPath, recursive: listRecursive, extensions, maxDepth } = args;
            try {
                const results = listRecursive
                    ? await listDirectoryRecursive(dirPath, extensions, 0, maxDepth || 3)
                    : (await fs.readdir(dirPath, { withFileTypes: true })).map(entry => ({
                        name: entry.name,
                        path: path.join(dirPath, entry.name),
                        type: entry.isDirectory() ? "directory" : "file"
                    }));

                return {
                    path: dirPath,
                    count: results.length,
                    items: results
                };
            } catch (error) {
                throw new Error(`Error al listar directorio: ${error instanceof Error ? error.message : String(error)}`);
            }

        case "regex_replace":
            const { filePath: regexPath, pattern: regexPattern, replacement, flags } = args;
            try {
                const content = await fs.readFile(regexPath, "utf-8");
                const regex = new RegExp(regexPattern, flags || "g");
                const newContent = content.replace(regex, replacement);

                await fs.writeFile(regexPath, newContent, "utf-8");

                const matches = content.match(regex);
                return {
                    success: true,
                    message: `Reemplazo completado`,
                    replacements: matches ? matches.length : 0,
                    pattern: regexPattern
                };
            } catch (error) {
                throw new Error(`Error en regex replace: ${error instanceof Error ? error.message : String(error)}`);
            }

        case "get_file_info":
            const { filePath: infoPath } = args;
            try {
                const stats = await fs.stat(infoPath);
                return {
                    path: infoPath,
                    size: stats.size,
                    sizeReadable: `${(stats.size / 1024).toFixed(2)} KB`,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    accessed: stats.atime,
                    isFile: stats.isFile(),
                    isDirectory: stats.isDirectory(),
                };
            } catch (error) {
                throw new Error(`Error al obtener info: ${error instanceof Error ? error.message : String(error)}`);
            }

        case "git_status":
            const { repoPath } = args;
            try {
                const { stdout } = await execAsync("git status --porcelain", { cwd: repoPath });
                const lines = stdout.trim().split("\n").filter(line => line);

                const files = lines.map(line => {
                    const status = line.substring(0, 2);
                    const filePath = line.substring(3);
                    return { status, filePath };
                });

                return {
                    repoPath,
                    files,
                    totalChanges: files.length
                };
            } catch (error) {
                throw new Error(`Error en git status: ${error instanceof Error ? error.message : String(error)}`);
            }

        case "git_diff":
            const { repoPath: diffRepoPath, filePath: diffFilePath, staged } = args;
            try {
                let command = staged ? "git diff --cached" : "git diff";
                if (diffFilePath) {
                    command += ` -- "${diffFilePath}"`;
                }

                const { stdout } = await execAsync(command, { cwd: diffRepoPath });

                return {
                    repoPath: diffRepoPath,
                    filePath: diffFilePath || "all files",
                    staged: staged || false,
                    diff: stdout || "No changes"
                };
            } catch (error) {
                throw new Error(`Error en git diff: ${error instanceof Error ? error.message : String(error)}`);
            }

        default:
            throw new Error(`Herramienta desconocida: ${name}`);
    }
}

/**
 * Inicialización del servidor MCP
 */
async function main() {
    const server = new Server(
        {
            name: "file-editor-mcp",
            version: "2.0.0",
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: TOOLS,
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        try {
            const result = await handleToolCall(name, args || {});
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("Servidor MCP v2.0 iniciado correctamente");
    console.error(`Herramientas disponibles (${TOOLS.length}):`, TOOLS.map(t => t.name).join(", "));
}

main().catch((error) => {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
});
