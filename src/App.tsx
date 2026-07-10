import { Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import GamePage from './pages/GamePage';
import InstallPrompt from './components/InstallPrompt';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/games/:gameId" element={<GamePage />} />
        <Route path="*" element={<Landing />} />
      </Routes>
      <InstallPrompt />
    </>
  );
}
