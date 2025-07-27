/**
 * APLICACIÓN PRINCIPAL - FRONTEND
 * 
 * Componente raíz de la aplicación React que integra
 * el chat con MCP y todas las funcionalidades.
 */

import { Chat } from './components/Chat';
import './App.css';

function App() {
  return (
    <div className="App">
      <Chat />
    </div>
  );
}

export default App;
