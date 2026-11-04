import { createServer } from './http/server';

const PORT = Number(process.env.PORT ?? 3000);

async function bootstrap(): Promise<void> {
  const app = await createServer();

  app.listen(PORT, () => {
    console.log(`Envío Fácil API escuchando en http://localhost:${PORT}`);
    console.log(`Documentación OpenAPI: openapi/openapi.yaml`);
  });
}

void bootstrap();
