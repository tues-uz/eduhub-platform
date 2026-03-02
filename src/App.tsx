import { AppRoutes } from "@/app/AppRoutes";
import { AppProviders } from "@/app/providers";

const App = () => (
    <AppProviders>
        <AppRoutes />
    </AppProviders>
);

export default App;
