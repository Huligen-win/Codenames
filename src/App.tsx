import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useLocalPlayer } from './hooks/useLocalPlayer';
import { LocalPlayerContext } from './context/LocalPlayerContext';
import { HomePage } from './pages/HomePage';
import { CreateGamePage } from './pages/CreateGamePage';
import { GameRoom } from './pages/GameRoom';

export function App() {
  const { localPlayer, setName } = useLocalPlayer();

  return (
    <LocalPlayerContext.Provider value={{ localPlayer, setName }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateGamePage />} />
          <Route path="/game/:roomCode" element={<GameRoom />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </LocalPlayerContext.Provider>
  );
}
