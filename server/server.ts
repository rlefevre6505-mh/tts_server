import express from "express";
import type { Express, Request, Response } from "express";
import cors from "cors";

const app: Express = express();
app.use(express.json());
app.use(cors());
app.use();

const PORT = 8080;
app.get("/", (req, res) =>
  res.json({ message: "Welcome to the Tom The Shop Logistics server" }),
);

app.listen(PORT, () => {
  console.info(`Server is running in port ${PORT}`);
});
