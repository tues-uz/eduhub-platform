import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    // Native watchers sometimes miss saves from editors/assistants; polling fixes HMR not firing.
    // Disable with VITE_DEV_POLL=0 in .env or shell.
    const usePoll = env.VITE_DEV_POLL !== "0";

    /** When the SPA uses a relative API base in dev, the browser calls same-origin `/api/...` and Vite forwards here (avoids CORS / aggressive third-party blocking in some browsers). */
    const devApiProxyTarget =
        (env.VITE_EDUHUB_API_BASE_URL || "").replace(/\/+$/, "") ||
        "https://svc-c6848ae1-kl-caa1669c-caa1669c.kubeletto.app";

    return {
        server: {
            host: true,
            port: 8081,
            strictPort: true,
            ...(usePoll ? { watch: { usePolling: true, interval: 200 } } : {}),
            proxy: {
                "/api": {
                    target: devApiProxyTarget,
                    changeOrigin: true,
                    secure: true,
                },
            },
        },
        plugins: [react()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
    };
});
