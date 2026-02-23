import { useLochordStore } from "./application/store/useLochordStore";
import { MainPage } from "./presentation/pages/MainPage";
import { OnboardingPage } from "./presentation/pages/OnboardingPage";

function App() {
  const musicRoot = useLochordStore((s) => s.musicRoot);

  return musicRoot ? <MainPage /> : <OnboardingPage />;
}

export default App;
