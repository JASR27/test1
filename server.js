import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

// Configurar dotenv para cargar variables de entorno
dotenv.config();

// Configurar el directorio actual (para servir archivos estáticos)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializa la aplicación de Express y define el puerto
const app = express();
const port = process.env.PORT || 3000;

// Configura el cliente de OpenAI con la API key desde el archivo .env
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware para parseo de JSON y datos URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, "public")));

/**
 * Función que realiza tres llamadas sucesivas a OpenAI con diferentes queries.
 * @param {string} companyName - Nombre de la empresa a evaluar.
 * @returns {Promise<Object>} Respuesta con los análisis combinados.
 */
async function performDueDiligence(companyName) {
  try {
    const queries = [
      `Is ${companyName} a legitimate company`,
      `Reviews of ${companyName}`,
      `Legal issues related to ${companyName}`
    ];

    const responses = await Promise.all(
      queries.map(async (query) => {
        const response = await client.responses.create({
          model: "gpt-4o-mini",
          tools: [{ type: "web_search_preview" }],
          input: query,
        });
        return response.output?.[1]?.content || { error: `No se pudo completar la consulta: ${query}` };
      })
    );

    return {
      query1: responses[0],
      query2: responses[1],
      query3: responses[2],
    };
  } catch (error) {
    console.error("Error al realizar due diligence:", error);
    return { error: "Falló la consulta de due diligence." };
  }
}

// Endpoint que procesa la petición POST
app.post("/due-diligence", async (req, res) => {
  const { companyName } = req.body;

  if (!companyName) {
    return res.status(400).json({ error: "Falta el nombre de la empresa en el formulario." });
  }

  try {
    const analysis = await performDueDiligence(companyName);
    res.json({ analysis });
  } catch (error) {
    console.error("Error en /due-diligence:", error);
    res.status(500).json({ error: "Error en el servidor." });
  }
});

// Arranca el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});