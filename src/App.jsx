import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Shell from './pages/Shell';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatsLayout from './pages/ChatsLayout';
import ChatEmpty from './pages/ChatEmpty';
import ChatDetail from './pages/ChatDetail';
import NewChat from './pages/NewChat';
import NewGroup from './pages/NewGroup';
import Status from './pages/Status';
import Calls from './pages/Calls';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Privacy from './pages/Privacy';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Shell />}>
            <Route path="/chats" element={<ChatsLayout />}>
              <Route index element={<ChatEmpty />} />
              <Route path=":chatId" element={<ChatDetail />} />
            </Route>
            <Route path="/new-chat" element={<NewChat />} />
            <Route path="/new-group" element={<NewGroup />} />
            <Route path="/status" element={<Status />} />
            <Route path="/calls" element={<Calls />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/profile" element={<Profile />} />
            <Route path="/settings/privacy" element={<Privacy />} />
            <Route path="/chat/:chatId" element={<LegacyChatRedirect />} />
          </Route>
          <Route path="/" element={<Navigate to="/chats" replace />} />
          <Route path="*" element={<Navigate to="/chats" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LegacyChatRedirect() {
  const { chatId } = useParams();
  return <Navigate to={`/chats/${chatId}`} replace />;
}
