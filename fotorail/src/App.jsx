import { useApp } from './context/AppContext';
import ProjectScreen from './components/ProjectScreen';
import MainApp from './components/MainApp';
import Toast from './components/Toast';

export default function App() {
  const { screen } = useApp();
  return (
    <>
      {screen === 'projects' && <ProjectScreen />}
      {screen === 'main' && <MainApp />}
      <Toast />
    </>
  );
}
