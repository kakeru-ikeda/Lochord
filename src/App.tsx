import { useLochordStore } from "./application/store/useLochordStore";
import { MainPage } from "./presentation/pages/MainPage";
import { OnboardingPage } from "./presentation/pages/OnboardingPage";
import { useTheme } from "./presentation/hooks/useTheme";

function App() {
  const musicRoot = useLochordStore((s) => s.musicRoot);
  useTheme();

  return musicRoot ? <MainPage /> : <OnboardingPage />;
}

export default App;
