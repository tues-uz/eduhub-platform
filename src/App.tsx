import { useTranslation } from "react-i18next";
import { AppRoutes } from "@/app/AppRoutes";
import { AppProviders } from "@/app/providers";

/** Remount routes when language changes so all screens pick up new copy. */
function AppShell() {
  const { i18n } = useTranslation();
  return (
    <AppProviders key={i18n.language}>
      <AppRoutes />
    </AppProviders>
  );
}

const App = () => <AppShell />;

export default App;
