# Servidor MCP - File Editor v2.0

Servidor MCP (Model Context Protocol) avanzado con 12 herramientas para manipulación de archivos, búsqueda, análisis de código y Git integration. Diseñado para extender las capacidades de clientes MCP como Antigravity con edición precisa estilo VS Code.

## 🚀 Características

Este servidor implementa **12 herramientas avanzadas** organizadas en categorías:

### Herramientas Básicas
1. **get_system_info**: Obtiene información del sistema operativo
2. **calculate**: Realiza operaciones matemáticas básicas

### Manipulación de Archivos (Buffer-style)
3. **read_file_lines**: Lee rangos específicos de líneas (lectura parcial)
4. **edit_file_lines**: Edita líneas específicas por número (sin ambigüedad)
5. **insert_lines**: Inserta nuevas líneas en cualquier posición
6. **delete_lines**: Elimina rangos de líneas

### Búsqueda y Análisis
7. **search_files**: Búsqueda recursiva de texto/patrones
8. **regex_replace**: Reemplazo usando expresiones regulares
9. **list_directory**: Lista archivos con filtros (extensiones, recursivo)
10. **get_file_info**: Obtiene metadata (tamaño, fechas, permisos)

### Git Integration
11. **git_status**: Estado del repositorio (archivos modificados, staged, etc.)
12. **git_diff**: Muestra diferencias de archivos

## 📋 Requisitos

- Node.js 18+ 
- npm o yarn

## 🔧 Instalación

```bash
# Instalar dependencias
npm install
```

## 🏗️ Compilación

```bash
# Compilar TypeScript a JavaScript
npm run build
```

## ▶️ Ejecución

```bash
# Ejecutar el servidor compilado
npm start

# O compilar y ejecutar en un solo paso
npm run dev
```

## 🔌 Configuración en Antigravity

Para usar este servidor en Antigravity, debes agregar la configuración en tu archivo de configuración MCP:

**Ubicación del archivo**: `C:\Users\user\.gemini\antigravity\mcp_config.json`

```json
{
  "mcpServers": {
    "file-editor-mcp": {
      "command": "node",
      "args": ["C:\\Users\\user\\mcp-servers\\file-editor-mcp\\build\\index.js"],
      "env": {}
    }
  }
}
```

### Pasos para registrar el servidor:

1. Compila el proyecto: `npm run build`
2. Edita el archivo `mcp_config.json` con la configuración anterior
3. Reinicia Antigravity para que cargue el nuevo servidor
4. Las herramientas estarán disponibles para usar

## 📖 Uso de las Herramientas

### get_system_info
```
Sin parámetros. Retorna información del sistema.
```

### calculate
```json
{
  "operation": "add",  // add, subtract, multiply, divide
  "a": 10,
  "b": 5
}
```

### read_file_lines
Lee un rango específico de líneas de un archivo.
```json
{
  "filePath": "C:\\ruta\\al\\archivo.txt",
  "startLine": 1,
  "endLine": 50
}
```

### edit_file_lines
Edita líneas específicas basándose en el número de línea.
```json
{
  "filePath": "C:\\ruta\\al\\archivo.txt",
  "edits": [
    { "line": 10, "content": "Nuevo contenido línea 10" },
    { "line": 15, "content": "Nuevo contenido línea 15" }
  ]
}
```

### search_files
Busca texto o patrones recursivamente.
```json
{
  "directory": "C:\\ruta\\al\\proyecto",
  "pattern": "texto a buscar",
  "recursive": true
}
```

### insert_lines
Inserta nuevas líneas en una posición.
```json
{
  "filePath": "C:\\ruta\\archivo.txt",
  "position": 10,
  "lines": ["nueva línea 1", "nueva línea 2"]
}
```

### delete_lines
Elimina un rango de líneas.
```json
{
  "filePath": "C:\\ruta\\archivo.txt",
  "startLine": 5,
  "endLine": 10
}
```

### list_directory
Lista archivos con filtros.
```json
{
  "path": "C:\\ruta\\proyecto",
  "recursive": true,
  "extensions": [".ts", ".js"],
  "maxDepth": 3
}
```

### regex_replace
Reemplazo con expresiones regulares.
```json
{
  "filePath": "C:\\ruta\\archivo.js",
  "pattern": "\\bvar\\b",
  "replacement": "const",
  "flags": "g"
}
```

### get_file_info
Obtiene metadata del archivo.
```json
{
  "filePath": "C:\\ruta\\archivo.txt"
}
```

### git_status
Estado del repositorio Git.
```json
{
  "repoPath": "C:\\ruta\\proyecto"
}
```

### git_diff
Diferencias en Git.
```json
{
  "repoPath": "C:\\ruta\\proyecto",
  "filePath": "archivo.js",
  "staged": false
}
```

## 🛠️ Desarrollo

```bash
# Modo watch para desarrollo
npm run watch
```

## 📂 Estructura del Proyecto

```
file-editor-mcp/
├── src/
│   └── index.ts          # Código fuente del servidor
├── build/                # Código compilado (generado)
├── package.json          # Configuración del proyecto
├── tsconfig.json         # Configuración TypeScript
└── README.md            # Este archivo
```

## 🔍 Debugging

El servidor imprime mensajes de diagnóstico en stderr. Para ver estos mensajes durante la ejecución, verifica los logs del cliente MCP (Antigravity).

## 📝 Notas

- Este es un servidor de **demostración** con herramientas básicas
- Puedes extenderlo agregando más herramientas en el arreglo `TOOLS`
- Cada herramienta debe tener su implementación en `handleToolCall()`

## 🎓 Recursos

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP SDK GitHub](https://github.com/modelcontextprotocol)
- [MCP Quickstart](https://modelcontextprotocol.io/quickstart)

## 👨‍💻 Autor

Jorge Magos - 2025

## 📄 Licencia

MIT
