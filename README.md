# 🚀 MCP Tutorial Completo - TypeScript + Node.js + React

## 📋 Descripción

Este es un ejemplo completo del **Model Context Protocol (MCP)** implementado en TypeScript con Node.js y React. El proyecto demuestra cómo crear un servidor MCP con múltiples herramientas, integrarlo con la API de OpenAI, y construir un frontend interactivo.

**Model Context Protocol (MCP)** es un protocolo estándar que permite a los modelos de IA interactuar de forma segura con herramientas y datos externos.

### Conceptos Clave:

- **Recursos**: Datos que el modelo puede leer (archivos, APIs, etc.)
- **Herramientas**: Acciones que el modelo puede ejecutar (cálculos, APIs, etc.)
- **Prompts**: Plantillas reutilizables para interacciones
- **Cliente**: Quien consume los servicios MCP
- **Servidor**: Quien expone los servicios MCP

## 🏗️ Arquitectura del Proyecto

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│────│  Node.js Backend│────│   OpenAI API    │
│      (Chat)     │    │   (Orchestrator)│    │   (GPT Model)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                │
                        ┌─────────────────┐
                        │   MCP Server    │
                        │  (Tools & Data) │
                        └─────────────────┘
```

## 🚀 Instalación y Ejecución

### 1. Instalar dependencias:
```bash
npm run install-all
```

### 2. Configurar variables de entorno:
Crea un archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

Edita el archivo `.env` y configura tu API key de OpenAI:
```env
OPENAI_API_KEY=tu_api_key_aqui
OPENWEATHER_API_KEY=tu_openweather_api_key_aqui  # Opcional
PORT=3001
NODE_ENV=development
```

### 3. Compilar el proyecto:
```bash
npm run build:all
```

### 4. Ejecutar en modo desarrollo (todos los servicios):
```bash
npm run dev
```

### 5. O ejecutar en modo producción:
```bash
# Servidor MCP + Backend solamente
npm run start

# Frontend (en otra terminal)
npm run frontend:start
```

### 6. Servicios disponibles:
- **Frontend**: http://localhost:5173 (dev) / http://localhost:4173 (preview)
- **Backend API**: http://localhost:3001/api
- **Admin Panel**: http://localhost:3001/

Esto iniciará:
- 🔧 Servidor MCP en stdio
- 🚀 Backend en puerto 3001
- 💬 Frontend en puerto 3000

## 📁 Estructura del Proyecto

```
mcp-complete-example/
├── src/
│   ├── mcp-server/          # Servidor MCP
│   │   ├── server.ts        # Servidor principal
│   │   ├── tools/           # Definición de herramientas
│   │   ├── resources/       # Definición de recursos
│   │   └── database/        # SQLite y esquemas
│   ├── backend/             # Backend Node.js
│   │   ├── app.ts           # Servidor Express
│   │   ├── services/        # Servicios (OpenAI, MCP)
│   │   └── routes/          # Rutas de API
│   └── shared/              # Tipos compartidos
├── frontend/                # Aplicación React
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── services/        # Servicios frontend
│   │   └── types/           # Tipos TypeScript
└── README.md
```

## 🛠️ Herramientas MCP Incluidas

1. **Calculadora**: Operaciones matemáticas básicas
2. **Clima**: Información meteorológica usando OpenWeather API
3. **Notas**: Sistema CRUD para gestionar notas
4. **Base de Datos**: Queries SQL en SQLite
5. **Sistema de Archivos**: Lectura/escritura de archivos

## 💡 Casos de Uso Demostrados

- ✅ **Cálculos**: "Calcula 15% de descuento sobre $200"
- ✅ **Clima**: "¿Qué tiempo hace en Madrid?"
- ✅ **Notas**: "Crea una nota sobre mi reunión de mañana"
- ✅ **Datos**: "Muestra todos los usuarios de la base de datos"
- ✅ **Archivos**: "Lee el contenido del archivo config.json"

## 🔧 Configuración Adicional

### OpenWeather API (opcional):
1. Registrarse en [OpenWeatherMap](https://openweathermap.org/api)
2. Agregar `OPENWEATHER_API_KEY=tu_key` al archivo `.env`

### Base de Datos:
El proyecto usa SQLite y se crea automáticamente la primera vez.

## 📚 Aprendizaje Paso a Paso

Cada archivo está ampliamente comentado para explicar:
- Cómo funcionan los conceptos MCP
- Patrones de diseño utilizados
- Mejores prácticas de implementación
- Manejo de errores y validaciones

## 🧪 Testing

```bash
npm test
```

## 📖 Recursos Adicionales

- [Documentación oficial MCP](https://modelcontextprotocol.io/)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Ejemplos de servidores](https://github.com/modelcontextprotocol/servers)

## 🤝 Contribuir

Este proyecto es educativo. Siéntete libre de:
- Agregar nuevas herramientas MCP
- Mejorar la interfaz React
- Optimizar la integración con OpenAI
- Agregar más casos de uso

## ⚠️ Notas Importantes

- Requiere Node.js 18+
- La API key de OpenAI es necesaria para el funcionamiento completo
- Algunos ejemplos requieren APIs externas (clima, etc.)
