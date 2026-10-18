import { Config } from "@remotion/cli/config";

// Reels: H.264, qualidade alta (a plataforma recomprime), JPEG nos frames é mais rápido.
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setCrf(18);
Config.setOverwriteOutput(true);

// Se o Remotion não achar o Chromium sozinho (sandbox, sem internet):
//   npx remotion render ... --browser-executable=/caminho/do/chromium
// ou descomente e ajuste:
// Config.setBrowserExecutable("/usr/bin/chromium");
