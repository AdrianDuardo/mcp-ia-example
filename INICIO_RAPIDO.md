# 🚀 INICIO RÁPIDO - MCP Tutorial

## ⚡ Quick Start (5 minutos)

### 1. 📥 **Instalación**
```bash
# Instalar dependencias (raíz + frontend)
npm run install-all
```

### 2. 🔑 **Configurar API Keys**
Crear archivo `.env` en la raíz:
```env
# ⚠️ REQUERIDO: OpenAI API Key
OPENAI_API_KEY=sk-tu-api-key-aqui

# 🌤️ OPCIONAL: Weather API (para herramienta del clima)
OPENWEATHER_API_KEY=tu-weather-api-key

# 🔧 CONFIGURACIÓN (opcional)
PORT=3001
FRONTEND_URL=http://localhost:5173
DATABASE_PATH=./database.db
LOG_LEVEL=info
```

### 3. 🏃‍♂️ **Ejecutar**
```bash
# Iniciar todo el stack (MCP + Backend + Frontend)
npm run dev
```

### 4. 🌐 **Acceder**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 🧪 **Pruebas Rápidas**

En el chat del frontend, prueba estos comandos:

### 🧮 **Calculadora**
```
Calcula la raíz cuadrada de 144
```

### 🌤️ **Clima** (si configuraste OPENWEATHER_API_KEY)
```
¿Qué tiempo hace en Madrid?
```

### 📝 **Notas**
```
Crea una nota sobre MCP
```

### 📊 **Base de Datos**
```
Ejecuta: SELECT * FROM usuarios LIMIT 3
```

### 📁 **Archivos**
```
Lista los archivos del directorio actual
```

## 🎯 **Verificación de Funcionamiento**

### ✅ **Frontend** (http://localhost:5173)
- [ ] Se carga la interfaz del chat
- [ ] Se muestran las 5 herramientas en "MCP Tools"
- [ ] Los ejemplos de prompts son clicables

### ✅ **Backend** (http://localhost:3001)
- [ ] GET `/api/health` devuelve status OK
- [ ] GET `/api/mcp/tools` lista las herramientas
- [ ] POST `/api/chat` procesa mensajes

### ✅ **MCP Server**
- [ ] Se conecta automáticamente al iniciar el backend
- [ ] Las 5 herramientas están disponibles
- [ ] La base de datos SQLite se crea automáticamente

## 🐛 **Troubleshooting**

### ❌ **Error: "OpenAI API key not found"**
```bash
# Verifica que el archivo .env existe y tiene OPENAI_API_KEY
ls -la .env
cat .env | grep OPENAI
```

### ❌ **Error: "Port 3001 already in use"**
```bash
# Encuentra y mata el proceso usando el puerto
lsof -ti:3001 | xargs kill -9
# O cambia el puerto en .env
echo "PORT=3002" >> .env
```

### ❌ **Error: "Cannot find module"**
```bash
# Reinstala dependencias
rm -rf node_modules frontend/node_modules
npm run install-all
```

### ❌ **Frontend no carga**
```bash
# Verifica que Vite está corriendo
cd frontend
npm run dev
```

## 📚 **Recursos Adicionales**

- **Documentación completa**: [README.md](README.md)
- **Resumen del proyecto**: [RESUMEN_FINAL.md](RESUMEN_FINAL.md)
- **Model Context Protocol**: https://modelcontextprotocol.io/
- **OpenAI API**: https://platform.openai.com/docs

## 🆘 **Soporte**

Si tienes problemas:
1. Revisa los logs en la consola
2. Verifica que todas las dependencias están instaladas
3. Confirma que el archivo `.env` está configurado correctamente
4. Prueba reiniciar todo: `Ctrl+C` y luego `npm run dev`

---

**¡Listo! Ya tienes un sistema MCP completo funcionando! 🎉**

Explora las diferentes herramientas, experimenta con los prompts, y ¡disfruta aprendiendo sobre el Model Context Protocol!
