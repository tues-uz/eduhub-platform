import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    // Native watchers sometimes miss saves from editors/assistants; polling fixes HMR not firing.
    // Disable with VITE_DEV_POLL=0 in .env or shell.
    const usePoll = env.VITE_DEV_POLL !== "0";

    return {
        server: {
            host: true,
            port: 8081,
            strictPort: true,
            ...(usePoll ? { watch: { usePolling: true, interval: 200 } } : {}),
        },
        plugins: [react()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
    };
});
