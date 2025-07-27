/**
 * MAIN APPLICATION - FRONTEND
 * 
 * Root React component that integrates
 * the chat with MCP and all functionalities.
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
